import React from 'react';

const formatKoreanDate = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

function FinanceMonthPage({ yearOptions = [], currentYear, currentMonth, cards = [] }) {
  return (
    <div className="max-w-6xl mx-auto">
      <section className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: '#1F2937' }}>📌 가계부 전체보기</h2>
          <button onClick={() => window.history.back()} className="px-4 py-2 border rounded-md transition" style={{ borderColor: '#E5E7EB' }}>닫기</button>
        </div>

        <form method="get" className="flex items-center gap-2 mb-6">
          <select name="year" className="px-3 py-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} defaultValue={currentYear}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
          <select name="month" className="px-3 py-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} defaultValue={currentMonth}>
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
          <button type="submit" className="btn-primary px-4 py-2 rounded-md font-medium">조회</button>
        </form>

        <div className="grid grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.date} className="border rounded-lg p-3 flex flex-col overflow-y-auto" style={{ borderColor: '#E5E7EB', minHeight: 140, maxHeight: 180 }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#1F2937' }}>
                {formatKoreanDate(card.date)}
              </div>
              {card.records && card.records.length > 0 ? (
                <div className="space-y-2">
                  {card.records.map((record) => (
                    <div key={record.id} className="text-xs">
                      <span className="mr-1">
                        {record.transaction_type === 'income' ? (
                          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>수입</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>지출</span>
                        )}
                      </span>
                      <span className="mr-1" style={{ color: '#1F2937' }}>{record.category}</span>
                      <span className={record.transaction_type === 'income' ? 'income-color' : 'expense-color'}>
                        {record.transaction_type === 'income' ? '+' : '-'}{Number(record.amount).toLocaleString()}원
                      </span>
                      {record.memo && <div className="mt-1" style={{ color: '#9CA3AF' }}>{record.memo}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#6B7280' }}>내역 없음</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FinanceMonthPage;

