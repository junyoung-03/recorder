import React, { useState } from 'react';

function FriendJournalPage({
  friendUser,
  journals = [],
  likedJournalIds = [],
  friendsList = [],
  categories = [],
  categoryCounts = {},
}) {
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

  const visibleJournals = activeCategory ? getCategoryJournals(activeCategory) : journals;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: '#6B7280' }}>Friend Blog</p>
            <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              {friendUser?.nickname || friendUser?.username}님의 일기 블로그
            </h2>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <aside className="w-full lg:w-72 space-y-4 lg:order-1">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg">🙂</div>
              <div>
                <div className="font-semibold" style={{ color: '#1F2937' }}>
                  {friendUser?.nickname || friendUser?.username}
                </div>
                <div className="text-xs" style={{ color: '#6B7280' }}>친구의 일기</div>
              </div>
            </div>
            <div className="mt-4 text-xs" style={{ color: '#6B7280' }}>
              총 글 {journals.length}개
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-red-500">
              <span>카테고리</span>
            </div>
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
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveCategory((prev) => (prev === category.name ? null : category.name))}
                    className="text-left hover:underline"
                  >
                    {category.name}
                  </button>
                  <span className="text-xs text-gray-400">({categoryCounts[category.name] || 0})</span>
                </div>
              ))}
            </div>
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
                  <div key={journal.id} className="block truncate" style={{ color: '#374151' }}>
                    {journal.title || '제목 없음'}
                  </div>
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
          {visibleJournals.length > 0 ? (
            visibleJournals.map((journal) => (
              <article key={journal.id} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm" style={{ color: '#6B7280' }}>{journal.date}</p>
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                    {journal.visibility}
                  </span>
                </div>
                <div className="text-xl font-semibold" style={{ color: '#1F2937' }}>
                  {journal.title || '제목 없음'}
                </div>
                <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
                  {journal.preview || journal.content?.slice(0, 180)}
                  {(journal.content || '').length > 180 ? '...' : ''}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs" style={{ color: '#6B7280' }}>
                  <form method="post" action={`/journal/${journal.id}/like`}>
                    <input type="hidden" name="next" value={`/friend/${friendUser?.id}/journal`} />
                    <button
                      type="submit"
                      className={`text-xs px-2 py-1 rounded border ${
                        likedJournalIds.includes(journal.id) ? 'calm-blue-bg text-white' : 'text-gray-600'
                      }`}
                    >
                      {likedJournalIds.includes(journal.id) ? '좋아요 취소' : '좋아요'}
                    </button>
                  </form>
                  <span>좋아요 {journal.likes?.length || 0}</span>
                  <span>댓글 {journal.comments?.length || 0}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center" style={{ color: '#6B7280' }}>
              공유된 일기가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendJournalPage;






