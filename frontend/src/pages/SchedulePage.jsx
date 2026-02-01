import React, { useMemo, useState } from 'react';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
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

function SchedulePage({
  currentYear,
  currentMonth,
  today,
  selectedDate,
  selectedDateFormatted,
  weekdayName,
  calendar = [],
  schedules = [],
  schedulesByDateList = [],
  todoCards = [],
}) {
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, count: 0 });
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailContent, setDetailContent] = useState(null);
  const [startDate, setStartDate] = useState(selectedDateKey);
  const [endDate, setEndDate] = useState('');

  const selectedDateBadges = selectedDates.slice().sort();

  const handleDateClick = (dateKey, event) => {
    if (!dateKey) return;
    if (event.ctrlKey || event.metaKey) {
      setSelectedDates((prev) => {
        if (prev.includes(dateKey)) {
          return prev.filter((d) => d !== dateKey);
        }
        return [...prev, dateKey];
      });
    } else {
      window.location.href = `/schedule?date=${dateKey}`;
    }
  };

  const clearSelectedDates = () => {
    setSelectedDates([]);
  };

  const openAddModal = () => {
    if (selectedDates.length > 0) {
      const sorted = selectedDates.slice().sort();
      setStartDate(sorted[0]);
      setEndDate('');
    } else {
      setStartDate(selectedDateKey);
      setEndDate('');
    }
    setShowAddModal(true);
  };

  const handleAddTodo = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch('/todos/add', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const handleToggleTodo = async (todoId, checked) => {
    await fetch(`/todos/toggle/${todoId}`, { method: 'POST' });
  };

  const handleDeleteTodo = async (todoId) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const response = await fetch(`/todos/delete/${todoId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const handleAddSchedule = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const rangeDates = [];

    if (selectedDates.length > 0) {
      rangeDates.push(...selectedDates);
    } else if (startDate && endDate && endDate >= startDate) {
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

    let successCount = 0;
    let errorCount = 0;
    for (const dateStr of rangeDates) {
      const singleFormData = new FormData(event.target);
      singleFormData.set('date', dateStr);
      singleFormData.delete('dates');
      singleFormData.delete('start_date');
      singleFormData.delete('end_date');
      try {
        const response = await fetch('/schedule/add', {
          method: 'POST',
          body: singleFormData,
        });
        const result = await response.json();
        if (result.success) {
          successCount += 1;
        } else {
          errorCount += 1;
        }
      } catch (error) {
        errorCount += 1;
      }
    }

    if (errorCount === 0) {
      alert(rangeDates.length > 1 ? `${successCount}개의 날짜에 일정이 추가되었습니다.` : '일정이 추가되었습니다.');
      clearSelectedDates();
      window.location.reload();
    } else {
      alert(`${successCount}개 성공, ${errorCount}개 실패`);
    }
  };

  const showDetail = async (scheduleId) => {
    const response = await fetch(`/schedule/detail/${scheduleId}`);
    if (!response.ok) return;
    const schedule = await response.json();
    setDetailContent(schedule);
    setShowDetailModal(true);
  };

  const deleteSchedule = async (scheduleId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await fetch(`/schedule/delete/${scheduleId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            📆 {currentYear}년 {currentMonth}월
          </h2>
          <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            {selectedDateFormatted} {weekdayName}
          </span>
        </div>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>💡 Ctrl + 클릭으로 여러 날짜 선택</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#1F2937' }}>
                {['월', '화', '수', '목', '금', '토', '일'].map((label) => (
                  <th key={label} className="border p-3 text-center font-semibold text-white">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendar.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((dayData, dayIndex) => {
                    const dateKey = toDateKey(dayData?.date);
                    const isToday = dateKey && dateKey === todayKey;
                    const isSelected = selectedDates.includes(dateKey);
                    return (
                      <td
                        key={`day-${weekIndex}-${dayIndex}`}
                        className={`border p-4 calendar-day cursor-pointer transition hover:bg-gray-50 ${isToday ? 'calm-blue-light' : ''} ${
                          isSelected ? 'ring-4 ring-yellow-400' : ''
                        }`}
                        style={{ borderColor: '#E5E7EB', backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.2)' : undefined }}
                        onClick={(event) => handleDateClick(dateKey, event)}
                        onMouseOver={(event) => {
                          if (dayData?.schedule_count > 0) {
                            setTooltip({ visible: true, x: event.pageX + 10, y: event.pageY + 10, count: dayData.schedule_count });
                          }
                        }}
                        onMouseOut={() => setTooltip({ visible: false, x: 0, y: 0, count: 0 })}
                      >
                        {dayData ? (
                          <div className="text-center">
                            <div className="font-semibold text-lg mb-2 flex items-center justify-center gap-1">
                              <span>{dayData.day}</span>
                              {dayData.has_schedule && <span className="inline-block w-2 h-2 rounded-full calm-blue-bg" />}
                            </div>
                            {dayData.titles && dayData.titles.length > 0 && (
                              <div className="mt-2 space-y-1 text-xs" style={{ color: '#6B7280' }}>
                                {dayData.titles.slice(0, 3).map((title, idx) => (
                                  <div key={`${dateKey}-${idx}`} className="truncate">{title}</div>
                                ))}
                                {dayData.titles.length > 3 && (
                                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
                                    + {dayData.titles.length - 3}건
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tooltip.visible && (
          <div
            className="absolute bg-gray-800 text-white text-xs rounded py-1 px-2 z-50"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            일정 {tooltip.count}건
          </div>
        )}
      </section>

      {selectedDates.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>선택된 날짜:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDateBadges.map((dateStr) => (
                  <span key={dateStr} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    {formatShortDate(dateStr)}
                    <button onClick={() => setSelectedDates((prev) => prev.filter((d) => d !== dateStr))} className="ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>
            <button onClick={clearSelectedDates} className="text-sm px-3 py-1 rounded-md" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              선택 해제
            </button>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              📅 {formatKoreanDate(selectedDateKey)} ({weekdayName})
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>🗓️ 선택한 날짜의 일정</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = `/schedule?date=${selectedDateKey}`}
              className="px-3 py-2 border rounded-md transition"
              style={{ borderColor: '#E5E7EB' }}
            >
              날짜 보기
            </button>
            <button onClick={openAddModal} className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
              + 일정 추가
            </button>
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: '#E5E7EB' }}>
          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => showDetail(schedule.id)}
                  style={{ borderLeft: `4px solid ${schedule.color || '#2563EB'}` }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {schedule.time && <span className="font-semibold">{schedule.time}</span>}
                      <span className={`font-semibold ${schedule.completed ? 'line-through text-gray-400' : ''}`} style={{ color: '#1F2937' }}>
                        {schedule.title}
                      </span>
                    </div>
                    {schedule.memo && <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{schedule.memo}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: '#6B7280' }}>이 날짜에 일정이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>✅ 해야 할일</h2>
          <div className="flex gap-2">
            <a href="/todos/month" className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>전체보기</a>
            <button onClick={() => setShowTodoModal(true)} className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">+할일</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {todoCards.map((card) => (
            <div key={card.date} className="border rounded-lg p-4 flex flex-col overflow-y-auto" style={{ borderColor: '#E5E7EB', minHeight: 160, maxHeight: 200 }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#1F2937' }}>
                    {formatKoreanDate(card.date)}
              </div>
              {card.todos && card.todos.length > 0 ? (
                <div className="space-y-2">
                  {card.todos.map((todo) => (
                    <div key={todo.id} className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={(event) => handleToggleTodo(todo.id, event.target.checked)}
                        />
                        <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : ''}`}>{todo.title}</span>
                      </label>
                      <button onClick={() => handleDeleteTodo(todo.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#6B7280' }}>할 일이 없습니다.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>📋 이번 달 일정 목록</h2>
        </div>
        <div className="space-y-6">
          {schedulesByDateList.length > 0 ? (
            schedulesByDateList.map(([dateStr, daySchedules]) => (
              <div key={dateStr} className="border-b pb-4 last:border-b-0" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h3
                    className="text-lg font-semibold cursor-pointer hover:text-blue-600"
                    style={{ color: '#1F2937' }}
                    onClick={() => window.location.href = `/schedule?date=${dateStr}`}
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
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
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
      </section>

      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>할일 추가</h3>
              <button onClick={() => setShowTodoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleAddTodo}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>제목 *</label>
                <input type="text" name="title" required className="w-full p-3 border rounded-md text-lg font-medium" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDateKey}
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowTodoModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>일정 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleAddSchedule}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>제목 *</label>
                <input type="text" name="title" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} placeholder="예: 회의, 독서, 운동" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜 선택</label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>시작 날짜</label>
                    <input
                      type="date"
                      name="start_date"
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
                      style={{ borderColor: '#E5E7EB' }}
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>종료 날짜를 선택하면 해당 기간의 모든 날짜에 일정이 추가됩니다</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>또는 캘린더에서 Ctrl + 클릭으로 여러 날짜 선택</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDateBadges.map((dateStr) => (
                      <span key={dateStr} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                        {formatShortDate(dateStr)}
                      </span>
                    ))}
                  </div>
                </div>
                <input type="hidden" name="dates" value={selectedDateBadges.join(',')} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>시간 (선택)</label>
                  <input type="time" name="time" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 / 장소 (선택)</label>
                <textarea name="memo" rows="2" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} placeholder="프로젝트 공유" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>일정 상세</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
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
                <button className="btn-primary px-4 py-2 text-white rounded-md" onClick={() => alert('수정 기능은 추후 구현 예정입니다.')}>수정</button>
                <button className="px-4 py-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} onClick={() => deleteSchedule(detailContent.id)}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePage;

