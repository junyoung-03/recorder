import React, { useMemo } from 'react';

const monthFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' });

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCalendarGrid = (year, month) => {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const weeks = [];
  let cursor = new Date(start);
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
};

function MonthlyCalendar({
  year,
  month,
  events = [],
  selectedDate,
  holidayDates = [],
  onDateClick,
  onPrevMonth,
  onNextMonth,
  onToday,
  compact = false,
  summaryByDate = null,
  summaryThreshold = 3,
}) {
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const holidaySet = useMemo(() => new Set(holidayDates || []), [holidayDates]);
  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = toDateKey(event.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [events]);

  const weeks = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const headerTextClass = compact ? 'text-sm' : 'text-base';
  const headerPaddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';
  const dayLabelClass = compact ? 'px-1 py-1 text-xs' : 'px-2 py-2 text-sm';
  const dayCellClass = compact
    ? 'min-h-[56px] border border-slate-100 text-left px-1 py-1 hover:bg-slate-50 transition'
    : 'min-h-[90px] border border-slate-100 text-left px-2 py-1 hover:bg-slate-50 transition';
  const showEvents = !compact;

  return (
    <div className="bg-white border border-warm rounded-2xl shadow-sm">
      <div className={`flex items-center justify-between border-b border-warm ${headerPaddingClass}`}>
        <div className={`${headerTextClass} font-semibold text-slate-700`}>{monthFormatter.format(new Date(year, month - 1, 1))}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToday} className="text-xs px-3 py-1.5 rounded-full border border-warm text-slate-600">
            오늘
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onPrevMonth} className="w-7 h-7 rounded-full border border-warm text-slate-500">‹</button>
            <button type="button" onClick={onNextMonth} className="w-7 h-7 rounded-full border border-warm text-slate-500">›</button>
          </div>
        </div>
      </div>
      <div className={`grid grid-cols-7 text-slate-500 px-2 pt-2 font-semibold ${compact ? 'text-[11px]' : 'text-sm'}`}>
        {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
          <div key={label} className={`text-center ${dayLabelClass}`}>{label}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${compact ? 'text-xs' : 'text-sm'}`}>
        {weeks.flat().map((date) => {
          const key = toDateKey(date);
          const isCurrentMonth = date.getMonth() + 1 === month;
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const isHoliday = holidaySet.has(key);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const dayEvents = eventMap.get(key) || [];
          const summaryText = summaryByDate ? summaryByDate[key] : null;
          const useSummary = Boolean(summaryText) && dayEvents.length >= summaryThreshold;
          const displayEvents = useSummary ? [] : dayEvents.slice(0, 2);
          const remaining = useSummary ? dayEvents.length : dayEvents.length - displayEvents.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDateClick(date)}
              className={`${dayCellClass} ${
                isWeekend ? 'calendar-weekend-bg' : ''
              }`}
            >
              <div className="flex justify-end">
                <div
                  className={`mt-1 mr-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
                    isSelected ? 'bg-red-500 text-white' : ''
                  } ${isToday && !isSelected ? 'border border-slate-300 text-slate-700' : ''}`}
                >
                  <span
                    className={`${
                      !isCurrentMonth ? 'text-slate-300' : 'text-slate-800'
                    } ${isHoliday ? 'calendar-holiday-text' : ''} ${isSelected ? 'text-white' : ''}`}
                  >
                    {date.getDate()}
                  </span>
                </div>
              </div>
              {showEvents ? (
                <div className="mt-1 space-y-1">
                  {useSummary && (
                    <div className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 truncate">
                      {summaryText}
                    </div>
                  )}
                  {displayEvents.map((event) => (
                    <div key={event.id} className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 truncate">
                      {event.title}
                    </div>
                  ))}
                  {remaining > 0 && (
                    <div className="text-[11px] text-slate-400">{remaining}건수</div>
                  )}
                </div>
              ) : (
                dayEvents.length > 0 && (
                  <div className="mt-1 flex justify-end">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MonthlyCalendar;

