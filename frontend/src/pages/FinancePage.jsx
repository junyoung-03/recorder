import React, { useMemo, useState } from 'react';

const toDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toISOString().split('T')[0];
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

function FinancePage({
  currentYear,
  currentMonth,
  today,
  selectedDate,
  selectedDateFormatted,
  weekdayName,
  calendar = [],
  totalIncome = 0,
  totalExpense = 0,
  totalNet = 0,
  records = [],
  daysWithExpense = 0,
  avgDailyExpense = 0,
  monthlyAvgExpense = 0,
  prevMonthExpense = 0,
  monthOverMonthDiff = 0,
  monthOverMonthRate = null,
  prevTopCategories = [],
  incomeCount = 0,
  expenseCount = 0,
  viewMode = 'latest',
}) {
  const [transactionType, setTransactionType] = useState('expense');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate) || todayKey, [selectedDate, todayKey]);
  const selectedDateParts = useMemo(() => {
    if (!selectedDateKey) return { year: currentYear, month: currentMonth };
    const date = new Date(selectedDateKey);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }, [selectedDateKey, currentYear, currentMonth]);
  const financeMonthHref = `/finance/month?year=${selectedDateParts.year}&month=${selectedDateParts.month}`;

  const handleAddRecord = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    formData.set('transaction_type', transactionType);
    const response = await fetch('/finance/add', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.success) {
      alert(result.message);
      const recordDate = formData.get('date');
      if (recordDate) {
        const dateObj = new Date(recordDate);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        window.location.href = `/finance?date=${recordDate}&year=${year}&month=${month}`;
      } else {
        window.location.reload();
      }
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await fetch(`/finance/delete/${recordId}`, { method: 'DELETE' });
    const result = await response.json();
    if (result.success) {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  const openEditModal = async (recordId) => {
    const response = await fetch(`/finance/detail/${recordId}`);
    if (!response.ok) {
      alert('거래 정보를 불러오지 못했습니다.');
      return;
    }
    const data = await response.json();
    setEditRecord(data);
    setEditModalOpen(true);
  };

  const handleUpdateRecord = async (event) => {
    event.preventDefault();
    const payload = {
      transaction_type: editRecord.transaction_type,
      category: editRecord.category,
      amount: editRecord.amount,
      date: editRecord.date,
      memo: editRecord.memo,
    };
    const response = await fetch(`/finance/update/${editRecord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.success) {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message || '오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            📆 {currentYear}년 {currentMonth}월
          </h2>
          <span className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            {selectedDateFormatted} {weekdayName}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#1F2937' }}>
                {['월', '화', '수', '목', '금', '토', '일'].map((label) => (
                  <th key={label} className="border p-3 text-center font-semibold text-white">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendar.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((dayData, dayIndex) => {
                    const dateKey = toDateKey(dayData?.date);
                    const isToday = dateKey && dateKey === todayKey;
                    return (
                      <td
                        key={`day-${weekIndex}-${dayIndex}`}
                        className={`border p-4 calendar-day cursor-pointer transition hover:bg-gray-50 ${isToday ? 'calm-blue-light' : ''} ${
                          dayData ? 'calendar-cell' : ''
                        }`}
                        style={{ borderColor: '#E5E7EB' }}
                        onClick={() => {
                          if (dateKey) window.location.href = `/finance?date=${dateKey}`;
                        }}
                      >
                        {dayData ? (
                          <div className="text-center">
                            <div className="font-semibold text-lg mb-2">{dayData.day}</div>
                            {dayData.net !== 0 && (
                              <div className={`text-xs ${dayData.net > 0 ? 'income-color' : 'expense-color'} font-semibold`}>
                                {dayData.net > 0 ? '+' : ''}
                                {Number(dayData.net || 0).toLocaleString()}원
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-sm mb-2" style={{ color: '#6B7280' }}>💰 총 수입</div>
          <div className="text-3xl income-color">{totalIncome.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-sm mb-2" style={{ color: '#6B7280' }}>💸 총 지출</div>
          <div className="text-3xl" style={{ color: '#F87171' }}>{totalExpense.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-sm mb-2" style={{ color: '#6B7280' }}>📊 잔액</div>
          <div className={`text-3xl ${totalNet >= 0 ? 'income-color' : 'expense-color'}`}>
            {totalNet >= 0 ? '+' : ''}{totalNet.toLocaleString()}원
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>거래 추가</h2>
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
            <button type="submit" className="btn-primary px-6 py-2 text-white rounded-md font-medium transition">+ 지출 추가</button>
            <button
              type="button"
              className="px-6 py-2 text-white rounded-md font-medium transition"
              style={{ backgroundColor: '#10B981' }}
              onClick={() => {
                setTransactionType('income');
                document.getElementById('financeForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }}
            >
              + 수입 추가
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              {viewMode === 'month' ? '월별 사용 내역' : '거래 내역'}
            </h2>
            {viewMode === 'month' && (
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {currentYear}년 {currentMonth}월
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={financeMonthHref}
              className="text-sm px-3 py-1 rounded-md"
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            >
              전체 보기
            </a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#1F2937' }}>
                <th className="border p-3 text-left align-middle font-semibold text-white">날짜</th>
                <th className="border p-3 text-left align-middle font-semibold text-white">구분</th>
                <th className="border p-3 text-left align-middle font-semibold text-white">항목</th>
                <th className="border p-3 text-right align-middle font-semibold text-white">금액</th>
                <th className="border p-3 text-left align-middle font-semibold text-white">메모</th>
                <th className="border p-3 text-center align-middle font-semibold text-white">작업</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="border p-3 align-middle" style={{ borderColor: '#E5E7EB' }}>{formatShortDate(record.date)}</td>
                    <td className="border p-3 align-middle" style={{ borderColor: '#E5E7EB' }}>
                      {record.transaction_type === 'income' ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>수입</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>지출</span>
                      )}
                    </td>
                    <td className="border p-3 align-middle" style={{ borderColor: '#E5E7EB' }}>{record.category}</td>
                    <td className={`border p-3 text-right align-middle font-semibold ${record.transaction_type === 'income' ? 'income-color' : 'expense-color'}`} style={{ borderColor: '#E5E7EB' }}>
                      {record.transaction_type === 'income' ? '+' : '-'}{Number(record.amount).toLocaleString()}원
                    </td>
                    <td className="border p-3 text-sm align-middle" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>{record.memo || '—'}</td>
                    <td className="border p-3 text-center align-middle" style={{ borderColor: '#E5E7EB' }}>
                      <button onClick={() => openEditModal(record.id)} className="text-xs px-2 py-1 rounded mr-1" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                        수정
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="border p-4 text-center" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                    거래 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1F2937' }}>📈 통계/분석</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>일평균 지출</h3>
            <div className="text-2xl font-bold expense-color">
              {daysWithExpense > 0 ? (avgDailyExpense.toLocaleString() + '원') : '0원'}
            </div>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>지출이 있는 {daysWithExpense}일 기준</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>전월 지출</h3>
            <div className="text-2xl font-bold expense-color">
              {prevMonthExpense > 0 ? (Math.round(prevMonthExpense).toLocaleString() + '원') : '0원'}
            </div>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>전월 총 지출</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>전월 대비 사용량</h3>
            <div className={`text-2xl font-bold ${monthOverMonthDiff >= 0 ? 'expense-color' : 'income-color'}`}>
              {monthOverMonthDiff >= 0 ? '+' : '-'}
              {Math.abs(monthOverMonthDiff || 0).toLocaleString()}원
            </div>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              전월 지출 {prevMonthExpense.toLocaleString()}원
              {monthOverMonthRate !== null ? ` · ${monthOverMonthRate.toFixed(1)}%` : ''}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>거래 건수</h3>
            <div className="text-2xl font-bold" style={{ color: '#1F2937' }}>{records.length}건</div>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              수입: {incomeCount}건 / 지출: {expenseCount}건
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>전월 최다 지출 TOP3</h3>
            <div className="space-y-1 text-sm" style={{ color: '#6B7280' }}>
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
      </section>

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

