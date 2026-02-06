import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function FriendMealsPage({ currentUser, friendId }) {
  const [friendUser, setFriendUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [likedMealIds, setLikedMealIds] = useState([]);
  const [friendsList, setFriendsList] = useState([]);

  const loadFriendMeals = async (userId, targetId) => {
    if (!userId || !targetId) return;
    const { data: friendData } = await supabase
      .from('users')
      .select('id, username, nickname')
      .eq('id', targetId)
      .maybeSingle();
    setFriendUser(friendData || null);

    const { data: mealData } = await supabase
      .from('meal_records')
      .select('*')
      .eq('user_id', targetId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    const mealIds = (mealData || []).map((meal) => meal.id);

    let likesByMeal = {};
    let likedIds = [];
    if (mealIds.length) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id, meal_id, user_id')
        .in('meal_id', mealIds);
      likesByMeal = (likeData || []).reduce((acc, like) => {
        acc[like.meal_id] = (acc[like.meal_id] || 0) + 1;
        return acc;
      }, {});
      likedIds = (likeData || [])
        .filter((like) => like.user_id === userId)
        .map((like) => like.meal_id);
    }

    let commentsByMeal = {};
    if (mealIds.length) {
      const { data: commentData } = await supabase
        .from('comments')
        .select('*')
        .in('meal_id', mealIds)
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
      commentsByMeal = (commentData || []).reduce((acc, comment) => {
        const next = {
          ...comment,
          user: userMap.get(comment.user_id),
          canDelete: comment.user_id === userId,
        };
        if (!acc[comment.meal_id]) acc[comment.meal_id] = [];
        acc[comment.meal_id].push(next);
        return acc;
      }, {});
    }

    const enrichedMeals = (mealData || []).map((meal) => ({
      ...meal,
      comments: commentsByMeal[meal.id] || [],
      likesCount: likesByMeal[meal.id] || 0,
    }));
    setMeals(enrichedMeals);
    setLikedMealIds(likedIds);

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

  const handleToggleLike = async (mealId) => {
    if (!currentUser?.id) return;
    const isLiked = likedMealIds.includes(mealId);
    if (isLiked) {
      await supabase.from('likes').delete().eq('meal_id', mealId).eq('user_id', currentUser.id);
      setLikedMealIds((prev) => prev.filter((id) => id !== mealId));
      setMeals((prev) =>
        prev.map((meal) => (meal.id === mealId ? { ...meal, likesCount: Math.max(0, meal.likesCount - 1) } : meal)),
      );
    } else {
      await supabase.from('likes').insert([{ meal_id: mealId, user_id: currentUser.id }]);
      setLikedMealIds((prev) => [...prev, mealId]);
      setMeals((prev) =>
        prev.map((meal) => (meal.id === mealId ? { ...meal, likesCount: meal.likesCount + 1 } : meal)),
      );
    }
  };

  const handleAddComment = async (event, mealId) => {
    event.preventDefault();
    if (!currentUser?.id) return;
    const formData = new FormData(event.target);
    const content = formData.get('content')?.toString().trim();
    if (!content) return;
    const { data, error } = await supabase
      .from('comments')
      .insert([{ meal_id: mealId, user_id: currentUser.id, content }])
      .select()
      .single();
    if (error || !data) return;
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              comments: [
                ...(meal.comments || []),
                {
                  ...data,
                  user: { username: currentUser.username, nickname: currentUser.nickname },
                  canDelete: true,
                },
              ],
            }
          : meal,
      ),
    );
    event.target.reset();
  };

  const handleDeleteComment = async (commentId, mealId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? { ...meal, comments: (meal.comments || []).filter((comment) => comment.id !== commentId) }
          : meal,
      ),
    );
  };

  useEffect(() => {
    if (!currentUser?.id || !friendId) return;
    loadFriendMeals(currentUser.id, friendId);
  }, [currentUser?.id, friendId]);

  useEffect(() => {
    if (!currentUser?.id || !friendId) return;
    const channel = supabase
      .channel(`friend-meals-${friendId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => loadFriendMeals(currentUser.id, friendId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => loadFriendMeals(currentUser.id, friendId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, friendId]);
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold" style={{ color: '#1F2937' }}>
            {friendUser?.nickname || friendUser?.username}
          </span>
          <span className="text-sm" style={{ color: '#6B7280' }}>님의 식단</span>
        </div>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>
            📷 식단
          </h2>
          {meals.length > 0 ? (
            <div className="space-y-6">
              {meals.map((meal) => (
                <div key={meal.id} className="border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">🙂</div>
                    <div>
                      <div className="font-semibold" style={{ color: '#1F2937' }}>
                        {friendUser?.nickname || friendUser?.username}
                      </div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>{meal.date}</div>
                    </div>
                  </div>
                  {meal.image_path ? (
                    <img src={meal.image_path} alt={meal.food_name} className="w-full max-h-96 object-cover" />
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                        {meal.meal_type || '식사'}
                      </span>
                      <span className="font-semibold" style={{ color: '#1F2937' }}>{meal.food_name}</span>
                      {meal.calories && <span className="text-sm" style={{ color: '#6B7280' }}>({meal.calories} kcal)</span>}
                    </div>
                    {meal.memo && <p className="text-sm" style={{ color: '#6B7280' }}>{meal.memo}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(meal.id)}
                        className={`text-xs px-2 py-1 rounded border ${
                          likedMealIds.includes(meal.id) ? 'calm-blue-bg text-white' : 'text-gray-600'
                        }`}
                      >
                        {likedMealIds.includes(meal.id) ? '좋아요 취소' : '좋아요'}
                      </button>
                      <span className="text-xs" style={{ color: '#6B7280' }}>좋아요 {meal.likesCount || 0}개</span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>댓글 {(meal.comments || []).length}개</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(meal.comments || []).map((comment) => (
                        <div key={comment.id} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold">{comment.user?.nickname || comment.user?.username}</span>
                            <span style={{ color: '#6B7280' }}> {comment.content}</span>
                          </div>
                          {(comment.canDelete || false) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id, meal.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <form className="mt-2 flex gap-2" onSubmit={(event) => handleAddComment(event, meal.id)}>
                      <input type="text" name="content" placeholder="댓글 입력" className="flex-1 p-2 text-sm border rounded-md" style={{ borderColor: '#E5E7EB' }} />
                      <button type="submit" className="text-xs px-3 py-2 rounded btn-primary">등록</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: '#6B7280' }}>공유된 식단이 없습니다.</p>
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
                  href={`/friend/${friend.id}/meals`}
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

export default FriendMealsPage;








