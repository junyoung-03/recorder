# Recorder 시스템 아키텍처 (현재 코드 기준)

## 1. 프로젝트 개요

**Recorder(리코더)**는 개인 생활 기록(가계부, 일정, 운동, 몸 기록, 일기)을 날짜 중심으로 관리하고,  
친구 관계를 통해 **운동/몸/일기 공유 뷰**를 제공하는 웹 서비스다.

---

## 2. 핵심 원칙

- 백엔드는 없고 **Supabase(Auth/DB/Storage)** 중심으로 동작한다.
- 개인 데이터는 **RLS**로 보호한다.
- 친구 공유 데이터는 **friendships + visibility**로 제한한다.
- 이미지는 **Supabase Storage**에 저장한다.

---

## 3. 전체 시스템 아키텍처 (Top-Level)

```
Client (Browser)
    |
    v
Supabase (Auth + Postgres + RLS + Storage)
    |
    +------------------+------------------+
    |                  |                  |
    v                  v                  v
Auth Session       Postgres (RLS)     Storage (Images)
```

---

## 4. 실행 방식

- 개발: `npm run dev` (Vite)
- 배포: Vercel (정적 프론트)
- 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 5. 라우팅 구조 (App.jsx 기준)

### 5.1 공용/인증
- `/` `/landing`
- `/login` `/register` `/reset-password`

### 5.2 개인 영역 (Private)
- `/dashboard`
- `/finance` `/finance/month`
- `/schedule`
- `/exercise` `/exercise/month` `/exercise/body/all`
- `/todos/month`
- `/account`

### 5.3 소셜/친구
- `/friends`
- `/journal` `/journal/new` `/journal/:id`
- `/friend/:id/exercise`
- `/friend/:id/body`
- `/friend/:id/journal`
- `/friend/:id/journal/:journalId`

---

## 6. 사용자/프로필 흐름

- 로그인 상태는 `supabase.auth.getSession()`으로 복원
- 프로필은 `public.users`에서 조회 (username, nickname, birth_date, avatar_url)
- Auth 메타데이터와 `public.users`를 상호 보정/동기화
- `username + birth_date`가 없으면 `/register`로 유도

---

## 7. 친구 모드 접근 제어

- 친구 페이지는 **기존 페이지를 friend 모드로 전환**
- friend 모드에서는 **읽기 전용**
- friend 모드 네비게이션: **운동/몸/일기만 허용**

---

## 8. 이미지 저장/접근 구조

### 8.1 Storage 버킷
- `body` : 몸 기록 이미지 (signed URL 사용)
- `photos` : 프로필 사진 (public URL 사용)

### 8.2 접근 방식
- `body`는 `createSignedUrl`로 접근
- `photos`는 public URL 또는 경로에서 public URL 생성

---

## 9. 데이터베이스 모델 (Supabase 테이블 기준)

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
- `journals`
- `journal_categories`
- `comments`
- `likes`

---

## 10. 기술 스택 요약

| 영역 | 기술 | 비고 |
|---|---|---|
| Backend | 없음 | Supabase로 대체 |
| DB | Supabase Postgres | RLS 사용 |
| Auth | Supabase Auth | 토큰 기반 |
| Storage | Supabase Storage | 이미지 저장 |
| Front | React + Vite | SPA |
| Style | Tailwind CSS | UI |

---

## 11. 한 문장 요약

Recorder는 Supabase Auth/RLS/Storage로 권한과 데이터를 관리하고,  
프론트엔드에서 직접 DB/스토리지를 접근하는  
서버리스 구조의 생활 기록 웹 서비스다.
