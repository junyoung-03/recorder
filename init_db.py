"""데이터베이스 초기화 스크립트"""
from app import create_app, db
from app.models import FinanceRecord, Schedule

app = create_app()

with app.app_context():
    # 모든 테이블 생성
    db.create_all()
    print("데이터베이스 테이블이 생성되었습니다.")
    print("- FinanceRecord 테이블")
    print("- Schedule 테이블")

