/**
 * Local-civil-date helpers. CLApp dates are wall-calendar dates (the date the
 * operator sees on their calendar), not UTC instants. Never use
 * `toISOString().slice(0, 10)` — that gives UTC and silently skews to the
 * previous day during local morning hours (UTC+7).
 */

/** YYYY-MM-DD in the local timezone. */
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
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
