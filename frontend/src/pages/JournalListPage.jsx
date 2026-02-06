import React, { useEffect, useMemo, useState } from 'react';
import MonthlyCalendar from '../components/MonthlyCalendar';
import EmptyState from '../components/ui/EmptyState';
import { supabase } from '../lib/supabaseClient';

const visibilityMeta = {
  private: { label: '나만 보기' },
  friends: { label: '친구 공개' },
  public: { label: '전체 공개' },
};

const visibilityIcon = (visibility) => {
  if (visibility === 'public') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 10 10M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }
  if (visibility === 'friends') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 20a4 4 0 0 1 8 0m2 0a4 4 0 0 1 8 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 10V7a6 6 0 1 1 12 0v3m-9 0h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
    </svg>
  );
};

function JournalListPage({ currentUser }) {
  const [journals, setJournals] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [categoryAddMode, setCategoryAddMode] = useState(false);
  const [goals, setGoals] = useState(['', '', '']);
  const [goalsEditMode, setGoalsEditMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('recorder-monthly-goals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setGoals(parsed.map((item) => (typeof item === 'string' ? item : '')));
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const loadJournalData = async () => {
      const { data: journalData } = await supabase
        .from('journals')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      setJournals(journalData || []);

      const { data: categoryData } = await supabase
        .from('journal_categories')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      setCategories(categoryData || []);

      const { data: friendshipData } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
      const friendIds = (friendshipData || []).map((row) =>
        row.user_id === currentUser.id ? row.friend_id : row.user_id,
      );
      if (friendIds.length) {
        const { data: friendsData } = await supabase
          .from('users')
          .select('id, username, nickname')
          .in('id', friendIds);
        setFriendsList(friendsData || []);
      } else {
        setFriendsList([]);
      }
    };
    loadJournalData();
  }, [currentUser?.id]);

  const handleGoalChange = (index, value) => {
    setGoals((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleGoalsSave = () => {
    localStorage.setItem('recorder-monthly-goals', JSON.stringify(goals));
    setGoalsEditMode(false);
  };

  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const categoryCounts = useMemo(() => {
    const counts = { __uncategorized: 0 };
    journals.forEach((journal) => {
      if (journal.category) {
        counts[journal.category] = (counts[journal.category] || 0) + 1;
      } else {
        counts.__uncategorized += 1;
      }
    });
    return counts;
  }, [journals]);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const exists = categories.some((category) => category.name === trimmed);
    if (exists) {
      setNewCategory('');
      setCategoryAddMode(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('journal_categories')
        .insert([{ user_id: currentUser.id, name: trimmed }])
        .select()
        .single();
      if (error) {
        return;
      }
      if (data) {
        setCategories((prev) => [...prev, data]);
        setNewCategory('');
        setCategoryAddMode(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCategoryKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCategory();
    }
  };

  const handleRemoveCategory = async (categoryId) => {
    try {
      const { error } = await supabase.from('journal_categories').delete().eq('id', categoryId);
      if (error) {
        return;
      }
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-warm-surface border border-warm rounded-2xl px-6 py-6 shadow-sm motion-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-title">일기</h2>
            <p className="text-body mt-2">오늘의 생각과 하루를 플래너처럼 정리해 보세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/journal/new" className="btn-primary px-4 py-2 text-white text-sm font-semibold">
              + 새 글
            </a>
            <a href="/journal" className="btn-secondary px-4 py-2 text-sm font-semibold">
              이번 달 보기
            </a>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <h3 className="text-body font-semibold mb-3">월간 캘린더</h3>
            <MonthlyCalendar
              year={currentYear}
              month={currentMonth}
              selectedDate={currentDate}
              holidayDates={[]}
              events={[]}
              onDateClick={() => {}}
              onPrevMonth={() => {}}
              onNextMonth={() => {}}
              onToday={() => {}}
              compact
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-semibold">카테고리</h3>
              <button
                type="button"
                onClick={() => {
                  setCategoryEditMode((prev) => !prev);
                  if (categoryEditMode) {
                    setCategoryAddMode(false);
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                {categoryEditMode ? 'DONE' : 'EDIT'}
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>전체보기</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-warm-surface text-slate-600">{journals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>일반</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-warm-surface text-slate-600">{categoryCounts.__uncategorized || 0}</span>
              </div>
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warm-surface text-slate-600">{categoryCounts[category.name] || 0}</span>
                    {categoryEditMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(category.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                        aria-label={`${category.name} 삭제`}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryAddMode((prev) => !prev);
                    if (categoryAddMode) {
                      setNewCategory('');
                    }
                  }}
                  className="w-7 h-7 rounded-full border border-warm flex items-center justify-center text-sm hover:bg-warm-surface transition"
                  aria-label="카테고리 추가"
                >
                  +
                </button>
                {categoryAddMode && (
                  <>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      onBlur={() => {
                        if (!newCategory.trim()) {
                          setCategoryAddMode(false);
                        }
                      }}
                      placeholder="카테고리 이름 입력"
                      className="flex-1 text-sm border border-warm rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="text-xs px-3 py-1.5 rounded-md border transition"
                      style={{
                        backgroundColor: newCategory.trim() ? '#F8F5EE' : '#FAFAFA',
                        borderColor: '#E5D7C6',
                        color: newCategory.trim() ? '#6B7280' : '#D1D5DB',
                        cursor: newCategory.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      등록
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <h3 className="text-body font-semibold mb-3">최근 글</h3>
            <div className="space-y-2 text-sm">
              {journals.slice(0, 5).map((journal) => (
                <a key={journal.id} href={`/journal/${journal.id}`} className="block truncate hover:underline" style={{ color: '#374151' }}>
                  {journal.title || '제목 없음'}
                </a>
              ))}
              {journals.length === 0 && (
                <div className="text-xs" style={{ color: '#6B7280' }}>최근 글이 없습니다.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <h3 className="text-body font-semibold mb-3">친구</h3>
            {friendsList.length > 0 ? (
              <div className="space-y-2">
                {friendsList.map((friend) => (
                  <a
                    key={friend.id || friend.username}
                    href={`/friend/${friend.id}/journal`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md bg-warm-surface hover:bg-warm-accent transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">🙂</div>
                    <span className="text-sm">{friend.nickname || friend.username}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#6B7280' }}>친구가 없습니다.</p>
            )}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-card-title">이달의 목표 3가지</h3>
              {goalsEditMode ? (
                <button type="button" onClick={handleGoalsSave} className="btn-primary px-3 py-1.5 text-white text-xs font-semibold">
                  저장
                </button>
              ) : (
                <button type="button" onClick={() => setGoalsEditMode(true)} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
                  수정
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['올해의 목표', '이번 달 집중', '오늘의 작은 성취'].map((label, index) => (
                <div key={label} className="bg-warm-surface border border-warm rounded-2xl p-4 motion-card">
                  <div className="text-muted mb-2">{label}</div>
                  {goalsEditMode ? (
                    <input
                      type="text"
                      value={goals[index]}
                      onChange={(event) => handleGoalChange(index, event.target.value)}
                      placeholder="새 목표를 적어보세요"
                      className="w-full bg-white border border-warm rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  ) : (
                    <div className="text-body font-semibold">{goals[index] || '새 목표를 적어보세요'}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-warm p-5 motion-card">
            <h3 className="text-card-title mb-4">최근 일기</h3>
            {journals.length > 0 ? (
              <div className="space-y-4">
                {journals.map((journal) => {
                  const visibility = visibilityMeta[journal.visibility] || { label: journal.visibility };
                  return (
                    <article key={journal.id} className="bg-warm-surface rounded-2xl border border-warm p-6 motion-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-white text-slate-600 border border-warm">
                            {journal.category || '일반'}
                          </span>
                          <span className="text-xs text-slate-500">{journal.date}</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-white text-slate-500 flex items-center gap-1 border border-warm">
                          {visibilityIcon(journal.visibility)}
                          {visibility.label}
                        </span>
                      </div>
                      <a href={`/journal/${journal.id}`} className="text-card-title hover:underline">
                        {journal.title || '제목 없음'}
                      </a>
                      <p className="text-body mt-2 leading-6 text-slate-600 line-clamp-3">
                        {journal.preview || journal.content?.slice(0, 180)}
                        {(journal.content || '').length > 180 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-muted">
                        <span>좋아요 {journal.likes?.length || 0}</span>
                        <span>댓글 {journal.comments?.length || 0}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="작성된 일기가 없습니다."
                description="첫 번째 글을 작성해 보세요."
                action={{ label: '새 글 작성', href: '/journal/new' }}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default JournalListPage;

