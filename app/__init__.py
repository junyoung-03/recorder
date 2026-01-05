from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from pathlib import Path
import os

db = SQLAlchemy()

def create_app():
    # 프로젝트 루트 디렉토리
    basedir = Path(__file__).parent.parent
    
    # 템플릿 폴더와 정적 파일 폴더 경로 지정
    template_dir = str(basedir / 'templates')
    static_dir = str(basedir / 'static')
    
    app = Flask(__name__, 
                template_folder=template_dir,
                static_folder=static_dir)
    
    # 데이터베이스 설정
    instance_dir = basedir / 'instance'
    instance_dir.mkdir(exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{instance_dir / "database.db"}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    db.init_app(app)
    
    from app import routes, models
    app.register_blueprint(routes.bp)
    
    with app.app_context():
        # 모든 모델의 테이블 생성 (없으면 생성)
        try:
            # 기존 테이블 확인 및 누락된 테이블 생성
            db.create_all()
            # 모든 모델 import 확인
            from app.models import FinanceRecord, Schedule
            print("데이터베이스 테이블 확인 완료")
        except Exception as e:
            print(f"데이터베이스 초기화 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
    return app


