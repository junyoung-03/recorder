import React, { useMemo, useState } from 'react';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
};

function MealsPage({ today, todayMeals = [], likedMealIds = [], friendsList = [] }) {
  const [showMealModal, setShowMealModal] = useState(false);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const handleAddMeal = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch('/meals/add', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await fetch(`/meals/delete/${mealId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
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
                    {meal.image_path || meal.imageUrl ? (
                      <img
                        src={meal.imageUrl || `/media/meals/${meal.id}`}
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
                      <form method="post" action={`/meals/${meal.id}/like`}>
                        <input type="hidden" name="next" value="/meals" />
                        <button
                          type="submit"
                          className={`text-xs px-2 py-1 rounded border ${
                            likedMealIds.includes(meal.id) ? 'calm-blue-bg text-white' : 'text-gray-600'
                          }`}
                        >
                          {likedMealIds.includes(meal.id) ? '좋아요 취소' : '좋아요'}
                        </button>
                      </form>
                      <span className="text-xs" style={{ color: '#6B7280' }}>좋아요 {meal.likes?.length || 0}개</span>
                      <span className="text-xs" style={{ color: '#6B7280' }}>댓글 {meal.comments?.length || 0}개</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(meal.comments || []).map((comment) => (
                        <div key={comment.id} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold">{comment.user?.nickname || comment.user?.username}</span>
                            <span style={{ color: '#6B7280' }}> {comment.content}</span>
                          </div>
                          {(comment.canDelete || false) && (
                            <form method="post" action={`/meals/comments/${comment.id}/delete`}>
                              <input type="hidden" name="next" value="/meals" />
                              <button type="submit" className="text-gray-400 hover:text-gray-600">삭제</button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                    <form method="post" action={`/meals/${meal.id}/comment`} className="mt-2 flex gap-2">
                      <input type="hidden" name="next" value="/meals" />
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





