import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

function JournalDetailPage({ currentUser, journalId }) {
  const [journal, setJournal] = useState(null);
  const [journals, setJournals] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [categoryAddMode, setCategoryAddMode] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts = { __uncategorized: 0 };
    journals.forEach((entry) => {
      if (entry.category) {
        counts[entry.category] = (counts[entry.category] || 0) + 1;
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

  useEffect(() => {
    if (!currentUser?.id || !journalId) return;
    const loadJournalData = async () => {
      const { data: journalData } = await supabase
        .from('journals')
        .select('*')
        .eq('id', journalId)
        .maybeSingle();
      setJournal(journalData || null);

      const { data: journalList } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      setJournals(journalList || []);

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

      const { data: likeData } = await supabase
        .from('likes')
        .select('id, user_id')
        .eq('journal_id', journalId);
      setLikesCount(likeData?.length || 0);
      setLiked((likeData || []).some((item) => item.user_id === currentUser.id));

      const { data: commentData } = await supabase
        .from('comments')
        .select('*')
        .eq('journal_id', journalId)
        .order('created_at', { ascending: true });
      const userIds = Array.from(new Set((commentData || []).map((comment) => comment.user_id)));
      let userMap = new Map();
      if (userIds.length) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, nickname')
          .in('id', userIds);
        userMap = new Map((usersData || []).map((user) => [user.id, user]));
      }
      const mappedComments = (commentData || []).map((comment) => ({
        ...comment,
        user: userMap.get(comment.user_id),
        canDelete: comment.user_id === currentUser.id || journalData?.user_id === currentUser.id,
      }));
      setComments(mappedComments);
    };
    loadJournalData();
  }, [currentUser?.id, journalId]);

  useEffect(() => {
    if (!journalId) return;
    const channel = supabase
      .channel(`journal-realtime-${journalId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `journal_id=eq.${journalId}` },
        () => {
          if (currentUser?.id) {
            supabase
              .from('comments')
              .select('*')
              .eq('journal_id', journalId)
              .order('created_at', { ascending: true })
              .then(async ({ data }) => {
                const userIds = Array.from(new Set((data || []).map((comment) => comment.user_id)));
                let userMap = new Map();
                if (userIds.length) {
                  const { data: usersData } = await supabase
                    .from('users')
                    .select('id, username, nickname')
                    .in('id', userIds);
                  userMap = new Map((usersData || []).map((user) => [user.id, user]));
                }
                const mapped = (data || []).map((comment) => ({
                  ...comment,
                  user: userMap.get(comment.user_id),
                  canDelete: comment.user_id === currentUser.id || journal?.user_id === currentUser.id,
                }));
                setComments(mapped);
              });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `journal_id=eq.${journalId}` },
        () => {
          supabase
            .from('likes')
            .select('id, user_id')
            .eq('journal_id', journalId)
            .then(({ data }) => {
              setLikesCount(data?.length || 0);
              if (currentUser?.id) {
                setLiked((data || []).some((item) => item.user_id === currentUser.id));
              }
            });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, journalId, journal?.user_id]);

  const getCategoryJournals = (categoryKey) => {
    if (categoryKey === 'all') {
      return journals;
    }
    if (categoryKey === '__uncategorized') {
      return journals.filter((entry) => !entry.category);
    }
    return journals.filter((entry) => entry.category === categoryKey);
  };

  const handleToggleLike = async () => {
    if (!currentUser?.id || !journal) return;
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('journal_id', journal.id)
        .eq('user_id', currentUser.id);
      setLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
    } else {
      await supabase.from('likes').insert([{ journal_id: journal.id, user_id: currentUser.id }]);
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!currentUser?.id || !journal) return;
    const formData = new FormData(event.target);
    const content = formData.get('content')?.toString().trim();
    if (!content) return;
    const { data, error } = await supabase
      .from('comments')
      .insert([{ journal_id: journal.id, user_id: currentUser.id, content }])
      .select()
      .single();
    if (error || !data) return;
    setComments((prev) => [
      ...prev,
      {
        ...data,
        user: { username: currentUser.username, nickname: currentUser.nickname },
        canDelete: true,
      },
    ]);
    event.target.reset();
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  };

  if (!journal) {
    return <div className="text-sm text-gray-500">일기를 불러오는 중...</div>;
  }

  const reduceMotion = useReducedMotion();
  const fadeIn = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };

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

        <div className="flex-1 bg-white rounded-lg shadow-md p-8 motion-card">
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
              <span>좋아요 {likesCount}</span>
              <span>댓글 {comments.length}</span>
            </div>
          </div>

          <div className="mt-6 border-t" style={{ borderColor: '#E5E7EB' }} />

          <motion.div
            initial={fadeIn}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mt-6 prose max-w-none whitespace-pre-line leading-relaxed"
            style={{ color: '#111827' }}
          >
            {journal.content}
          </motion.div>

          <div className="mt-8 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLike}
              className={`text-xs px-3 py-1 rounded border transition motion-button-secondary ${
                liked
                  ? 'border-blue-200 text-blue-500 hover:bg-blue-50'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {liked ? '좋아요 취소' : '좋아요'}
            </button>
          </div>

          <div className="mt-6 border-t" style={{ borderColor: '#E5E7EB' }} />

          <motion.div
            initial={fadeIn}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
            className="mt-4 space-y-2"
          >
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-center justify-between text-sm transition-all duration-150 ease-out hover:-translate-y-0.5">
                <div>
                  <span className="font-semibold">{comment.user?.nickname || comment.user?.username}</span>
                  <span style={{ color: '#6B7280' }}> {comment.content}</span>
                </div>
                {(comment.canDelete || false) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </motion.div>
          <form className="mt-3 flex gap-2" onSubmit={handleAddComment}>
            <input type="text" name="content" placeholder="댓글 입력" className="flex-1 p-2 text-sm border rounded-md" style={{ borderColor: '#E5E7EB' }} />
            <button type="submit" className="text-xs px-3 py-2 rounded btn-primary motion-button-primary">등록</button>
          </form>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => alert('수정 기능은 준비 중입니다.')}
              className="px-3 py-1 text-xs rounded-md border border-blue-200 text-blue-500 hover:bg-blue-50 transition"
            >
              수정
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('정말 삭제하시겠습니까?')) return;
                await supabase.from('journals').delete().eq('id', journal.id);
                window.location.href = '/journal';
              }}
              className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-400 hover:bg-red-50 transition"
            >
              삭제
            </button>
            <a href="/journal" className="px-3 py-1 text-xs rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition">목록</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default JournalDetailPage;

