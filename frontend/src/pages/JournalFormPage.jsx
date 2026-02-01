import React from 'react';

function JournalFormPage({ journal, error, categories = [] }) {
  const isEdit = Boolean(journal);
  const hasCategories = categories.length > 0;

  return (
    <section className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
          {isEdit ? '일기 수정' : '일기 작성'}
        </h2>
        <a href="/journal" className="text-sm text-gray-500 hover:underline">목록으로</a>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}
      <form method="post" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
              날짜
            </label>
            <input
              type="date"
              name="date"
              defaultValue={journal?.date || ''}
              className="w-full p-2 border rounded-md"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
              공개 범위
            </label>
            <select name="visibility" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} defaultValue={journal?.visibility || 'private'}>
              <option value="private">나만 보기</option>
              <option value="friends">친구 공개</option>
              <option value="public">전체 공개</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            제목
          </label>
          <input
            type="text"
            name="title"
            defaultValue={journal?.title || ''}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        {hasCategories && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
              게시판
            </label>
            <select
              name="category"
              defaultValue={journal?.category || ''}
              className="w-full p-2 border rounded-md"
              style={{ borderColor: '#E5E7EB' }}
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
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            내용 *
          </label>
          <textarea
            name="content"
            rows="10"
            required
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
            defaultValue={journal?.content || ''}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary px-6 py-2 text-white rounded-md font-medium transition">
            저장
          </button>
          <a href="/journal" className="px-6 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
            취소
          </a>
        </div>
      </form>
    </section>
  );
}

export default JournalFormPage;



