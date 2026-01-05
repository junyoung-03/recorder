from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from datetime import date, datetime
from calendar import monthrange
import random
from app import db
from app.models import FinanceRecord, Schedule

bp = Blueprint('main', __name__)

def get_dummy_finance_data(year, month):
    """더미 가계부 데이터 생성"""
    last_day_num = monthrange(year, month)[1]
    finance_data = {}
    
    # 각 날짜별로 랜덤하게 수입/지출 생성
    for day in range(1, last_day_num + 1):
        # 30% 확률로 수입, 50% 확률로 지출, 20% 확률로 없음
        rand = random.random()
        if rand < 0.3:
            # 수입: 10,000 ~ 500,000원
            finance_data[day] = {
                'income': random.randint(10, 500) * 1000,
                'expense': 0
            }
        elif rand < 0.8:
            # 지출: 5,000 ~ 200,000원
            finance_data[day] = {
                'income': 0,
                'expense': random.randint(5, 200) * 1000
            }
        else:
            # 둘 다 있음
            finance_data[day] = {
                'income': random.randint(10, 300) * 1000,
                'expense': random.randint(5, 150) * 1000
            }
    
    return finance_data

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

@bp.route('/')
def home():
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # 요일 이름 (한글)
    weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
    weekday_name = weekdays[today.weekday()]
    
    # 더미 가계부 데이터 생성
    finance_data = get_dummy_finance_data(current_year, current_month)
    
    # 월간 요약 계산
    total_income = sum(data['income'] for data in finance_data.values())
    total_expense = sum(data['expense'] for data in finance_data.values())
    total_net = total_income - total_expense
    
    # 캘린더 데이터 생성
    calendar = get_calendar_data(current_year, current_month, finance_data)
    
    # 오늘 날짜 포맷 (5일 형식)
    today_formatted = f"{today.day}일"
    
    return render_template('home.html',
                         current_year=current_year,
                         current_month=current_month,
                         today=today,
                         today_formatted=today_formatted,
                         weekday_name=weekday_name,
                         calendar=calendar,
                         total_income=total_income,
                         total_expense=total_expense,
                         total_net=total_net)

def get_finance_data_from_db(year, month):
    """데이터베이스에서 가계부 데이터 가져오기"""
    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    
    records = FinanceRecord.query.filter(
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

@bp.route('/finance')
def finance():
    """가계부 페이지"""
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
    calendar = get_calendar_data_from_db(current_year, current_month)
    
    # 월간 요약
    finance_data = get_finance_data_from_db(current_year, current_month)
    total_income = sum(data['income'] for data in finance_data.values())
    total_expense = sum(data['expense'] for data in finance_data.values())
    total_net = total_income - total_expense
    
    # 거래 내역 (선택된 날짜 또는 전체 월)
    if selected_date and selected_date.year == current_year and selected_date.month == current_month:
        records = FinanceRecord.query.filter(
            FinanceRecord.date == selected_date
        ).order_by(FinanceRecord.created_at.desc()).all()
    else:
        start_date = date(current_year, current_month, 1)
        last_day = monthrange(current_year, current_month)[1]
        end_date = date(current_year, current_month, last_day)
        records = FinanceRecord.query.filter(
            FinanceRecord.date >= start_date,
            FinanceRecord.date <= end_date
        ).order_by(FinanceRecord.date.desc(), FinanceRecord.created_at.desc()).all()
    
    # 통계 데이터
    days_with_expense = len([d for d in finance_data.values() if d['expense'] > 0])
    avg_daily_expense = (total_expense / days_with_expense) if days_with_expense > 0 else 0
    income_count = len([r for r in records if r.transaction_type == 'income'])
    expense_count = len([r for r in records if r.transaction_type == 'expense'])
    
    return render_template('finance.html',
                         current_year=current_year,
                         current_month=current_month,
                         today=today,
                         selected_date=selected_date,
                         calendar=calendar,
                         finance_data=finance_data,
                         total_income=total_income,
                         total_expense=total_expense,
                         total_net=total_net,
                         records=records,
                         days_with_expense=days_with_expense,
                         avg_daily_expense=avg_daily_expense,
                         income_count=income_count,
                         expense_count=expense_count)

@bp.route('/finance/add', methods=['POST'])
def add_finance():
    """거래 추가"""
    try:
        transaction_type = request.form.get('transaction_type')
        category = request.form.get('category', '')
        amount = float(request.form.get('amount', 0))
        record_date = request.form.get('date', date.today().isoformat())
        memo = request.form.get('memo', '')
        
        record = FinanceRecord(
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
def delete_finance(record_id):
    """거래 삭제"""
    try:
        record = FinanceRecord.query.get_or_404(record_id)
        db.session.delete(record)
        db.session.commit()
        return jsonify({'success': True, 'message': '거래가 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/finance/update/<int:record_id>', methods=['PUT'])
def update_finance(record_id):
    """거래 수정"""
    try:
        record = FinanceRecord.query.get_or_404(record_id)
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

def get_schedule_calendar_data(year, month):
    """일정 캘린더 데이터 생성"""
    start_date = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_date = date(year, month, last_day)
    
    # 일정이 있는 날짜 조회
    schedules = Schedule.query.filter(
        Schedule.date >= start_date,
        Schedule.date <= end_date
    ).all()
    
    # 날짜별 일정 개수
    schedule_count = {}
    for schedule in schedules:
        day = schedule.date.day
        if day not in schedule_count:
            schedule_count[day] = 0
        schedule_count[day] += 1
    
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
            'schedule_count': schedule_count.get(day, 0)
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

@bp.route('/schedule')
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
    
    return render_template('schedule.html',
                         current_year=current_year,
                         current_month=current_month,
                         today=today,
                         selected_date=selected_date,
                         weekday_name=weekday_name,
                         calendar=calendar,
                         schedules=selected_schedules,
                         schedules_by_date_list=schedules_by_date_list)

@bp.route('/schedule/add', methods=['POST'])
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
def delete_schedule(schedule_id):
    """일정 삭제"""
    try:
        schedule = Schedule.query.get_or_404(schedule_id)
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'success': True, 'message': '일정이 삭제되었습니다.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400

@bp.route('/schedule/update/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    """일정 수정"""
    try:
        schedule = Schedule.query.get_or_404(schedule_id)
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
def schedule_detail(schedule_id):
    """일정 상세 정보"""
    schedule = Schedule.query.get_or_404(schedule_id)
    return jsonify(schedule.to_dict())

