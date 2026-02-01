import React, { useState } from 'react';

function JournalDetailPage({ journal, liked = false, journals = [], friendsList = [], categories: initialCategories = [], categoryCounts = {} }) {
  if (!journal) {
    return null;
  }

  const [categoryOpen, setCategoryOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [categoryAddMode, setCategoryAddMode] = useState(false);

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

  const getCategoryJournals = (categoryKey) => {
    if (categoryKey === 'all') {
      return journals;
    }
    if (categoryKey === '__uncategorized') {
      return journals.filter((entry) => !entry.category);
    }
    return journals.filter((entry) => entry.category === categoryKey);
  };

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <aside className="w-full lg:w-72 space-y-4">
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
                    if (categoryEditMode) {
                      setCategoryAddMode(false);
                    }
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
                  <span className="text-xs text-gray-400">({journals.length})</span>
                </div>
                {activeCategory === 'all' && (
                  <div className="ml-2 space-y-1 text-xs">
                    {getCategoryJournals('all').map((entry) => (
                      <a
                        key={entry.id}
                        href={`/journal/${entry.id}`}
                        className="block truncate hover:underline"
                        style={{ color: '#374151' }}
                      >
                        {entry.title || '제목 없음'}
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
                    {getCategoryJournals('__uncategorized').map((entry) => (
                      <a
                        key={entry.id}
                        href={`/journal/${entry.id}`}
                        className="block truncate hover:underline"
                        style={{ color: '#374151' }}
                      >
                        {entry.title || '제목 없음'}
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
                        {getCategoryJournals(category.name).map((entry) => (
                          <a
                            key={entry.id}
                            href={`/journal/${entry.id}`}
                            className="block truncate hover:underline"
                            style={{ color: '#374151' }}
                          >
                            {entry.title || '제목 없음'}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryAddMode((prev) => !prev);
                      if (categoryAddMode) {
                        setNewCategory('');
                      }
                    }}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50 transition"
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
                        className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={!newCategory.trim()}
                        className="text-xs px-3 py-1.5 rounded-md border transition"
                        style={{
                          backgroundColor: newCategory.trim() ? '#F3F4F6' : '#FAFAFA',
                          borderColor: '#E5E7EB',
                          color: newCategory.trim() ? '#6B7280' : '#D1D5DB',
                          cursor: newCategory.trim() ? 'pointer' : 'not-allowed'
                        }}
                        onMouseEnter={(e) => {
                          if (newCategory.trim()) {
                            e.target.style.backgroundColor = '#E5E7EB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (newCategory.trim()) {
                            e.target.style.backgroundColor = '#F3F4F6';
                          }
                        }}
                      >
                        등록
                      </button>
                    </>
                  )}
                </div>
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
                {journals.slice(0, 5).map((recent) => (
                  <a key={recent.id} href={`/journal/${recent.id}`} className="block truncate hover:underline" style={{ color: '#374151' }}>
                    {recent.title || '제목 없음'}
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

        <div className="flex-1 bg-white rounded-lg shadow-md p-8">
          <div className="text-sm text-gray-400">게시판</div>
          <h2 className="mt-2 text-2xl font-semibold" style={{ color: '#1F2937' }}>{journal.title || '제목 없음'}</h2>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm" style={{ color: '#6B7280' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">🙂</div>
              <div className="flex items-center gap-2">
                <span>나</span>
                <span>·</span>
                <span>{journal.date}</span>
                <span>·</span>
                <span>{journal.visibility}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span>좋아요 {journal.likes?.length || 0}</span>
              <span>댓글 {journal.comments?.length || 0}</span>
            </div>
          </div>

          <div className="mt-6 border-t" style={{ borderColor: '#E5E7EB' }} />

          <div className="mt-6 prose max-w-none whitespace-pre-line leading-relaxed" style={{ color: '#111827' }}>
            {journal.content}
          </div>

          <div className="mt-8 flex items-center gap-2">
            <form method="post" action={`/journal/${journal.id}/like`}>
              <input type="hidden" name="next" value={`/journal/${journal.id}`} />
              <button
                type="submit"
                className={`text-xs px-3 py-1 rounded border transition ${
                  liked
                    ? 'border-blue-200 text-blue-500 hover:bg-blue-50'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {liked ? '좋아요 취소' : '좋아요'}
              </button>
            </form>
          </div>

          <div className="mt-6 border-t" style={{ borderColor: '#E5E7EB' }} />

          <div className="mt-4 space-y-2">
            {(journal.comments || []).map((comment) => (
              <div key={comment.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold">{comment.user?.nickname || comment.user?.username}</span>
                  <span style={{ color: '#6B7280' }}> {comment.content}</span>
                </div>
                {(comment.canDelete || false) && (
                  <form method="post" action={`/journal/comments/${comment.id}/delete`}>
                    <input type="hidden" name="next" value={`/journal/${journal.id}`} />
                    <button type="submit" className="text-gray-400 hover:text-gray-600">삭제</button>
                  </form>
                )}
              </div>
            ))}
          </div>
          <form method="post" action={`/journal/${journal.id}/comment`} className="mt-3 flex gap-2">
            <input type="hidden" name="next" value={`/journal/${journal.id}`} />
            <input type="text" name="content" placeholder="댓글 입력" className="flex-1 p-2 text-sm border rounded-md" style={{ borderColor: '#E5E7EB' }} />
            <button type="submit" className="text-xs px-3 py-2 rounded btn-primary">등록</button>
          </form>

          <div className="flex gap-2 mt-6">
            <a
              href={`/journal/${journal.id}/edit`}
              className="px-3 py-1 text-xs rounded-md border border-blue-200 text-blue-500 hover:bg-blue-50 transition"
            >
              수정
            </a>
            <form
              method="post"
              action={`/journal/${journal.id}/delete`}
              onSubmit={(event) => {
                if (!confirm('정말 삭제하시겠습니까?')) {
                  event.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-400 hover:bg-red-50 transition"
              >
                삭제
              </button>
            </form>
            <a href="/journal" className="px-3 py-1 text-xs rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition">목록</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default JournalDetailPage;

