# Daily Life Tracker (Recorder)

날짜 중심의 통합 생활 기록 웹사이트입니다.  
가계부, 일정, 할 일, 운동 기록, 몸 기록, 일기(블로그형), 친구 소셜 기능을 한 곳에서 관리합니다.

## 주요 기능

### 1. 인증
- 회원가입 / 로그인
- 세션 기반 인증 (Flask-Login)

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
- 친구의 일기/식단 보기 (권한 체크)

## 기술 스택
- 백엔드: Flask (Python)
- 프론트엔드: React + Vite
- 스타일: Tailwind CSS
- 데이터베이스: SQLite
- 이미지 저장소: 로컬 / Cloudflare R2 / Supabase Storage (선택)

## 설치 및 실행

### 1. 가상환경 생성 및 활성화
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 프론트 빌드
```bash
cd frontend
npm install
npm run build
```

### 4. 실행
```bash
python run.py
```

브라우저에서 `http://localhost:5000` 접속

## 환경 변수 (선택)
이미지 저장을 클라우드로 쓰려면 `.env`에 아래를 설정하세요.

### Supabase Storage
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=photos
SUPABASE_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/photos
```

### Cloudflare R2
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=recorder-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## 프로젝트 구조
```
daily-life-tracker/
├── app/
│   ├── __init__.py          # Flask 앱 초기화
│   ├── models.py            # SQLAlchemy 모델
│   ├── routes.py            # 라우트 및 API
│   └── storage.py           # 이미지 저장 유틸
├── frontend/
│   ├── src/                 # React 소스
│   └── dist/                # Vite 빌드 (개발 시)
├── static/
│   └── dist/                # 배포용 프론트 빌드 결과
├── templates/
│   └── react_index.html     # React 엔트리 템플릿
├── instance/
│   └── database.db          # SQLite DB
├── run.py                   # 실행 파일
└── requirements.txt         # 패키지 목록
```

## 주의사항
이 프로젝트는 학습/개인용으로 구성되어 있습니다.  
실서비스로 사용 시 아래 항목을 개선하세요.
- 비밀번호 해시화
- 운영 DB 사용 (PostgreSQL 등)
- HTTPS 적용
- CSRF/보안 설정 강화

