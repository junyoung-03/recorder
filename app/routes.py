from flask import Blueprint, render_template, request, jsonify, redirect, url_for, send_from_directory, flash, current_app, abort
from datetime import date, datetime, timedelta
from calendar import monthrange
import random
import os
import json
from pathlib import Path
from app import db
from app.storage import save_image_to_storage, delete_image_from_storage
from app.models import FinanceRecord, Schedule, ExercisePlan, ExerciseRecord, MealRecord, User, Journal, Friendship, Comment, Like, BodyRecord, Todo, JournalCategory
from sqlalchemy import or_, and_
from flask_login import login_user, logout_user, login_required, current_user

bp = Blueprint('main', __name__)

# ===== Shared helpers / serialization =====

@bp.route('/assets/<path:filename>')
def react_assets(filename):
    dist_dir = Path(current_app.root_path).parent / 'static' / 'dist' / 'assets'
    return send_from_directory(dist_dir, filename)


def get_current_user_payload():
    if current_user.is_authenticated:
        return {
            'isAuthenticated': True,
            'id': current_user.id,
            'username': current_user.username,
            'nickname': current_user.nickname
        }
    return {'isAuthenticated': False}


def get_react_assets():
    manifest_path = Path(current_app.root_path).parent / 'static' / 'dist' / '.vite' / 'manifest.json'
    if not manifest_path.exists():
        return [], []
    with open(manifest_path, 'r', encoding='utf-8') as handle:
        manifest = json.load(handle)
    entry = manifest.get('src/main.jsx') or manifest.get('index.html')
    if not entry:
        return [], []
    js_files = [entry['file']]
    css_files = entry.get('css', [])
    return js_files, css_files


def render_react(page, props=None, active_path=None):
    js_files, css_files = get_react_assets()
    initial_data = {
        'page': page,
        'props': props or {},
        'currentUser': get_current_user_payload(),
        'activePath': active_path or request.path
    }
    return render_template('react_index.html', initial_data=initial_data, js_files=js_files, css_files=css_files)


def serialize_calendar(calendar):
    serialized = []
    for week in calendar:
        week_items = []
        for day in week:
            if not day:
                week_items.append(None)
            else:
                week_items.append({**day, 'date': day['date'].isoformat()})
        serialized.append(week_items)
    return serialized


def serialize_user(user):
    return {'id': user.id, 'username': user.username, 'nickname': user.nickname}


def serialize_schedule(schedule):
    return schedule.to_dict()


def serialize_todo(todo):
    return {
        'id': todo.id,
        'date': todo.date.isoformat(),
        'title': todo.title,
        'completed': todo.completed
    }


def serialize_todo_cards(cards):
    return [
        {
            'date': card['date'].isoformat(),
            'todos': [serialize_todo(todo) for todo in card.get('todos', [])]
        }
        for card in cards
    ]


def serialize_exercise_record(record):
    return {
        'id': record.id,
        'date': record.date.isoformat(),
        'body_part': record.body_part,
        'memo': record.memo
    }


def serialize_exercise_cards(cards):
    return [
        {
            'date': card['date'].isoformat(),
            'records': [serialize_exercise_record(record) for record in card.get('records', [])]
        }
        for card in cards
    ]


def serialize_body_record(record):
    image_url = record.image_path if record.image_path and record.image_path.startswith('http') else None
    return {
        'id': record.id,
        'date': record.date.isoformat(),
        'image_path': record.image_path,
        'imageUrl': image_url,
        'memo': record.memo
    }


def serialize_meal_comment(comment, can_delete):
    return {
        'id': comment.id,
        'content': comment.content,
        'user': serialize_user(comment.user),
        'canDelete': can_delete
    }


def serialize_meal(meal, liked=False, can_delete_comment_ids=None):
    can_delete_comment_ids = can_delete_comment_ids or set()
    image_url = meal.image_path if meal.image_path and meal.image_path.startswith('http') else None
    return {
        'id': meal.id,
        'date': meal.date.isoformat(),
        'meal_type': meal.meal_type,
        'food_name': meal.food_name,
        'calories': meal.calories,
        'image_path': meal.image_path,
        'imageUrl': image_url,
        'memo': meal.memo,
        'visibility': meal.visibility,
        'likes': [like.id for like in meal.likes],
        'comments': [
            serialize_meal_comment(comment, comment.id in can_delete_comment_ids)
            for comment in sorted(meal.comments, key=lambda c: c.created_at)
        ],
        'liked': liked
    }


def serialize_journal_comment(comment, can_delete):
    return {
        'id': comment.id,
        'content': comment.content,
        'user': serialize_user(comment.user),
        'canDelete': can_delete
    }


def serialize_journal(journal, can_delete_comment_ids=None):
    can_delete_comment_ids = can_delete_comment_ids or set()
    return {
        'id': journal.id,
        'date': journal.date.isoformat(),
        'title': journal.title,
        'content': journal.content,
        'category': journal.category,
        'visibility': journal.visibility,
        'likes': [like.id for like in journal.likes],
        'comments': [
            serialize_journal_comment(comment, comment.id in can_delete_comment_ids)
            for comment in sorted(journal.comments, key=lambda c: c.created_at)
        ]
    }


def serialize_journal_category(category):
    return {
        'id': category.id,
        'name': category.name
    }


def ensure_default_journal_categories(user_id):
    categories = JournalCategory.query.filter(
        JournalCategory.user_id == user_id
    ).order_by(JournalCategory.created_at.asc()).all()
    if categories:
        return categories
    # No auto-created defaults; uncategorized handled in UI.
    return categories


def build_journal_category_counts(journals):
    counts = {}
    for journal in journals:
        name = journal.category
        if not name:
            counts['__uncategorized'] = counts.get('__uncategorized', 0) + 1
            continue
        counts[name] = counts.get(name, 0) + 1
    return counts

def build_todo_cards(user_id, base_date, limit=4):
    """해야 할일 카드 데이터 생성 (오늘 기준: -2, -1, 오늘, +1)"""
    if not base_date:
        base_date = date.today()

    target_dates = [
        base_date - timedelta(days=2),
        base_date - timedelta(days=1),
        base_date,
        base_date + timedelta(days=1)
    ]
    target_dates = target_dates[:limit]

    start_date = min(target_dates)
    end_date = max(target_dates)

    todos = Todo.query.filter(
        Todo.user_id == user_id,
        Todo.date >= start_date,
        Todo.date <= end_date
    ).order_by(Todo.date.asc(), Todo.created_at.desc()).all()

    grouped = {}
    for todo in todos:
        grouped.setdefault(todo.date, []).append(todo)

    cards = []
    for target_date in target_dates:
        cards.append({'date': target_date, 'todos': grouped.get(target_date, [])})

    return cards


def build_exercise_cards(user_id, base_date):
    """운동 기록 카드 데이터 생성 (그저께/어제/오늘/내일)"""
    if not base_date:
        base_date = date.today()

    target_dates = [
        base_date - timedelta(days=2),
        base_date - timedelta(days=1),
        base_date,
        base_date + timedelta(days=1)
    ]

    start_date = min(target_dates)
    end_date = max(target_dates)

    records = ExerciseRecord.query.filter(
        ExerciseRecord.user_id == user_id,
        ExerciseRecord.date >= start_date,
        ExerciseRecord.date <= end_date
    ).order_by(ExerciseRecord.date.asc(), ExerciseRecord.created_at.desc()).all()

    grouped = {}
    for record in records:
        grouped.setdefault(record.date, []).append(record)

    labels = ['그저께', '어제', '오늘', '내일']
    cards = []
    for idx, target_date in enumerate(target_dates):
        cards.append({
            'label': labels[idx],
            'date': target_date,
            'records': grouped.get(target_date, [])
        })

    return cards

def get_calendar_data(year, month, finance_data):
    """캘린더 데이터 생성"""
    first_day = date(year, month, 1)
    last_day_num = monthrange(year, month)[1]
    
    # 첫 날의 요일 (0=월요일, 6=일요일)
    first_weekday = first_day.weekday()
    
    calendar = []
    week = []
    
    # 첫 주의 빈 칸 채우기
    for _ in range(first_weekday):
        week.append(None)
    
    # 날짜 채우기
    for day in range(1, last_day_num + 1):
        current_date = date(year, month, day)
        day_finance = finance_data.get(day, {'income': 0, 'expense': 0})
        week.append({
            'day': day,
            'date': current_date,
            'income': day_finance['income'],
            'expense': day_finance['expense'],
            'net': day_finance['income'] - day_finance['expense']
        })
        
        if len(week) == 7:
            calendar.append(week)
            week = []
    
    # 마지막 주 빈 칸 채우기
    if week:
        while len(week) < 7:
            week.append(None)
        calendar.append(week)
    
    return calendar


# ===== Auth =====
@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            next_url = request.args.get('next')
            return redirect(next_url or url_for('main.home'))

        error = '아이디 또는 비밀번호가 올바르지 않습니다.'

    return render_react('login', {'error': error}, active_path='/login')


@bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        password_confirm = request.form.get('password_confirm', '')
        nickname = request.form.get('nickname', '').strip()

        if not username or not password:
            error = '아이디와 비밀번호는 필수입니다.'
        elif password != password_confirm:
            error = '비밀번호가 일치하지 않습니다.'
        elif User.query.filter_by(username=username).first():
            error = '이미 사용 중인 아이디입니다.'
        else:
            new_user = User(username=username, nickname=nickname or None)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            login_user(new_user)
            return redirect(url_for('main.home'))

    return render_react('register', {'error': error}, active_path='/register')


@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))

# ===== Home =====
@bp.route('/')
@login_required
def home():
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # 요일 이름 (한글)
    weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
    weekday_name = weekdays[today.weekday()]
    
    # 홈 캘린더: 가계부 연동/표시 없음
    finance_data = {}
    total_income = 0
    total_expense = 0
    total_net = 0
    
    # 캘린더 데이터 생성
    calendar = get_calendar_data(current_year, current_month, finance_data)

    # 일정 표시용 (홈 캘린더)
    start_date = date(current_year, current_month, 1)
    last_day = monthrange(current_year, current_month)[1]
    end_date = date(current_year, current_month, last_day)
    schedules = Schedule.query.filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= start_date,
        Schedule.date <= end_date
    ).all()
    schedule_count = {}
    schedule_titles = {}
    for schedule in schedules:
        day = schedule.date.day
        schedule_count[day] = schedule_count.get(day, 0) + 1
        if day not in schedule_titles:
            schedule_titles[day] = []
        schedule_titles[day].append(schedule.title)

    # 오늘 일정
    today_schedules = Schedule.query.filter(
        Schedule.user_id == current_user.id,
        Schedule.date == today
    ).all()
    from datetime import time as dt_time
    today_schedules.sort(key=lambda s: (s.time is None, s.time or dt_time(23, 59, 59), s.created_at or datetime.min))
    
    # 오늘 날짜 포맷 (5일 형식)
    today_formatted = f"{today.day}일"
    
    today_todos = Todo.query.filter(
        Todo.user_id == current_user.id,
        Todo.date == today
    ).order_by(Todo.created_at.desc()).all()

    return render_react('home', {
        'currentYear': current_year,
        'currentMonth': current_month,
        'today': today.isoformat(),
        'todayFormatted': today_formatted,
        'weekdayName': weekday_name,
        'calendar': serialize_calendar(calendar),
        'totalIncome': total_income,
        'totalExpense': total_expense,
        'totalNet': total_net,
        'scheduleCount': schedule_count,
        'scheduleTitles': schedule_titles,
        'todaySchedules': [serialize_schedule(schedule) for schedule in today_schedules],
        'todayTodos': [serialize_todo(todo) for todo in today_todos]
    }, active_path='/')

def get_finance_data_from_db(year, month):
    """데이터베이스에서 가계부 데이터 가져오기"""
    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    
    records = FinanceRecord.query.filter(
        FinanceRecord.user_id == current_user.id,
        FinanceRecord.date >= start_date,
        FinanceRecord.date <= end_date
    ).all()
    
    finance_data = {}
    for record in records:
        day = record.date.day
        if day not in finance_data:
            finance_data[day] = {'income': 0, 'expense': 0}
        
        if record.transaction_type == 'income':
            finance_data[day]['income'] += record.amount
        else:
            finance_data[day]['expense'] += record.amount
    
    return finance_data

def get_calendar_data_from_db(year, month):
    """데이터베이스에서 캘린더 데이터 생성"""
    finance_data = get_finance_data_from_db(year, month)
    return get_calendar_data(year, month, finance_data)

# ===== Finance =====
@bp.route('/finance')
@login_required
def finance():
    """가계부 페이지"""
    today = date.today()
    current_year = today.year
    current_month = today.month
    year_param = request.args.get('year')
    month_param = request.args.get('month')
    view_mode = request.args.get('view', 'latest')

    try:
        if year_param:
            current_year = int(year_param)
        if month_param:
            current_month = int(month_param)
    except ValueError:
        current_year = today.year
        current_month = today.month
    
    # 선택된 날짜 (쿼리 파라미터에서 가져오기)
    selected_date = request.args.get('date')
    if selected_date:
        try:
            selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
        except:
            selected_date = today
    else:
        selected_date = today
    if not year_param and not month_param and selected_date:
        current_year = selected_date.year
        current_month = selected_date.month
    
    # 캘린더 데이터
    calendar = get_calendar_data_from_db(current_year, current_month)
    
    # 월간 요약
    finance_data = get_finance_data_from_db(current_year, current_month)
    total_income = sum(data['income'] for data in finance_data.values())
    total_expense = sum(data['expense'] for data in finance_data.values())
    total_net = total_income - total_expense
    days_in_month = monthrange(current_year, current_month)[1]
    monthly_avg_expense = total_expense / days_in_month if days_in_month > 0 else 0

    prev_year = current_year
    prev_month = current_month - 1
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
    prev_start = date(prev_year, prev_month, 1)
    prev_last_day = monthrange(prev_year, prev_month)[1]
    prev_end = date(prev_year, prev_month, prev_last_day)
    prev_records = FinanceRecord.query.filter(
        FinanceRecord.user_id == current_user.id,
        FinanceRecord.date >= prev_start,
        FinanceRecord.date <= prev_end,
        FinanceRecord.transaction_type == 'expense'
    ).all()
    prev_total_expense = sum(record.amount for record in prev_records)
    month_over_month_diff = total_expense - prev_total_expense
    month_over_month_rate = (month_over_month_diff / prev_total_expense * 100) if prev_total_expense > 0 else None

    prev_top_categories = db.session.query(
        FinanceRecord.category,
        db.func.sum(FinanceRecord.amount)
    ).filter(
        FinanceRecord.user_id == current_user.id,
        FinanceRecord.date >= prev_start,
        FinanceRecord.date <= prev_end,
        FinanceRecord.transaction_type == 'expense'
    ).group_by(FinanceRecord.category).order_by(
        db.func.sum(FinanceRecord.amount).desc()
    ).limit(3).all()
    prev_top_categories = [
        {'category': category or '미분류', 'total': total}
        for category, total in prev_top_categories
    ]
    
    # 거래 내역 (선택된 날짜 / 전체 월 / 최신 5개)
    records = []
    if selected_date and selected_date.year == current_year and selected_date.month == current_month and view_mode != 'latest':
        records = FinanceRecord.query.filter(
            FinanceRecord.user_id == current_user.id,
            FinanceRecord.date == selected_date
        ).order_by(FinanceRecord.created_at.desc()).all()
    elif view_mode == 'month':
        start_date = date(current_year, current_month, 1)
        last_day = monthrange(current_year, current_month)[1]
        end_date = date(current_year, current_month, last_day)
        records = FinanceRecord.query.filter(
            FinanceRecord.user_id == current_user.id,
            FinanceRecord.date >= start_date,
            FinanceRecord.date <= end_date
        ).order_by(FinanceRecord.date.desc(), FinanceRecord.created_at.desc()).all()
    else:
        records = FinanceRecord.query.filter(
            FinanceRecord.user_id == current_user.id
        ).order_by(FinanceRecord.date.desc(), FinanceRecord.created_at.desc()).limit(5).all()
    
    # 통계 데이터 (현재 표시되는 거래 내역 기준)
    expense_records = [record for record in records if record.transaction_type == 'expense']
    days_with_expense = len({record.date for record in expense_records})
    avg_daily_expense = (
        sum(record.amount for record in expense_records) / days_with_expense
        if days_with_expense > 0
        else 0
    )
    income_count = len([record for record in records if record.transaction_type == 'income'])
    expense_count = len(expense_records)
    
    return render_react('finance', {
        'currentYear': current_year,
        'currentMonth': current_month,
        'today': today.isoformat(),
        'selectedDate': selected_date.isoformat(),
        'calendar': serialize_calendar(calendar),
        'totalIncome': total_income,
        'totalExpense': total_expense,
        'totalNet': total_net,
        'records': [record.to_dict() for record in records],
        'daysWithExpense': days_with_expense,
        'avgDailyExpense': avg_daily_expense,
        'monthlyAvgExpense': monthly_avg_expense,
        'prevMonthExpense': prev_total_expense,
        'monthOverMonthDiff': month_over_month_diff,
        'monthOverMonthRate': month_over_month_rate,
        'prevTopCategories': prev_top_categories,
        'incomeCount': income_count,
        'expenseCount': expense_count,
        'viewMode': view_mode
    }, active_path='/finance')


@bp.route('/finance/records')
@login_required
def finance_records():
    """거래 내역 JSON (AJAX용)"""
    today = date.today()
    current_year = today.year
    current_month = today.month
    view_mode = request.args.get('view', 'latest')
    year_param = request.args.get('year')
    month_param = request.args.get('month')

    try:
        if year_param:
            current_year = int(year_param)
        if month_param:
            current_month = int(month_param)
    except ValueError:
        current_year = today.year
        current_month = today.month

    records = []
    if view_mode == 'month':
        start_date = date(current_year, current_month, 1)
        last_day = monthrange(current_year, current_month)[1]
        end_date = date(current_year, current_month, last_day)
        records = FinanceRecord.query.filter(
            FinanceRecord.user_id == current_user.id,
            FinanceRecord.date >= start_date,
            FinanceRecord.date <= end_date
        ).order_by(FinanceRecord.date.desc(), FinanceRecord.created_at.desc()).all()
    else:
        records = FinanceRecord.query.filter(
            FinanceRecord.user_id == current_user.id
        ).order_by(FinanceRecord.date.desc(), FinanceRecord.created_at.desc()).limit(5).all()

    record_list = [{
        'id': r.id,
        'date': r.date.strftime('%m/%d'),
        'transaction_type': r.transaction_type,
        'category': r.category,
        'amount': int(round(r.amount)),
        'memo': r.memo or '—'
    } for r in records]

    income_count = len([r for r in records if r.transaction_type == 'income'])
    expense_count = len([r for r in records if r.transaction_type == 'expense'])

    return jsonify({
        'view_mode': view_mode,
        'current_year': current_year,
        'current_month': current_month,
        'records': record_list,
        'records_count': len(records),
        'income_count': income_count,
        'expense_count': expense_count
    })


@bp.route('/finance/month')
@login_required
def finance_month():
    """가계부 월별 보기 (카드형)"""
    today = date.today()
    year_param = request.args.get('year')
    month_param = request.args.get('month')

    try:
        year = int(year_param) if year_param else today.year
        month = int(month_param) if month_param else today.month
        if month < 1 or month > 12:
            month = today.month
    except ValueError:
        year = today.year
        month = today.month

    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    records = FinanceRecord.query.filter(
        FinanceRecord.user_id == current_user.id,
        FinanceRecord.date >= start_date,
        FinanceRecord.date <= end_date
    ).order_by(FinanceRecord.date.asc(), FinanceRecord.created_at.desc()).all()

    grouped = {}
    for record in records:
        grouped.setdefault(record.date, []).append(record)

    cards = []
    for day in range(1, last_day + 1):
        card_date = date(year, month, day)
        cards.append({'date': card_date, 'records': grouped.get(card_date, [])})

    year_options = list(range(today.year - 5, today.year + 2))
    serialized_cards = [
        {
            'date': card['date'].isoformat(),
            'records': [record.to_dict() for record in card['records']]
        }
        for card in cards
    ]
    return render_react('financeMonth', {
        'currentYear': year,
        'currentMonth': month,
        'yearOptions': year_options,
        'cards': serialized_cards
    }, active_path='/finance')

@bp.route('/finance/add', methods=['POST'])
@login_required
def add_finance():
    """거래 추가"""
    try:
        transaction_type = request.form.get('transaction_type')
        category = request.form.get('category', '')
        amount = float(request.form.get('amount', 0))
        record_date = request.form.get('date', date.today().isoformat())
        memo = request.form.get('memo', '')
        
        record = FinanceRecord(
            user_id=current_user.id,
            date=datetime.strptime(record_date, '%Y-%m-%d').date(),
            amount=amount,
            transaction_type=transaction_type,
            category=category,
            memo=memo
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '거래가 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/finance/delete/<int:record_id>', methods=['DELETE'])
@login_required
def delete_finance(record_id):
    """거래 삭제"""
    try:
        record = FinanceRecord.query.filter(
            FinanceRecord.id == record_id,
            FinanceRecord.user_id == current_user.id
        ).first_or_404()
        db.session.delete(record)
        db.session.commit()
        return jsonify({'success': True, 'message': '거래가 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/finance/update/<int:record_id>', methods=['PUT'])
@login_required
def update_finance(record_id):
    """거래 수정"""
    try:
        record = FinanceRecord.query.filter(
            FinanceRecord.id == record_id,
            FinanceRecord.user_id == current_user.id
        ).first_or_404()
        data = request.get_json()
        
        record.category = data.get('category', record.category)
        record.amount = float(data.get('amount', record.amount))
        record.transaction_type = data.get('transaction_type', record.transaction_type)
        record.memo = data.get('memo', record.memo)
        if 'date' in data:
            record.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        db.session.commit()
        return jsonify({'success': True, 'message': '거래가 수정되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@bp.route('/finance/detail/<int:record_id>')
@login_required
def finance_detail(record_id):
    """거래 상세"""
    record = FinanceRecord.query.filter(
        FinanceRecord.id == record_id,
        FinanceRecord.user_id == current_user.id
    ).first_or_404()
    return jsonify(record.to_dict())

def get_schedule_calendar_data(year, month):
    """일정 캘린더 데이터 생성"""
    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    
    # 일정이 있는 날짜 조회
    schedules = Schedule.query.filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= start_date,
        Schedule.date <= end_date
    ).all()
    
    # 날짜별 일정 개수/제목
    schedule_count = {}
    schedule_titles = {}
    for schedule in schedules:
        day = schedule.date.day
        if day not in schedule_count:
            schedule_count[day] = 0
        schedule_count[day] += 1
        if day not in schedule_titles:
            schedule_titles[day] = []
        schedule_titles[day].append(schedule.title)
    
    # 캘린더 구조 생성
    first_day = date(year, month, 1)
    first_weekday = first_day.weekday()
    calendar = []
    week = []
    
    # 첫 주의 빈 칸 채우기
    for _ in range(first_weekday):
        week.append(None)
    
    # 날짜 채우기
    for day in range(1, last_day + 1):
        current_date = date(year, month, day)
        week.append({
            'day': day,
            'date': current_date,
            'has_schedule': day in schedule_count,
            'schedule_count': schedule_count.get(day, 0),
            'titles': schedule_titles.get(day, [])
        })
        
        if len(week) == 7:
            calendar.append(week)
            week = []
    
    # 마지막 주 빈 칸 채우기
    if week:
        while len(week) < 7:
            week.append(None)
        calendar.append(week)
    
    return calendar

# ===== Schedule =====
@bp.route('/schedule')
@login_required
def schedule():
    """일정 페이지"""
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # 선택된 날짜 (쿼리 파라미터에서 가져오기)
    selected_date = request.args.get('date')
    if selected_date:
        try:
            selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
        except:
            selected_date = today
    else:
        selected_date = today
    
    # 캘린더 데이터
    calendar = get_schedule_calendar_data(current_year, current_month)
    
    # 선택된 날짜의 일정 목록
    selected_schedules = Schedule.query.filter(
        Schedule.user_id == current_user.id,
        Schedule.date == selected_date
    ).all()
    
    # 시간이 있는 것 먼저, 그 다음 시간 순으로 정렬
    from datetime import time as dt_time
    selected_schedules.sort(key=lambda s: (s.time is None, s.time or dt_time(23, 59, 59), s.created_at or datetime.min))
    
    # 이번 달 전체 일정 목록 (날짜별로 그룹화)
    start_date = date(current_year, current_month, 1)
    last_day = monthrange(current_year, current_month)[1]
    end_date = date(current_year, current_month, last_day)
    
    all_schedules = Schedule.query.filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= start_date,
        Schedule.date <= end_date
    ).order_by(Schedule.date.asc(), Schedule.time.asc()).all()
    
    # 날짜별로 그룹화 (정렬된 리스트로 변환)
    schedules_by_date = {}
    for schedule in all_schedules:
        date_key = schedule.date.isoformat()
        if date_key not in schedules_by_date:
            schedules_by_date[date_key] = []
        schedules_by_date[date_key].append(schedule)
    
    # 날짜 순으로 정렬된 리스트로 변환
    schedules_by_date_list = sorted(schedules_by_date.items())
    
    # 요일 이름
    weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
    weekday_name = weekdays[selected_date.weekday()]
    
    todo_cards = build_todo_cards(current_user.id, today, 4)

    serialized_schedules_by_date = [
        [date_str, [serialize_schedule(schedule) for schedule in day_schedules]]
        for date_str, day_schedules in schedules_by_date_list
    ]
    return render_react('schedule', {
        'currentYear': current_year,
        'currentMonth': current_month,
        'today': today.isoformat(),
        'selectedDate': selected_date.isoformat(),
        'weekdayName': weekday_name,
        'calendar': serialize_calendar(calendar),
        'schedules': [serialize_schedule(schedule) for schedule in selected_schedules],
        'schedulesByDateList': serialized_schedules_by_date,
        'todoCards': serialize_todo_cards(todo_cards)
    }, active_path='/schedule')

@bp.route('/schedule/add', methods=['POST'])
@login_required
def add_schedule():
    """일정 추가"""
    try:
        title = request.form.get('title', '')
        schedule_date = request.form.get('date', date.today().isoformat())
        time_str = request.form.get('time', '')
        memo = request.form.get('memo', '')
        category = request.form.get('category', '')
        color = request.form.get('color', '#2563EB')
        repeat_type = request.form.get('repeat_type', 'none')
        
        schedule = Schedule(
            user_id=current_user.id,
            date=datetime.strptime(schedule_date, '%Y-%m-%d').date(),
            time=datetime.strptime(time_str, '%H:%M').time() if time_str else None,
            title=title,
            memo=memo,
            category=category,
            color=color,
            repeat_type=repeat_type
        )
        
        db.session.add(schedule)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '일정이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/schedule/delete/<int:schedule_id>', methods=['DELETE'])
@login_required
def delete_schedule(schedule_id):
    """일정 삭제"""
    try:
        schedule = Schedule.query.filter(
            Schedule.id == schedule_id,
            Schedule.user_id == current_user.id
        ).first_or_404()
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': '일정이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/schedule/update/<int:schedule_id>', methods=['PUT'])
@login_required
def update_schedule(schedule_id):
    """일정 수정"""
    try:
        schedule = Schedule.query.filter(
            Schedule.id == schedule_id,
            Schedule.user_id == current_user.id
        ).first_or_404()
        data = request.get_json()
        
        schedule.title = data.get('title', schedule.title)
        schedule.memo = data.get('memo', schedule.memo)
        schedule.category = data.get('category', schedule.category)
        schedule.color = data.get('color', schedule.color)
        if 'date' in data:
            schedule.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'time' in data and data['time']:
            schedule.time = datetime.strptime(data['time'], '%H:%M').time()
        if 'completed' in data:
            schedule.completed = data['completed']
        
        db.session.commit()
        return jsonify({'success': True, 'message': '일정이 수정되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/schedule/detail/<int:schedule_id>')
@login_required
def schedule_detail(schedule_id):
    """일정 상세 정보"""
    schedule = Schedule.query.filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first_or_404()
    return jsonify(schedule.to_dict())


# ===== Todos =====
@bp.route('/todos/month')
@login_required
def todos_month():
    """해야 할일 월별 보기"""
    today = date.today()
    year_param = request.args.get('year')
    month_param = request.args.get('month')

    try:
        year = int(year_param) if year_param else today.year
        month = int(month_param) if month_param else today.month
        if month < 1 or month > 12:
            month = today.month
    except ValueError:
        year = today.year
        month = today.month

    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    todos = Todo.query.filter(
        Todo.user_id == current_user.id,
        Todo.date >= start_date,
        Todo.date <= end_date
    ).order_by(Todo.date.asc(), Todo.created_at.desc()).all()

    grouped = {}
    for todo in todos:
        grouped.setdefault(todo.date, []).append(todo)

    cards = []
    for day in range(1, last_day + 1):
        card_date = date(year, month, day)
        cards.append({'date': card_date, 'todos': grouped.get(card_date, [])})

    year_options = list(range(today.year - 5, today.year + 2))
    return render_react('todosMonth', {
        'currentYear': year,
        'currentMonth': month,
        'yearOptions': year_options,
        'cards': serialize_todo_cards(cards)
    }, active_path='/schedule')


@bp.route('/todos/add', methods=['POST'])
@login_required
def add_todo():
    """해야 할일 추가"""
    try:
        title = request.form.get('title', '').strip()
        todo_date = request.form.get('date', date.today().isoformat())
        if not title:
            return jsonify({'success': False, 'message': '제목을 입력해주세요.'}), 400

        todo = Todo(
            user_id=current_user.id,
            date=datetime.strptime(todo_date, '%Y-%m-%d').date(),
            title=title
        )
        db.session.add(todo)
        db.session.commit()
        return jsonify({'success': True, 'message': '할 일이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@bp.route('/todos/toggle/<int:todo_id>', methods=['POST'])
@login_required
def toggle_todo(todo_id):
    """해야 할일 완료 토글"""
    todo = Todo.query.filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first_or_404()
    todo.completed = not todo.completed
    db.session.commit()
    return jsonify({'success': True})


@bp.route('/todos/delete/<int:todo_id>', methods=['DELETE'])
@login_required
def delete_todo(todo_id):
    """해야 할일 삭제"""
    try:
        todo = Todo.query.filter(
            Todo.id == todo_id,
            Todo.user_id == current_user.id
        ).first_or_404()
        db.session.delete(todo)
        db.session.commit()
        return jsonify({'success': True, 'message': '할 일이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

# 파일 업로드 설정
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MEAL_UPLOAD_FOLDER = Path(__file__).parent.parent / 'static' / 'uploads' / 'meals'
BODY_UPLOAD_FOLDER = Path(__file__).parent.parent / 'static' / 'uploads' / 'body'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def can_view_meal(meal: MealRecord) -> bool:
    if meal.user_id == current_user.id:
        return True
    if meal.visibility == 'public':
        return True
    if meal.visibility == 'friends':
        return is_friend(current_user.id, meal.user_id)
    return False

def can_view_journal(journal: Journal) -> bool:
    if journal.user_id == current_user.id:
        return True
    if journal.visibility == 'public':
        return True
    if journal.visibility == 'friends':
        return is_friend(current_user.id, journal.user_id)
    return False

def get_friend_ids(user_id: int):
    """친구 목록 (accepted)"""
    relationships = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == user_id, Friendship.status == 'accepted'),
            and_(Friendship.friend_id == user_id, Friendship.status == 'accepted')
        )
    ).all()

    friend_ids = set()
    for rel in relationships:
        if rel.user_id == user_id:
            friend_ids.add(rel.friend_id)
        else:
            friend_ids.add(rel.user_id)
    return list(friend_ids)


def is_friend(user_id: int, target_id: int) -> bool:
    """친구 관계 여부"""
    return target_id in get_friend_ids(user_id)


def can_view_friend_content(friend_id: int) -> bool:
    """친구 전용 화면 접근 권한"""
    return is_friend(current_user.id, friend_id)


def ensure_friend_access(friend_id: int) -> None:

# ===== Auth =====
    """친구 전용 화면 권한 검사"""
    if not can_view_friend_content(friend_id):
        abort(403)


def get_friends_list(user_id: int):
    """친구 목록 상세"""
    friend_ids = get_friend_ids(user_id)
    if not friend_ids:
        return []
    return User.query.filter(User.id.in_(friend_ids)).order_by(User.nickname.asc(), User.username.asc()).all()

# ===== Meals (Social) =====
@bp.route('/meals')
@login_required
def meals():
    """식단 페이지"""
    return redirect(url_for('main.exercise'))


# ===== Media Access =====
@bp.route('/media/meals/<int:meal_id>')
@login_required
def meal_image(meal_id):
    """식단 이미지 접근 (권한 체크)"""
    meal = MealRecord.query.filter(
        MealRecord.id == meal_id
    ).first_or_404()
    if not can_view_meal(meal):
        return ('', 403)
    if not meal.image_path:
        return ('', 404)
    if meal.image_path.startswith('http'):
        return redirect(meal.image_path)
    image_file = Path(__file__).parent.parent / 'static' / meal.image_path
    if not image_file.exists():
        return ('', 404)
    return send_from_directory(str(image_file.parent), image_file.name)


@bp.route('/media/body/<int:record_id>')
@login_required
def body_image(record_id):
    """몸 기록 이미지 접근"""
    record = BodyRecord.query.filter(
        BodyRecord.id == record_id,
        BodyRecord.user_id == current_user.id
    ).first_or_404()
    if not record.image_path:
        return ('', 404)
    if record.image_path.startswith('http'):
        return redirect(record.image_path)
    image_file = Path(__file__).parent.parent / 'static' / record.image_path
    if not image_file.exists():
        return ('', 404)
    return send_from_directory(str(image_file.parent), image_file.name)


@bp.route('/meals/<int:meal_id>/like', methods=['POST'])
@login_required
def toggle_meal_like(meal_id):
    """식단 좋아요 토글"""
    meal = MealRecord.query.filter(MealRecord.id == meal_id).first_or_404()
    if not can_view_meal(meal):
        return ('', 403)
    existing = Like.query.filter(
        Like.user_id == current_user.id,
        Like.meal_id == meal_id
    ).first()
    if existing:
        db.session.delete(existing)
    else:
        db.session.add(Like(user_id=current_user.id, meal_id=meal_id))
    db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.meals')
    return redirect(next_url)


@bp.route('/meals/<int:meal_id>/comment', methods=['POST'])
@login_required
def add_meal_comment(meal_id):
    """식단 댓글 추가"""
    meal = MealRecord.query.filter(MealRecord.id == meal_id).first_or_404()
    if not can_view_meal(meal):
        return ('', 403)
    content = request.form.get('content', '').strip()
    if content:
        db.session.add(Comment(user_id=current_user.id, meal_id=meal_id, content=content))
        db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.meals')
    return redirect(next_url)


@bp.route('/meals/comments/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_meal_comment(comment_id):
    """식단 댓글 삭제"""
    comment = Comment.query.filter(
        Comment.id == comment_id,
        Comment.meal_id.isnot(None)
    ).first_or_404()
    meal = MealRecord.query.filter(MealRecord.id == comment.meal_id).first_or_404()
    if comment.user_id != current_user.id and meal.user_id != current_user.id:
        return ('', 403)
    db.session.delete(comment)
    db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.meals')
    return redirect(next_url)


# ===== Journal (Social) =====
@bp.route('/journal')
@login_required
def journal_list():
    """일기 목록"""
    categories = ensure_default_journal_categories(current_user.id)
    journals = Journal.query.filter(
        Journal.user_id == current_user.id
    ).order_by(Journal.date.desc(), Journal.created_at.desc()).all()
    category_counts = build_journal_category_counts(journals)

    friends_list = get_friends_list(current_user.id)
    return render_react('journalList', {
        'journals': [journal.to_dict() for journal in journals],
        'friendsList': [serialize_user(friend) for friend in friends_list],
        'categories': [serialize_journal_category(category) for category in categories],
        'categoryCounts': category_counts
    }, active_path='/journal')


@bp.route('/journal/new', methods=['GET', 'POST'])
@login_required
def journal_new():
    """일기 작성"""
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        category = request.form.get('category', '').strip() or None
        journal_date = request.form.get('date', '').strip()
        visibility = request.form.get('visibility', 'private')

        if not content:
            return render_react('journalForm', {'error': '내용은 필수입니다.', 'journal': None}, active_path='/journal')

        try:
            parsed_date = datetime.strptime(journal_date, '%Y-%m-%d').date() if journal_date else date.today()
        except ValueError:
            parsed_date = date.today()

        journal = Journal(
            user_id=current_user.id,
            date=parsed_date,
            title=title or None,
            content=content,
            category=category,
            visibility=visibility
        )
        db.session.add(journal)
        db.session.commit()
        return redirect(url_for('main.journal_list'))

    categories = ensure_default_journal_categories(current_user.id)
    return render_react('journalForm', {
        'journal': None,
        'categories': [serialize_journal_category(category) for category in categories]
    }, active_path='/journal')


@bp.route('/journal/<int:journal_id>')
@login_required
def journal_detail(journal_id):
    """일기 상세"""
    categories = ensure_default_journal_categories(current_user.id)
    journal = Journal.query.filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first_or_404()
    liked = Like.query.filter(
        Like.user_id == current_user.id,
        Like.journal_id == journal.id
    ).first() is not None
    can_delete_comment_ids = {
        comment.id
        for comment in journal.comments
        if comment.user_id == current_user.id or journal.user_id == current_user.id
    }
    journals = Journal.query.filter(
        Journal.user_id == current_user.id
    ).order_by(Journal.date.desc(), Journal.created_at.desc()).all()
    category_counts = build_journal_category_counts(journals)
    friends_list = get_friends_list(current_user.id)
    return render_react('journalDetail', {
        'journal': serialize_journal(journal, can_delete_comment_ids=can_delete_comment_ids),
        'liked': liked,
        'journals': [entry.to_dict() for entry in journals],
        'friendsList': [serialize_user(friend) for friend in friends_list],
        'categories': [serialize_journal_category(category) for category in categories],
        'categoryCounts': category_counts
    }, active_path='/journal')


@bp.route('/journal/categories', methods=['GET', 'POST'])
@login_required
def journal_categories():
    """일기 카테고리 목록/추가"""
    if request.method == 'GET':
        categories = ensure_default_journal_categories(current_user.id)
        return jsonify({'categories': [serialize_journal_category(category) for category in categories]})

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': '카테고리 이름이 필요합니다.'}), 400

    existing = JournalCategory.query.filter(
        JournalCategory.user_id == current_user.id,
        JournalCategory.name == name
    ).first()
    if existing:
        return jsonify({'category': serialize_journal_category(existing)}), 200

    category = JournalCategory(user_id=current_user.id, name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify({'category': serialize_journal_category(category)}), 201


@bp.route('/journal/categories/<int:category_id>', methods=['DELETE'])
@login_required
def journal_category_delete(category_id):
    """일기 카테고리 삭제"""
    category = JournalCategory.query.filter(
        JournalCategory.id == category_id,
        JournalCategory.user_id == current_user.id
    ).first_or_404()
    db.session.delete(category)
    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/journal/<int:journal_id>/edit', methods=['GET', 'POST'])
@login_required
def journal_edit(journal_id):
    """일기 수정"""
    journal = Journal.query.filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first_or_404()

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        category = request.form.get('category', '').strip() or None
        journal_date = request.form.get('date', '').strip()
        visibility = request.form.get('visibility', journal.visibility)

        if not content:
            return render_react('journalForm', {
                'error': '내용은 필수입니다.',
                'journal': journal.to_dict()
            }, active_path='/journal')

        journal.title = title or None
        journal.content = content
        journal.category = category
        try:
            journal.date = datetime.strptime(journal_date, '%Y-%m-%d').date() if journal_date else journal.date
        except ValueError:
            journal.date = journal.date
        journal.visibility = visibility
        db.session.commit()
        return redirect(url_for('main.journal_detail', journal_id=journal.id))

    categories = ensure_default_journal_categories(current_user.id)
    return render_react('journalForm', {
        'journal': journal.to_dict(),
        'categories': [serialize_journal_category(category) for category in categories]
    }, active_path='/journal')


@bp.route('/journal/<int:journal_id>/delete', methods=['POST'])
@login_required
def journal_delete(journal_id):
    """일기 삭제"""
    journal = Journal.query.filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first_or_404()
    db.session.delete(journal)
    db.session.commit()
    return redirect(url_for('main.journal_list'))


@bp.route('/journal/<int:journal_id>/like', methods=['POST'])
@login_required
def toggle_journal_like(journal_id):
    """일기 좋아요 토글"""
    journal = Journal.query.filter(Journal.id == journal_id).first_or_404()
    if not can_view_journal(journal):
        return ('', 403)
    existing = Like.query.filter(
        Like.user_id == current_user.id,
        Like.journal_id == journal_id
    ).first()
    if existing:
        db.session.delete(existing)
    else:
        db.session.add(Like(user_id=current_user.id, journal_id=journal_id))
    db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.journal_list')
    return redirect(next_url)


@bp.route('/journal/<int:journal_id>/comment', methods=['POST'])
@login_required
def add_journal_comment(journal_id):
    """일기 댓글 추가"""
    journal = Journal.query.filter(Journal.id == journal_id).first_or_404()
    if not can_view_journal(journal):
        return ('', 403)
    content = request.form.get('content', '').strip()
    if content:
        db.session.add(Comment(user_id=current_user.id, journal_id=journal_id, content=content))
        db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.journal_list')
    return redirect(next_url)


@bp.route('/journal/comments/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_journal_comment(comment_id):
    """일기 댓글 삭제"""
    comment = Comment.query.filter(
        Comment.id == comment_id,
        Comment.journal_id.isnot(None)
    ).first_or_404()
    journal = Journal.query.filter(Journal.id == comment.journal_id).first_or_404()
    if comment.user_id != current_user.id and journal.user_id != current_user.id:
        return ('', 403)
    db.session.delete(comment)
    db.session.commit()
    next_url = request.form.get('next') or request.referrer or url_for('main.journal_list')
    return redirect(next_url)


# ===== Friends =====
@bp.route('/friends')
@login_required
def friends():
    """친구 목록"""
    accepted = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.status == 'accepted'),
            and_(Friendship.friend_id == current_user.id, Friendship.status == 'accepted')
        )
    ).all()
    accepted_ids = []
    for rel in accepted:
        accepted_ids.append(rel.friend_id if rel.user_id == current_user.id else rel.user_id)
    friends_list = User.query.filter(User.id.in_(accepted_ids)).all() if accepted_ids else []

    incoming = Friendship.query.filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == 'pending'
    ).all()
    outgoing = Friendship.query.filter(
        Friendship.user_id == current_user.id,
        Friendship.status == 'pending'
    ).all()

    return render_react('friends', {
        'friendsList': [serialize_user(friend) for friend in friends_list],
        'incomingRequests': [
            {'id': req.id, 'user': serialize_user(req.user)} for req in incoming
        ],
        'outgoingRequests': [
            {'id': req.id, 'friend_id': req.friend_id, 'friend': serialize_user(req.friend)}
            for req in outgoing
        ]
    }, active_path='/friends')


@bp.route('/friends/request', methods=['POST'])
@login_required
def send_friend_request():
    """친구 요청"""
    identifier = request.form.get('username', '').strip()
    if not identifier:
        return redirect(url_for('main.friends'))

    if identifier.isdigit():
        target = User.query.get(int(identifier))
    else:
        target = User.query.filter_by(username=identifier).first()
    if not target or target.id == current_user.id:
        return redirect(url_for('main.friends'))

    existing = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == target.id),
            and_(Friendship.user_id == target.id, Friendship.friend_id == current_user.id)
        )
    ).first()
    if existing:
        return redirect(url_for('main.friends'))

    request_row = Friendship(user_id=current_user.id, friend_id=target.id, status='pending')
    db.session.add(request_row)
    db.session.commit()
    return redirect(url_for('main.friends'))


@bp.route('/friends/accept/<int:request_id>', methods=['POST'])
@login_required
def accept_friend_request(request_id):
    """친구 요청 수락"""
    request_row = Friendship.query.filter(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == 'pending'
    ).first_or_404()
    request_row.status = 'accepted'
    db.session.commit()
    return redirect(url_for('main.friends'))


@bp.route('/friends/remove/<int:user_id>', methods=['POST'])
@login_required
def remove_friend(user_id):
    """친구 삭제/요청 취소"""
    relationships = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
            and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id)
        )
    ).all()
    for rel in relationships:
        db.session.delete(rel)
    db.session.commit()
    return redirect(url_for('main.friends'))


@bp.route('/friend/<int:friend_id>/meals')
@login_required
def friend_meals(friend_id):
    """친구 식단 뷰어"""
    ensure_friend_access(friend_id)
    friend_user = User.query.filter(User.id == friend_id).first_or_404()
    meals = MealRecord.query.filter(
        MealRecord.user_id == friend_id,
        MealRecord.visibility.in_(['friends', 'public'])
    ).order_by(MealRecord.date.desc(), MealRecord.created_at.desc()).all()
    friends_list = get_friends_list(current_user.id)
    meal_ids = [meal.id for meal in meals]
    liked_meal_ids = set()
    if meal_ids:
        liked_meal_ids = set(
            like.meal_id for like in Like.query.filter(
                Like.user_id == current_user.id,
                Like.meal_id.in_(meal_ids)
            ).all()
        )
    serialized_meals = []
    for meal in meals:
        can_delete_comment_ids = {
            comment.id for comment in meal.comments if comment.user_id == current_user.id
        }
        serialized_meals.append(serialize_meal(
            meal,
            liked=meal.id in liked_meal_ids,
            can_delete_comment_ids=can_delete_comment_ids
        ))
    return render_react('friendMeals', {
        'friendUser': serialize_user(friend_user),
        'meals': serialized_meals,
        'friendsList': [serialize_user(friend) for friend in friends_list],
        'likedMealIds': list(liked_meal_ids)
    }, active_path='/meals')


@bp.route('/friend/<int:friend_id>/journal')
@login_required
def friend_journal(friend_id):
    """친구 일기 뷰어"""
    ensure_friend_access(friend_id)
    friend_user = User.query.filter(User.id == friend_id).first_or_404()
    journals = Journal.query.filter(
        Journal.user_id == friend_id,
        Journal.visibility.in_(['friends', 'public'])
    ).order_by(Journal.date.desc(), Journal.created_at.desc()).all()
    categories = ensure_default_journal_categories(friend_id)
    category_counts = build_journal_category_counts(journals)
    friends_list = get_friends_list(current_user.id)
    journal_ids = [journal.id for journal in journals]
    liked_journal_ids = set()
    if journal_ids:
        liked_journal_ids = set(
            like.journal_id for like in Like.query.filter(
                Like.user_id == current_user.id,
                Like.journal_id.in_(journal_ids)
            ).all()
        )
    serialized_journals = []
    for journal in journals:
        can_delete_comment_ids = {
            comment.id for comment in journal.comments if comment.user_id == current_user.id
        }
        serialized_journals.append(serialize_journal(journal, can_delete_comment_ids=can_delete_comment_ids))
    return render_react('friendJournal', {
        'friendUser': serialize_user(friend_user),
        'journals': serialized_journals,
        'categories': [serialize_journal_category(category) for category in categories],
        'categoryCounts': category_counts,
        'friendsList': [serialize_user(friend) for friend in friends_list],
        'likedJournalIds': list(liked_journal_ids)
    }, active_path='/journal')

# ===== Exercise =====
@bp.route('/exercise')
@login_required
def exercise():
    """운동 페이지"""
    today = date.today()
    
    record_cards = build_exercise_cards(current_user.id, today)
    
    body_records = BodyRecord.query.filter(
        BodyRecord.user_id == current_user.id
    ).order_by(BodyRecord.date.desc(), BodyRecord.created_at.desc()).all()

    today_meals = MealRecord.query.filter(
        MealRecord.user_id == current_user.id,
        MealRecord.date == today
    ).order_by(MealRecord.created_at).all()
    meal_ids = [meal.id for meal in today_meals]
    liked_meal_ids = set()
    if meal_ids:
        liked_meal_ids = set(
            like.meal_id for like in Like.query.filter(
                Like.user_id == current_user.id,
                Like.meal_id.in_(meal_ids)
            ).all()
        )
    serialized_meals = []
    for meal in today_meals:
        can_delete_comment_ids = {
            comment.id
            for comment in meal.comments
            if comment.user_id == current_user.id or meal.user_id == current_user.id
        }
        serialized_meals.append(serialize_meal(
            meal,
            liked=meal.id in liked_meal_ids,
            can_delete_comment_ids=can_delete_comment_ids
        ))

    return render_react('exercise', {
        'today': today.isoformat(),
        'recordCards': serialize_exercise_cards(record_cards),
        'bodyRecords': [serialize_body_record(record) for record in body_records],
        'todayMeals': serialized_meals,
        'likedMealIds': list(liked_meal_ids)
    }, active_path='/exercise')

@bp.route('/exercise/plan', methods=['POST'])
@login_required
def add_exercise_plan():
    """내일 운동 계획 추가"""
    try:
        plan_date = request.form.get('date', (date.today() + timedelta(days=1)).isoformat())
        body_part = request.form.get('body_part', '')
        
        # 기존 계획이 있으면 삭제
        existing = ExercisePlan.query.filter(
            ExercisePlan.user_id == current_user.id,
            ExercisePlan.date == datetime.strptime(plan_date, '%Y-%m-%d').date()
        ).first()
        if existing:
            db.session.delete(existing)
        
        plan = ExercisePlan(
            user_id=current_user.id,
            date=datetime.strptime(plan_date, '%Y-%m-%d').date(),
            body_part=body_part
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '운동 계획이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/exercise/record', methods=['POST'])
@login_required
def add_exercise_record():
    """운동 기록 추가"""
    try:
        record_date = request.form.get('date', date.today().isoformat())
        body_part = request.form.get('body_part', '')
        memo = request.form.get('memo', '')
        exercise_name = memo if memo else body_part
        
        record = ExerciseRecord(
            user_id=current_user.id,
            date=datetime.strptime(record_date, '%Y-%m-%d').date(),
            body_part=body_part,
            exercise_name=exercise_name,
            memo=memo
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '운동 기록이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/exercise/record/<int:record_id>', methods=['DELETE'])
@login_required
def delete_exercise_record(record_id):
    """운동 기록 삭제"""
    try:
        record = ExerciseRecord.query.filter(
            ExerciseRecord.id == record_id,
            ExerciseRecord.user_id == current_user.id
        ).first_or_404()
        db.session.delete(record)
        db.session.commit()
        return jsonify({'success': True, 'message': '운동 기록이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@bp.route('/exercise/month')
@login_required
def exercise_month():
    """운동 기록 월별 보기 (카드형)"""
    today = date.today()
    year_param = request.args.get('year')
    month_param = request.args.get('month')

    try:
        year = int(year_param) if year_param else today.year
        month = int(month_param) if month_param else today.month
        if month < 1 or month > 12:
            month = today.month
    except ValueError:
        year = today.year
        month = today.month

    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    records = ExerciseRecord.query.filter(
        ExerciseRecord.user_id == current_user.id,
        ExerciseRecord.date >= start_date,
        ExerciseRecord.date <= end_date
    ).order_by(ExerciseRecord.date.asc(), ExerciseRecord.created_at.desc()).all()

    grouped = {}
    for record in records:
        grouped.setdefault(record.date, []).append(record)

    cards = []
    for day in range(1, last_day + 1):
        card_date = date(year, month, day)
        cards.append({'date': card_date, 'records': grouped.get(card_date, [])})

    year_options = list(range(today.year - 5, today.year + 2))
    serialized_cards = [
        {
            'date': card['date'].isoformat(),
            'records': [serialize_exercise_record(record) for record in card['records']]
        }
        for card in cards
    ]
    return render_react('exerciseMonth', {
        'currentYear': year,
        'currentMonth': month,
        'yearOptions': year_options,
        'cards': serialized_cards
    }, active_path='/exercise')


@bp.route('/exercise/record/detail/<int:record_id>')
@login_required
def exercise_record_detail(record_id):
    """운동 기록 상세"""
    record = ExerciseRecord.query.filter(
        ExerciseRecord.id == record_id,
        ExerciseRecord.user_id == current_user.id
    ).first_or_404()
    return jsonify({
        'id': record.id,
        'date': record.date.strftime('%Y-%m-%d'),
        'body_part': record.body_part,
        'memo': record.memo or ''
    })


@bp.route('/exercise/record/<int:record_id>', methods=['PUT'])
@login_required
def update_exercise_record(record_id):
    """운동 기록 수정"""
    try:
        record = ExerciseRecord.query.filter(
            ExerciseRecord.id == record_id,
            ExerciseRecord.user_id == current_user.id
        ).first_or_404()
        data = request.get_json()
        record.body_part = data.get('body_part', record.body_part)
        record.memo = data.get('memo', record.memo)
        if 'date' in data and data['date']:
            record.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        record.exercise_name = record.memo or record.body_part
        db.session.commit()
        return jsonify({'success': True, 'message': '운동 기록이 수정되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/meals/add', methods=['POST'])
@login_required
def add_meal_record():
    """식단 기록 추가"""
    try:
        meal_date = request.form.get('date', date.today().isoformat())
        meal_type = request.form.get('meal_type', '')
        food_name = request.form.get('food_name', '')
        calories = int(request.form.get('calories', 0)) if request.form.get('calories') else None
        memo = request.form.get('memo', '')
        
        # 파일 업로드 처리
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                image_path = save_image_to_storage(file, current_user.id, 'meals', meal_date)
        
        visibility = request.form.get('visibility', 'private')
        meal = MealRecord(
            user_id=current_user.id,
            date=datetime.strptime(meal_date, '%Y-%m-%d').date(),
            meal_type=meal_type,
            food_name=food_name,
            calories=calories,
            image_path=image_path,
            memo=memo,
            visibility=visibility
        )
        
        db.session.add(meal)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '식단 기록이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/meals/delete/<int:meal_id>', methods=['DELETE'])
@login_required
def delete_meal_record(meal_id):
    """식단 기록 삭제"""
    try:
        meal = MealRecord.query.filter(
            MealRecord.id == meal_id,
            MealRecord.user_id == current_user.id
        ).first_or_404()
        # 이미지 파일 삭제
        if meal.image_path:
            delete_image_from_storage(meal.image_path)
        db.session.delete(meal)
        db.session.commit()
        return jsonify({'success': True, 'message': '식단 기록이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/exercise/body', methods=['POST'])
@login_required
def add_body_record():
    """몸 기록 추가"""
    try:
        record_date = request.form.get('date', date.today().isoformat())
        memo = request.form.get('memo', '')

        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                image_path = save_image_to_storage(file, current_user.id, 'body', record_date)

        record = BodyRecord(
            user_id=current_user.id,
            date=datetime.strptime(record_date, '%Y-%m-%d').date(),
            image_path=image_path,
            memo=memo
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({'success': True, 'message': '몸 기록이 추가되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400


@bp.route('/exercise/body/<int:record_id>', methods=['DELETE'])
@login_required
def delete_body_record(record_id):
    """몸 기록 삭제"""
    try:
        record = BodyRecord.query.filter(
            BodyRecord.id == record_id,
            BodyRecord.user_id == current_user.id
        ).first_or_404()
        if record.image_path:
            delete_image_from_storage(record.image_path)
        db.session.delete(record)
        db.session.commit()
        return jsonify({'success': True, 'message': '몸 기록이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/uploads/meals/<filename>')
@login_required
def uploaded_meal_image(filename):
    """업로드된 식단 이미지 제공"""
    return send_from_directory(str(MEAL_UPLOAD_FOLDER), filename)

