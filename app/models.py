from app import db
from datetime import datetime, date

class FinanceRecord(db.Model):
    """가계부 기록"""
    __tablename__ = 'finance_records'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    category = db.Column(db.String(100))  # 항목명
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
    """일정"""
    __tablename__ = 'schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    time = db.Column(db.Time)  # 시간 (선택)
    title = db.Column(db.String(200), nullable=False)  # 제목
    memo = db.Column(db.Text)  # 메모/장소
    category = db.Column(db.String(50))  # 카테고리 (업무, 개인, 건강, 공부)
    color = db.Column(db.String(20))  # 색상 태그
    repeat_type = db.Column(db.String(20))  # 반복 여부 (none, weekly, monthly)
    completed = db.Column(db.Boolean, default=False)  # 완료 여부
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

