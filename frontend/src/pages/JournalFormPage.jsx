import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function JournalFormPage({ currentUser }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasCategories = categories.length > 0;

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('journal_categories')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setCategories(data || []));
  }, [currentUser?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) return;
    const formData = new FormData(event.target);
    const payload = {
      user_id: currentUser.id,
      date: formData.get('date') || new Date().toISOString().slice(0, 10),
      visibility: formData.get('visibility') || 'private',
      category: formData.get('category') || null,
      title: formData.get('title') || null,
      content: formData.get('content'),
    };
    setLoading(true);
    const { error: insertError } = await supabase.from('journals').insert([payload]);
    setLoading(false);
    if (insertError) {
      setError('저장에 실패했습니다.');
      return;
    }
    window.location.href = '/journal';
  };

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-warm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-title">
              일기 작성
            </h2>
            <p className="text-muted mt-1">
              오늘의 생각을 차분히 기록해 보세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold">
              임시 저장
            </button>
            <button type="submit" form="journalForm" className="btn-primary px-4 py-2 text-white text-sm font-semibold">
              {loading ? '저장 중...' : '발행'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <form id="journalForm" className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
            <label className="block text-body font-semibold mb-2">
                날짜
              </label>
              <input
                type="date"
                name="date"
                defaultValue=""
              className="w-full p-2.5 border border-warm rounded-md"
              />
            </div>
            <div>
            <label className="block text-body font-semibold mb-2">
                공개 범위
              </label>
            <select name="visibility" className="w-full p-2.5 border border-warm rounded-md" defaultValue="private">
                <option value="private">나만 보기</option>
                <option value="friends">친구 공개</option>
                <option value="public">전체 공개</option>
              </select>
            </div>
            {hasCategories && (
              <div>
              <label className="block text-body font-semibold mb-2">
                  카테고리
                </label>
                <select
                  name="category"
                  defaultValue=""
                  className="w-full p-2.5 border border-warm rounded-md"
                >
                  <option value="">선택 안함</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-body font-semibold mb-2">
              제목
            </label>
            <input
              type="text"
              name="title"
              defaultValue=""
              placeholder="오늘의 제목을 입력하세요."
              className="w-full px-4 py-3 border border-warm rounded-lg text-2xl font-semibold"
            />
          </div>

          <div className="border border-warm rounded-lg">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-warm">
              <span className="text-xs font-semibold text-slate-500">Toolbar</span>
              <button type="button" className="px-2 py-1 text-sm rounded-md border border-warm">B</button>
              <button type="button" className="px-2 py-1 text-sm rounded-md border border-warm">I</button>
              <button type="button" className="px-2 py-1 text-sm rounded-md border border-warm">H1</button>
              <button type="button" className="px-2 py-1 text-sm rounded-md border border-warm">List</button>
            </div>
            <textarea
              name="content"
              rows="14"
              required
              className="w-full px-4 py-4 text-base leading-7 focus:outline-none"
              placeholder="오늘의 이야기를 자유롭게 적어보세요."
              defaultValue=""
            />
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary px-6 py-2 text-white text-sm font-semibold transition">
              저장
            </button>
            <a href="/journal" className="btn-secondary px-6 py-2 text-sm font-semibold transition">
              취소
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JournalFormPage;



