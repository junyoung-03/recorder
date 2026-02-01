"""
Cloudflare R2 저장소 유틸리티
무료 티어: 10GB 저장, 1M 읽기/월, 다운로드 무료
"""
import os
import boto3
import requests
from botocore.config import Config
from pathlib import Path
from datetime import datetime
from urllib.parse import quote
from werkzeug.utils import secure_filename

class R2Storage:
    def __init__(self):
        # 환경 변수에서 설정 가져오기
        self.account_id = os.environ.get('R2_ACCOUNT_ID')
        self.access_key_id = os.environ.get('R2_ACCESS_KEY_ID')
        self.secret_access_key = os.environ.get('R2_SECRET_ACCESS_KEY')
        self.bucket_name = os.environ.get('R2_BUCKET_NAME', 'recorder-images')
        self.public_url = os.environ.get('R2_PUBLIC_URL')  # 예: https://pub-xxxxx.r2.dev
        
        if not all([self.account_id, self.access_key_id, self.secret_access_key]):
            raise ValueError("R2 credentials not found in environment variables")
        
        # R2는 S3 호환 API 사용
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version='s3v4')
        )
    
    def upload_file(self, file_obj, key: str, content_type: str = None) -> str:
        """
        파일을 R2에 업로드
        
        Args:
            file_obj: 파일 객체 (request.files['image'])
            key: R2에 저장될 경로 (예: 'meals/1/2024-01-01_image.jpg')
            content_type: MIME 타입 (예: 'image/jpeg')
        
        Returns:
            저장된 파일의 public URL
        """
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket_name,
            key,
            ExtraArgs=extra_args
        )
        
        # Public URL 반환
        if self.public_url:
            return f"{self.public_url}/{key}"
        else:
            # 또는 signed URL 생성 (5분 유효)
            return self.get_signed_url(key, expires_in=31536000)  # 1년
    
    def delete_file(self, key: str) -> bool:
        """R2에서 파일 삭제"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            print(f"Error deleting file from R2: {e}")
            return False
    
    def get_signed_url(self, key: str, expires_in: int = 3600) -> str:
        """Signed URL 생성 (임시 접근용)"""
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expires_in
        )
    
    def file_exists(self, key: str) -> bool:
        """파일 존재 여부 확인"""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except:
            return False


class SupabaseStorage:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL')
        self.service_key = os.environ.get('SUPABASE_SERVICE_KEY')
        self.bucket_name = os.environ.get('SUPABASE_BUCKET', 'photos')
        self.public_url = os.environ.get('SUPABASE_PUBLIC_URL')
        if not self.public_url and self.url:
            self.public_url = f"{self.url}/storage/v1/object/public/{self.bucket_name}"

        if not all([self.url, self.service_key, self.bucket_name]):
            raise ValueError("Supabase storage credentials not found in environment variables")

    def _headers(self, content_type: str = None):
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key
        }
        if content_type:
            headers['Content-Type'] = content_type
        return headers

    def upload_file(self, file_obj, key: str, content_type: str = None) -> str:
        safe_key = quote(key, safe='/')
        url = f"{self.url}/storage/v1/object/{self.bucket_name}/{safe_key}"
        data = file_obj.read()
        headers = self._headers(content_type or 'application/octet-stream')
        headers['x-upsert'] = 'true'
        response = requests.put(url, data=data, headers=headers, timeout=30)
        if response.status_code not in (200, 201):
            raise ValueError(f"Supabase upload failed: {response.status_code} {response.text}")
        return f"{self.public_url}/{key}"

    def delete_file(self, key: str) -> bool:
        safe_key = quote(key, safe='/')
        url = f"{self.url}/storage/v1/object/{self.bucket_name}/{safe_key}"
        response = requests.delete(url, headers=self._headers(), timeout=30)
        return response.status_code in (200, 204)

    def file_exists(self, key: str) -> bool:
        safe_key = quote(key, safe='/')
        url = f"{self.url}/storage/v1/object/{self.bucket_name}/{safe_key}"
        response = requests.head(url, headers=self._headers(), timeout=10)
        return response.status_code == 200


def get_storage():
    """저장소 인스턴스 반환 (R2 또는 로컬)"""
    # 환경 변수가 설정되어 있으면 Supabase 사용
    if os.environ.get('SUPABASE_URL') and os.environ.get('SUPABASE_SERVICE_KEY'):
        try:
            return SupabaseStorage()
        except Exception as e:
            print(f"Supabase 초기화 실패, 로컬 저장소 사용: {e}")
            return None
    # 환경 변수가 설정되어 있으면 R2 사용
    if os.environ.get('R2_ACCOUNT_ID'):
        try:
            return R2Storage()
        except Exception as e:
            print(f"R2 초기화 실패, 로컬 저장소 사용: {e}")
            return None
    return None


def save_image_to_storage(file, user_id: int, category: str, date_str: str = None) -> str:
    """
    이미지를 저장소에 저장 (R2 또는 로컬)
    
    Args:
        file: 업로드된 파일 객체
        user_id: 사용자 ID
        category: 'meals' 또는 'body'
        date_str: 날짜 문자열 (선택)
    
    Returns:
        저장된 이미지의 경로 또는 URL
    """
    storage = get_storage()
    
    if not file or not file.filename:
        return None
    
    # 파일명 생성
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if date_str:
        safe_date = date_str.replace('-', '_')
        filename = f"{safe_date}_{timestamp}_{filename}"
    else:
        filename = f"{timestamp}_{filename}"
    
    # R2 사용
    if storage:
        key = f"{category}/{user_id}/{filename}"
        content_type = file.content_type or 'image/jpeg'
        url = storage.upload_file(file, key, content_type)
        return url  # R2 URL 반환
    
    # 로컬 저장소 사용 (기존 방식)
    from pathlib import Path
    basedir = Path(__file__).parent.parent
    upload_folder = basedir / 'static' / 'uploads' / category
    user_folder = upload_folder / str(user_id)
    user_folder.mkdir(parents=True, exist_ok=True)
    
    filepath = user_folder / filename
    file.save(str(filepath))
    return f"uploads/{category}/{user_id}/{filename}"


def delete_image_from_storage(image_path: str) -> bool:
    """
    저장소에서 이미지 삭제
    
    Args:
        image_path: 이미지 경로 또는 URL
    
    Returns:
        삭제 성공 여부
    """
    storage = get_storage()
    
    # Supabase/R2 URL인 경우
    if storage and image_path.startswith('http'):
        # URL에서 key 추출
        if storage.public_url and image_path.startswith(storage.public_url):
            key = image_path.replace(f"{storage.public_url}/", "")
            return storage.delete_file(key)
    
    # 로컬 파일인 경우
    if image_path.startswith('uploads/'):
        from pathlib import Path
        basedir = Path(__file__).parent.parent
        file_path = basedir / 'static' / image_path
        if file_path.exists():
            file_path.unlink()
            return True
    
    return False
