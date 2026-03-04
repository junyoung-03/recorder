# Daily Life Tracker (Recorder)

날짜 중심의 통합 생활 기록 웹사이트입니다.  
가계부, 일정, 할 일, 운동 기록, 몸 기록, 일기(블로그형), 친구 소셜 기능을 한 곳에서 관리합니다.

## 주요 기능

### 1. 인증
- 회원가입 / 로그인
- Supabase Auth 기반 인증

### 2. 가계부
- 수입/지출 기록
- 월별 캘린더 뷰
- 통계: 일평균 지출, 전월 지출, 전월 대비 변화, 전월 최다 지출 TOP3

### 3. 일정
- 달력 기반 일정 등록/조회

### 4. 할 일 (Todos)
- 월간 카드형 뷰
- 완료/미완료 상태 관리

### 5. 운동/몸 기록
- 오늘 운동 기록 작성
- 전체보기(월간)에서 날짜 클릭 시 기록 추가
- 몸 기록 이미지 업로드/비교 보기

### 6. 일기 (블로그형)
- 카테고리(게시판) 관리: 추가/삭제
- 카테고리별 글 목록/카운트
- 좋아요/댓글

### 7. 친구
- 친구 목록
- 친구의 일기 보기 (권한 체크)

## 기술 스택
- 백엔드: 없음 (Supabase로 대체)
- 프론트엔드: React + Vite
- 스타일: Tailwind CSS
- 데이터베이스: Supabase Postgres
- 이미지 저장소: Supabase Storage

## 설치 및 실행

### 1. 프론트 설치
```bash
cd frontend
npm install
```

### 2. 개발 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5174` 접속

## 환경 변수
프론트에서 Supabase를 사용하려면 아래를 설정하세요.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 프로젝트 구조
```
daily-life-tracker/
├── frontend/
│   ├── src/                 # React 소스
│   ├── public/              # 정적 파일
│   └── dist/                # 빌드 결과 (배포 시)
└── md/                      # 문서
```

## 주의사항
이 프로젝트는 학습/개인용으로 구성되어 있습니다.  
실서비스로 사용 시 아래 항목을 개선하세요.
- RLS 정책 검증/감사
- HTTPS 적용
- 키 회전/권한 최소화

