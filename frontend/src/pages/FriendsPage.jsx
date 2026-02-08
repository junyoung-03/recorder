import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import EmptyState from '../components/ui/EmptyState';
import { supabase } from '../lib/supabaseClient';
import { useInViewOnce } from '../hooks/useInViewOnce';

function FriendsPage({ currentUser }) {
  const [friendsList, setFriendsList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [identifier, setIdentifier] = useState('');
  const [requestError, setRequestError] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const reduceMotion = useReducedMotion();

  const FriendRow = ({ children }) => {
    const ref = useRef(null);
    const isInView = useInViewOnce(ref);
    return (
      <motion.div
        ref={ref}
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    );
  };

  const loadFriends = async (userId) => {
    if (!userId) return;
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
    const accepted = (friendships || []).filter((row) => row.status === 'accepted');
    const incoming = (friendships || []).filter((row) => row.status === 'pending' && row.friend_id === userId);
    const outgoing = (friendships || []).filter((row) => row.status === 'pending' && row.user_id === userId);

    const friendIds = accepted.map((row) => (row.user_id === userId ? row.friend_id : row.user_id));
    const incomingIds = incoming.map((row) => row.user_id);
    const outgoingIds = outgoing.map((row) => row.friend_id);
    const allIds = Array.from(new Set([...friendIds, ...incomingIds, ...outgoingIds]));

    let usersMap = new Map();
    if (allIds.length) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, nickname')
        .in('id', allIds);
      usersMap = new Map((usersData || []).map((user) => [user.id, user]));
    }

    setFriendsList(friendIds.map((id) => usersMap.get(id)).filter(Boolean));
    setIncomingRequests(incoming.map((row) => ({ id: row.id, user: usersMap.get(row.user_id) })));
    setOutgoingRequests(outgoing.map((row) => ({ id: row.id, friend_id: row.friend_id, friend: usersMap.get(row.friend_id) })));
  };

  const handleSendRequest = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) {
      setRequestError('로그인이 필요합니다.');
      return;
    }
    const trimmed = identifier.trim();
    if (!trimmed) {
      setRequestError('친구 ID 또는 아이디를 입력해주세요.');
      return;
    }
    setRequestError('');
    setSendingRequest(true);
    let target = null;
    if (trimmed.includes('-')) {
      const { data } = await supabase.from('users').select('id, username, nickname').eq('id', trimmed).maybeSingle();
      target = data;
    }
    if (!target) {
      const { data } = await supabase.from('users').select('id, username, nickname').eq('username', trimmed).maybeSingle();
      target = data;
    }
    if (!target) {
      setSendingRequest(false);
      setRequestError('해당 사용자를 찾을 수 없습니다.');
      return;
    }
    if (target.id === currentUser.id) {
      setSendingRequest(false);
      setRequestError('본인에게는 친구 요청을 보낼 수 없습니다.');
      return;
    }
    const { error: requestError } = await supabase
      .from('friendships')
      .insert([{ user_id: currentUser.id, friend_id: target.id, status: 'pending' }]);
    setSendingRequest(false);
    if (requestError) {
      setRequestError('이미 요청했거나 요청을 보낼 수 없습니다.');
      return;
    }
    setIdentifier('');
    loadFriends(currentUser.id);
  };

  const handleAccept = async (requestId) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    loadFriends(currentUser?.id);
  };

  const handleRemove = async (targetId) => {
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${currentUser.id})`);
    loadFriends(currentUser?.id);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadFriends(currentUser.id);
  }, [currentUser?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="친구"
        description="친구를 추가하고 서로의 기록을 공유해보세요."
        actions={[{ label: '친구 요청', href: '#friend-request', variant: 'primary' }]}
      />

      <section id="friend-request" className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
          친구 요청 보내기
        </h3>
        <form className="flex flex-wrap gap-2" onSubmit={handleSendRequest}>
          <input
            type="text"
            name="username"
            placeholder="친구 ID 또는 아이디 입력"
            className="flex-1 p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <button
            type="submit"
            disabled={sendingRequest}
            className="btn-primary px-4 py-2 text-white rounded-md font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sendingRequest ? '요청 중...' : '요청'}
          </button>
        </form>
        {requestError && <p className="mt-2 text-sm text-red-500">{requestError}</p>}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          내 친구
        </h3>
        {friendsList.length > 0 ? (
          <div className="space-y-2">
            {friendsList.map((friend) => (
              <FriendRow key={friend.id || friend.username}>
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border rounded-md p-3 motion-card"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <a href={`/friend/${friend.id}/journal`} className="font-semibold text-slate-800 hover:underline">
                    {friend.nickname || friend.username}
                  </a>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemove(friend.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </FriendRow>
            ))}
          </div>
        ) : (
          <EmptyState
            title="친구가 없습니다."
            description="아이디 또는 친구 ID로 친구를 추가해보세요."
          />
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          받은 요청
        </h3>
        {incomingRequests.length > 0 ? (
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <FriendRow key={req.id || req.user?.username}>
                <div
                  className="flex items-center justify-between border rounded-md p-3 motion-card"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <span>{req.user?.nickname || req.user?.username}</span>
                  <button type="button" onClick={() => handleAccept(req.id)} className="btn-primary text-xs px-2 py-1 rounded">
                    수락
                  </button>
                </div>
              </FriendRow>
            ))}
          </div>
        ) : (
          <EmptyState
            title="받은 요청이 없습니다."
            description="새로운 친구 요청이 도착하면 이곳에 표시됩니다."
          />
        )}
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold mb-3" style={{ color: '#1F2937' }}>
          보낸 요청
        </h3>
        {outgoingRequests.length > 0 ? (
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <FriendRow key={req.id || req.friend?.username}>
                <div
                  className="flex items-center justify-between border rounded-md p-3 motion-card"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <span>{req.friend?.nickname || req.friend?.username}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(req.friend_id)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
                  >
                    취소
                  </button>
                </div>
              </FriendRow>
            ))}
          </div>
        ) : (
          <EmptyState
            title="보낸 요청이 없습니다."
            description="요청을 보내면 상대방이 수락할 때까지 이곳에 표시됩니다."
          />
        )}
      </section>
    </div>
  );
}

export default FriendsPage;






