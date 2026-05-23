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
