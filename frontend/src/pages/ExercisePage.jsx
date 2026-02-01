import React, { useMemo, useState } from 'react';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
};

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

function ExercisePage({ today, recordCards = [], bodyRecords = [] }) {
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [newRecordDate, setNewRecordDate] = useState(todayKey);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  React.useEffect(() => {
    if (urlParams.get('add') !== '1') return;
    const paramDate = urlParams.get('date');
    if (paramDate) {
      setNewRecordDate(paramDate);
    } else {
      setNewRecordDate(todayKey);
    }
    setShowExerciseModal(true);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('add');
    nextUrl.searchParams.delete('date');
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
  }, [todayKey, urlParams]);

  const handleAddExercise = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch('/exercise/record', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      window.location.href = '/exercise';
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };


  const handleAddBody = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const response = await fetch('/exercise/body', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const deleteExerciseRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await fetch(`/exercise/record/${recordId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const openEditExerciseModal = async (recordId) => {
    const response = await fetch(`/exercise/record/detail/${recordId}`);
    if (!response.ok) {
      alert('운동 기록을 불러오지 못했습니다.');
      return;
    }
    const record = await response.json();
    setEditRecord(record);
    setShowEditModal(true);
  };

  const handleUpdateExercise = async (event) => {
    event.preventDefault();
    const response = await fetch(`/exercise/record/${editRecord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body_part: editRecord.body_part,
        date: editRecord.date,
        memo: editRecord.memo,
      }),
    });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const deleteBodyRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await fetch(`/exercise/body/${recordId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const openAddExerciseForDate = (dateValue) => {
    if (dateValue) {
      setNewRecordDate(dateValue);
    } else {
      setNewRecordDate(todayKey);
    }
    setShowExerciseModal(true);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>💪 오늘의 운동 기록</h2>
          <div className="flex gap-2">
            <a href={`/exercise/month?year=${new Date(today).getFullYear()}&month=${new Date(today).getMonth() + 1}`} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
              전체보기
            </a>
            <button onClick={() => openAddExerciseForDate(todayKey)} className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
              + 운동 기록
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {recordCards.map((card) => (
            <div key={card.date} className="border rounded-lg p-4 flex flex-col overflow-y-auto" style={{ borderColor: '#E5E7EB', minHeight: 180, maxHeight: 220 }}>
              <button
                type="button"
                onClick={() => openAddExerciseForDate(card.date)}
                className="text-sm font-semibold mb-3 text-left hover:underline"
                style={{ color: '#1F2937' }}
              >
                {card.date}
              </button>
              {card.records && card.records.length > 0 ? (
                <div className="space-y-3">
                  {card.records.map((record) => (
                    <div key={record.id} className="border rounded-md p-2" style={{ borderColor: '#E5E7EB' }}>
                      <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{record.body_part}</div>
                      <div className="text-xs mt-1" style={{ color: '#6B7280', whiteSpace: 'pre-line' }}>
                        {record.memo || '메모 없음'}
                      </div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => openEditExerciseModal(record.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>수정</button>
                        <button onClick={() => deleteExerciseRecord(record.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm" style={{ color: '#9CA3AF' }}>운동 기록이 없습니다.</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>📸 나의 몸 기록</h2>
          <div className="flex gap-2">
            <a href="/exercise/body/all" className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
              전체보기
            </a>
            <button onClick={() => setShowBodyModal(true)} className="btn-primary px-4 py-2 text-white rounded-md font-medium transition">
              + 기록 추가
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {bodyRecords.length > 0 ? (
            [...bodyRecords].reverse().map((record) => (
              <div key={record.id} className="border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                {record.image_path || record.imageUrl ? (
                  <img 
                    src={record.imageUrl || `/media/body/${record.id}`} 
                    alt="body" 
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-4xl">📷</div>
                )}
                <div className="p-3">
                  <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{record.date}</div>
                  {record.memo && (
                    <p className="text-xs truncate" style={{ color: '#6B7280' }} title={record.memo}>{record.memo}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-4 text-center py-8" style={{ color: '#6B7280' }}>몸 기록이 없습니다.</p>
          )}
        </div>
      </section>

      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>운동 기록 추가</h3>
              <button onClick={() => setShowExerciseModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form id="exerciseForm" className="space-y-4" onSubmit={handleAddExercise}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>부위 *</label>
                <select name="body_part" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }}>
                  <option value="">선택</option>
                  {['가슴', '등', '어깨', '하체', '팔', '코어', '유산소'].map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모</label>
                <textarea
                  name="memo"
                  rows="4"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="운동 내용을 입력하세요"
                />
              </div>
              <input type="hidden" name="date" value={newRecordDate || todayKey} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowExerciseModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {showBodyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>몸 기록 추가</h3>
              <button onClick={() => setShowBodyModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form id="bodyForm" className="space-y-4" onSubmit={handleAddBody} encType="multipart/form-data">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input type="date" name="date" defaultValue={todayKey} className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>사진</label>
                <input type="file" name="image" accept="image/*" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 (선택)</label>
                <textarea name="memo" rows="2" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowBodyModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>운동 기록 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateExercise}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>부위 *</label>
                <select
                  required
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.body_part}
                  onChange={(event) => setEditRecord({ ...editRecord, body_part: event.target.value })}
                >
                  {['가슴', '등', '어깨', '하체', '팔', '코어', '유산소'].map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.date}
                  onChange={(event) => setEditRecord({ ...editRecord, date: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모</label>
                <textarea
                  rows="4"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="운동 내용을 입력하세요"
                  value={editRecord.memo || ''}
                  onChange={(event) => setEditRecord({ ...editRecord, memo: event.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">수정 저장</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
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

export default ExercisePage;

