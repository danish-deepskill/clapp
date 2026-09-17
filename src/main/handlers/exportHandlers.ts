import { join } from 'node:path';

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import type { ExportInput, ExportKind, ExportResult } from '../../shared/export';
import type { IpcResult } from '../../shared/ipc';
import { InvalidPeriodError } from '../../shared/period';
import { exportFileName, exportService } from '../exports/exportService';
import type { IpcDeps } from '../ipc';

export function registerExportHandlers(deps: IpcDeps): void {
  /**
   * Build the workbook in memory, ask where to save it, write it. Returns
   * null when the operator cancels the dialog.
   */
  ipcMain.handle(
    'export:excel',
    async (_e, kind: ExportKind, input: ExportInput): Promise<IpcResult<ExportResult | null>> => {
      try {
        const workbook = exportService.buildWorkbook({ db: deps.db }, kind, input);
        const fileName = exportFileName(kind, input);
        const win = BrowserWindow.getFocusedWindow() ?? undefined;
        const r = await dialog.showSaveDialog(win!, {
          title: 'Simpan file Excel',
          defaultPath: join(app.getPath('documents'), fileName),
          filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        });
        if (r.canceled || !r.filePath) return { ok: true, data: null };
        await workbook.xlsx.writeFile(r.filePath);
        return { ok: true, data: { path: r.filePath, fileName: r.filePath.split(/[\\/]/).pop() ?? fileName } };
      } catch (e) {
        if (e instanceof InvalidPeriodError) {
          return { ok: false, code: 'INVALID_INPUT', message: e.message };
        }
        return {
          ok: false,
          code: 'INVALID_INPUT',
          message: e instanceof Error ? e.message : String(e),
        };
      }
    },
  );

  ipcMain.handle('export:open', async (_e, path: string): Promise<IpcResult<null>> => {
    const err = await shell.openPath(path);
    return err ? { ok: false, code: 'NOT_FOUND', message: err } : { ok: true, data: null };
  });
}
