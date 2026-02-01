# Recorder 시스템 아키텍처 (운영 기준)

## 1. 프로젝트 개요

**Recorder(리코더)**는 개인 생활 기록(가계부, 일정, 운동, 식단, 일기)을 날짜 중심으로 관리하고,  
식단·일기는 **상호 승인된 친구에게만** 공유 가능한 웹 서비스다.

운영 환경을 전제로 하며, 확장성/보안/데이터 무결성/운영 안정성을 최우선으로 설계한다.

---

## 2. 퍼스트 프린시플(First Principles)

- 사용자는 동시에 여러 명이 접속한다.
- 서버는 언제든지 느려지거나 장애가 발생할 수 있다.
- 사진(식단)은 텍스트보다 훨씬 많은 용량과 트래픽을 유발한다.
- 금융/일정/운동 데이터는 절대 타인에게 노출되면 안 된다.
- 친구 공유 데이터는 UI가 아니라 **서버에서 강제 통제**되어야 한다.
- 서비스는 성장하면서 구조가 바뀔 수 있어야 한다.



이 전제를 만족하지 못하는 설계는 운영 가능한 시스템이 아니다.

---

## 3. 전체 시스템 아키텍처 (Top-Level)

```
Client (Browser)
    |
    v
Load Balancer / Reverse Proxy
    |
    v
Flask Application Cluster (Stateless)
    |
    +------------------+------------------+------------------+
    |                  |                  |                  |
    v                  v                  v
Redis (Session)   PostgreSQL (Data)   Object Storage (Images)
```

---

## 4. 서버/인프라 설계 이유

### 4.1 Flask App Cluster + Load Balancer
**왜 단일 Flask 서버가 아닌가?**
- 요청 증가 시 단일 서버는 병목이 된다.

**설계 선택**
- Gunicorn 기반 멀티 프로세스
- Nginx 또는 클라우드 LB로 분산

**결과**
- 성능 안정, 무중단, 수평 확장 가능

### 4.2 Stateless 서버
**왜 Stateless인가?**
- 여러 서버가 동시에 동작할 때 상태 불일치 방지

**설계 선택**
- 서버 메모리에 상태 저장 금지
- 인증 상태는 외부 저장소로 분리

### 4.3 Redis(Session Store)
**왜 Redis인가?**
- 모든 서버가 동일한 로그인 상태 공유 필요

**역할**
- `session_id -> user_id` 매핑 저장
- 서버 재시작에도 인증 유지

---

## 5. 도메인 분리 설계

### 5.1 도메인 구조

| Domain | 설명 |
|---|---|
| Auth | 로그인, 세션 관리 |
| Friends | 친구 요청/수락/차단 |
| Private Domain | 개인 전용 데이터 |
| Social Domain | 친구 공유 데이터 |
| Media Access | 이미지 접근 제어 |

### 5.2 Private Domain (Owner-only)

**포함**
- 홈 대시보드
- 가계부
- 일정
- 운동

**보안 원칙**
- 모든 쿼리에 `user_id == current_user.id` 강제
- URL 직접 접근도 서버에서 차단

### 5.3 Social Domain (Friends-only)

**포함**
- 식단
- 일기

**보안 원칙**
- 친구 관계는 상호 승인
- 모든 조회/댓글/이미지 접근 시 `is_friend()` 검사

---

## 6. 친구 콘텐츠 접근 (새 탭 Friend Viewer)

**설계**
- 내 페이지는 내 콘텐츠만 유지
- 친구 클릭 시 새 탭에서 전용 뷰어 열기

**라우트 예시**
- `/friend/<friend_id>/meals`
- `/friend/<friend_id>/diary`

**효과**
- 내 작업 흐름 유지
- 콘텐츠 분리와 권한 검사 지점 명확화

---

## 7. 이미지 저장 및 용량 관리

### 7.1 서버 디스크 저장의 문제
- 디스크 고갈
- 서버 다중화 시 파일 불일치
- 백업/확장 어려움

### 7.2 Object Storage (S3 / R2)
- 이미지 전용 저장소
- 서버 수와 무관하게 단일 저장소

### 7.3 Signed URL 방식

**동작**
1. 서버가 친구 관계 확인
2. 짧은 유효기간의 다운로드 URL 발급
3. 클라이언트는 해당 URL로 이미지 로드

**장점**
- 서버가 이미지 트래픽을 직접 처리하지 않음
- URL 유출 시에도 자동 무효화

---

## 8. 데이터베이스 설계 (PostgreSQL)

### 8.1 선택 이유
- 트랜잭션 안정성
- 관계형 모델 적합
- 운영 신뢰성/확장성

### 8.2 주요 테이블

**사용자/관계**
- `users`
- `friend_requests`
- `friendships`

**개인 데이터 (Private)**
- `finance_records`
- `schedules`
- `exercise_records`

**친구 공유 데이터 (Social)**
- `meal_posts`
- `diary_posts`
- `comments`
- `likes`

---

## 9. 기술 스택 요약

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| Backend | Flask | 단순, 명확, 학습 비용 낮음 |
| WSGI | Gunicorn | 안정적 멀티 프로세스 |
| DB | PostgreSQL | 운영 신뢰성 |
| Session | Redis | 클러스터 공유 |
| Storage | S3/R2 | 대용량, 확장 |
| Front | Jinja SSR | 구조 단순, SEO, 빠른 개발 |
| Auth | Flask-Login | 세션 기반 안정 |

---

## 10. 시스템 아키텍처 다이어그램 (설명용)

### 10.1 전체 시스템 구조

```
+-------------------------------------------------------------+
|                          Client                             |
|                    (Web Browser / HTTPS)                    |
|                                                             |
|  [PRIVATE]                                                   |
|    /          Home Dashboard                                |
|    /finance   Finance                                       |
|    /schedule  Schedule                                      |
|    /exercise  Exercise                                      |
|                                                             |
|  [SOCIAL - FRIENDS ONLY]                                    |
|    /meals                 내 식단                           |
|    /diary                 내 일기                           |
|    /friend/{id}/meals     친구 식단 (새 탭)                 |
|    /friend/{id}/diary     친구 일기 (새 탭)                 |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              Load Balancer / Reverse Proxy                  |
|            (Nginx or Cloud Load Balancer)                   |
| - TLS 종료, 요청 분산, 보안 헤더, Rate Limit                 |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Flask App Cluster                        |
|              (Gunicorn + Flask, Stateless)                  |
|                                                             |
|  Auth / Session -> Redis (session_id -> user_id)            |
|                                                             |
|  Domain Router (Blueprint)                                  |
|    PRIVATE DOMAIN  -> Owner-only (user_id == current_user)   |
|    SOCIAL DOMAIN   -> Friends-only (is_friend 검사)          |
|    MEDIA ACCESS    -> signed URL 발급                        |
+------------------------------+------------------------------+
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
+------------------------+        +---------------------------+
| PostgreSQL             |        | Object Storage (S3 / R2)  |
| - users                |        | - meal images             |
| - friendships          |        | - diary attachments       |
| - finance_records      |        | - signed URL access       |
| - schedules            |        +---------------------------+
| - exercise_records     |
| - meal_posts           |
| - diary_posts          |
| - comments / likes     |
+------------------------+
```

### 10.2 권한 흐름 (Private vs Social)

**Private Domain (홈/가계부/운동/일정)**
```
Browser -> /finance
  -> 로그인 확인
  -> current_user.id 획득
  -> DB Query WHERE user_id = current_user.id
  -> Response
```
다른 사용자 데이터는 쿼리 단계에서 접근 불가.

**Social Domain (친구 뷰어: 식단/일기)**
```
Browser -> /friend/{friend_id}/meals
  -> 로그인 확인
  -> is_friend(me, friend_id) 검사
     -> 실패: 403/404
  -> DB Query WHERE user_id = friend_id
  -> 이미지 필요 시 signed URL 발급
  -> Response
```

### 10.3 이미지 처리 흐름

**업로드**
```
Browser (multipart)
  -> Flask
     - 파일 크기/확장자 검증
     - 리사이즈 + WebP 변환(선택)
  -> Object Storage
  -> DB에 image_key 저장
```

**표시**
```
Browser
  -> 페이지 요청
     - 권한 검사 (is_friend or owner)
     - signed URL 발급 (예: 5분)
  -> <img src="signed_url">
```

---

## 11. 한 문장 요약

Recorder는 개인 데이터는 완전 분리하고,  
친구 공유는 신뢰 관계로 제한하며,  
서버는 확장 가능하고,  
미디어는 서버 밖에서 안전하게 관리하는 실배포용 웹 아키텍처다.









