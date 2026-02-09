const padNumber = (value) => String(value).padStart(2, '0');

const FIXED_HOLIDAYS = [
  [1, 1],  // 신정
  [3, 1],  // 삼일절
  [5, 5],  // 어린이날
  [6, 6],  // 현충일
  [8, 15], // 광복절
  [10, 3], // 개천절
  [10, 9], // 한글날
  [12, 25], // 성탄절
];

export const getKoreanHolidayDates = (years) => {
  const yearList = Array.isArray(years) ? years : [years];
  const result = new Set();
  yearList.forEach((year) => {
    FIXED_HOLIDAYS.forEach(([month, day]) => {
      result.add(`${year}-${padNumber(month)}-${padNumber(day)}`);
    });

    const lunar = LUNAR_HOLIDAYS[year];
    if (lunar) {
      lunar.forEach((date) => result.add(date));
    }

    const substitutes = SUBSTITUTE_HOLIDAYS[year];
    if (substitutes) {
      substitutes.forEach((date) => result.add(date));
    }
  });
  return Array.from(result);
};

const LUNAR_HOLIDAYS = {
  2024: [
    '2024-02-09',
    '2024-02-10',
    '2024-02-11',
    '2024-02-12',
    '2024-09-16',
    '2024-09-17',
    '2024-09-18',
  ],
  2025: [
    '2025-01-28',
    '2025-01-29',
    '2025-01-30',
    '2025-10-05',
    '2025-10-06',
    '2025-10-07',
    '2025-10-08',
  ],
  2026: [
    '2026-02-16',
    '2026-02-17',
    '2026-02-18',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
    '2026-09-28',
  ],
  2027: [
    '2027-02-06',
    '2027-02-07',
    '2027-02-08',
    '2027-02-09',
    '2027-09-14',
    '2027-09-15',
    '2027-09-16',
  ],
  2028: [
    '2028-01-26',
    '2028-01-27',
    '2028-01-28',
    '2028-10-02',
    '2028-10-03',
    '2028-10-04',
  ],
};

// 대체 공휴일 (연도별 실제 공휴일 날짜를 추가하세요)
const SUBSTITUTE_HOLIDAYS = {
  2024: [],
  2025: [],
  2026: [],
  2027: [],
  2028: [],
};
