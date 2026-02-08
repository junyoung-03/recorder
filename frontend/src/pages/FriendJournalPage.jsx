import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useInViewOnce } from '../hooks/useInViewOnce';

function FriendJournalPage({ currentUser, friendId }) {
  const [friendUser, setFriendUser] = useState(null);
  const [journals, setJournals] = useState([]);
  const [likedJournalIds, setLikedJournalIds] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [recentOpen, setRecentOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const loadFriendJournals = async (userId, targetId) => {
    if (!userId || !targetId) return;
    const { data: friendData } = await supabase
      .from('users')
      .select('id, username, nickname')
      .eq('id', targetId)
      .maybeSingle();
    setFriendUser(friendData || null);

    const { data: journalData } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', targetId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    const counts = { __uncategorized: 0 };
    (journalData || []).forEach((entry) => {
      if (entry.category) {
        counts[entry.category] = (counts[entry.category] || 0) + 1;
      } else {
        counts.__uncategorized += 1;
      }
    });
    setCategoryCounts(counts);

    const { data: categoryData } = await supabase
      .from('journal_categories')
      .select('*')
      .eq('user_id', targetId)
      .order('created_at', { ascending: true });
    setCategories(categoryData || []);

    const journalIds = (journalData || []).map((entry) => entry.id);
    if (journalIds.length) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id, journal_id, user_id')
        .in('journal_id', journalIds);
      const likedIds = (likeData || [])
        .filter((like) => like.user_id === userId)
        .map((like) => like.journal_id);
      setLikedJournalIds(likedIds);
      const likesByJournal = (likeData || []).reduce((acc, like) => {
        acc[like.journal_id] = (acc[like.journal_id] || 0) + 1;
        return acc;
      }, {});
      setJournals(
        (journalData || []).map((entry) => ({
          ...entry,
          likesCount: likesByJournal[entry.id] || 0,
        })),
      );
    } else {
      setLikedJournalIds([]);
      setJournals((journalData || []).map((entry) => ({ ...entry, likesCount: 0 })));
    }

    const { data: friendshipData } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
    const friendIds = (friendshipData || []).map((row) =>
      row.user_id === userId ? row.friend_id : row.user_id,
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

  const handleToggleLike = async (journalId) => {
    if (!currentUser?.id) return;
    const isLiked = likedJournalIds.includes(journalId);
    if (isLiked) {
      await supabase.from('likes').delete().eq('journal_id', journalId).eq('user_id', currentUser.id);
      setLikedJournalIds((prev) => prev.filter((id) => id !== journalId));
    } else {
      await supabase.from('likes').insert([{ journal_id: journalId, user_id: currentUser.id }]);
      setLikedJournalIds((prev) => [...prev, journalId]);
    }
  };

  useEffect(() => {
    if (!currentUser?.id || !friendId) return;
    loadFriendJournals(currentUser.id, friendId);
  }, [currentUser?.id, friendId]);

  useEffect(() => {
    if (!currentUser?.id || !friendId) return;
    const channel = supabase
      .channel(`friend-journals-${friendId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => loadFriendJournals(currentUser.id, friendId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, friendId]);

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

  const reduceMotion = useReducedMotion();

  const TimelineCard = ({ children }) => {
    const ref = useRef(null);
    const isInView = useInViewOnce(ref);
    return (
      <motion.article
        ref={ref}
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bg-white rounded-lg shadow-md p-5 motion-card"
      >
        {children}
      </motion.article>
    );
  };

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
          <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => navigate('/friends')}>
            친구 페이지로 이동
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/friend/${friendId}/exercise`} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
            운동
          </a>
          <a href={`/friend/${friendId}/body`} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
            몸
          </a>
          <a href={`/friend/${friendId}/journal`} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
            일기
          </a>
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
              <TimelineCard key={journal.id}>
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
                  <button
                    type="button"
                    onClick={() => handleToggleLike(journal.id)}
                    className={`text-xs px-2 py-1 rounded border ${
                      likedJournalIds.includes(journal.id) ? 'calm-blue-bg text-white' : 'text-gray-600'
                    }`}
                  >
                    {likedJournalIds.includes(journal.id) ? '좋아요 취소' : '좋아요'}
                  </button>
                  <span>좋아요 {journal.likesCount || 0}</span>
                  <span>댓글 0</span>
                </div>
              </TimelineCard>
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






