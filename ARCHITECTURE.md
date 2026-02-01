# Recorder 시스템 아키텍처 (현재 코드 기준)

## 1. 프로젝트 개요

**Recorder(리코더)**는 개인 생활 기록(가계부, 일정, 운동, 몸 기록, 일기)을 날짜 중심으로 관리하고,  
식단/일기는 **친구 권한을 가진 사용자에게만** 공유 가능한 웹 서비스다.

현재 코드 기준으로 작성했으며, 운영 확장 계획은 마지막 섹션에 별도 정리한다.

---

## 2. 핵심 원칙 (현재 구현)

- 개인 데이터는 **권한 함수 + 쿼리 조건**으로 제한한다.
- 친구 공유 데이터는 **`is_friend`, `can_view_*` 권한 함수**로 제한한다.
- 이미지 저장은 **로컬 / Cloudflare R2 / Supabase Storage** 중 선택 가능하다.
- 프론트는 React(Vite), 서버는 Flask(세션 기반) 구조다.

---

## 3. 전체 시스템 아키텍처 (Top-Level)

```
Client (Browser)
    |
    v
Flask Application (dev: run.py / prod: gunicorn)
    |
    +------------------+------------------+
    |                  |                  |
    v                  v                  v
SQLite/Postgres    Object Storage     Static Assets
(local/Supabase)   (Local/R2/Supabase) (Vite build)
```

---

## 4. 서버/인프라 구성 (현재 구현)

### 4.1 실행 방식
- 개발: `python run.py`
- 배포: `gunicorn run:app`

### 4.2 인증/세션
- Flask-Login 기반 세션 인증
- 별도 Redis 세션 저장소는 **현재 미사용**

### 4.3 데이터베이스
- 기본: SQLite (`instance/database.db`)
- 선택: Supabase Postgres (`DATABASE_URL` / `SUPABASE_DB_URL`)

---

## 5. 도메인 구조 (현재 라우트 기준)

### 5.1 도메인 분리
| Domain | 설명 |
|---|---|
| Auth | 로그인/로그아웃/회원가입 |
| Friends | 친구 요청/수락/차단 |
| Private | 개인 전용 데이터 |
| Social | 친구 공유 데이터 |
| Media Access | 이미지 접근 제어 |

### 5.2 Private Domain (Owner-only)
**포함**
- 홈 대시보드
- 가계부
- 일정
- 운동/몸 기록
- 할 일

**보안**
- 권한 함수 또는 `user_id == current_user.id` 조건으로 제한
- URL 직접 접근도 서버에서 차단

### 5.3 Social Domain (Friends-only)
**포함**
- 식단
- 일기

**보안**
- 친구 관계는 상호 승인
- `is_friend`, `can_view_meal`, `can_view_journal`로 제한

---

## 6. 친구 콘텐츠 접근

**설계**
- 내 페이지는 내 콘텐츠만 유지
- 친구 클릭 시 전용 뷰어로 접근

**라우트**
- `/friend/<friend_id>/meals`
- `/friend/<friend_id>/journal`

---

## 7. 이미지 저장/접근 구조

### 7.1 저장 방식
- 로컬: `static/uploads`
- 선택: Cloudflare R2 / Supabase Storage

### 7.2 접근 방식
- 로컬 파일은 서버가 직접 제공
- 클라우드 URL은 리다이렉트로 제공
- 권한 검사는 서버에서 수행

---

## 8. 데이터베이스 모델 (models.py 기준)

**사용자/관계**
- `users`
- `friendships`

**개인 데이터 (Private)**
- `finance_records`
- `schedules`
- `todos`
- `exercise_plans`
- `exercise_records`
- `body_records`

**친구 공유 데이터 (Social)**
- `meal_records`
- `journals`
- `journal_categories`
- `comments`
- `likes`

---

## 9. 기술 스택 요약

| 영역 | 기술 | 비고 |
|---|---|---|
| Backend | Flask | 서버/권한/세션 |
| WSGI | Gunicorn | 배포용 |
| DB | SQLite / Postgres | 로컬/운영 전환 |
| Auth | Flask-Login | 세션 기반 |
| Storage | Local / R2 / Supabase | 이미지 저장 |
| Front | React + Vite | SPA |
| Style | Tailwind CSS | UI |

---

## 10. 아키텍처 다이어그램 (현재 구현)

```
+-------------------------------------------------------------+
|                          Client                             |
|                     (Web Browser)                           |
|                                                             |
|  [PRIVATE]                                                   |
|    /          Home Dashboard                                |
|    /finance   Finance                                       |
|    /schedule  Schedule                                      |
|    /exercise  Exercise                                      |
|    /todos     Todos                                         |
|                                                             |
|  [SOCIAL - FRIENDS ONLY]                                    |
|    /journal              내 일기                            |
|    /friend/{id}/meals     친구 식단                          |
|    /friend/{id}/journal   친구 일기                          |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Flask Application                        |
|                (Gunicorn + Flask)                           |
|                                                             |
|  Auth / Session -> Flask-Login                              |
|                                                             |
|  Domain Router (Blueprint)                                  |
|    PRIVATE DOMAIN  -> owner-only                            |
|    SOCIAL DOMAIN   -> friend-only                           |
|    MEDIA ACCESS    -> local file / redirect                 |
+------------------------------+------------------------------+
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
+------------------------+        +---------------------------+
| SQLite / Postgres      |        | Object Storage            |
| - users                |        | - meal images             |
| - friendships          |        | - body images             |
| - finance_records      |        | - URL redirect            |
| - schedules            |        +---------------------------+
| - exercise_records     |
| - meal_records         |
| - journals             |
| - comments / likes     |
+------------------------+
```

---

## 11. 한 문장 요약

Recorder는 개인 데이터는 권한 함수/쿼리 조건으로 분리하고,  
친구 공유는 서버 권한 검사로 제한하며,  
이미지는 로컬 또는 클라우드 저장소로 분리 가능한  
현재 구현 기준의 생활 기록 웹 서비스다.

---

## 12. 확장/권장 사항 (운영)
- Redis 세션 스토어 도입
- PostgreSQL 고정 및 마이그레이션 자동화
- Signed URL 기반 미디어 제공
- TLS/보안 헤더/Rate Limit 적용

