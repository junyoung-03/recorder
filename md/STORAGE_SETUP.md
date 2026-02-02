# Cloudflare R2 이미지 저장소 설정 가이드

## Cloudflare R2란?
- **무료 티어**: 10GB 저장, 1M 읽기/월, 다운로드 무료
- S3 호환 API
- AWS S3보다 훨씬 저렴 (다운로드 비용 없음)

## 설정 방법

### 1. Cloudflare R2 버킷 생성
1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. R2 → Create bucket 클릭
3. 버킷 이름 입력 (예: `recorder-images`)
4. 생성 완료

### 2. API 토큰 생성
1. R2 → Manage R2 API Tokens
2. Create API Token 클릭
3. 권한: Object Read & Write 선택
4. 토큰 생성 후 다음 정보 복사:
   - Account ID
   - Access Key ID
   - Secret Access Key

### 3. Public URL 설정 (선택)
1. R2 → 버킷 선택 → Settings
2. Public Access 설정
3. Custom Domain 또는 R2.dev 도메인 사용
4. Public URL 복사 (예: `https://pub-xxxxx.r2.dev`)

### 4. 환경 변수 설정

#### 방법 1: .env 파일 사용 (권장) ⭐
프로젝트 루트에 `.env` 파일 생성:
1. `.env.example` 파일을 복사해서 `.env` 파일로 만들기
2. 실제 R2 값으로 변경

```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=recorder-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**장점:**
- ✅ 한 번만 설정하면 됨
- ✅ 여러 컴퓨터에서 동일한 `.env` 파일 복사 가능
- ✅ Git에 포함되지 않아 안전 (`.gitignore`에 포함됨)
- ✅ 설정이 코드와 함께 관리됨

**여러 컴퓨터에서 사용:**
- 노트북에서 `.env` 파일 설정 후
- 데스크탑으로 `.env` 파일만 복사하면 됨
- (단, R2 credentials는 동일하므로 한 번만 설정해도 됨)

#### 방법 2: 환경 변수 직접 설정
각 컴퓨터마다 별도로 설정해야 함 (비추천)

**Windows (PowerShell)**
```powershell
$env:R2_ACCOUNT_ID="your-account-id"
$env:R2_ACCESS_KEY_ID="your-access-key-id"
$env:R2_SECRET_ACCESS_KEY="your-secret-access-key"
$env:R2_BUCKET_NAME="recorder-images"
$env:R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

**Linux/Mac**
```bash
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
export R2_BUCKET_NAME="recorder-images"
export R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

### 5. 코드 적용
환경 변수가 설정되면 자동으로 R2를 사용합니다.
설정되지 않으면 기존 로컬 저장소를 사용합니다.

## 비용
- **무료 티어**: 10GB 저장, 1M 읽기/월
- **초과 시**: $0.015/GB 저장, $4.50/1M 읽기
- **다운로드**: 무료 (S3와 달리 egress 비용 없음)

## 장점
- ✅ 무료 티어로 충분한 용량
- ✅ 다운로드 비용 없음
- ✅ 빠른 CDN
- ✅ S3 호환 API (기존 코드 재사용 가능)
