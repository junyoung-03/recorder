# Supabase Storage 설정 가이드

## Supabase Storage란?
- Supabase에서 제공하는 이미지/파일 스토리지
- 버킷 단위로 관리하며 RLS 정책으로 접근 제어 가능

## 설정 방법

### 1. 버킷 생성
1. Supabase Dashboard → Storage
2. Create bucket 클릭
3. 버킷 이름 입력 (예: `photos`)
4. Public 또는 Signed URL 정책 선택

### 2. 공개 URL/정책 설정
- 공개 접근이 필요하면 bucket을 public으로 설정
- 비공개라면 signed URL을 사용하도록 정책 적용

### 3. 환경 변수 설정 (프론트)
Vite 환경 변수로 Supabase 연결 정보를 설정합니다.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 코드 적용
- 프론트에서 `supabase.storage.from('photos')` 형태로 사용
- 프로필/몸 기록 이미지 업로드는 Storage에 저장

## 권장 사항
- RLS 정책 적용 (본인만 읽기/쓰기)
- 공개 URL은 필요한 경우에만 사용
