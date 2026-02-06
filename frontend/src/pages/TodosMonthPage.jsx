import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import EmptyState from '../components/ui/EmptyState';
import { supabase } from '../lib/supabaseClient';

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

function TodosMonthPage({ currentUser }) {
  const today = useMemo(() => new Date(), []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [currentYear, setCurrentYear] = useState(() => Number(urlParams.get('year')) || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => Number(urlParams.get('month')) || today.getMonth() + 1);
  const [cards, setCards] = useState([]);
  const yearOptions = useMemo(() => Array.from({ length: 7 }, (_, idx) => today.getFullYear() - 5 + idx), [today]);

  const loadTodos = async (userId, year, month) => {
    if (!userId) return;
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('created_at', { ascending: false });
    const grouped = new Map();
    (data || []).forEach((todo) => {
      const key = todo.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(todo);
    });
    const totalDays = new Date(year, month, 0).getDate();
    const nextCards = [];
    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = new Date(year, month - 1, day).toISOString().slice(0, 10);
      nextCards.push({ date: dateKey, todos: grouped.get(dateKey) || [] });
    }
    setCards(nextCards);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadTodos(currentUser.id, currentYear, currentMonth);
  }, [currentUser?.id, currentYear, currentMonth]);

  const handleToggle = async (todoId) => {
    const current = cards.flatMap((card) => card.todos || []).find((todo) => todo.id === todoId);
    if (!current) return;
    const nextValue = !current.completed;
    await supabase.from('todos').update({ completed: nextValue }).eq('id', todoId);
    setCards((prev) =>
      prev.map((card) => ({
        ...card,
        todos: card.todos?.map((todo) => (todo.id === todoId ? { ...todo, completed: nextValue } : todo)) || [],
      })),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="할 일"
        description="이번 달 해야 할 일을 카드 형태로 정리하고 완료 상태를 관리하세요."
        actions={[
          { label: '닫기', onClick: () => window.history.back(), variant: 'secondary' },
        ]}
      />

      <FilterBar>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (currentUser?.id) {
              loadTodos(currentUser.id, currentYear, currentMonth);
            }
          }}
        >
          <select
            name="year"
            className="px-3 py-2 border border-slate-200 rounded-md"
            value={currentYear}
            onChange={(event) => setCurrentYear(Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
          <select
            name="month"
            className="px-3 py-2 border border-slate-200 rounded-md"
            value={currentMonth}
            onChange={(event) => setCurrentMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
          <button type="submit" className="btn-primary px-4 py-2 text-sm font-semibold">조회</button>
        </form>
      </FilterBar>

      {cards.length > 0 ? (
        <section className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div key={card.date} className="border border-warm rounded-xl p-3 flex flex-col overflow-y-auto motion-card" style={{ minHeight: 140, maxHeight: 180 }}>
                <div className="text-body font-semibold mb-2">
                  {formatKoreanDate(card.date)}
                </div>
                {card.todos && card.todos.length > 0 ? (
                  <div className="space-y-2">
                    {card.todos.map((todo) => (
                      <div key={todo.id} className="flex items-center gap-2 transition-all duration-150 ease-out">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggle(todo.id)}
                          className="transition-transform duration-150 ease-out checked:scale-110"
                        />
                        <span className={`text-xs transition-colors duration-150 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                          {todo.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">할 일이 없습니다.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="이번 달 할 일이 없습니다."
          description="새로운 할 일을 추가하면 월간 카드에서 한눈에 확인할 수 있어요."
          action={{ label: '할 일 추가', href: '/schedule' }}
        />
      )}
    </div>
  );
}

export default TodosMonthPage;

