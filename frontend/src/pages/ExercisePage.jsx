import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import { supabase } from '../lib/supabaseClient';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import ModalContainer from '../components/ui/ModalContainer';

const parseDateKey = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
    return new Date(year, month - 1, day);
  }
  return null;
};

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = parseDateKey(value);
  if (!date) return '';
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatDuration = (minutes) => {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}시간 ${mins}분`;
};

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

const getRelativeDayLabel = (dateKey, baseDate) => {
  if (!dateKey || !baseDate) return '';
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  const target = new Date(dateKey);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((base - target) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '전날';
  if (diffDays === 2) return '전전날';
  if (diffDays === 3) return '전전전날';
  return formatKoreanDate(target);
};

function ExercisePage({ today, currentUser }) {
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const baseToday = useMemo(() => (today ? new Date(today) : new Date()), [today]);
  const todayKey = useMemo(() => toDateKey(baseToday), [baseToday]);
  const [newRecordDate, setNewRecordDate] = useState(todayKey);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [recordCards, setRecordCards] = useState([]);
  const [bodyRecords, setBodyRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadExerciseData = async (userId) => {
    if (!userId) return;
    setLoading(true);
    const { data: recordData } = await supabase
      .from('exercise_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    const grouped = new Map();
    (recordData || []).forEach((record) => {
      const key = record.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    const cards = Array.from(grouped.entries())
      .map(([date, records]) => ({ date, records }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecordCards(cards);

    const { data: bodyData } = await supabase
      .from('body_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    const bodyWithUrls = await Promise.all(
      (bodyData || []).map(async (record) => {
        if (!record.image_path) return record;
        const storagePath = extractStoragePath(record.image_path, 'body');
        if (!storagePath) return record;
        const { data: signed, error: signedError } = await supabase.storage
          .from('body')
          .createSignedUrl(storagePath, 60 * 60);
        if (signedError || !signed?.signedUrl) return record;
        return { ...record, image_path: signed.signedUrl };
      }),
    );
    setBodyRecords(bodyWithUrls);
    setLoading(false);
  };
  const parsedCards = useMemo(() => {
    return recordCards
      .map((card) => ({
        ...card,
        dateKey: toDateKey(card.date),
        dateObj: new Date(card.date),
        records: card.records || [],
      }))
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [recordCards]);
  const todayCard = useMemo(
    () => parsedCards.find((card) => card.dateKey === todayKey) || { date: todayKey, records: [] },
    [parsedCards, todayKey],
  );
  const recentCards = useMemo(() => {
    const base = new Date(baseToday);
    base.setHours(0, 0, 0, 0);
    return [1, 2].map((offset) => {
      const date = new Date(base);
      date.setDate(base.getDate() - offset);
      const dateKey = toDateKey(date);
      const existing = parsedCards.find((card) => card.dateKey === dateKey);
      return existing || { date: dateKey, dateKey, dateObj: date, records: [] };
    });
  }, [parsedCards, baseToday]);
  const weekSummary = useMemo(() => {
    const baseDate = baseToday;
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekRecords = parsedCards.flatMap((card) => {
      if (!card.dateObj) return [];
      if (card.dateObj < start || card.dateObj > end) return [];
      return card.records.map((record) => ({ ...record, dateKey: card.dateKey }));
    });

    const totalSessions = weekRecords.length;
    const totalMinutes = weekRecords.reduce((sum, record) => sum + (Number(record.total_time) || 0), 0);
    const goalTarget = 5;
    const goalRate = goalTarget > 0 ? Math.min(100, Math.round((totalSessions / goalTarget) * 100)) : 0;

    const bodyCounts = {};
    weekRecords.forEach((record) => {
      if (!record.body_part) return;
      bodyCounts[record.body_part] = (bodyCounts[record.body_part] || 0) + 1;
    });
    const topExercise = Object.entries(bodyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const lastWorkout = weekRecords[0]?.dateKey || null;

    return {
      totalSessions,
      totalMinutes,
      goalRate,
      topExercise,
      lastWorkout,
      hasData: weekRecords.length > 0,
    };
  }, [parsedCards, baseToday]);
  const weightStats = useMemo(() => {
    const weights = parsedCards
      .flatMap((card) => card.records || [])
      .map((record) => (record.weight_kg !== null && record.weight_kg !== undefined ? Number(record.weight_kg) : null))
      .filter((value) => value !== null && !Number.isNaN(value));
    if (weights.length === 0) {
      return { max: null, min: null, current: null };
    }
    return {
      max: Math.max(...weights),
      min: Math.min(...weights),
      current: weights[0],
    };
  }, [parsedCards]);
  const recentBodyRecords = useMemo(() => {
    return [...bodyRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  }, [bodyRecords]);

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

  useEffect(() => {
    if (!currentUser?.id) return;
    loadExerciseData(currentUser.id);
  }, [currentUser?.id]);

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
      date: formData.get('date') || todayKey,
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
    loadExerciseData(currentUser.id);
  };


  const handleAddBody = async (event) => {
    event.preventDefault();
    if (!currentUser?.id) return;
    const formData = new FormData(event.target);
    const dateValue = formData.get('date') || todayKey;
    const memo = formData.get('memo') || '';
    const file = formData.get('image');
    let imagePath = null;
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop();
      const fileName = `${dateValue}_${Date.now()}.${ext}`;
      const filePath = `${currentUser.id}/${fileName}`;
      const { error } = await supabase.storage.from('body').upload(filePath, file, { upsert: true });
      if (error) {
        alert('이미지 업로드에 실패했습니다.');
        return;
      }
      imagePath = filePath;
    }
    const { error } = await supabase.from('body_records').insert([
      {
        user_id: currentUser.id,
        date: dateValue,
        memo,
        image_path: imagePath,
      },
    ]);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowBodyModal(false);
    loadExerciseData(currentUser.id);
  };

  const deleteExerciseRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('exercise_records').delete().eq('id', recordId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    loadExerciseData(currentUser?.id);
  };

  const openEditExerciseModal = async (recordId) => {
    const local = recordCards.flatMap((card) => card.records).find((record) => record.id === recordId);
    if (local) {
      setEditRecord({ ...local });
      setShowEditModal(true);
      return;
    }
    const { data, error } = await supabase
      .from('exercise_records')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();
    if (error || !data) {
      alert('운동 기록을 불러오지 못했습니다.');
      return;
    }
    setEditRecord(data);
    setShowEditModal(true);
  };

  const handleUpdateExercise = async (event) => {
    event.preventDefault();
    if (!editRecord) return;
    const payload = {
      body_part: editRecord.body_part,
      date: editRecord.date,
      total_time: editRecord.total_time ? Number(editRecord.total_time) : null,
      weight_kg: editRecord.weight_kg ? Number(editRecord.weight_kg) : null,
      memo: editRecord.memo,
    };
    const { error } = await supabase.from('exercise_records').update(payload).eq('id', editRecord.id);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setShowEditModal(false);
    setEditRecord(null);
    loadExerciseData(currentUser?.id);
  };

  const deleteBodyRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('body_records').delete().eq('id', recordId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    loadExerciseData(currentUser?.id);
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
      <PageHeader
        title="운동 · 몸 기록"
        description="운동과 몸 변화를 같은 타임라인에 기록하고, 오늘의 변화를 확인하세요."
        actions={[
          { label: '+ 운동 기록', onClick: () => openAddExerciseForDate(todayKey), variant: 'primary' },
          { label: '+ 몸 기록', onClick: () => setShowBodyModal(true), variant: 'secondary' },
        ]}
      />



      <section id="exercise-records" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-warm shadow-sm p-4 motion-card">
            <div className="text-sm text-gray-500 mb-2">이번 주 운동 횟수</div>
            <div className="text-lg font-semibold text-gray-900">
              {weekSummary.totalSessions > 0 ? `${weekSummary.totalSessions}회` : '기록 없음'}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-warm shadow-sm p-4 motion-card">
            <div className="text-sm text-gray-500 mb-2">이번 주 총 운동 시간</div>
            <div className="text-lg font-semibold text-gray-900">
              {weekSummary.totalMinutes > 0
                ? `${Math.floor(weekSummary.totalMinutes / 60)}시간 ${weekSummary.totalMinutes % 60}분`
                : '기록 없음'}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-warm shadow-sm p-4 motion-card">
            <div className="text-sm text-gray-500 mb-2">이번 달 목표 달성률</div>
            <div className="text-lg font-semibold text-gray-900">
              {weekSummary.totalSessions > 0 ? `${weekSummary.goalRate}%` : '기록 없음'}
            </div>
          </div>
        </div>

        <section className="bg-white rounded-3xl border border-warm shadow-sm p-6 motion-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h3l2-3 3 6 2-3h2" />
                </svg>
                오늘의 운동 기록
              </h2>
              <p className="text-sm text-gray-500 mt-1">최근 며칠 간의 운동 기록을 하루 단위로 확인해 보세요.</p>
            </div>
            <div className="flex gap-2">
              <a href={`/exercise/month?year=${new Date(today).getFullYear()}&month=${new Date(today).getMonth() + 1}`} className="btn-secondary px-4 py-2 text-sm font-semibold">
                전체보기
              </a>
              <button onClick={() => openAddExerciseForDate(todayKey)} className="btn-primary px-4 py-2 text-white text-sm font-semibold">
                + 운동 기록
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
            <div className="border border-warm rounded-2xl p-4 bg-warm-surface motion-card">
              <div className="text-sm font-semibold mb-3">{formatKoreanDate(todayKey)}</div>
              {todayCard.records.length > 0 ? (
                <div className="space-y-3">
                  {todayCard.records.map((record) => (
                    <div key={record.id} className="border border-warm rounded-xl p-3 bg-white motion-card">
                      <div className="text-sm font-semibold">{record.body_part}</div>
                      {record.total_time ? (
                        <div className="text-xs text-gray-500 mt-1">총 {record.total_time}분</div>
                      ) : null}
                      {record.weight_kg ? (
                        <div className="text-xs text-gray-500 mt-1">몸무게 {record.weight_kg}kg</div>
                      ) : null}
                      <div className="text-xs text-gray-500 mt-1" style={{ whiteSpace: 'pre-line' }}>
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
                <div className="text-sm text-gray-500">오늘 운동 기록이 없습니다.</div>
              )}
              <button
                type="button"
                onClick={() => openAddExerciseForDate(todayKey)}
                className="btn-primary px-4 py-2 text-white text-sm font-semibold mt-4"
              >
                + 운동 기록
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {recentCards.map((card) => (
                <button
                  key={card.date}
                  type="button"
                  onClick={() => openAddExerciseForDate(card.date)}
                  className="text-left border border-warm rounded-2xl p-4 bg-white hover:bg-warm-surface transition motion-card"
                >
                  <div className="text-sm font-semibold">
                    {formatKoreanDate(card.dateKey || card.date)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {card.records.length > 0 ? `운동 기록 ${card.records.length}개` : '운동 기록 없음'}
                  </div>
                </button>
              ))}
              {recentCards.length === 0 && (
                <div className="text-sm text-gray-500">최근 기록이 없습니다.</div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="bg-white rounded-3xl border border-warm shadow-sm p-6 motion-card">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2m8-2v2M5 9h14M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
              </svg>
              이번 주 운동 요약
            </h2>
            {weekSummary.hasData ? (
              <div className="text-sm text-gray-600 space-y-2">
              <div>
                이번 주 총 운동 시간{' '}
                <AnimatedNumber
                  value={weekSummary.totalMinutes}
                  formatter={formatDuration}
                  className="font-semibold text-slate-900"
                />
              </div>
                <div>가장 자주 한 운동: {weekSummary.topExercise || '기록 없음'}</div>
                <div>마지막 운동: {weekSummary.lastWorkout ? formatKoreanDate(weekSummary.lastWorkout) : '기록 없음'}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                이번 주 운동 기록이 없습니다. 이번 주 첫 운동을 기록해 보세요.
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-warm shadow-sm p-6 motion-card">
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l-1 12H7L6 7zM9 7l1-3h4l1 3" />
              </svg>
              최근 30일 체중 변화
            </h3>
            <div className="text-sm text-gray-500 space-y-1">
              <div>최고: {weightStats.max !== null ? `${weightStats.max.toFixed(1)}kg` : '-'}</div>
              <div>최저: {weightStats.min !== null ? `${weightStats.min.toFixed(1)}kg` : '-'}</div>
              <div>현재: {weightStats.current !== null ? `${weightStats.current.toFixed(1)}kg` : '-'}</div>
            </div>
            <p className="text-xs text-gray-400 mt-3">차트는 추후 업데이트됩니다.</p>
          </div>
        </section>
      </section>

      <section id="body-records" className="bg-white rounded-3xl border border-warm shadow-sm p-6 motion-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4l2-2h6l2 2h4v12H3V7z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              나의 몸 기록
            </h2>
            <p className="text-sm text-gray-500 mt-1">몸무게와 사진을 함께 남기고, 시간을 두고 변화를 확인해 보세요.</p>
          </div>
          <div className="flex gap-2">
            <a href="/exercise/body/all" className="btn-secondary px-4 py-2 text-sm font-semibold">전체보기</a>
            <button onClick={() => setShowBodyModal(true)} className="btn-primary px-4 py-2 text-white text-sm font-semibold">
              + 기록 추가
            </button>
          </div>
        </div>

            <div className="rounded-3xl bg-warm-surface overflow-hidden">
          {recentBodyRecords.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 p-4">
              {recentBodyRecords.map((record) => (
                <div key={record.id} className="rounded-2xl overflow-hidden bg-white motion-card">
                  {record.image_path ? (
                    <img
                      src={record.image_path}
                      alt="body"
                      className="w-full h-60 object-cover"
                    />
                  ) : (
                    <div className="w-full h-60 flex items-center justify-center text-3xl">📷</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <p className="text-sm text-gray-500">몸 기록을 남겨두면, 몇 달 뒤에 큰 변화가 보일 거예요.</p>
              <button onClick={() => setShowBodyModal(true)} className="btn-primary px-4 py-2 text-white text-sm font-semibold mt-4">
                + 몸 기록 추가
              </button>
            </div>
          )}
        </div>

        {recentBodyRecords.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentBodyRecords.map((record) => (
              <div key={record.id} className="border border-warm rounded-2xl p-4 bg-white motion-card">
                <div className="text-sm font-semibold">{record.date}</div>
                {record.memo ? (
                  <p className="text-xs text-gray-500 mt-1">{record.memo}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">메모 없음</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ModalContainer open={showExerciseModal} onClose={() => setShowExerciseModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>운동 기록 추가</h3>
              <button onClick={() => setShowExerciseModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form id="exerciseForm" className="space-y-4" onSubmit={handleAddExercise}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>부위 *</label>
                <select name="body_part" required className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }}>
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
                  className="w-full p-2 border rounded-md motion-input"
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
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="예: 60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모</label>
                <textarea
                  name="memo"
                  rows="4"
                  className="w-full p-2 border rounded-md motion-input"
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
      </ModalContainer>

      

      <ModalContainer open={showBodyModal} onClose={() => setShowBodyModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>몸 기록 추가</h3>
              <button onClick={() => setShowBodyModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form id="bodyForm" className="space-y-4" onSubmit={handleAddBody} encType="multipart/form-data">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input type="date" name="date" defaultValue={todayKey} className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>사진</label>
                <input type="file" name="image" accept="image/*" className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 (선택)</label>
                <textarea name="memo" rows="2" className="w-full p-2 border rounded-md motion-input" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">추가</button>
                <button type="button" onClick={() => setShowBodyModal(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
                  취소
                </button>
              </div>
            </form>
          </div>
      </ModalContainer>

      <ModalContainer open={showEditModal && Boolean(editRecord)} onClose={() => setShowEditModal(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>운동 기록 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateExercise}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>부위 *</label>
                <select
                  required
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord?.body_part || ''}
                  onChange={(event) => setEditRecord((prev) => ({ ...prev, body_part: event.target.value }))}
                >
                  {['가슴', '등', '어깨', '하체', '팔', '코어', '유산소'].map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>몸무게 (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord?.weight_kg ?? ''}
                  onChange={(event) => setEditRecord((prev) => ({ ...prev, weight_kg: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>총 시간 (분)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord?.total_time ?? ''}
                  onChange={(event) => setEditRecord((prev) => ({ ...prev, total_time: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord?.date || ''}
                  onChange={(event) => setEditRecord((prev) => ({ ...prev, date: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모</label>
                <textarea
                  rows="4"
                  className="w-full p-2 border rounded-md motion-input"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="운동 내용을 입력하세요"
                  value={editRecord?.memo || ''}
                  onChange={(event) => setEditRecord((prev) => ({ ...prev, memo: event.target.value }))}
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
      </ModalContainer>
    </div>
  );
}

export default ExercisePage;

