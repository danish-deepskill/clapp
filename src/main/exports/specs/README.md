# Export layout specs (HANDOFF §12.4)

Derived cell-by-cell from the manager's workbook
`clapp-handoff/05 I 18 Mei 2026 - SLM Cilandak.xlsx` (read with ExcelJS on
2026-09-17). One file per document. Each spec maps our service data to Excel
coordinates so the generator in `../` can be checked against the source.

| Spec | Source sheet(s) | Generator |
|---|---|---|
| [laporan-bulanan.md](laporan-bulanan.md) | `01`–`04` (one per month, identical structure) | `laporanBulananXlsx.ts` |
| [rekap-absensi.md](rekap-absensi.md) | `Rekap Absen` (also `Absen Times`) | `rekapAbsensiXlsx.ts` |
| [serkiler.md](serkiler.md) | `Serkiler` | `serkilerXlsx.ts` |

Not exported (yet) but present in the workbook:

- `CETAK ABSEN` — the blank paper attendance sheet (per session date: "Jam
  Hadir" + "Shodaqoh" columns, landscape, 158 names, closing note + witness
  line "Menyaksikan, IKEL CLA / Wa-IKEL"). A future "Cetak Lembar Absensi".
- `KK` — the 192-member roster the production `seed.json` must be generated
  from (63 households: 44 KK + 19 KK-S). Category vocabulary: `Balita L/P`,
  `AUD L/P`, `Caberawit L/P`, `Pra Remaja L/P`, `Remaja L/P`, `Muda mudi L/P`,
  `Menikah L/P`, `Duda`, `Janda`. Rhesus spellings: `+ (Positif)`,
  `- (Negatif)`, `Plus`, `Tidak tahu`. No birth dates, no addresses.

Shared conventions live in `../shared/excelTheme.ts` (fonts, borders, the
kelompok header lines).
