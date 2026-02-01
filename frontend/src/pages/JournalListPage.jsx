import React, { useState } from 'react';

function JournalListPage({ journals = [], friendsList = [], categories: initialCategories = [], categoryCounts = {} }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const getCategoryJournals = (categoryKey) => {
    if (categoryKey === 'all') {
      return journals;
    }
    if (categoryKey === '__uncategorized') {
      return journals.filter((journal) => !journal.category);
    }
    return journals.filter((journal) => journal.category === categoryKey);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const exists = categories.some((category) => category.name === trimmed);
    if (exists) {
      setNewCategory('');
      return;
    }
    try {
      const response = await fetch('/journal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      if (payload.category) {
        setCategories((prev) => [...prev, payload.category]);
        setNewCategory('');
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
      const response = await fetch(`/journal/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        return;
      }
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: '#6B7280' }}>My Blog</p>
            <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              나의 일기 블로그
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a href="/journal/new" className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
              + 새 글
            </a>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <aside className="w-full lg:w-72 space-y-4 lg:order-1">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg">🙂</div>
              <div>
                <div className="font-semibold" style={{ color: '#1F2937' }}>나의 블로그</div>
                <div className="text-xs" style={{ color: '#6B7280' }}>오늘도 기록하는 하루</div>
              </div>
            </div>
            <div className="mt-4 text-xs" style={{ color: '#6B7280' }}>
              총 글 {journals.length}개
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setCategoryOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-red-500"
            >
              <span>카테고리</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCategoryEditMode((prev) => !prev);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {categoryEditMode ? 'DONE' : 'EDIT'}
                </button>
                <span>{categoryOpen ? '^' : 'v'}</span>
              </div>
            </button>
            {categoryOpen && (
              <div className="px-5 pb-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveCategory((prev) => (prev === 'all' ? null : 'all'))}
                    className="text-left hover:underline"
                  >
                    전체보기
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>({journals.length})</span>
                  </div>
                </div>
                {activeCategory === 'all' && (
                  <div className="ml-2 space-y-1 text-xs">
                    {getCategoryJournals('all').map((journal) => (
                      <a
                        key={journal.id}
                        href={`/journal/${journal.id}`}
                        className="block truncate hover:underline"
                        style={{ color: '#374151' }}
                      >
                        {journal.title || '제목 없음'}
                      </a>
                    ))}
                    {getCategoryJournals('all').length === 0 && (
                      <div className="text-xs" style={{ color: '#6B7280' }}>
                        글이 없습니다.
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveCategory((prev) => (prev === '__uncategorized' ? null : '__uncategorized'))}
                    className="text-left hover:underline"
                  >
                    일반
                  </button>
                  <span className="text-xs text-gray-400">({categoryCounts.__uncategorized || 0})</span>
                </div>
                {activeCategory === '__uncategorized' && (
                  <div className="ml-2 space-y-1 text-xs">
                    {getCategoryJournals('__uncategorized').map((journal) => (
                      <a
                        key={journal.id}
                        href={`/journal/${journal.id}`}
                        className="block truncate hover:underline"
                        style={{ color: '#374151' }}
                      >
                        {journal.title || '제목 없음'}
                      </a>
                    ))}
                    {getCategoryJournals('__uncategorized').length === 0 && (
                      <div className="text-xs" style={{ color: '#6B7280' }}>
                        글이 없습니다.
                      </div>
                    )}
                  </div>
                )}
                {categories.map((category) => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveCategory((prev) => (prev === category.name ? null : category.name))}
                        className="text-left hover:underline"
                      >
                        {category.name}
                      </button>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>({categoryCounts[category.name] || 0})</span>
                      {categoryEditMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(category.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                          aria-label={`${category.name} 삭제`}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                    {activeCategory === category.name && (
                      <div className="ml-2 space-y-1 text-xs">
                        {getCategoryJournals(category.name).map((journal) => (
                          <a
                            key={journal.id}
                            href={`/journal/${journal.id}`}
                            className="block truncate hover:underline"
                            style={{ color: '#374151' }}
                          >
                            {journal.title || '제목 없음'}
                          </a>
                        ))}
                        {getCategoryJournals(category.name).length === 0 && (
                          <div className="text-xs" style={{ color: '#6B7280' }}>
                            글이 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {categoryEditMode && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 transition"
                      aria-label="게시판 추가"
                    >
                      +
                    </button>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="게시판 이름 입력"
                      className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <button
              type="button"
              onClick={() => setRecentOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-red-500"
            >
              <span>최근 글</span>
              <span className="text-xs text-gray-400">{recentOpen ? '^' : 'v'}</span>
            </button>
            {recentOpen && (
              <div className="px-5 pb-4 space-y-2 text-sm">
                {journals.slice(0, 5).map((journal) => (
                  <a key={journal.id} href={`/journal/${journal.id}`} className="block truncate hover:underline" style={{ color: '#374151' }}>
                    {journal.title || '제목 없음'}
                  </a>
                ))}
                {journals.length === 0 && (
                  <div className="text-xs" style={{ color: '#6B7280' }}>최근 글이 없습니다.</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#1F2937' }}>친구</h3>
            {friendsList.length > 0 ? (
              <div className="space-y-2">
                {friendsList.map((friend) => (
                  <a
                    key={friend.id || friend.username}
                    href={`/friend/${friend.id}/journal`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition"
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

        <div className="flex-1 space-y-4 lg:order-2">
          {journals.length > 0 ? (
            journals.map((journal) => (
              <article key={journal.id} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm" style={{ color: '#6B7280' }}>{journal.date}</p>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                    {journal.visibility}
                  </span>
                </div>
                <a href={`/journal/${journal.id}`} className="text-xl font-semibold hover:underline" style={{ color: '#1F2937' }}>
                  {journal.title || '제목 없음'}
                </a>
                <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
                  {journal.preview || journal.content?.slice(0, 180)}
                  {(journal.content || '').length > 180 ? '...' : ''}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: '#6B7280' }}>
                  <span>좋아요 {journal.likes?.length || 0}</span>
                  <span>댓글 {journal.comments?.length || 0}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center" style={{ color: '#6B7280' }}>
              작성된 일기가 없습니다.
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}

export default JournalListPage;

