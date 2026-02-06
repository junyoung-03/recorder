# Recorder 시스템 아키텍처 (현재 코드 기준)

## 1. 프로젝트 개요

**Recorder(리코더)**는 개인 생활 기록(가계부, 일정, 운동, 몸 기록, 일기)을 날짜 중심으로 관리하고,  
식단/일기는 **친구 권한을 가진 사용자에게만** 공유 가능한 웹 서비스다.

현재 코드 기준으로 작성했으며, 운영 확장 계획은 마지막 섹션에 별도 정리한다.

---

## 2. 핵심 원칙 (현재 구현)

- 개인 데이터는 **Supabase RLS**로 제한한다.
- 친구 공유 데이터는 **friendships 기반 RLS 정책**으로 제한한다.
- 이미지 저장은 **Supabase Storage** 사용.
- 프론트는 React(Vite), 서버는 없고 Supabase(Auth/DB/Storage)로 구성된다.

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

## 4. 서버/인프라 구성 (현재 구현)

### 4.1 실행 방식
- 개발: `npm run dev` (Vite)
- 배포: Vercel (정적 프론트)

### 4.2 인증/세션
- Supabase Auth 기반 인증
- 프론트에서 `supabase.auth.getUser()`로 사용자 식별

### 4.3 데이터베이스
- Supabase Postgres 고정 사용

---

## 5. 도메인 구조 (현재 코드 기준)

### 5.1 도메인 분리
| Domain | 설명 |
|---|---|
| Auth | 로그인/회원가입 |
| Friends | 친구 요청/수락/차단 |
| Private | 개인 전용 데이터 |
| Social | 친구 공유 데이터 |
| Media Access | 스토리지 접근 제어 |

### 5.2 Private Domain (Owner-only)
**포함**
- 홈 대시보드
- 가계부
- 일정
- 운동/몸 기록
- 할 일

**보안**
- RLS 정책 `auth.uid() = user_id`

### 5.3 Social Domain (Friends-only)
**포함**
- 식단
- 일기

**보안**
- 친구 관계는 상호 승인
- RLS에서 `friendships` + `visibility`로 제한

---

## 6. 친구 콘텐츠 접근

**설계**
- 내 페이지는 내 콘텐츠만 유지
- 친구 클릭 시 전용 뷰어로 접근

**라우트**
- `/friend/:id/meals`
- `/friend/:id/journal`

---

## 7. 이미지 저장/접근 구조

### 7.1 저장 방식
- Supabase Storage bucket 사용 (`meals`, `body`)

### 7.2 접근 방식
- Supabase Storage RLS로 접근 제어
- 클라이언트는 Storage public URL 또는 signed URL 사용

---

## 8. 데이터베이스 모델 (Supabase 테이블 기준)

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
| Backend | 없음 | Supabase로 대체 |
| DB | Supabase Postgres | RLS 사용 |
| Auth | Supabase Auth | 토큰 기반 |
| Storage | Supabase Storage | 이미지 저장 |
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
|                         Supabase                            |
|  Auth (JWT) + Postgres (RLS) + Storage                      |
|                                                             |
|  RLS 정책으로 권한 제어                                      |
|  Storage RLS로 이미지 접근 제어                              |
+------------------------------+------------------------------+
```

---

## 11. 한 문장 요약

Recorder는 Supabase Auth/RLS/Storage로 권한과 데이터를 관리하고,  
프론트엔드에서 직접 DB/스토리지를 접근하는  
서버리스 구조의 생활 기록 웹 서비스다.

---

## 12. 확장/권장 사항 (운영)
- RLS 정책 테스트/감사 자동화
- Edge Function 도입(대량 Export, 서명 URL)
- Storage signed URL 사용 범위 확대


