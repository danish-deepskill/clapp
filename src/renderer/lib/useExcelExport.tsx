import { useCallback } from 'react';

import { useToast } from '@renderer/components/Toast';
import type { ExportInput, ExportKind } from '@shared/export';

/**
 * One "Unduh" behaviour for every screen: build in main, native save
 * dialog, success toast with a "Buka" action, sticky error toast with
 * "Coba Lagi" (HANDOFF §12.9).
 */
export function useExcelExport(): (kind: ExportKind, input: ExportInput) => Promise<void> {
  const { showToast } = useToast();
  const run = useCallback(
    async (kind: ExportKind, input: ExportInput): Promise<void> => {
      let r: Awaited<ReturnType<typeof window.clapp.exportDoc.excel>>;
      try {
        r = await window.clapp.exportDoc.excel(kind, input);
      } catch (err: unknown) {
        r = { ok: false, code: 'INVALID_INPUT', message: err instanceof Error ? err.message : String(err) };
      }
      if (!r.ok) {
        showToast({
          variant: 'error',
          message: (
            <>
              Ekspor gagal: <b>{r.message}</b>
            </>
          ),
          action: { label: 'Coba Lagi', onClick: () => void run(kind, input) },
        });
        return;
      }
      if (!r.data) return; // operator cancelled the save dialog
      const { path, fileName } = r.data;
      showToast({
        variant: 'success',
        message: (
          <>
            Tersimpan: <b>{fileName}</b>
          </>
        ),
        action: { label: 'Buka', onClick: () => void window.clapp.exportDoc.open(path) },
        duration: 6000,
      });
    },
    [showToast],
  );
  return run;
}
