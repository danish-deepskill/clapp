# Rekap Absensi — Excel layout

Source: sheet `Rekap Absen` (a `Absen Times` variant carries arrival times).
Landscape, margins L/R 0.7, T/B 0.75, panes frozen below row 7. Calibri.
Column widths: A 4.5, B 8.2, C 24.5, one session column ≈ 10.2 each,
percentage columns 9.5 / 9.5 / 8 / 9.5 / 8.5.

## Header

| Cells | Content | Style |
|---|---|---|
| B1:L2 (merged over the used width) | `ABSENSI PENGAJIAN KELOMPOK CILANDAK A - {BULAN} {YYYY}` (upper-case month) | Calibri 18 bold, centered |
| B3:L3 | kelompok address line (`excelTheme.KELOMPOK_ADDRESS`) | Calibri 11, centered |

Rows 5–7 (bold, centered, green fill `A8D08D`, boxed):

- Row 5: `B5 No`, `C5 Nama`, `{sessions} Bulan {Bulan} {YYYY}` merged over the
  session columns, `Prosentase (%)` merged over the five % columns.
- Row 6: session type name per session column (the source abbreviates by
  hand, e.g. `Pnrbs Da`; we write the master-data name), then `H A S I H+S+I`.
- Row 7: day-of-month of each session under its column.

## Body (from row 8)

One row per attendance-eligible member of the period roster
(`RecapData.members`, ordered by household number then name):

| Col | Content |
|---|---|
| A | household ordinal (1, 2, 3 …) — merged vertically across the household's members, thin left/right borders |
| B | running number |
| C | full name |
| session cols | `H` / `A` / `S` / `I`, blank when no row saved (Calibri 12 centered) |
| H % | `=COUNTIF(D8:H8,"H")/{n}*100` (formulas, as in source) |
| A % / S % / I % | same with `"A"` / `"S"` / `"I"` |
| H+S+I % | `={Hcol}+{Scol}+{Icol}` |

Blank % cells in the source are simply zero results; we write the formula
everywhere.

## Footer

Row after the last member: `B Prosentase 5 BAB jamaah`, then `=AVERAGE(...)`
of each % column over the member rows. Next row repeats the labels
`H A S I H+S+I`. Two rows later: `TOTAL` merged over three session columns
and `={Havg}+{Savg}+{Iavg}` beside it (labelled `H+S+I`) — the period's
overall % Hadir, matching the Rekap screen's grand total.

When the month has no session the sheet still renders header + roster with
empty session columns (the template minimum is five session columns; we pad
to five with blank headers so the print width is stable).
