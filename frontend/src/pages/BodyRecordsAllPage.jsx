import React, { useState } from 'react';

function BodyRecordsAllPage({ bodyRecords = [] }) {
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

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
    const response = await fetch(`/exercise/body/${recordId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const selectedRecord1 = bodyRecords.find((r) => r.id === selectedRecords[0]);
  const selectedRecord2 = bodyRecords.find((r) => r.id === selectedRecords[1]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>📸 나의 몸 기록 전체보기</h2>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: '#6B7280' }}>💡 사진 2개 클릭하여 비교 가능</p>
            {selectedRecords.length === 2 && (
              <button
                onClick={handleCompare}
                className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium transition hover:bg-blue-600"
              >
                비교하기
              </button>
            )}
            <a href="/exercise" className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
              뒤로가기
            </a>
          </div>
        </div>

        {selectedRecords.length > 0 && (
          <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: '#EFF6FF' }}>
            <p className="text-sm" style={{ color: '#1E40AF' }}>
              {selectedRecords.length}개 선택됨 {selectedRecords.length === 2 && '(비교 가능)'}
            </p>
          </div>
        )}

        {showCompare && selectedRecord1 && selectedRecord2 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>비교 보기</h3>
              <button
                onClick={() => {
                  setShowCompare(false);
                  setSelectedRecords([]);
                }}
                className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}
              >
                닫기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <div className="p-3 border-b" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{selectedRecord1.date}</div>
                  {selectedRecord1.memo && (
                    <div className="text-xs mt-1" style={{ color: '#6B7280' }}>{selectedRecord1.memo}</div>
                  )}
                </div>
                {selectedRecord1.image_path ? (
                  <img
                    src={`/media/body/${selectedRecord1.id}`}
                    alt="body record 1"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center text-4xl">📷</div>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <div className="p-3 border-b" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{selectedRecord2.date}</div>
                  {selectedRecord2.memo && (
                    <div className="text-xs mt-1" style={{ color: '#6B7280' }}>{selectedRecord2.memo}</div>
                  )}
                </div>
                {selectedRecord2.image_path ? (
                  <img
                    src={`/media/body/${selectedRecord2.id}`}
                    alt="body record 2"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 flex items-center justify-center text-4xl">📷</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {bodyRecords.length > 0 ? (
              [...bodyRecords].reverse().map((record) => {
                const isSelected = selectedRecords.includes(record.id);
                return (
                  <div
                    key={record.id}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition ${
                      isSelected ? 'ring-4 ring-blue-500' : ''
                    }`}
                    style={{ borderColor: isSelected ? '#3B82F6' : '#E5E7EB' }}
                    onClick={() => handleRecordClick(record.id)}
                  >
                    {record.image_path ? (
                      <img
                        src={`/media/body/${record.id}`}
                        alt="body"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-4xl">📷</div>
                    )}
                    <div className="p-3">
                      <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{record.date}</div>
                      {record.memo && (
                        <p className="text-xs truncate" style={{ color: '#6B7280' }} title={record.memo}>
                          {record.memo}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {isSelected && (
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                            선택됨
                          </span>
                        )}
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
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-4 text-center py-8" style={{ color: '#6B7280' }}>
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
