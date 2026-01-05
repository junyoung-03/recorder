# Daily Life Tracker (Recorder)

날짜 중심의 통합 생활 기록 웹사이트 (프론트엔드 틀)

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

### 3. 실행

```bash
python run.py
```

브라우저에서 `http://localhost:5000` 접속

## 프로젝트 구조

```
daily-life-tracker/
├── app/
│   ├── __init__.py      # Flask 앱 초기화
│   └── routes.py         # 라우트 정의
├── templates/
│   ├── base.html         # 기본 레이아웃
│   └── home.html         # 홈 화면
├── run.py                # 실행 파일
└── requirements.txt      # 패키지 목록
```

