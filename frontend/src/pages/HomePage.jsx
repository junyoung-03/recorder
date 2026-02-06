import React, { useEffect, useMemo, useState } from 'react';
import MonthlyCalendar from '../components/MonthlyCalendar';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { supabase } from '../lib/supabaseClient';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const getKoreanWeekdayShort = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return weekdays[date.getDay()];
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString()}원`;

function HomePage({ currentUser }) {
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showAllTodos, setShowAllTodos] = useState(false);
  const today = useMemo(() => new Date(), []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [currentYear, setCurrentYear] = useState(() => Number(urlParams.get('year')) || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => Number(urlParams.get('month')) || today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => urlParams.get('date') || toDateKey(today));
  const [monthSchedules, setMonthSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [todayTodos, setTodayTodos] = useState([]);
  const [todayExpense, setTodayExpense] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [loading, setLoading] = useState(false);

  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate || today), [selectedDate, today]);
  const todayLabel = useMemo(
    () => `${formatKoreanDate(today)} (${getKoreanWeekdayShort(today)})`,
    [today],
  );
  const selectedLabel = useMemo(
    () => `${formatKoreanDate(selectedDateKey)} (${getKoreanWeekdayShort(selectedDateKey)})`,
    [selectedDateKey],
  );
  const scheduleTitles = useMemo(() => {
    const map = {};
    monthSchedules.forEach((schedule) => {
      const dateObj = new Date(schedule.date);
      const day = dateObj.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(schedule.title);
    });
    return map;
  }, [monthSchedules]);
  const scheduleCount = useMemo(() => {
    const map = {};
    monthSchedules.forEach((schedule) => {
      const dateObj = new Date(schedule.date);
      const day = dateObj.getDate();
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [monthSchedules]);
  const holidayDates = useMemo(() => [], []);
  const events = useMemo(
    () => monthSchedules.map((schedule) => ({ id: schedule.id, date: schedule.date, title: schedule.title })),
    [monthSchedules],
  );
  const summaryCards = useMemo(
    () => ([
      {
        label: `📅 오늘 일정 ${todaySchedules.length}개`,
        href: '#today-schedules',
      },
      {
        label: `✅ 해야 할 일 ${todayTodos.length}개`,
        href: '#today-todos',
      },
      {
        label: `💸 오늘 지출 ${formatCurrency(todayExpense)}`,
        href: '/finance',
      },
    ]),
    [todaySchedules.length, todayTodos.length, todayExpense],
  );
  const recentRecords = useMemo(() => {
    const items = monthSchedules.map((schedule) => ({
      id: `schedule-${schedule.id || schedule.title}-${schedule.date || ''}`,
      type: '일정',
      title: schedule.title,
      time: schedule.time,
      date: schedule.date,
    }));
    return items
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [monthSchedules]);

  const loadDashboard = async (userId, year, month, dateKey) => {
    if (!userId) return;
    setLoading(true);
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    setMonthSchedules(scheduleData || []);

    const { data: todayScheduleData } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .order('time', { ascending: true });
    setTodaySchedules(todayScheduleData || []);

    const { data: todoData } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .order('created_at', { ascending: false });
    setTodayTodos(todoData || []);

    const { data: expenseData } = await supabase
      .from('finance_records')
      .select('amount')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .eq('transaction_type', 'expense');
    const todayExpenseTotal = (expenseData || []).reduce((sum, record) => sum + Number(record.amount || 0), 0);
    setTodayExpense(todayExpenseTotal);

    const { data: monthFinanceData } = await supabase
      .from('finance_records')
      .select('amount, transaction_type')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    const monthIncomeTotal = (monthFinanceData || [])
      .filter((record) => record.transaction_type === 'income')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const monthExpenseTotal = (monthFinanceData || [])
      .filter((record) => record.transaction_type === 'expense')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
    setMonthIncome(monthIncomeTotal);
    setMonthExpense(monthExpenseTotal);
    setLoading(false);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 2, 1);
    setCurrentYear(prev.getFullYear());
    setCurrentMonth(prev.getMonth() + 1);
    setSelectedDate(toDateKey(prev));
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth, 1);
    setCurrentYear(next.getFullYear());
    setCurrentMonth(next.getMonth() + 1);
    setSelectedDate(toDateKey(next));
  };

  const handleToday = () => {
    const todayDate = new Date();
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth() + 1);
    setSelectedDate(toDateKey(todayDate));
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadDashboard(currentUser.id, currentYear, currentMonth, selectedDateKey);
  }, [currentUser?.id, currentYear, currentMonth, selectedDateKey]);

  const handleAddTodo = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    if (!currentUser?.id) return;
    const payload = {
      user_id: currentUser.id,
      date: formData.get('date') || selectedDateKey,
      title: formData.get('title'),
      completed: false,
    };
    const { error } = await supabase.from('todos').insert([payload]);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowTodoModal(false);
    loadDashboard(currentUser.id, currentYear, currentMonth, selectedDateKey);
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
          <div className="mb-6">
            <h2 className="text-title">
              안녕하세요 👋
            </h2>
            <p className="text-body mt-2">
              오늘은 {todayLabel}이에요.
            </p>
            <p className="text-muted mt-1">
              오늘 하루 일정과 할 일을 한 번에 확인해 보세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {summaryCards.map((card) => (
              <a
                key={card.label}
                href={card.href}
                className="px-4 py-3 rounded-full bg-white border border-warm text-sm font-semibold text-slate-700 shadow-sm hover:bg-warm-surface transition"
              >
                {card.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <MonthlyCalendar
            year={currentYear}
            month={currentMonth}
            events={events}
            selectedDate={selectedDateKey}
            holidayDates={holidayDates}
            onDateClick={(dateValue) => {
              const dateKey = toDateKey(dateValue);
              setSelectedDate(dateKey);
              setCurrentYear(dateValue.getFullYear());
              setCurrentMonth(dateValue.getMonth() + 1);
            }}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            compact
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div id="today-schedules" className="bg-white rounded-2xl shadow-sm border border-warm px-6 py-4 motion-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-card-title flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2m8-2v2M5 9h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
                </svg>
                {selectedLabel} 일정
              </h2>
              <p className="text-muted mt-1">선택한 날짜의 일정</p>
            </div>
            <button
              onClick={() => (window.location.href = '/schedule')}
              className="btn-primary px-4 py-2 text-white text-sm font-semibold transition"
            >
              +일정
            </button>
          </div>
          {todaySchedules.length > 0 ? (
            <div className="space-y-1.5">
              {todaySchedules.map((schedule) => (
                <div
                  key={schedule.id || schedule.title}
                  className="flex items-center gap-2 p-3 rounded-xl border border-warm"
                >
                  {schedule.time && <span className="text-sm font-semibold">{schedule.time}</span>}
                  <span className="text-body font-semibold">
                    {schedule.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">선택한 날짜에 일정이 없습니다.</p>
          )}
          <div className="mt-3 text-muted">
            {todaySchedules.length === 0
              ? '오늘은 아직 일정이 없습니다. 자유 시간이 많아요 🙌'
              : todaySchedules.length <= 2
                ? `오늘 일정 ${todaySchedules.length}개 · 여유로운 하루네요 ✨`
                : `오늘 일정 ${todaySchedules.length}개 · 바쁜 하루네요 🔥`}
          </div>
        </div>

        <div id="today-todos" className="bg-white rounded-2xl shadow-sm border border-warm px-6 py-4 motion-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-card-title flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M4 6h16M4 12h3m-3 6h16" />
                </svg>
                {selectedLabel} 해야 할 일
              </h2>
              <p className="text-muted mt-1">선택한 날짜의 할 일</p>
            </div>
            <button
              onClick={() => setShowTodoModal(true)}
              className="btn-primary px-4 py-2 text-white text-sm font-semibold transition"
            >
              +할일
            </button>
          </div>
          {todayTodos.length > 0 ? (
            <div className="space-y-1.5">
              {(showAllTodos ? todayTodos : todayTodos.slice(0, 4)).map((todo) => (
                <div
                  key={todo.id || todo.title}
                  className="flex items-center justify-between p-3 rounded-xl border border-warm"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#2563EB' }} />
                    <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                      {todo.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">선택한 날짜에 할 일이 없습니다.</p>
          )}
          {todayTodos.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-muted">
                  오늘 할 일 {todayTodos.length}개 중 {todayTodos.filter((todo) => todo.completed).length}개 완료
                </div>
                <div className="mt-2 h-2 rounded-full bg-warm-surface border border-warm overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${todayTodos.length > 0 ? (todayTodos.filter((todo) => todo.completed).length / todayTodos.length) * 100 : 0}%`,
                      backgroundColor: '#10B981',
                    }}
                  />
                </div>
              </div>
              {todayTodos.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllTodos((prev) => !prev)}
                  className="btn-ghost text-sm font-semibold whitespace-nowrap"
                >
                  {showAllTodos
                    ? '접기'
                    : `할 일 ${todayTodos.length - 4}개 더 보기`}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-card-title flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 11h18M7 15h10M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
                지출 요약
              </h2>
              <p className="text-muted mt-1">이번 달 기준</p>
            </div>
            <a href="/finance" className="btn-ghost text-sm font-semibold">가계부 보기</a>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-warm motion-card">
              <div className="text-muted mb-1">
                오늘 지출
              </div>
              <AnimatedNumber
                value={todayExpense}
                formatter={formatCurrency}
                className="text-card-title expense-color"
              />
            </div>
            <div className="p-4 rounded-xl border border-warm motion-card">
              <div className="text-muted mb-1">
                이번 달 잔액
              </div>
              <AnimatedNumber
                value={monthIncome - monthExpense}
                formatter={(val) => `${val >= 0 ? '+' : ''}${formatCurrency(val)}`}
                className={`text-card-title ${monthIncome - monthExpense >= 0 ? 'income-color' : 'expense-color'}`}
              />
            </div>
            <div className="p-4 rounded-xl border border-warm motion-card">
              <div className="text-muted mb-1">
                이번 달 수입
              </div>
              <AnimatedNumber
                value={monthIncome}
                formatter={formatCurrency}
                className="text-card-title income-color"
              />
            </div>
            <div className="p-4 rounded-xl border border-warm motion-card">
              <div className="text-muted mb-1">
                이번 달 지출
              </div>
              <AnimatedNumber
                value={monthExpense}
                formatter={formatCurrency}
                className="text-card-title expense-color"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-card-title flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2m8-2v2M5 9h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
              </svg>
              {currentMonth}월 일정
            </h2>
          </div>
          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl border border-warm">
                  <div>
                    <div className="text-muted">{record.type}</div>
                    <div className="text-body font-semibold">{record.title}</div>
                  </div>
                  <div className="text-muted font-semibold">
                    {record.date ? formatKoreanDate(record.date) : ''}
                    {record.time ? ` · ${record.time}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">일정이 없습니다.</p>
          )}
        </div>
      </section>

      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>
                할일 추가
              </h3>
              <button onClick={() => setShowTodoModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleAddTodo}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full p-3 border rounded-md text-lg font-medium"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="예: 스트레칭 10분"
                />
              </div>
              <input type="hidden" name="date" value={selectedDateKey} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white text-sm font-semibold transition">
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowTodoModal(false)}
                  className="btn-secondary px-4 py-2 text-sm font-semibold transition"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;







