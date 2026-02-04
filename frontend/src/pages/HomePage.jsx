import React, { useMemo, useState } from 'react';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
};

function HomePage({
  currentYear,
  currentMonth,
  todayFormatted,
  weekdayName,
  today,
  calendar = [],
  scheduleCount = {},
  scheduleTitles = {},
  totalIncome = 0,
  totalExpense = 0,
  totalNet = 0,
  todaySchedules = [],
  todayTodos = [],
}) {
  const [showTodoModal, setShowTodoModal] = useState(false);

  const todayKey = useMemo(() => toDateKey(today), [today]);

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

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            📆 {currentYear}년 {currentMonth}월
          </h2>
          <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            {todayFormatted} {weekdayName}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#1F2937' }}>
                {['월', '화', '수', '목', '금', '토', '일'].map((label) => (
                  <th key={label} className="border p-3 text-center font-semibold text-white">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendar.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((dayData, dayIndex) => {
                    const dayKey = toDateKey(dayData?.date);
                    const isToday = dayKey && dayKey === todayKey;
                    const dayScheduleTitles = scheduleTitles?.[dayData?.day] || [];
                    const dayScheduleCount = scheduleCount?.[dayData?.day] || 0;
                    return (
                      <td
                        key={`day-${weekIndex}-${dayIndex}`}
                        className={`border p-4 calendar-day ${isToday ? 'calm-blue-light' : ''}`}
                        style={{ borderColor: '#E5E7EB' }}
                      >
                        {dayData ? (
                          <div className="text-center">
                            <div className="font-semibold text-lg mb-2 flex items-center justify-center gap-1">
                              <span>{dayData.day}</span>
                              {dayScheduleCount > 0 && (
                                <span className="inline-block w-2 h-2 rounded-full calm-blue-bg" />
                              )}
                            </div>
                            {dayScheduleTitles.length > 0 && (
                              <div className="mt-2 space-y-1 text-xs" style={{ color: '#6B7280' }}>
                                {dayScheduleTitles.slice(0, 3).map((title, idx) => (
                                  <div key={`${dayKey}-${idx}`} className="truncate">
                                    {title}
                                  </div>
                                ))}
                                {dayScheduleTitles.length > 3 && (
                                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
                                    + {dayScheduleTitles.length - 3}건
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

        <div className="mt-8 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>
            💳 지출 요약
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg">
              <div className="text-sm mb-1" style={{ color: '#6B7280' }}>
                수입
              </div>
              <div className="text-2xl income-color">{totalIncome.toLocaleString()}원</div>
            </div>
            <div className="text-center p-4 rounded-lg">
              <div className="text-sm mb-1" style={{ color: '#6B7280' }}>
                지출
              </div>
              <div className="text-2xl" style={{ color: '#F87171' }}>
                {totalExpense.toLocaleString()}원
              </div>
            </div>
            <div className="text-center p-4 rounded-lg">
              <div className="text-sm mb-1" style={{ color: '#6B7280' }}>
                합계
              </div>
              <div className={`text-2xl ${totalNet >= 0 ? 'income-color' : 'expense-color'}`}>
                {totalNet >= 0 ? '+' : ''}
                {totalNet.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            📋 오늘 일정
          </h2>
          <button
            onClick={() => (window.location.href = '/schedule')}
            className="btn-primary px-4 py-2 text-white rounded-md font-medium transition"
          >
            +일정
          </button>
        </div>
        {todaySchedules.length > 0 ? (
          <div className="space-y-2">
            {todaySchedules.map((schedule) => (
              <div
                key={schedule.id || schedule.title}
                className="flex items-center gap-2 p-2 rounded-md border"
                style={{ borderColor: '#E5E7EB' }}
              >
                {schedule.time && <span className="text-sm font-semibold">{schedule.time}</span>}
                <span className="font-medium" style={{ color: '#1F2937' }}>
                  {schedule.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6B7280' }}>오늘 일정이 없습니다.</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            ✅ 해야 할일
          </h2>
          <button
            onClick={() => setShowTodoModal(true)}
            className="btn-primary px-4 py-2 text-white rounded-md font-medium transition"
          >
            +할일
          </button>
        </div>
        {todayTodos.length > 0 ? (
          <div className="space-y-2">
            {todayTodos.map((todo) => (
              <div
                key={todo.id || todo.title}
                className="flex items-center justify-between p-2 rounded-md border"
                style={{ borderColor: '#E5E7EB' }}
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
          <p style={{ color: '#6B7280' }}>오늘 할 일이 없습니다.</p>
        )}
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
              <input type="hidden" name="date" value={todayKey} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowTodoModal(false)}
                  className="px-4 py-2 border rounded-md transition"
                  style={{ borderColor: '#E5E7EB' }}
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







