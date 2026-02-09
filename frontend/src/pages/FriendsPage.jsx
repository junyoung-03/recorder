import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { supabase } from '../lib/supabaseClient';
import { useInViewOnce } from '../hooks/useInViewOnce';

function FriendsPage({ currentUser }) {
  const [friendsList, setFriendsList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [identifier, setIdentifier] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestNotice, setRequestNotice] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const reduceMotion = useReducedMotion();
  const noticeTimer = useRef(null);

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

  const avatarColors = useMemo(
    () => ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-indigo-400', 'bg-purple-400'],
    [],
  );

  const normalizeAvatarUrl = (rawValue) => {
    if (!rawValue) return null;
    if (rawValue.startsWith('http')) {
      if (rawValue.includes('/storage/v1/object/') && !rawValue.includes('/storage/v1/object/public/')) {
        return rawValue.replace('/storage/v1/object/', '/storage/v1/object/public/');
      }
      return rawValue;
    }
    if (rawValue.startsWith('/') || rawValue.startsWith('data:')) {
      return rawValue;
    }
    const { data } = supabase.storage.from('photos').getPublicUrl(rawValue);
    return data?.publicUrl || null;
  };

  const Avatar = ({ name, username, url, size = 40 }) => {
    const label = (name || username || '?').trim();
    const initials = label.length <= 2 ? label : label.slice(0, 2);
    const colorIndex = label ? label.charCodeAt(0) % avatarColors.length : 0;
    const sizeClass = size === 32 ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    const normalizedUrl = normalizeAvatarUrl(url);
    if (normalizedUrl) {
      return <img src={normalizedUrl} alt={label} className={`rounded-full object-cover border border-slate-200 ${sizeClass}`} />;
    }
    return (
      <div className={`rounded-full flex items-center justify-center text-white font-semibold ${avatarColors[colorIndex]} ${sizeClass}`}>
        {initials}
      </div>
    );
  };

  const formatRequestDate = (dateValue) => {
    if (!dateValue) return '';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
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
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, nickname, avatar_url')
        .in('id', allIds);
      let resolvedUsers = usersData;
      if (usersError) {
        const fallback = await supabase
          .from('users')
          .select('id, username, nickname')
          .in('id', allIds);
        resolvedUsers = fallback.data;
      }
      usersMap = new Map((resolvedUsers || []).map((user) => [user.id, user]));
    }

    setFriendsList(friendIds.map((id) => usersMap.get(id)).filter(Boolean));
    setIncomingRequests(incoming.map((row) => ({ ...row, user: usersMap.get(row.user_id) })));
    setOutgoingRequests(outgoing.map((row) => ({ ...row, friend: usersMap.get(row.friend_id) })));
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
    setRequestNotice('');
    setSendingRequest(true);
    let target = null;
    if (trimmed.includes('-')) {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, nickname, avatar_url')
        .eq('id', trimmed)
        .maybeSingle();
      if (error) {
        const fallback = await supabase
          .from('users')
          .select('id, username, nickname')
          .eq('id', trimmed)
          .maybeSingle();
        target = fallback.data;
      } else {
        target = data;
      }
    }
    if (!target) {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, nickname, avatar_url')
        .eq('username', trimmed)
        .maybeSingle();
      if (error) {
        const fallback = await supabase
          .from('users')
          .select('id, username, nickname')
          .eq('username', trimmed)
          .maybeSingle();
        target = fallback.data;
      } else {
        target = data;
      }
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
    setRequestNotice('요청을 보냈어요. 상대방이 수락하면 친구 목록에 나타납니다.');
    if (noticeTimer.current) {
      window.clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = window.setTimeout(() => {
      setRequestNotice('');
    }, 2000);
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
    return () => {
      if (noticeTimer.current) {
        window.clearTimeout(noticeTimer.current);
      }
    };
  }, [currentUser?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="친구"
        description="친구를 추가하고 서로의 기록을 공유해보세요."
        actions={[{ label: '친구 요청', href: '#friend-request', variant: 'primary' }]}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '내 친구', value: friendsList.length },
            { label: '받은 요청', value: incomingRequests.length },
            { label: '보낸 요청', value: outgoingRequests.length },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{item.value}명</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-6">
            <section id="friend-request" className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">친구 찾기 · 요청 보내기</h3>
                <p className="text-xs text-slate-500 mt-1">친구 ID 또는 아이디를 검색해서 친구 요청을 보낼 수 있습니다.</p>
              </div>
              <form className="flex flex-wrap items-center gap-2" onSubmit={handleSendRequest}>
                <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-full px-4 py-2 bg-white">
                  <span className="text-slate-400">🔍</span>
                  <input
                    type="text"
                    name="username"
                    placeholder="친구 ID 또는 아이디 입력"
                    className="flex-1 text-sm focus:outline-none bg-transparent"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="btn-primary px-4 py-2 text-sm font-semibold rounded-full transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingRequest ? '요청 중...' : '요청 보내기'}
                </button>
              </form>
              {requestError && <p className="text-xs text-red-500">{requestError}</p>}
              {requestNotice && <p className="text-xs text-emerald-600">{requestNotice}</p>}
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">내 친구</h3>
                <span className="text-xs text-slate-400">친구 {friendsList.length}명</span>
              </div>
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {friendsList.map((friend) => (
                    <FriendRow key={friend.id || friend.username}>
                      <motion.div
                        whileHover={reduceMotion ? undefined : { y: -2, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)' }}
                        className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={friend.nickname}
                            username={friend.username}
                            url={friend.avatar_url}
                            size={40}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{friend.nickname || friend.username}</p>
                            <p className="text-xs text-slate-400">@{friend.username}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">최근 공유된 기록을 확인해보세요.</p>
                        <div className="flex flex-wrap gap-2">
                          <a href={`/friend/${friend.id}/journal`} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
                            기록 보기
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemove(friend.id)}
                            className="btn-secondary px-3 py-1.5 text-xs font-semibold text-red-500 border-red-200"
                          >
                            삭제
                          </button>
                        </div>
                      </motion.div>
                    </FriendRow>
                  ))}
                </div>
              ) : (
                <div className="py-8">
                  <EmptyState
                    title="내 친구가 아직 없습니다."
                    description="친구 ID를 입력해서 첫 친구를 추가해 보세요."
                  />
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">받은 요청</h3>
              {incomingRequests.length > 0 ? (
                <div className="space-y-3">
                  {incomingRequests.map((req) => (
                    <FriendRow key={req.id || req.user?.username}>
                      <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={req.user?.nickname}
                            username={req.user?.username}
                            url={req.user?.avatar_url}
                            size={32}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{req.user?.nickname || req.user?.username}</p>
                            <p className="text-xs text-slate-400">@{req.user?.username}</p>
                            <p className="text-xs text-slate-400">{formatRequestDate(req.created_at)}에 요청 받음</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAccept(req.id)}
                            className="btn-primary text-xs px-3 py-1.5 rounded-full"
                          >
                            수락
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(req.user_id)}
                            className="btn-secondary text-xs px-3 py-1.5 rounded-full text-slate-500"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    </FriendRow>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-2xl mb-2">📭</div>
                  <p className="text-sm font-semibold text-slate-800">받은 요청이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">친구가 요청을 보내면 여기에서 확인할 수 있어요.</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">보낸 요청</h3>
              {outgoingRequests.length > 0 ? (
                <div className="space-y-3">
                  {outgoingRequests.map((req) => (
                    <FriendRow key={req.id || req.friend?.username}>
                      <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={req.friend?.nickname}
                            username={req.friend?.username}
                            url={req.friend?.avatar_url}
                            size={32}
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{req.friend?.nickname || req.friend?.username}</p>
                            <p className="text-xs text-slate-400">@{req.friend?.username}</p>
                            <p className="text-xs text-slate-400">{formatRequestDate(req.created_at)}에 요청 보냄</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(req.friend_id)}
                          className="btn-secondary text-xs px-3 py-1.5 rounded-full text-slate-500"
                        >
                          요청 취소
                        </button>
                      </div>
                    </FriendRow>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-2xl mb-2">📭</div>
                  <p className="text-sm font-semibold text-slate-800">보낸 요청이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">친구에게 요청을 보내면 수락할 때까지 이곳에 표시됩니다.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FriendsPage;






