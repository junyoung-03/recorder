import React from 'react';

function FriendsPage({ friendsList = [], incomingRequests = [], outgoingRequests = [] }) {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>
          👥 친구 관리
        </h2>
        <form method="post" action="/friends/request" className="flex gap-2">
          <input
            type="text"
            name="username"
            placeholder="친구 아이디 입력"
            className="flex-1 p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
          <button type="submit" className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
            요청
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          내 친구
        </h3>
        {friendsList.length > 0 ? (
          <div className="space-y-2">
            {friendsList.map((friend) => (
              <div
                key={friend.id || friend.username}
                className="flex items-center justify-between border rounded-md p-3"
                style={{ borderColor: '#E5E7EB' }}
              >
                <span>{friend.nickname || friend.username}</span>
                <form method="post" action={`/friends/remove/${friend.id}`}>
                  <button type="submit" className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                    삭제
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#6B7280' }}>친구가 없습니다.</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          받은 요청
        </h3>
        {incomingRequests.length > 0 ? (
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div
                key={req.id || req.user?.username}
                className="flex items-center justify-between border rounded-md p-3"
                style={{ borderColor: '#E5E7EB' }}
              >
                <span>{req.user?.nickname || req.user?.username}</span>
                <form method="post" action={`/friends/accept/${req.id}`}>
                  <button type="submit" className="btn-primary text-xs px-2 py-1 rounded">
                    수락
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#6B7280' }}>받은 요청이 없습니다.</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          보낸 요청
        </h3>
        {outgoingRequests.length > 0 ? (
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <div
                key={req.id || req.friend?.username}
                className="flex items-center justify-between border rounded-md p-3"
                style={{ borderColor: '#E5E7EB' }}
              >
                <span>{req.friend?.nickname || req.friend?.username}</span>
                <form method="post" action={`/friends/remove/${req.friend_id}`}>
                  <button type="submit" className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                    취소
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#6B7280' }}>보낸 요청이 없습니다.</p>
        )}
      </section>
    </div>
  );
}

export default FriendsPage;






