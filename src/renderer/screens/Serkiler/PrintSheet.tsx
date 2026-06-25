import type { SerkilerRow } from '@shared/serkiler';

export interface PrintSheetProps {
  rows: SerkilerRow[];
  periodLabel: string;
  /** "SLM Kelompok Cilandak A". */
  kelompokName: string;
}

/**
 * Hidden in screen view; visible only on print. Renders an A4-portrait
 * sheet with empty Serkiler (Rp) + Paraf columns — operator fills both
 * by hand on paper, then transcribes back into the app.
 *
 * Tailwind print: utilities + arbitrary mm values handle layout.
 */
export function PrintSheet({ rows, periodLabel, kelompokName }: PrintSheetProps) {
  return (
    <div
      aria-hidden="true"
      className="hidden print:fixed print:inset-0 print:z-[1000] print:block print:bg-white print:p-[14mm_18mm] print:text-black"
    >
      <header className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
          {kelompokName}
        </p>
        <h1 className="mt-1 text-[20px] font-bold tracking-tight">
          Lembar Serkiler
        </h1>
        <p className="mt-1 text-[12px]">Periode {periodLabel}</p>
        <p className="mt-2 text-[10.5px] italic">
          Isi kolom Iuran (Rp) dan tanda tangan di kolom Paraf, lalu
          serahkan kembali ke pengurus.
        </p>
      </header>

      <table className="mt-[8mm] w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border border-black px-[2mm] py-[1.5mm] text-center font-bold w-[10mm]">
              No
            </th>
            <th className="border border-black px-[3mm] py-[1.5mm] text-left font-bold">
              Nama Jama'ah
            </th>
            <th className="border border-black px-[2mm] py-[1.5mm] text-right font-bold w-[30mm]">
              Iuran (Rp)
            </th>
            <th className="border border-black px-[3mm] py-[1.5mm] text-left font-bold w-[50mm]">
              Paraf / Tanda Tangan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.memberId} className="h-[12mm]">
              <td className="border border-black px-[2mm] text-center align-middle font-mono">
                {i + 1}
              </td>
              <td className="border border-black px-[3mm] align-middle">
                {r.fullName}
                <span className="ml-2 font-mono text-[9.5px]">
                  KK-{r.householdNo}
                </span>
              </td>
              <td className="border border-black px-[2mm] text-right align-middle" />
              <td className="border border-black px-[3mm] align-middle" />
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-[14mm] grid grid-cols-2 gap-[20mm] text-[11px]">
        <div className="text-center">
          <p>Sekretaris,</p>
          <div className="mx-auto mt-[18mm] w-[50mm] border-t border-black" />
          <p className="mt-1 italic">(……………………………)</p>
        </div>
        <div className="text-center">
          <p>Ketua,</p>
          <div className="mx-auto mt-[18mm] w-[50mm] border-t border-black" />
          <p className="mt-1 italic">(……………………………)</p>
        </div>
      </footer>
    </div>
  );
}
