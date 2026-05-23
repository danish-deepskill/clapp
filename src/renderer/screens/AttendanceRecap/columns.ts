/**
 * Sticky-column widths (px). Used to compute right-edge offsets for the
 * H/A/S/I totals and the % column so each can pin to the viewport's right
 * even as horizontal scrolling reveals more session columns.
 */
export const STICKY = {
  numCol: 40,
  nameCol: 220,
  totalCol: 36, // H / A / S / I (each)
  pctCol: 60,
  sessionCol: 84,
};

/** Right offset (px) for each rightward-sticky column. */
export const RIGHT_OFFSET = {
  pct: 0,
  i: STICKY.pctCol,
  s: STICKY.pctCol + STICKY.totalCol,
  a: STICKY.pctCol + STICKY.totalCol * 2,
  h: STICKY.pctCol + STICKY.totalCol * 3,
};

/**
 * Minimum session-column count. Padded with empty placeholder slots so the
 * matrix doesn't look sparse when there are only a few real sessions.
 * Real sessions fill from the left; placeholders show "—".
 */
export const MIN_SESSION_COLS = 5;
