import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import MonthlyCalendar from '../components/MonthlyCalendar';
import { supabase } from '../lib/supabaseClient';
import ModalContainer from '../components/ui/ModalContainer';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

function SchedulePage({ currentUser }) {
  const today = useMemo(() => new Date(), []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [currentYear, setCurrentYear] = useState(() => Number(urlParams.get('year')) || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => Number(urlParams.get('month')) || today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => urlParams.get('date') || toDateKey(today));
  const [schedules, setSchedules] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const weekdayName = useMemo(() => {
    const date = selectedDateKey ? new Date(selectedDateKey) : new Date();
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return weekdays[date.getDay()];
  }, [selectedDateKey]);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailContent, setDetailContent] = useState(null);
  const [startDate, setStartDate] = useState(selectedDateKey);
  const [endDate, setEndDate] = useState('');
  const todoCards = useMemo(() => {
    const grouped = new Map();
    todos.forEach((todo) => {
      const key = todo.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(todo);
    });
    return Array.from(grouped.entries()).map(([date, items]) => ({ date, todos: items }));
  }, [todos]);
  const schedulesByDateList = useMemo(() => {
    const grouped = new Map();
    schedules.forEach((schedule) => {
      const key = schedule.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(schedule);
    });
    return Array.from(grouped.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [schedules]);
  const activeTodoCards = useMemo(
    () => todoCards.filter((card) => card.todos && card.todos.length > 0),
    [todoCards],
  );

  const events = useMemo(
    () => schedules.map((schedule) => ({ id: schedule.id, date: schedule.date, title: schedule.title })),
    [schedules],
  );
  const holidayDates = useMemo(() => [], []);

  const openAddModal = () => {
    setStartDate(selectedDateKey);
    setEndDate('');
    setShowAddModal(true);
  };

  const loadSchedules = async (userId, year, month) => {
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
    setSchedules(scheduleData || []);

    const { data: todoData } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('created_at', { ascending: false });
    setTodos(todoData || []);
    setLoading(false);
  };

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
    loadSchedules(currentUser.id, currentYear, currentMonth);
  };

  const handleToggleTodo = async (todoId, checked) => {
    await supabase.from('todos').update({ completed: checked }).eq('id', todoId);
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? { ...todo, completed: checked } : todo)));
  };

  const handleDeleteTodo = async (todoId) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const { error } = await supabase.from('todos').delete().eq('id', todoId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
  };

  const handleAddSchedule = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const rangeDates = [];

    if (startDate && endDate && endDate >= startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        rangeDates.push(toDateKey(d));
      }
    } else if (startDate) {
      rangeDates.push(startDate);
    }

    if (rangeDates.length === 0) {
      alert('날짜를 선택해주세요.');
      return;
    }
    if (!currentUser?.id) return;
    const payload = rangeDates.map((dateStr) => ({
      user_id: currentUser.id,
      date: dateStr,
      time: formData.get('time') || null,
      title: formData.get('title'),
      memo: formData.get('memo') || null,
      category: formData.get('category') || null,
      color: formData.get('color') || null,
      repeat_type: formData.get('repeat_type') || 'none',
      completed: false,
    }));
    const { error } = await supabase.from('schedules').insert(payload);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowAddModal(false);
    loadSchedules(currentUser.id, currentYear, currentMonth);
  };

  const showDetail = async (scheduleId) => {
    const local = schedules.find((schedule) => schedule.id === scheduleId);
    if (local) {
      setDetailContent(local);
      setShowDetailModal(true);
      return;
    }
    const { data } = await supabase.from('schedules').select('*').eq('id', scheduleId).maybeSingle();
    if (!data) return;
    setDetailContent(data);
    setShowDetailModal(true);
  };

  const deleteSchedule = async (scheduleId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    loadSchedules(currentUser?.id, currentYear, currentMonth);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadSchedules(currentUser.id, currentYear, currentMonth);
  }, [currentUser?.id, currentYear, currentMonth]);

  const handleCalendarDateClick = (date) => {
    const dateKey = toDateKey(date);
    setSelectedDate(dateKey);
    setCurrentYear(date.getFullYear());
    setCurrentMonth(date.getMonth() + 1);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="일정"
        description="달력으로 일정 흐름을 관리하고 선택한 날짜의 목록을 확인하세요."
        actions={[
          { label: '오늘로 이동', onClick: handleToday, variant: 'secondary' },
          { label: '+ 새 일정', onClick: openAddModal, variant: 'primary' },
        ]}
      />



      <section className="bg-white rounded-2xl shadow-sm border border-warm p-6">
        <MonthlyCalendar
          year={currentYear}
          month={currentMonth}
          events={events}
          selectedDate={selectedDateKey}
          holidayDates={holidayDates}
          onDateClick={handleCalendarDateClick}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />
      </section>


      <section className="bg-white rounded-2xl shadow-sm border border-warm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-card-title flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2m8-2v2M5 9h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
              </svg>
              {formatKoreanDate(selectedDateKey)} ({weekdayName})
            </h2>
            <p className="text-muted mt-1">선택한 날짜의 일정</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDate(selectedDateKey)}
              className="btn-secondary px-3 py-2 text-sm font-semibold transition"
            >
              날짜 보기
            </button>
            <button onClick={openAddModal} className="btn-primary px-4 py-2 text-white text-sm font-semibold transition">
              + 일정 추가
            </button>
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: '#E5E7EB' }}>
          {schedules.length > 0 ? (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex gap-4">
                  <div className="text-sm font-semibold text-slate-500 w-16">
                    {schedule.time || '하루'}
                  </div>
                  <div className="flex-1">
                    <div
                      className="p-3 rounded-lg border border-warm hover:bg-warm-surface cursor-pointer transition motion-card"
                      style={{ borderLeft: `4px solid ${schedule.color || '#2563EB'}` }}
                      onClick={() => showDetail(schedule.id)}
                    >
                      <div className={`text-body font-semibold ${schedule.completed ? 'line-through text-gray-400' : ''}`}>
                        {schedule.title}
                      </div>
                      {schedule.memo && <p className="text-muted mt-1">{schedule.memo}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-slate-500">
              선택한 날짜에 일정이 없습니다.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M4 6h16M4 12h3m-3 6h16" />
                </svg>
                해야 할 일 (이번 주)
              </h2>
              <p className="text-muted mt-1">실제 할 일이 있는 날짜만 보여줍니다.</p>
            </div>
            <div className="flex gap-2">
              <a href="/todos/month" className="btn-secondary px-4 py-2 text-sm font-semibold transition">전체보기</a>
              <button onClick={() => setShowTodoModal(true)} className="btn-primary px-4 py-2 text-white text-sm font-semibold transition">+할일</button>
            </div>
          </div>
          {activeTodoCards.length > 0 ? (
            <div className="space-y-4">
              {activeTodoCards.map((card) => (
                <div key={card.date} className="border border-warm rounded-xl p-4 motion-card">
                  <div className="text-body font-semibold mb-3">
                    {formatKoreanDate(card.date)}
                  </div>
                  <div className="space-y-2">
                    {card.todos.map((todo) => (
                      <div key={todo.id} className="flex items-center justify-between gap-2 transition-all duration-150 ease-out">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={(event) => handleToggleTodo(todo.id, event.target.checked)}
                            className="transition-transform duration-150 ease-out checked:scale-110"
                          />
                          <span className={`text-sm transition-colors duration-150 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                            {todo.title}
                          </span>
                        </label>
                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted">
              이번 주에 완료할 할 일이 없어요.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-card-title flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2m8-2v2M5 9h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
              </svg>
              이번 달 일정 목록
            </h2>
          </div>
          <div className="space-y-6">
            {schedulesByDateList.length > 0 ? (
              schedulesByDateList.map(([dateStr, daySchedules]) => (
                <div key={dateStr} className="border-b pb-4 last:border-b-0" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3
                      className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                      style={{ color: '#1F2937' }}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        const dateObj = new Date(dateStr);
                        setCurrentYear(dateObj.getFullYear());
                        setCurrentMonth(dateObj.getMonth() + 1);
                      }}
                    >
                      {formatKoreanDate(dateStr)} ({getKoreanWeekdayShort(dateStr)})
                    </h3>
                    <span className="text-sm px-2 py-1 rounded-md" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                      {daySchedules.length}건
                    </span>
                  </div>
                  <div className="space-y-2 ml-4">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 ease-out hover:bg-gray-50 hover:-translate-y-0.5 motion-card"
                        onClick={() => showDetail(schedule.id)}
                        style={{ borderLeft: `3px solid ${schedule.color || '#2563EB'}` }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {schedule.time && <span className="text-sm font-semibold">{schedule.time}</span>}
                            <span className={`text-sm font-semibold ${schedule.completed ? 'line-through text-gray-400' : ''}`} style={{ color: '#1F2937' }}>
                              {schedule.title}
                            </span>
                          </div>
                          {schedule.memo && <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{schedule.memo}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8" style={{ color: '#6B7280' }}>이번 달 일정이 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      <ModalContainer open={showTodoModal} onClose={() => setShowTodoModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>할일 추가</h3>
              <button onClick={() => setShowTodoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleAddTodo}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>제목 *</label>
                <input type="text" name="title" required className="w-full p-3 border rounded-md text-lg font-medium motion-input" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDateKey}
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white text-sm font-semibold transition">추가</button>
                <button type="button" onClick={() => setShowTodoModal(false)} className="btn-secondary px-4 py-2 text-sm font-semibold transition">취소</button>
              </div>
            </form>
          </div>
      </ModalContainer>

      <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>일정 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleAddSchedule}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>제목 *</label>
                <input type="text" name="title" required className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} placeholder="예: 회의, 독서, 운동" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜 선택</label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>시작 날짜</label>
                    <input
                      type="date"
                      name="start_date"
                      className="w-full p-2 border rounded-md motion-input"
                      style={{ borderColor: '#E5E7EB' }}
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>종료 날짜 (선택)</label>
                    <input
                      type="date"
                      name="end_date"
                      className="w-full p-2 border rounded-md motion-input"
                      style={{ borderColor: '#E5E7EB' }}
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>종료 날짜를 선택하면 해당 기간의 모든 날짜에 일정이 추가됩니다</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>시간 (선택)</label>
                  <input type="time" name="time" className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 / 장소 (선택)</label>
                <textarea name="memo" rows="2" className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} placeholder="프로젝트 공유" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white text-sm font-semibold transition">추가</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-4 py-2 text-sm font-semibold transition">취소</button>
              </div>
            </form>
          </div>
      </ModalContainer>

      <ModalContainer open={showDetailModal && Boolean(detailContent)} onClose={() => setShowDetailModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>일정 상세</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {detailContent && (
            <div className="space-y-4">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="font-semibold py-2" style={{ color: '#1F2937' }}>제목</td>
                    <td>{detailContent.title}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-2" style={{ color: '#1F2937' }}>시간</td>
                    <td>{detailContent.time || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-2" style={{ color: '#1F2937' }}>메모</td>
                    <td>{detailContent.memo || '—'}</td>
                  </tr>
                </tbody>
              </table>
              <div className="flex gap-2 mt-4">
                <button className="btn-primary px-4 py-2 text-white text-sm font-semibold" onClick={() => alert('수정 기능은 추후 구현 예정입니다.')}>수정</button>
                <button className="btn-secondary px-4 py-2 text-sm font-semibold text-red-500" onClick={() => deleteSchedule(detailContent.id)}>
                  삭제
                </button>
              </div>
            </div>
            )}
          </div>
      </ModalContainer>
    </div>
  );
}

export default SchedulePage;

