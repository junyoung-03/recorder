import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const isPublicUrl = (value) => typeof value === 'string' && value.startsWith('http');

const extractStoragePath = (value, bucket) => {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('http')) return value;
  try {
    const url = new URL(value);
    const marker = '/storage/v1/object/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const after = url.pathname.slice(idx + marker.length);
    const parts = after.split('/').filter(Boolean);
    const bucketIndex = parts.indexOf(bucket);
    if (bucketIndex === -1) return null;
    const pathParts = parts.slice(bucketIndex + 1);
    return pathParts.length ? pathParts.join('/') : null;
  } catch {
    return null;
  }
};

function BodyRecordsAllPage({ currentUser, friendId, friendMode }) {
  const isFriendMode = Boolean(friendId) || Boolean(friendMode);
  const targetUserId = isFriendMode ? friendId : currentUser?.id;
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [bodyRecords, setBodyRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleRecordClick = (recordId) => {
    setSelectedRecords((prev) => {
      if (prev.includes(recordId)) {
        return prev.filter((id) => id !== recordId);
      } else if (prev.length < 2) {
        return [...prev, recordId];
      } else {
        // 이미 2개 선택되어 있으면 첫 번째 제거하고 새로 추가
        return [prev[1], recordId];
      }
    });
  };

  const handleCompare = () => {
    if (selectedRecords.length === 2) {
      setShowCompare(true);
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('body_records').delete().eq('id', recordId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setBodyRecords((prev) => prev.filter((record) => record.id !== recordId));
    setSelectedRecords((prev) => prev.filter((id) => id !== recordId));
    setShowCompare(false);
  };

  const selectedRecord1 = bodyRecords.find((r) => r.id === selectedRecords[0]);
  const selectedRecord2 = bodyRecords.find((r) => r.id === selectedRecords[1]);
  const getImageSrc = (record) => {
    if (!record) return null;
    return record.image_path || record.imageUrl || null;
  };

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    supabase
      .from('body_records')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const records = data || [];
        const withUrls = await Promise.all(
          records.map(async (record) => {
            const path = extractStoragePath(record.image_path || record.imageUrl, 'body');
            if (!path) return record;
            const { data: signed, error } = await supabase.storage.from('body').createSignedUrl(path, 60 * 60);
            if (error || !signed?.signedUrl) return record;
            return { ...record, image_path: signed.signedUrl };
          }),
        );
        setBodyRecords(withUrls);
        setLoading(false);
      });
  }, [targetUserId]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-warm shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2" style={{ color: '#1F2937' }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4l2-2h6l2 2h4v12H3V7z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {isFriendMode ? '친구의 몸 기록 전체보기' : '나의 몸 기록 전체보기'}
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">사진 2개 클릭하여 비교 가능</p>
            {selectedRecords.length === 2 && (
              <button
                onClick={handleCompare}
                className="btn-primary px-4 py-2 text-white text-sm font-semibold"
              >
                비교하기
              </button>
            )}
            <a href={isFriendMode ? `/friend/${friendId}/exercise` : '/exercise'} className="btn-secondary px-4 py-2 text-sm font-semibold">
              뒤로가기
            </a>
          </div>
        </div>

        {selectedRecords.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-blue-700">
              {selectedRecords.length}개 선택됨 {selectedRecords.length === 2 && '(비교 가능)'}
            </p>
          </div>
        )}

        {showCompare && selectedRecord1 && selectedRecord2 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold" style={{ color: '#1F2937' }}>비교 보기</h3>
              <button
                onClick={() => {
                  setShowCompare(false);
                  setSelectedRecords([]);
                }}
                className="btn-secondary px-4 py-2 text-sm font-semibold"
              >
                닫기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-warm rounded-2xl overflow-hidden bg-white">
                <div className="p-3 border-b border-warm bg-warm-surface">
                  <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{selectedRecord1.date}</div>
                  {selectedRecord1.memo && (
                    <div className="text-xs mt-1 text-gray-500">{selectedRecord1.memo}</div>
                  )}
                </div>
                {selectedRecord1.image_path || selectedRecord1.imageUrl ? (
                  <img
                    src={getImageSrc(selectedRecord1)}
                    alt="body record 1"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-100 flex items-center justify-center text-4xl text-gray-400">📷</div>
                )}
              </div>
              <div className="border border-warm rounded-2xl overflow-hidden bg-white">
                <div className="p-3 border-b border-warm bg-warm-surface">
                  <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{selectedRecord2.date}</div>
                  {selectedRecord2.memo && (
                    <div className="text-xs mt-1 text-gray-500">{selectedRecord2.memo}</div>
                  )}
                </div>
                {selectedRecord2.image_path || selectedRecord2.imageUrl ? (
                  <img
                    src={getImageSrc(selectedRecord2)}
                    alt="body record 2"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-100 flex items-center justify-center text-4xl text-gray-400">📷</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bodyRecords.length > 0 ? (
              [...bodyRecords].reverse().map((record) => {
                const isSelected = selectedRecords.includes(record.id);
                return (
                  <div
                    key={record.id}
                    className={`border border-warm rounded-2xl overflow-hidden bg-white cursor-pointer transition motion-card ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleRecordClick(record.id)}
                  >
                    {record.image_path || record.imageUrl ? (
                      <img
                        src={getImageSrc(record)}
                        alt="body"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-4xl text-gray-400">📷</div>
                    )}
                    <div className="p-3">
                      <div className="text-xs text-gray-500 mb-1">{record.date}</div>
                      {record.memo && (
                        <p className="text-xs truncate text-gray-500" title={record.memo}>
                          {record.memo}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {isSelected && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                            선택됨
                          </span>
                        )}
                        {!isFriendMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record.id);
                            }}
                            className="text-xs px-2 py-1 rounded ml-auto"
                            style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-4 text-center py-8 text-gray-500">
                몸 기록이 없습니다.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default BodyRecordsAllPage;
