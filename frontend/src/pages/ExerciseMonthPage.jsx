import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

function ExerciseMonthPage({ currentUser }) {
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState('');
  const today = useMemo(() => new Date(), []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [currentYear, setCurrentYear] = useState(() => Number(urlParams.get('year')) || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => Number(urlParams.get('month')) || today.getMonth() + 1);
  const [cards, setCards] = useState([]);
  const yearOptions = useMemo(() => Array.from({ length: 7 }, (_, idx) => today.getFullYear() - 5 + idx), [today]);

  const loadMonthRecords = async (userId, year, month) => {
    if (!userId) return;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const { data } = await supabase
      .from('exercise_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().slice(0, 10))
      .lte('date', endDate.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .order('created_at', { ascending: false });
    const grouped = new Map();
    (data || []).forEach((record) => {
      const key = record.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    const totalDays = endDate.getDate();
    const nextCards = [];
    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = new Date(year, month - 1, day).toISOString().slice(0, 10);
      nextCards.push({ date: dateKey, records: grouped.get(dateKey) || [] });
    }
    setCards(nextCards);
  };

  const openAddExerciseForDate = (dateValue) => {
    if (!dateValue) return;
    setNewRecordDate(dateValue);
    setShowExerciseModal(true);
  };

  const handleAddExercise = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) return;
    const formData = new FormData(event.target);
    const body_part = formData.get('body_part');
    const memo = formData.get('memo') || '';
    const total_time_raw = formData.get('total_time');
    const weight_raw = formData.get('weight_kg');
    const payload = {
      user_id: currentUser.id,
      date: formData.get('date') || newRecordDate,
      body_part,
      exercise_name: memo ? memo : body_part,
      total_time: total_time_raw ? Number(total_time_raw) : null,
      weight_kg: weight_raw ? Number(weight_raw) : null,
      memo,
    };
    const { error } = await supabase.from('exercise_records').insert([payload]);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowExerciseModal(false);
    loadMonthRecords(currentUser.id, currentYear, currentMonth);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadMonthRecords(currentUser.id, currentYear, currentMonth);
  }, [currentUser?.id, currentYear, currentMonth]);

  return (
    <div className="max-w-6xl mx-auto">
      <section className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>📌 운동 기록 전체보기</h2>
          <button onClick={() => window.history.back()} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
            닫기
          </button>
        </div>

        <form
          className="flex items-center gap-2 mb-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (currentUser?.id) {
              loadMonthRecords(currentUser.id, currentYear, currentMonth);
            }
          }}
        >
          <select
            name="year"
            className="px-3 py-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
            value={currentYear}
            onChange={(event) => setCurrentYear(Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
          <select
            name="month"
            className="px-3 py-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
            value={currentMonth}
            onChange={(event) => setCurrentMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
          <button type="submit" className="btn-primary px-4 py-2 rounded-md font-medium">조회</button>
        </form>

        <div className="grid grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.date} className="border rounded-lg p-3 flex flex-col overflow-y-auto" style={{ borderColor: '#E5E7EB', minHeight: 140, maxHeight: 180 }}>
              <button
                type="button"
                onClick={() => openAddExerciseForDate(card.date)}
                className="text-sm font-semibold mb-2 text-left hover:underline"
                style={{ color: '#1F2937' }}
              >
                {formatKoreanDate(card.date)}
              </button>
              {card.records && card.records.length > 0 ? (
                <div className="space-y-2">
                  {card.records.map((record) => (
                    <div key={record.id} className="text-xs">
                      <div className="font-semibold" style={{ color: '#1F2937' }}>{record.body_part}</div>
                      {record.total_time ? (
                        <div className="mt-1" style={{ color: '#6B7280' }}>총 {record.total_time}분</div>
                      ) : null}
                      <div className="mt-1" style={{ color: '#6B7280', whiteSpace: 'pre-line' }}>{record.memo || '메모 없음'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#6B7280' }}>기록 없음</p>
              )}
            </div>
          ))}
        </div>
      </section>
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>운동 기록 추가</h3>
              <button onClick={() => setShowExerciseModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleAddExercise}>
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
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>몸무게 (kg)</label>
                <input
                  type="number"
                  name="weight_kg"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="예: 68.2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>총 시간 (분)</label>
                <input
                  type="number"
                  name="total_time"
                  min="0"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="예: 60"
                />
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
              <input type="hidden" name="date" value={newRecordDate} />
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
    </div>
  );
}

export default ExerciseMonthPage;

