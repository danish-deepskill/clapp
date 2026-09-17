# Laporan Bulanan — Excel layout

Source: sheets `01`–`04`. A4 portrait (paperSize 9), margins L/R 0.7, T/B 0.75.
Column A width 2; columns B–R width 10.7 (17 data columns). Body font Arial.

Fixed row counts below are the template's; the generator grows a section when
there is more data (inserting rows shifts everything after it), never shrinks
it, so a sparse month still looks like the manager's sheet.

## Header

| Cells | Content | Style |
|---|---|---|
| B1:R1 (merged) | `SLM Kelompok Cilandak A` | Arial 14 bold, centered, row h 18 |
| B2:R2 (merged) | `Bulan {Bulan} Tahun {YYYY}` | Arial 14 bold, centered, row h 18 |

## Demografi (rows 4–7) — Times New Roman

Row 4 group headers (14pt, centered, boxed): `B4:K4 BELUM MENIKAH`,
`L4:O5 MENIKAH`, `P4:R5 JUMLAH`.
Row 5 stage headers under BELUM MENIKAH (each merged over 2 cols):
`B5:C5 BALITA & AUD`, `D5:E5 CABE RAWIT`, `F5:G5 Pra REMAJA`, `H5:I5 REMAJA`,
`J5:K5 MUDA-MUDI`.
Row 6 (14pt, boxed): `L P L P L P L P L P` in B–K, then `L6 L`, `M6 P`,
`N6 Duda`, `O6 Janda`, `P6 L`, `Q6 P`, `R6 TOTAL`.
Row 7 values (16pt, centered, boxed; R7 bold 22pt), row h 28:

| Cell | Value from `Demografi` |
|---|---|
| B7 / C7 | Balita.male + AUD.male / Balita.female + AUD.female |
| D7 / E7 | Caberawit male / female |
| F7 / G7 | Pra Remaja male / female |
| H7 / I7 | Remaja male / female |
| J7 / K7 | Muda-mudi male / female |
| L7 | (Dewasa.male + Lansia.male) − duda |
| M7 | (Dewasa.female + Lansia.female) − janda |
| N7 / O7 | duda / janda |
| P7 | `=B7+D7+F7+H7+J7+L7+N7` (formula, as in source) |
| Q7 | `=C7+E7+G7+I7+K7+M7+O7` |
| R7 | `=P7+Q7` |

Assumptions: the template has no Lansia column, so Lansia is folded into the
MENIKAH group; Duda/Janda are subtracted from the adult L/P columns because the
source's KATEGORI treats them as their own category (KK sheet footer).

Rows 8–12 notes, Arial 10: `B8 CATATAN :`, `C8 AUD&Balita : 0-6 Tahun`,
`F8 L : Laki-laki`, `C9 Cabe Rawit : 1-6 SD`, `F9 P : Perempuan`,
`C10 Pra Remaja : 1-3 SMP`, `C11 Remaja : 1-3 SMA`,
`C12 Muda-mudi : Lulus SMA- Menikah`.

## Numbered sections (Arial 12 bold section titles in C, number in B)

Table header rows are Arial 12 bold centered, boxed; data rows boxed; the
NAMA / KETERANGAN cells are merged across their column span. Row height 15.75.

### 1 · rows 14–22 `DATA JM MELAHIRKAN DAN MENINGGAL DUNIA DESA CILANDAK`
Header rows 15–16: `B NO` (B15:B16), `C:G NAMA`, `H:I MELAHIRKAN` over `L | P`,
`J:K MENINGGAL` over `L | P`, `L:R KETERANGAN`. Data rows 17–21 (min 5):
`peristiwa.vital` entries — name in C:G (Arial 10 left), a `1` in H/I (Lahir,
by gender) or J/K (Meninggal, by gender), notes in L:R. Row 22 `Jumlah`
(B22:G22) with `=SUM(H17:H21)` … in H–K.

### 2 · rows 24–38 `DATA JM PINDAH SAMBUNG dan SAMBUNG BARU DESA CILANDAK`
Same shape: `H:I PINDAH SAMBUNG`, `J:K SAMBUNG BARU`, each over `L | P`.
Data rows 27–37 (min 11) from `peristiwa.movement`; gender looked up from the
member. Row 38 `Jumlah` with SUM formulas in H–K.

### 3 · rows 40–47 `DATA JM YANG SEDANG SAKIT`
Header row 41: `B NO`, `C:K NAMA`, `L:R KETERANGAN`. Rows 42–47 (min 6) from
`sick` (memberName, notes).

### 4 · rows 49–56 `KEGIATAN KELOMPOK`
Header row 50: `B NO`, `C:H KEGIATAN`, `I:K STATUS`, `L:N TANGGAL PELAKSANAAN`,
`O:P JUMLAH HADIR`, `Q:R TEMPAT`. Rows 51–56 (min 6) from `activities`:
name, `TERLAKSANA` / `BELUM`, executedDate (dd/mm/yyyy), attendeeCount,
location. The template's six rows are exactly HANDOFF §12.5's activity types.

### 5 · rows 58–67 `KELUARGA YANG SUDAH DIKUNJUNGI`
Header row 59: `B NO`, `C:K NAMA KELUARGA`, `L:R KETERANGAN`. Rows 60–67
(min 8) from `familyVisits` (householdLabel or familyName, notes).

### 6 · rows 70–73 `Prosentase Lima BAB`
Row 70: `C70:E70 Prosentase Lima BAB`, `F70:Q70 SIFATNYA SECARA KESELURUHAN,
IZIN DIHITUNG HADIR` (bold, boxed). Row 72 labels (bold, boxed):
`C:E LANCAR : > 60 %`, `G:J KURANG LANCAR : 20 - 60 %`,
`L:N KRG SAMBUNG : < 20 %`, `O:Q TABAYYUN : 0 %`. Row 73 values under each,
Arial 20 centered, number format `0%`: bucket count ÷ eligible members
(lancar + kurangLancar + kurangSambung + tabayyun); blank when
`sessionCount = 0`.

### 7 · rows 75–78 `ANJANGSANA`
Header row 76 (bold, boxed): `C No`, `D Waktu`, `E:H Tempat`, `I:J Acara`,
`K:N Keterangan`. Rows 77–78 (min 2) from `visitPlans` (waktu, tempat,
agenda; Keterangan blank).

### 8 · rows 80–83 `PEMBANGUNAN`
Header row 81: `C No`, `D:F Jenis`, `G:I Kegunaan`, `J:K Volume/Luas`,
`L:N Dana`, `O:P Kondisi`. Rows 82–83 (min 2) from `constructionProjects`
(jenis, tujuan → Kegunaan, volume, dana; Kondisi blank). Jenis cells wrap.

### 9–11 · rows 86–88
`C86 RENCANA BECE` / `E86 : {rencanaBece}`; `C87 BERAS JIMPITAN` /
`E87 : {berasJimpitan}`; `C88 FOTOCOPY DALIL` / `E88 : {fotocopyDalil}`.
Labels bold Arial; value cells bold with a bottom border.

### 12 · rows 89–93 `SARAN DAN MASUKAN`
Header row 90: `C NO`, `D:R SARAN DAN MASUKAN`. Rows 91–93 (min 3) from
`saran` (one row per meeting suggestion, text merged D:R, wrapped).

### Lain-lain · row 94
`C94:D94 Lain - Lain`, `E94 : {otherNotes}`.

## Signatures (rows 95–99)
`G95:I95 Sekretaris Kelompok`, `L95:N95 Pembina Kelompok` (Arial, centered);
names in row 99, `( {name} )`, same columns. Names come from the active
members holding the roles `Sekretaris` and `Pembina` (blank parentheses when
no single holder) — the workbook hard-codes two people; roles are the
maintained equivalent.

## Deliberate deviations from the manager's file

- Lain-lain is numbered 13 (the file numbers it "12" twice).
- Row 36 of section 2 is the only data row the file leaves unmerged in
  KETERANGAN; we merge it like the other ten (`SOURCE_QUIRK_MERGES` in the
  fidelity test).
- Print setup: portrait, fit to one page wide (the file prints at 100% and
  spills across pages).
- Signatures come from the `Sekretaris` / `Pembina` roles instead of two
  hard-coded names; Lansia is folded into the MENIKAH columns (no Lansia
  column exists); Duda/Janda are subtracted from the adult L/P columns.
- Kegiatan rows follow master-data order (Pengaturan) so the six default
  activities land in the file's row order.
