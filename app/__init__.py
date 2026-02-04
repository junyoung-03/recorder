from flask import Flask, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
import os
from dotenv import load_dotenv

# .env 파일 로드 (프로젝트 루트에서)
basedir = Path(__file__).parent.parent
load_dotenv(basedir / '.env')

db = SQLAlchemy()
login_manager = LoginManager()

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
    database_url = os.environ.get('DATABASE_URL') or os.environ.get('SUPABASE_DB_URL')
    if database_url:
        # Supabase Postgres URL 지원 (postgres -> postgresql)
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        if database_url.startswith('postgresql://'):
            parsed = urlparse(database_url)
            query = dict(parse_qsl(parsed.query))
            if 'sslmode' not in query:
                query['sslmode'] = 'require'
            database_url = urlunparse(parsed._replace(query=urlencode(query)))
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                'pool_pre_ping': True,
                'connect_args': {'sslmode': query.get('sslmode', 'require')}
            }
        else:
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
                'pool_pre_ping': True
            }
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{instance_dir / "database.db"}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key'

    # Log DB source without leaking secrets
    print(
        "[startup] db_source=%s DATABASE_URL set=%s SUPABASE_DB_URL set=%s"
        % (
            "postgres" if database_url else "sqlite",
            bool(os.environ.get("DATABASE_URL")),
            bool(os.environ.get("SUPABASE_DB_URL")),
        )
    )
    
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    
    from app import routes, models
    app.register_blueprint(routes.bp)
    
    with app.app_context():
        # 모든 모델의 테이블 생성 (없으면 생성)
        try:
            # 기존 테이블 확인 및 누락된 테이블 생성
            db.create_all()
            # 모든 모델 import 확인
            from app.models import FinanceRecord, Schedule, User, MealRecord, ExercisePlan, ExerciseRecord, Journal, Friendship, Comment, Like, BodyRecord, Todo
            print("데이터베이스 테이블 확인 완료")
        except Exception as e:
            print(f"데이터베이스 초기화 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
    return app


@login_manager.user_loader
def load_user(user_id):
    from app.models import User
    try:
        return User.query.get(int(user_id))
    except (TypeError, ValueError):
        try:
            current_app.logger.warning("Invalid user_id in session: %s", user_id)
        except Exception:
            pass
        return None


