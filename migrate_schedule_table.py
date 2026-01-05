"""Schedule 테이블에 누락된 컬럼 추가"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # 기존 테이블에 컬럼 추가 (없는 경우만)
        with db.engine.connect() as conn:
            # 컬럼 존재 여부 확인 및 추가
            try:
                conn.execute(text("ALTER TABLE schedules ADD COLUMN category VARCHAR(50)"))
                print("category 컬럼 추가 완료")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"category 컬럼 추가 중 오류 (이미 존재할 수 있음): {e}")
            
            try:
                conn.execute(text("ALTER TABLE schedules ADD COLUMN color VARCHAR(20)"))
                print("color 컬럼 추가 완료")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"color 컬럼 추가 중 오류 (이미 존재할 수 있음): {e}")
            
            try:
                conn.execute(text("ALTER TABLE schedules ADD COLUMN repeat_type VARCHAR(20)"))
                print("repeat_type 컬럼 추가 완료")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"repeat_type 컬럼 추가 중 오류 (이미 존재할 수 있음): {e}")
            
            try:
                conn.execute(text("ALTER TABLE schedules ADD COLUMN completed BOOLEAN DEFAULT 0"))
                print("completed 컬럼 추가 완료")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"completed 컬럼 추가 중 오류 (이미 존재할 수 있음): {e}")
            
            conn.commit()
        
        print("\n마이그레이션 완료!")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()

