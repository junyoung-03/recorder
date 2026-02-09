import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import MonthlyCalendar from '../components/MonthlyCalendar';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { supabase } from '../lib/supabaseClient';
import { getKoreanHolidayDates } from '../lib/koreanHolidays';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString()}원`;

function FinancePage({ currentUser }) {
  const [transactionType, setTransactionType] = useState('expense');
  const [activeTab, setActiveTab] = useState('date');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const today = useMemo(() => new Date(), []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [currentYear, setCurrentYear] = useState(() => Number(urlParams.get('year')) || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => Number(urlParams.get('month')) || today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => urlParams.get('date') || toDateKey(today));
  const [records, setRecords] = useState([]);
  const [prevMonthRecords, setPrevMonthRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate) || todayKey, [selectedDate, todayKey]);
  const selectedDateParts = useMemo(() => {
    if (!selectedDateKey) return { year: currentYear, month: currentMonth };
    const date = new Date(selectedDateKey);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }, [selectedDateKey, currentYear, currentMonth]);
  const financeMonthHref = `/finance/month?year=${selectedDateParts.year}&month=${selectedDateParts.month}`;
  const events = useMemo(() => {
    return records.map((record) => ({
      id: record.id,
      date: record.date,
      title: `${record.category || '기록'} ${Number(record.amount).toLocaleString()}원`,
    }));
  }, [records]);
  const expenseSummaryByDate = useMemo(() => {
    const summary = {};
    records.forEach((record) => {
      if (record.transaction_type !== 'expense') return;
      const key = toDateKey(record.date);
      if (!key) return;
      if (!summary[key]) {
        summary[key] = { total: 0, count: 0 };
      }
      summary[key].total += Number(record.amount || 0);
      summary[key].count += 1;
    });
    const result = {};
    Object.entries(summary).forEach(([key, data]) => {
      if (data.count >= 1) {
        result[key] = `-${data.total.toLocaleString()}원`;
      }
    });
    return result;
  }, [records]);
  const holidayDates = useMemo(
    () => getKoreanHolidayDates([currentYear - 1, currentYear, currentYear + 1]),
    [currentYear],
  );
  const recordsByDate = useMemo(() => {
    const grouped = new Map();
    records.forEach((record) => {
      const key = toDateKey(record.date);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });
    return Array.from(grouped.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [records]);
  const expenseRecords = useMemo(
    () => records.filter((record) => record.transaction_type === 'expense'),
    [records],
  );
  const incomeRecords = useMemo(
    () => records.filter((record) => record.transaction_type === 'income'),
    [records],
  );
  const totalIncome = useMemo(
    () => incomeRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    [incomeRecords],
  );
  const totalExpense = useMemo(
    () => expenseRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    [expenseRecords],
  );
  const totalNet = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);
  const incomeCount = useMemo(() => incomeRecords.length, [incomeRecords]);
  const expenseCount = useMemo(() => expenseRecords.length, [expenseRecords]);
  const daysWithExpense = useMemo(() => {
    const unique = new Set(expenseRecords.map((record) => toDateKey(record.date)));
    unique.delete('');
    return unique.size;
  }, [expenseRecords]);
  const avgDailyExpense = useMemo(() => {
    if (!daysWithExpense) return 0;
    return Math.round(totalExpense / daysWithExpense);
  }, [daysWithExpense, totalExpense]);
  const prevMonthExpense = useMemo(
    () => prevMonthRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    [prevMonthRecords],
  );
  const monthOverMonthDiff = useMemo(() => totalExpense - prevMonthExpense, [totalExpense, prevMonthExpense]);
  const monthOverMonthRate = useMemo(() => {
    if (!prevMonthExpense) return null;
    return (monthOverMonthDiff / prevMonthExpense) * 100;
  }, [monthOverMonthDiff, prevMonthExpense]);
  const prevTopCategories = useMemo(() => {
    const totals = new Map();
    prevMonthRecords.forEach((record) => {
      if (record.transaction_type !== 'expense') return;
      const key = record.category || '기타';
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(record.amount || 0));
    });
    return Array.from(totals.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [prevMonthRecords]);
  const categorySource = expenseRecords.length > 0 ? expenseRecords : records;
  const categoryTotals = useMemo(() => {
    const totals = new Map();
    categorySource.forEach((record) => {
      const key = record.category || '기타';
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(record.amount || 0));
    });
    return Array.from(totals.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [categorySource]);
  const categoryTotalAmount = useMemo(
    () => categoryTotals.reduce((sum, item) => sum + item.total, 0),
    [categoryTotals],
  );
  const fixedRecords = useMemo(
    () => records.filter((record) => Boolean(record.is_fixed)),
    [records],
  );
  const loadMonthRecords = async (userId, year, month) => {
    if (!userId) return;
    setLoading(true);
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await supabase
      .from('finance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    setRecords(data || []);

    const prevDate = new Date(year, month - 2, 1);
    const prevStart = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1).toISOString().slice(0, 10);
    const prevEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data: prevData } = await supabase
      .from('finance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', prevStart)
      .lte('date', prevEnd);
    setPrevMonthRecords(prevData || []);
    setLoading(false);
  };

  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 2, 1);
    setCurrentYear(prev.getFullYear());
    setCurrentMonth(prev.getMonth() + 1);
    setSelectedDate(toDateKey(prev));
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth, 1);
    setCurrentYear(next.getFullYear());
    setCurrentMonth(next.getMonth() + 1);
    setSelectedDate(toDateKey(next));
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(toDateKey(today));
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadMonthRecords(currentUser.id, currentYear, currentMonth);
  }, [currentUser?.id, currentYear, currentMonth]);

  const handleAddRecord = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    formData.set('transaction_type', transactionType);
    if (!currentUser?.id) return;
    const payload = {
      user_id: currentUser.id,
      date: formData.get('date'),
      amount: Number(formData.get('amount') || 0),
      transaction_type: formData.get('transaction_type'),
      category: formData.get('category') || null,
      memo: formData.get('memo') || null,
    };
    const { error } = await supabase.from('finance_records').insert([payload]);
    if (error) {
      alert('오류가 발생했습니다.');
      return false;
    }
    setShowAddModal(false);
    loadMonthRecords(currentUser.id, currentYear, currentMonth);
    return true;
  };

  const handleDeleteRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('finance_records').delete().eq('id', recordId);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    loadMonthRecords(currentUser?.id, currentYear, currentMonth);
  };

  const openEditModal = async (recordId) => {
    const local = records.find((record) => record.id === recordId);
    if (local) {
      setEditRecord({ ...local });
      setEditModalOpen(true);
      return;
    }
    const { data, error } = await supabase
      .from('finance_records')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();
    if (error || !data) {
      alert('거래 정보를 불러오지 못했습니다.');
      return;
    }
    setEditRecord(data);
    setEditModalOpen(true);
  };

  const handleUpdateRecord = async (event) => {
    event.preventDefault();
    const payload = {
      transaction_type: editRecord.transaction_type,
      category: editRecord.category,
      amount: Number(editRecord.amount || 0),
      date: editRecord.date,
      memo: editRecord.memo,
    };
    const { error } = await supabase.from('finance_records').update(payload).eq('id', editRecord.id);
    if (error) {
      alert('오류가 발생했습니다.');
      return;
    }
    setEditModalOpen(false);
    setEditRecord(null);
    loadMonthRecords(currentUser?.id, currentYear, currentMonth);
  };

  const renderEmptyState = (title, actionLabel, actionHref, actionClick) => (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="text-4xl mb-3">🧾</div>
      <p className="text-sm text-slate-500 mb-4">{title}</p>
      {actionLabel && (actionClick ? (
        <button type="button" onClick={actionClick} className="btn-primary px-4 py-2 rounded-full text-white text-sm font-semibold">
          {actionLabel}
        </button>
      ) : (
        <a href={actionHref} className="btn-primary px-4 py-2 rounded-full text-white text-sm font-semibold">
          {actionLabel}
        </a>
      ))}
    </div>
  );

  const openAddModal = (type = 'expense') => {
    setTransactionType(type);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="가계부"
        description="수입/지출을 한눈에 정리하고 달력과 통계로 흐름을 확인하세요."
        actions={[
          { label: '월간 보기', href: financeMonthHref, variant: 'secondary' },
          { label: '새 거래 추가', href: '#financeForm', variant: 'primary' },
        ]}
      />



      <section className="bg-white rounded-2xl shadow-sm border border-warm p-6 motion-card">
        <MonthlyCalendar
          year={currentYear}
          month={currentMonth}
          events={events}
          selectedDate={selectedDateKey}
          holidayDates={holidayDates}
          summaryByDate={expenseSummaryByDate}
          summaryThreshold={1}
          onDateClick={(dateValue) => {
            const dateKey = toDateKey(dateValue);
            setSelectedDate(dateKey);
            setCurrentYear(dateValue.getFullYear());
            setCurrentMonth(dateValue.getMonth() + 1);
          }}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 text-center motion-card">
          <div className="text-muted mb-2">총 수입</div>
          <AnimatedNumber
            value={totalIncome}
            formatter={(val) => `${Number(val || 0).toLocaleString()}원`}
            className="text-title income-color"
          />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 text-center motion-card">
          <div className="text-muted mb-2">총 지출</div>
          <AnimatedNumber
            value={totalExpense}
            formatter={(val) => `${Number(val || 0).toLocaleString()}원`}
            className="text-title expense-color"
          />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6 text-center motion-card">
          <div className="text-muted mb-2">잔액</div>
          <AnimatedNumber
            value={totalNet}
            formatter={(val) => `${val >= 0 ? '+' : ''}${Number(val || 0).toLocaleString()}원`}
            className={`text-title ${totalNet >= 0 ? 'income-color' : 'expense-soft'}`}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6">
          <h2 className="text-card-title flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l3-3 3 3 5-6" />
            </svg>
            통계/분석
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-card-title mb-2">일평균 지출</h3>
              <AnimatedNumber
                value={avgDailyExpense}
                formatter={(val) => `${Number(val || 0).toLocaleString()}원`}
                className="text-title expense-color"
              />
              <p className="text-muted mt-1">지출이 있는 {daysWithExpense}일 기준</p>
            </div>
            <div>
              <h3 className="text-card-title mb-2">전월 지출</h3>
              <AnimatedNumber
                value={prevMonthExpense}
                formatter={(val) => `${Math.round(Number(val || 0)).toLocaleString()}원`}
                className="text-title expense-color"
              />
              <p className="text-muted mt-1">전월 총 지출</p>
            </div>
            <div>
              <h3 className="text-card-title mb-2">전월 대비 사용량</h3>
              <AnimatedNumber
                value={monthOverMonthDiff}
                formatter={(val) => `${val >= 0 ? '+' : '-'}${Math.abs(Number(val || 0)).toLocaleString()}원`}
                className={`text-title ${monthOverMonthDiff >= 0 ? 'expense-color' : 'income-color'}`}
              />
              <p className="text-muted mt-1">
                전월 지출 {prevMonthExpense.toLocaleString()}원
                {monthOverMonthRate !== null ? ` · ${monthOverMonthRate.toFixed(1)}%` : ''}
              </p>
            </div>
            <div>
              <h3 className="text-card-title mb-2">거래 건수</h3>
              <AnimatedNumber
                value={records.length}
                formatter={(val) => `${Math.round(Number(val || 0))}건`}
                className="text-title text-slate-900"
              />
              <p className="text-muted mt-1">
                수입: {incomeCount}건 / 지출: {expenseCount}건
              </p>
            </div>
            <div>
              <h3 className="text-card-title mb-2">전월 최다 지출 TOP3</h3>
              <div className="space-y-1 text-sm text-slate-500">
                {prevTopCategories.length > 0 ? (
                  prevTopCategories.map((item, index) => (
                    <div key={`${item.category}-${index}`} className="flex items-center justify-between">
                      <span className="truncate">{index + 1}. {item.category}</span>
                      <span className="ml-2 text-xs">{Number(item.total || 0).toLocaleString()}원</span>
                    </div>
                  ))
                ) : (
                  <div>전월 지출 내역이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-warm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-card-title flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                빠른 거래 추가
              </h2>
              <p className="text-muted mt-1">이번 달 흐름에 바로 기록을 남겨보세요.</p>
            </div>
          </div>
          <form id="financeForm" className="space-y-4" onSubmit={handleAddRecord}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>구분</label>
                <select
                  name="transaction_type"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={transactionType}
                  onChange={(event) => setTransactionType(event.target.value)}
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                <input type="date" name="date" defaultValue={selectedDateKey} className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>항목명</label>
              <input type="text" name="category" placeholder="예: 커피, 급여, 식비" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>금액</label>
              <input type="number" name="amount" placeholder="0" min="0" step="1" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 (선택)</label>
              <textarea name="memo" rows="2" placeholder="간단한 설명" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary px-4 py-2 text-white text-sm font-semibold transition">
                + {transactionType === 'income' ? '수입' : '지출'} 추가
              </button>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm font-semibold transition"
                onClick={() => setTransactionType('income')}
              >
                수입으로 변경
              </button>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm font-semibold transition"
                onClick={() => setTransactionType('expense')}
              >
                지출로 변경
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-warm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'date', label: '날짜별' },
              { key: 'category', label: '카테고리별' },
              { key: 'fixed', label: '고정비' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeTab === tab.key ? 'btn-primary text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <a
            href={financeMonthHref}
            className="btn-ghost text-sm font-semibold"
          >
            전체 보기
          </a>
        </div>

        {activeTab === 'date' && (
          <div className="space-y-4">
            {recordsByDate.length > 0 ? (
              recordsByDate.map(([dateKey, dayRecords]) => (
                <div key={dateKey} className="border border-warm rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold" style={{ color: '#1F2937' }}>{formatKoreanDate(dateKey)}</div>
                  </div>
                  <div className="space-y-2">
                    {dayRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-warm-surface border border-warm">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#EEF2FF', color: '#3730A3' }}>
                            {record.category || '기타'}
                          </span>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: '#1F2937' }}>{record.memo || '메모 없음'}</div>
                            <div className="text-xs text-slate-500">{formatShortDate(record.date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${record.transaction_type === 'income' ? 'income-color' : 'expense-color'}`}>
                            {record.transaction_type === 'income' ? '+' : '-'}{Number(record.amount).toLocaleString()}원
                          </span>
                          <button onClick={() => openEditModal(record.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                            수정
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              renderEmptyState('아직 이 기간에는 거래가 없어요. 첫 기록을 추가해 볼까요?', '거래 추가', '#financeForm')
            )}
          </div>
        )}

        {activeTab === 'category' && (
          <div className="space-y-4">
            {categoryTotals.length > 0 ? (
              categoryTotals.map((item) => {
                const ratio = categoryTotalAmount > 0 ? (item.total / categoryTotalAmount) * 100 : 0;
                return (
                  <div key={item.category} className="border border-warm rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500">{ratio.toFixed(1)}%</span>
                      </div>
                      <div className="text-sm font-semibold expense-color">{formatCurrency(item.total)}</div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ratio}%`, backgroundColor: '#3B82F6' }} />
                    </div>
                  </div>
                );
              })
            ) : (
              renderEmptyState('아직 카테고리별로 정리할 거래가 없어요.', '거래 추가', '#financeForm')
            )}
          </div>
        )}

        {activeTab === 'fixed' && (
          <div className="space-y-4">
            {fixedRecords.length > 0 ? (
              fixedRecords.map((record) => (
                <div key={record.id} className="border border-warm rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold" style={{ color: '#1F2937' }}>{record.category || '고정비'}</div>
                    <div className="text-xs text-slate-500">{record.memo || '정기 지출'}</div>
                  </div>
                  <div className="text-sm font-semibold expense-color">{formatCurrency(record.amount)}</div>
                </div>
              ))
            ) : (
              renderEmptyState('고정비로 등록된 지출이 아직 없어요.', '거래 추가', '#financeForm', () => openAddModal('expense'))
            )}
          </div>
        )}
      </section>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>거래 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                const ok = await handleAddRecord(event);
                if (ok) setShowAddModal(false);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>구분</label>
                  <select
                    name="transaction_type"
                    className="w-full p-2 border rounded-md"
                    style={{ borderColor: '#E5E7EB' }}
                    value={transactionType}
                    onChange={(event) => setTransactionType(event.target.value)}
                  >
                    <option value="expense">지출</option>
                    <option value="income">수입</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>날짜</label>
                  <input type="date" name="date" defaultValue={selectedDateKey} className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>항목명</label>
                <input type="text" name="category" placeholder="예: 커피, 급여, 식비" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>금액</label>
                <input type="number" name="amount" placeholder="0" min="0" step="1" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 (선택)</label>
                <textarea name="memo" rows="2" placeholder="간단한 설명" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white text-sm font-semibold transition">저장</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 px-4 py-2 text-sm font-semibold transition">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>거래 수정</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateRecord}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>구분</label>
                <select
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.transaction_type}
                  onChange={(event) => setEditRecord({ ...editRecord, transaction_type: event.target.value })}
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>항목명</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.category || ''}
                  onChange={(event) => setEditRecord({ ...editRecord, category: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>금액</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.amount}
                  onChange={(event) => setEditRecord({ ...editRecord, amount: event.target.value })}
                  required
                />
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
                <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>메모 (선택)</label>
                <textarea
                  rows="2"
                  className="w-full p-2 border rounded-md"
                  style={{ borderColor: '#E5E7EB' }}
                  value={editRecord.memo || ''}
                  onChange={(event) => setEditRecord({ ...editRecord, memo: event.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 px-4 py-2 text-white rounded-md font-medium transition">수정 저장</button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>
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

export default FinancePage;

