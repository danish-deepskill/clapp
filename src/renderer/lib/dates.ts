export { BULAN_ID, BULAN_SHORT, HARI_ID } from '@shared/enums';

export function currentMonthYear(now: Date = new Date()): {
  month: number;
  year: number;
} {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function availableYears(
  startYear: number,
  now: Date = new Date(),
): number[] {
  const end = now.getFullYear();
  const start = Math.min(startYear, end);
  const years: number[] = [];
  for (let y = end; y >= start; y--) years.push(y);
  return years;
}

/** YYYY-MM-DD in local time (avoid the UTC shift from toISOString()). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First day of a month as YYYY-MM-DD. `month` is 1-12. */
export function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Last day of a month as YYYY-MM-DD. `month` is 1-12. Handles 28/29/30/31. */
export function lastDayOfMonth(year: number, month: number): string {
  // new Date(y, monthIndex, 0).getDate() = last day of month at monthIndex-1.
  // Passing our 1-indexed `month` directly yields the last day of THAT month.
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
