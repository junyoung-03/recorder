import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
};

function MealsPage({ currentUser }) {
  const [showMealModal, setShowMealModal] = useState(false);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [todayMeals, setTodayMeals] = useState([]);
  const [likedMealIds, setLikedMealIds] = useState([]);
  const [friendsList, setFriendsList] = useState([]);

  const loadMeals = async (userId) => {
    if (!userId) return;
    const { data: mealData } = await supabase
      .from('meal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayKey)
      .order('created_at', { ascending: true });
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
    setTodayMeals(enrichedMeals);
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

  useEffect(() => {
    if (!currentUser?.id) return;
    loadMeals(currentUser.id);
  }, [currentUser?.id, todayKey]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`meals-realtime-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => loadMeals(currentUser.id),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => loadMeals(currentUser.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleAddMeal = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) return;
    const formData = new FormData(event.target);
    const file = formData.get('image');
    let imagePath = null;
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop();
      const fileName = `${todayKey}_${Date.now()}.${ext}`;
      const filePath = `${currentUser.id}/${fileName}`;
      const { error } = await supabase.storage.from('meals').upload(filePath, file, { upsert: true });
      if (error) {
        alert('이미지 업로드에 실패했습니다.');
        return;
      }
      const { data } = supabase.storage.from('meals').getPublicUrl(filePath);
      imagePath = data?.publicUrl || null;
    }
    const payload = {
      user_id: currentUser.id,
      date: formData.get('date') || todayKey,
      meal_type: formData.get('meal_type') || null,
      food_name: formData.get('food_name') || null,
      calories: formData.get('calories') ? Number(formData.get('calories')) : null,
      memo: formData.get('memo') || null,
      visibility: formData.get('visibility') || 'private',
      image_path: imagePath,
    };
    const { error } = await supabase.from('meal_records').insert([payload]);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowMealModal(false);
    loadMeals(currentUser.id);
  };

  const handleDeleteMeal = async (mealId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('meal_records').delete().eq('id', mealId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setTodayMeals((prev) => prev.filter((meal) => meal.id !== mealId));
  };

  const handleToggleLike = async (mealId) => {
    if (!currentUser?.id) return;
    const isLiked = likedMealIds.includes(mealId);
    if (isLiked) {
      await supabase.from('likes').delete().eq('meal_id', mealId).eq('user_id', currentUser.id);
      setLikedMealIds((prev) => prev.filter((id) => id !== mealId));
      setTodayMeals((prev) =>
        prev.map((meal) => (meal.id === mealId ? { ...meal, likesCount: Math.max(0, meal.likesCount - 1) } : meal)),
      );
    } else {
      await supabase.from('likes').insert([{ meal_id: mealId, user_id: currentUser.id }]);
      setLikedMealIds((prev) => [...prev, mealId]);
      setTodayMeals((prev) =>
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
    setTodayMeals((prev) =>
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
    setTodayMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId
          ? { ...meal, comments: (meal.comments || []).filter((comment) => comment.id !== commentId) }
          : meal,
      ),
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              🍎 식단 기록
            </h2>
            <button onClick={() => setShowMealModal(true)} className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
              + 식단 추가
            </button>
          </div>

          <div className="space-y-4">
            {todayMeals.length > 0 ? (
              todayMeals.map((meal) => (
                <div key={meal.id} className="flex items-start gap-4 p-4 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
                  <div className="flex-shrink-0">
                    {meal.image_path ? (
                      <img
                        src={meal.image_path}
                        alt={meal.food_name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-2xl">📷</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                        {meal.meal_type || '식사'}
                      </span>
                      <span className="font-semibold" style={{ color: '#1F2937' }}>
                        {meal.food_name}
                      </span>
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
                  <button onClick={() => handleDeleteMeal(meal.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                    삭제
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center py-8" style={{ color: '#6B7280' }}>오늘 식단 기록이 없습니다.</p>
            )}
          </div>
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

      {showMealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>
                식단 추가
              </h3>
              <button onClick={() => setShowMealModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleAddMeal} encType="multipart/form-data">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  식사 구분
                </label>
                <select name="meal_type" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }}>
                  <option value="아침">아침</option>
                  <option value="점심">점심</option>
                  <option value="저녁">저녁</option>
                  <option value="간식">간식</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  음식명
                </label>
                <input type="text" name="food_name" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} placeholder="예: 오트밀, 달걀" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  칼로리 (선택)
                </label>
                <input type="number" name="calories" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} placeholder="350" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  사진 (선택)
                </label>
                <input type="file" name="image" accept="image/*" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  메모 (선택)
                </label>
                <textarea name="memo" rows="2" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                  공개 범위
                </label>
                <select name="visibility" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }}>
                  <option value="private">나만 보기</option>
                  <option value="friends">친구 공개</option>
                  <option value="public">전체 공개</option>
                </select>
              </div>
              <input type="hidden" name="date" value={todayKey} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealsPage;








