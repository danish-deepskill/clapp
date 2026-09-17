# Serkiler — Excel layout

Source: sheet `Serkiler`. Portrait, zero margins, Calibri. Column widths:
A 9.3, B 5, C 47.2, D 25.5, E 15.7, F 13.2.

The sheet is two lists — Bapak-bapak first, then Ibu-ibu — each numbered from
1, each closed by a witness block, and each restarting the page header. The
generator splits `SerkilerRow`s by member gender (looked up from `members`),
ordered as on screen.

## Per list

| Rows | Content | Style |
|---|---|---|
| title row (h 103.5) | `B:F SERKILER KELOMPOK` merged | Calibri 20 bold, centered; the tall row leaves room for the printed letterhead |
| next (h 21) | `B .` (spacer as in source) | Calibri 16 bold |
| header (h 38.25) | `B NO`, `C NAMA`, `D {BULAN}` (upper-case), `E:F PARAF` merged | Calibri 16 bold, centered, boxed |
| members (h 24.75) | `B n`, `C fullName` (18pt), `D` iuran amount when recorded (`#,##0`), else blank for handwriting | boxed |

Paraf slots: members are paired. For the pair (2k+1, 2k+2) the cells `E` and
`F` are each merged over both rows; `E` carries the odd member's number,
`F` the even member's number (12pt, top-left), so two signatures share the
row pair side by side. A recorded paraf is rendered as `✓ {number}`.

After the last member of a list, three blank rows, then `B:C Menyaksikan,
IKEL CLA` (14pt, centered), two blank rows, `B:C ( {witness} )`. The witness
is the active member holding the role `Imam` when there is exactly one, else
blank parentheses (the workbook hard-codes a person).

The second list begins on a fresh page (`addPageBreak` before its title row).
