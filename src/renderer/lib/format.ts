import { BULAN_ID, HARI_ID } from '@shared/enums';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const IDR_PARSE = /[^\d-]/g;

/** "Rp 25.000". Returns "Rp 0" for null/undefined. */
export function fmtIDR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Rp 0';
  return IDR.format(n);
}

/** Parse "Rp 25.000" / "25.000" / "25000" back to a number. */
export function parseIDR(s: string): number {
  const stripped = s.replace(IDR_PARSE, '');
  if (!stripped) return 0;
  const n = Number(stripped);
  return Number.isFinite(n) ? n : 0;
}

/**
 * "12 Mei 2026". Accepts ISO date strings (YYYY-MM-DD) or Date objects.
 * Returns "—" for null/undefined.
 */
export function fmtDateID(input: string | Date | null | undefined): string {
  if (input === null || input === undefined) return '—';
  const d = input instanceof Date ? input : parseISO(input);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Senin" / "Kamis" / etc. Returns "—" for invalid input. */
export function fmtDay(input: string | Date | null | undefined): string {
  if (input === null || input === undefined) return '—';
  const d = input instanceof Date ? input : parseISO(input);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return HARI_ID[d.getDay()] ?? '—';
}

function parseISO(s: string): Date | null {
  // YYYY-MM-DD interpreted as local-midnight (avoid the UTC shift from new Date(iso)).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m && m[1] && m[2] && m[3]) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
