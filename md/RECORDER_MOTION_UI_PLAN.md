# Recorder 내부 페이지 동적 UI·UX 구성 기획서

## 0. 목적 & 범위

### 목적
Recorder의 모든 내부 페이지(홈, 가계부, 일정/할 일, 운동·몸, 일기, 친구, 내 계정)에 일관된 동적 인터랙션을 추가해,
사용성이 자연스럽고 “살아있는 플래너” 같은 느낌을 만든다.

### 대상 라우트
`/dashboard`, `/finance`, `/schedule`, `/todos/month`, `/exercise`, `/journal`, `/friends`, `/account` 등 내부 라우트 전체를 포함한다.

---

## 1. 전체 모션·인터랙션 가이드라인

### 1.1 톤 & 무드

- 키워드: 부드러움 / 안정감 / 플래너 / 카드형
- 과한 애니메이션 대신, “터치감 좋고 가볍게 반응하는” 정도의 모션을 기본으로 한다.
- 모션은 기능보다 앞서지 않고, 상태 변화·피드백을 보조하는 역할에 집중한다.

### 1.2 공통 토큰

**시간**
- fast: 120–150ms (버튼/hover)
- normal: 180–220ms (카드 hover, 탭 전환)
- slow: 280–320ms (모달, 페이지 in/out)

**이징**
- 기본: ease-out
- in/out 혼합: ease-in-out

**거리/스케일**
- 카드/리스트 슬라이드: 4–8px
- hover 이동: Y축 -1~2px
- scale 변동: 0.95–1.05 범위 내

---

## 2. 공통 컴포넌트 인터랙션 스펙

### 2.1 카드(Card)

**적용 대상**: 홈 요약 카드, 가계부/운동/몸/일기 카드, 내 계정 카드 등 모든 큰 카드 UI.

**기본 스타일**
- bg-white, rounded-2xl~3xl, border, shadow-sm
- transition-all duration-150 ease-out

**인터랙션**
- Hover:
  - shadow-sm → shadow-md
  - translateY(0 → -2px)
  - 배경색 미세하게 밝게 (bg-white → bg-white/98)
- Active(클릭 순간):
  - translateY(-1px → 0)
  - shadow 약하게 (shadow-md → shadow-sm)

### 2.2 버튼(Button)

**Primary**
- hover: 색 약간 진하게 + translateY(-1px) + shadow-sm
- active: translateY(0) + shadow 제거

**Secondary**
- hover: 테두리/텍스트 컬러 강조 + bg-blue-50 수준의 옅은 배경

**Disabled**
- 불투명도 0.5 / 커서 not-allowed / 모션 없음

### 2.3 탭·서브네비게이션

**대상**
- 좌측 사이드바 활성 pill
- 일정/운동/가계부 상단 탭
- 내 계정 좌측 탭 등

**탭 버튼**
- 활성: 흰 배경 + 그림자 + 진한 텍스트
- 비활성: 베이지 배경 + 회색 텍스트, hover 시만 명도 상승

**탭 콘텐츠 전환**
- 기존 콘텐츠: opacity 1 → 0, translateY(0 → 4px)
- 새 콘텐츠: opacity 0 → 1, translateY(4px → 0)
- duration: 180–200ms

### 2.4 숫자/통계 표시

**AnimatedNumber** 컴포넌트 도입 (0 → 목표값 카운트 업)

**적용 위치**
- 홈: 오늘 일정 수, 해야 할 일 수, 오늘 지출
- 가계부: 총 수입/지출/잔액, 통계 카드 숫자
- 운동: 이번 주 운동 횟수/시간

**애니메이션**
- duration: 250–350ms
- 값 변경 시 한 번만 실행

### 2.5 모달·사이드패널

**모달 in**
- scale 0.95 → 1.0
- opacity 0 → 1
- duration: 200–240ms

**모달 out**
- scale 1.0 → 0.97
- opacity 1 → 0

**오버레이**
- opacity 0 → 1 (150ms), 반대 방향으로 닫힘

### 2.6 리스트·아이템 인터랙션

- 리스트 항목 hover: 배경 약간 강조 + cursor: pointer
- 새로 추가된 항목: 등장 시 bg-amber-50 하이라이트 300ms 유지 후 원복
- 삭제/완료 항목:
  - opacity 1 → 0 + translateY(0 → -4px) 후 제거
  - 또는 체크 완료 시 텍스트 색/취소선 150ms 전환

---

## 3. 상태 표현(로딩/빈 상태/에러) 동적 설계

### 3.1 로딩 스켈레톤

- 모든 주요 대시보드 카드에 Skeleton 버전 정의
- rounded-3xl bg-warm/40 animate-pulse h-xx
- 서버 응답 지연 시 기존 카드 대신 skeleton 표시

### 3.2 Empty State

- 텍스트 + 아이콘 + CTA 버튼
- hover/포커스 시 약한 모션
- CTA 버튼: 공통 버튼 인터랙션
- 박스 전체에 shadow/배경 미세 변경

### 3.3 에러

- 상단 토스트 or 카드 내 배너
- slide-down + fade-in

---

## 4. 페이지군별 동적 UI 구성

### 4.1 홈 대시보드 (`/dashboard`)

#### 4.1.1 오늘 인사 & 요약 카드
- 인사 카드: 마운트 시 fade-in + upward (8px)
- 오늘 일정/할 일/지출 칩: hover 시 아이콘 scale 1 → 1.08 + 텍스트 색 하이라이트
- 클릭 시 해당 섹션으로 스무스 스크롤 또는 탭 전환

#### 4.1.2 미니 캘린더
- 월 전환: 캘린더 전체 slide-left/right + fade (200ms)
- 날짜 선택: 선택 셀 배경/테두리 색 애니메이션
- 아래 리스트 페이드 전환

#### 4.1.3 “오늘의 운세” 위젯
- 버튼 breathing (scale 0.98↔1.02, opacity 0.9↔1.0)
- 클릭 시 accordion open + 텍스트 fade/slide

### 4.2 가계부 (`/finance`)

#### 4.2.1 상단 요약 카드
- 값 업데이트 시 count-up + 배경 하이라이트(200ms)
- 기간 변경 시 카드 내용 fade + slide 전환

#### 4.2.2 거래 추가 폼
- 높이 transition으로 부드럽게 열고 닫힘
- 입력 포커스 시 보더/그림자 강조

#### 4.2.3 통계/분석 카드
- 그래프/숫자 로딩 시 skeleton
- 필터 변경 시 그래프/텍스트 fade-in

### 4.3 일정·할 일 (`/schedule`, `/todos/month`)

#### 4.3.1 달력 인터랙션
- 월/주 전환 시 좌/우 슬라이드
- 오늘/선택 날짜 강조 애니메이션

#### 4.3.2 일정/할 일 리스트
- 일정 클릭 시 상세 패널/모달 slide-in
- 할 일 완료 체크 애니메이션(체크박스 scale, 텍스트 색/취소선 전환)

### 4.4 운동 · 몸 기록 (`/exercise`)

#### 4.4.1 이번 주 운동 요약
- 숫자 카운트업 + 카드 hover 모션
- 주 변경 시 카드 fade + slide

#### 4.4.2 오늘의 운동 · 최근 운동 카드
- 날짜 선택/탭 이동 시 리스트 fade 전환
- “+ 운동 기록” 버튼 hover → scale & shadow

#### 4.4.3 나의 몸 기록
- 사진 썸네일 hover: scale 1 → 1.05, shadow-sm → shadow-md
- 전체보기/기록추가 버튼: 공통 버튼 인터랙션
- Empty 상태: 버튼 약한 bounce 애니메이션 옵션

### 4.5 일기 (`/journal`)

#### 4.5.1 리스트 & 카테고리
- 카테고리 전환 시 리스트 fade 전환
- 새 글 작성 후 카드 slide-down + 하이라이트

#### 4.5.2 에디터
- 자동 저장: “저장 중…” → “저장 완료 ✓” 텍스트 fade in/out
- 툴바 hover: 아이콘 색/배경 전환

### 4.6 친구 (`/friends`)

#### 4.6.1 친구 리스트
- hover 시 카드 translateY(-1px) + shadow
- 선택된 친구: 좌측 highlight, 우측 타임라인 fade 전환

#### 4.6.2 친구 타임라인
- 스크롤 in-view 시 카드 opacity + translateY (once)

### 4.7 내 계정 (`/account`)

#### 4.7.1 좌측 메뉴 하이라이트
- 활성 메뉴 pill 위치를 애니메이션으로 이동

#### 4.7.2 프로필 탭
- 아바타 hover: overlay(사진 변경 텍스트) fade-in
- 프로필 업데이트 성공: 배너 slide-down + fade-in → 1.5초 후 fade-out

#### 4.7.3 환경 설정 토글
- 테마/위젯 체크박스 변경 시 아이콘/라벨 색 전환

---

## 5. 구현 우선순위 & 작업 쪼개기

### 5.1 1차 (전역 공통)
- 카드/버튼/탭 공통 인터랙션 유틸 클래스 적용
- Skeleton 컴포넌트 도입 및 홈/가계부/운동에 적용
- AnimatedNumber 컴포넌트 구현 및 홈/가계부 요약에 적용

### 5.2 2차 (홈 + 가계부 + 운동·몸)
- 홈 인사/요약/운세/미니 캘린더 모션 구현
- 가계부: 요약/통계/거래 폼/Empty state 모션
- 운동·몸: 이번 주 운동/나의 몸 기록/Empty state 모션

### 5.3 3차 (일정/할 일 + 일기 + 친구 + 내 계정)
- 일정/할 일: 캘린더 전환, 할 일 완료 애니메이션
- 일기: 리스트/새 글/자동 저장 모션
- 친구: 타임라인 in-view 애니메이션
- 내 계정: 좌측 메뉴 pill 이동, 프로필/환경설정 피드백

---

## 6. 추가 설계 메모 (구현 관점)

### 6.1 공통 유틸 클래스
- `motion-card`: `transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md`
- `motion-button-primary`: `transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0`
- `motion-button-secondary`: `transition-all duration-150 ease-out hover:bg-blue-50 hover:border-blue-300`
- `motion-tab`: 활성/비활성 상태 클래스 분리 + `transition-colors duration-150`

### 6.2 AnimatedNumber 컴포넌트
- `useEffect`로 값 변경 감지 후 `requestAnimationFrame` 기반 카운트업
- `prefers-reduced-motion`일 때는 즉시 값 표시
- 숫자 포맷은 기존 `formatCurrency`, `formatNumber` 유틸과 결합

### 6.3 Skeleton 컴포넌트
- `SkeletonCard`, `SkeletonListRow` 기본 구성
- 홈/가계부/운동의 주요 카드에 로딩 시 교체
- `animate-pulse` + `bg-warm/40` 조합 유지

### 6.4 페이지별 적용 아이디어

**홈(`/dashboard`)**
- 요약 카드 row: 첫 로딩 시 순차 fade-in (stagger 60~90ms)
- 오늘 일정/할 일 리스트: item hover에 배경 강조 + 좌측 라인 강조
- 최근 기록 카드: 새 항목 추가 시 300ms 하이라이트

**가계부(`/finance`)**
- 통계/분석 카드 내 숫자: AnimatedNumber 적용
- 탭 전환(날짜별/카테고리별/고정비): 콘텐츠 fade + slide
- 거래 추가 폼: 열림/닫힘 height transition + 입력 포커스 링

**일정(`/schedule`)**
- 선택 날짜 변경 시 리스트 전체 fade out → fade in
- 일정 카드 hover: 좌측 컬러 바 강조 + shadow 상승

**할 일(`/todos/month`)**
- 완료 체크 시 체크박스 scale + 취소선 전환
- 필터 변경 시 리스트 fade 전환

**운동·몸(`/exercise`)**
- 운동 기록 리스트: hover 시 카드 lift + shadow
- 몸 기록 사진: hover scale + overlay 텍스트 fade-in

**일기(`/journal`)**
- 리스트 카드 hover: shadow + translateY
- 새 글 저장 성공: 상단 토스트 slide-down (1.5s 후 자동 제거)

**친구(`/friends`)**
- 친구 리스트 hover 강조
- 타임라인 카드 in-view 등장 (once)

**내 계정(`/account`)**
- 좌측 메뉴 활성 pill 위치 애니메이션
- 프로필 저장 성공 배너 slide-down

### 6.5 접근성/성능 체크
- `prefers-reduced-motion` 대응 필수
- 스크롤 애니메이션은 `once`로 제한
- hover 모션은 모바일에서 과도하지 않게 제한
