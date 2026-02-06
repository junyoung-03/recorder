# 문제 정리 (로그인 500/내부 서버 오류)

## 1) Supabase 스키마 불일치
- 원인: Supabase에 `sql/001_init.sql` 기반 테이블이 생성되어 있었음.
- 문제: 앱은 `users`(정수 id) + `date` 컬럼명을 사용하지만,
  Supabase 스키마는 `auth.users`(UUID) + `record_date` 컬럼명 구조라서
  로그인/조회 시 모델과 매칭이 실패했고 500 오류가 발생.
- 조치: Supabase `public` 스키마를 앱 모델과 동일한 구조로 재생성
  (정수 PK, `users` 테이블, `date` 컬럼명).

## 2) Supabase 연결 시 SSL 필수 옵션 누락 가능
- 원인: Supabase Postgres는 SSL 연결이 필수인데 `sslmode=require`가 없으면
  환경에 따라 연결 실패 → 내부 서버 오류 발생 가능.
- 조치: `DATABASE_URL`/`SUPABASE_DB_URL`에 `sslmode=require`가 없으면
  자동으로 붙이도록 서버 설정 보강.

## 3) 세션에 잘못된 user_id 저장 시 500 가능
- 원인: 세션의 `_user_id`가 숫자가 아닌 값으로 들어오면
  `int(user_id)` 변환에서 예외 발생.
- 조치: `load_user`에서 변환 실패를 안전 처리하고 None 반환.

## 4) Vite manifest 파싱 실패 시 500 가능
- 원인: `static/dist/.vite/manifest.json`이 손상되거나 파싱 실패 시
  템플릿 렌더링 과정에서 예외 발생.
- 조치: 파싱 예외를 잡고 빈 asset 목록으로 안전하게 렌더링.

## 5) Render 배포 시 DATABASE_URL 형식 오류
- 원인: `DATABASE_URL`에 `YOUR-PASSWORD` 같은 템플릿 값이 들어가거나
  특수문자(예: `@`, `:`, `[`, `]`)가 URL 인코딩되지 않으면 `urlparse`가 실패.
- 조치: Render 환경 변수에 실제 DB 비밀번호를 넣고 URL 인코딩하여 설정.

---

### 현재 권장 환경
- DB: Supabase Postgres 사용 (`DATABASE_URL` 또는 `SUPABASE_DB_URL` 설정)
- 스키마: 앱 모델과 동일한 구조 유지
- 서버 재시작 후 `/register` → `/login` 순서로 정상 동작 확인

