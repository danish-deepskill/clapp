/**
 * Single source of truth for "a calendar month period". Several services
 * filter by Bulan/Tahun; this centralizes the validation + the half-open
 * date-string range so the math isn't reimplemented per domain.
 */

export class InvalidPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPeriodError';
  }
}

export function assertMonthYear(month: number, year: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidPeriodError(`month harus 1–12 (diterima ${month})`);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new InvalidPeriodError(`year tidak valid (diterima ${year})`);
  }
}

/** Storage key for a month: zero-padded `YYYY-MM`. Validates the period. */
export function monthKey(month: number, year: number): string {
  assertMonthYear(month, year);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Half-open date-string range for a month: `[start, end)` where both are
 * zero-padded `YYYY-MM-DD`. `end` is the first day of the next month, so a
 * `date >= start && date < end` test selects exactly that month (works on
 * the string-stored dates without timezone parsing). Validates the period.
 */
export function monthRange(
  month: number,
  year: number,
): { start: string; end: string } {
  assertMonthYear(month, year);
  const startMonth = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${year}-${startMonth}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}
