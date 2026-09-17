export { BULAN_ID, BULAN_SHORT, HARI_ID } from '@shared/enums';
export {
  currentMonthYear,
  firstDayOfMonth,
  lastDayOfMonth,
  todayISO,
} from '@shared/dates';

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
