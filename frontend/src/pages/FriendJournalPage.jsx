import React from 'react';

function FriendJournalPage({ friendUser, journals = [], likedJournalIds = [], friendsList = [] }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold" style={{ color: '#1F2937' }}>
            {friendUser?.nickname || friendUser?.username}
          </span>
          <span className="text-sm" style={{ color: '#6B7280' }}>님의 일기</span>
        </div>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>
            📰 일기
          </h2>
          {journals.length > 0 ? (
            <div className="space-y-6">
              {journals.map((journal) => (
                <div key={journal.id} className="border rounded-lg p-5" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">🙂</div>
                    <div>
                      <div className="font-semibold" style={{ color: '#1F2937' }}>
                        {friendUser?.nickname || friendUser?.username}
                      </div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>{journal.date}</div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>
                    {journal.title || '제목 없음'}
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {journal.preview || journal.content?.slice(0, 200)}
                    {(journal.content || '').length > 200 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
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
                    <span className="text-xs" style={{ color: '#6B7280' }}>좋아요 {journal.likes?.length || 0}개</span>
                    <span className="text-xs" style={{ color: '#6B7280' }}>댓글 {journal.comments?.length || 0}개</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(journal.comments || []).map((comment) => (
                      <div key={comment.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold">{comment.user?.nickname || comment.user?.username}</span>
                          <span style={{ color: '#6B7280' }}> {comment.content}</span>
                        </div>
                        {(comment.canDelete || false) && (
                          <form method="post" action={`/journal/comments/${comment.id}/delete`}>
                            <input type="hidden" name="next" value={`/friend/${friendUser?.id}/journal`} />
                            <button type="submit" className="text-gray-400 hover:text-gray-600">삭제</button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                  <form method="post" action={`/journal/${journal.id}/comment`} className="mt-2 flex gap-2">
                    <input type="hidden" name="next" value={`/friend/${friendUser?.id}/journal`} />
                    <input type="text" name="content" placeholder="댓글 입력" className="flex-1 p-2 text-sm border rounded-md" style={{ borderColor: '#E5E7EB' }} />
                    <button type="submit" className="text-xs px-3 py-2 rounded btn-primary">등록</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: '#6B7280' }}>공유된 일기가 없습니다.</p>
          )}
        </section>
      </div>

      <aside className="w-full lg:w-64">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
            친구 목록
          </h3>
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
    </div>
  );
}

export default FriendJournalPage;






