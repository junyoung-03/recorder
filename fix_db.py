"""데이터베이스 수정 스크립트 - 누락된 테이블 추가"""
from app import create_app, db
from app.models import FinanceRecord, Schedule
from pathlib import Path

app = create_app()

with app.app_context():
    try:
        # 모든 테이블 생성 (기존 테이블은 유지, 새 테이블만 추가)
        db.create_all()
        
        # 테이블 존재 확인
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        print("현재 데이터베이스 테이블:")
        for table in tables:
            print(f"  - {table}")
        
        # 필요한 테이블 확인
        required_tables = ['finance_records', 'schedules']
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            print(f"\n누락된 테이블: {missing_tables}")
            print("테이블을 생성합니다...")
            db.create_all()
            print("완료!")
        else:
            print("\n모든 테이블이 존재합니다.")
            
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()

