from app import db
from datetime import datetime, date
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    """User"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    nickname = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    meals = db.relationship('MealRecord', backref='user', lazy=True)
    journals = db.relationship('Journal', backref='user', lazy=True)
    comments = db.relationship('Comment', backref='user', lazy=True)
    likes = db.relationship('Like', backref='user', lazy=True)
    friendships_sent = db.relationship('Friendship', foreign_keys='Friendship.user_id', backref='user', lazy=True)
    friendships_received = db.relationship('Friendship', foreign_keys='Friendship.friend_id', backref='friend', lazy=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Friendship(db.Model):
    """Friendship"""
    __tablename__ = 'friendships'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'friend_id', name='unique_friendship'),
    )

    def __repr__(self):
        return f'<Friendship {self.user_id} -> {self.friend_id} ({self.status})>'

class FinanceRecord(db.Model):
    """Finance record"""
    __tablename__ = 'finance_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    category = db.Column(db.String(100))
    memo = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<FinanceRecord {self.date} {self.transaction_type} {self.amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'category': self.category,
            'memo': self.memo
        }

class Schedule(db.Model):
    """Schedule"""
    __tablename__ = 'schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    time = db.Column(db.Time)  # ?간 (?택)
    title = db.Column(db.String(200), nullable=False)  # ?목
    memo = db.Column(db.Text)  # 메모/?소
    category = db.Column(db.String(50))  # 카테고리 (?무, 개인, 건강, 공?)
    color = db.Column(db.String(20))  # ?상 ?그
    repeat_type = db.Column(db.String(20))  # 반복 ?? (none, weekly, monthly)
    completed = db.Column(db.Boolean, default=False)  # ?료 ??
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Schedule {self.date} {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'time': self.time.strftime('%H:%M') if self.time else None,
            'title': self.title,
            'memo': self.memo,
            'category': self.category,
            'color': self.color,
            'repeat_type': self.repeat_type,
            'completed': self.completed
        }

class ExercisePlan(db.Model):
    """Exercise plan"""
    __tablename__ = 'exercise_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)  # ?동???짜
    body_part = db.Column(db.String(50), nullable=False)  # 부??(?? 가?? ?깨 ??
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ExercisePlan {self.date} {self.body_part}>'

class ExerciseRecord(db.Model):
    """Exercise record"""
    __tablename__ = 'exercise_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    body_part = db.Column(db.String(50), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    sets = db.Column(db.Integer)
    reps = db.Column(db.String(50))
    weight = db.Column(db.String(50))
    total_time = db.Column(db.Integer)
    weight_kg = db.Column(db.Float)
    memo = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ExerciseRecord {self.date} {self.body_part} {self.exercise_name}>'

class BodyRecord(db.Model):
    """Body record"""
    __tablename__ = 'body_records'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    image_path = db.Column(db.String(500))
    memo = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<BodyRecord {self.date} {self.user_id}>'

class Todo(db.Model):
    """Todo"""
    __tablename__ = 'todos'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Todo {self.date} {self.title}>'

class MealRecord(db.Model):
    """Meal record"""
    __tablename__ = 'meal_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    meal_type = db.Column(db.String(20))  # breakfast/lunch/dinner/snack
    food_name = db.Column(db.String(200))
    calories = db.Column(db.Integer)
    image_path = db.Column(db.String(500))
    memo = db.Column(db.Text)
    visibility = db.Column(db.String(20), default='private')  # private, friends, public
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    comments = db.relationship('Comment', backref='meal', lazy=True, cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='meal', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<MealRecord {self.date} {self.meal_type}>'


class Journal(db.Model):
    """Journal"""
    __tablename__ = 'journals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    title = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    visibility = db.Column(db.String(20), default='private')  # private, friends, public
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    comments = db.relationship('Comment', backref='journal', lazy=True, cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='journal', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Journal {self.date} {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'visibility': self.visibility,
            'likes': [like.id for like in self.likes],
            'comments': [comment.id for comment in self.comments]
        }


class JournalCategory(db.Model):
    """Journal category"""
    __tablename__ = 'journal_categories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'name', name='unique_journal_category'),
    )

    def __repr__(self):
        return f'<JournalCategory {self.user_id} {self.name}>'

class Comment(db.Model):
    """Comment"""
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meal_records.id'), nullable=True, index=True)
    journal_id = db.Column(db.Integer, db.ForeignKey('journals.id'), nullable=True, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Like(db.Model):
    """Like"""
    __tablename__ = 'likes'    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meal_records.id'), nullable=True, index=True)
    journal_id = db.Column(db.Integer, db.ForeignKey('journals.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'meal_id', name='unique_like_meal'),
        db.UniqueConstraint('user_id', 'journal_id', name='unique_like_journal'),
    )
