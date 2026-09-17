import { readFileSync } from 'node:fs';

import { BrowserWindow, dialog, ipcMain } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type {
  SeedCommitResult,
  SeedPreviewResult,
  SeedStatus,
} from '../../shared/seed';
import type { IpcDeps } from '../ipc';
import { SeedAlreadyCommittedError, seedService } from '../services/seedService';

function readJson(path: string): { ok: true; raw: unknown } | { ok: false; message: string } {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    return { ok: false, message: `File tidak bisa dibaca: ${e instanceof Error ? e.message : String(e)}` };
  }
  try {
    return { ok: true, raw: JSON.parse(text) as unknown };
  } catch (e) {
    return { ok: false, message: `Bukan JSON yang valid: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function registerSeedHandlers(deps: IpcDeps): void {
  ipcMain.handle('seed:status', (): SeedStatus => seedService.status({ db: deps.db }));

  ipcMain.handle('seed:pickFile', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const r = await dialog.showOpenDialog(win!, {
      title: 'Pilih file seed.json',
      filters: [{ name: 'Seed CLApp', extensions: ['json'] }],
      properties: ['openFile'],
    });
    const picked = r.filePaths[0];
    return r.canceled || !picked ? null : picked;
  });

  ipcMain.handle(
    'seed:preview',
    (_e, path: string): SeedPreviewResult => {
      const file = readJson(path);
      if (!file.ok) return { ok: false, issues: [{ path: '(file)', message: file.message }] };
      const parsed = seedService.parse(file.raw);
      if (!parsed.ok) return parsed;
      return { ok: true, preview: { path, ...parsed.preview } };
    },
  );

  // Re-reads and re-validates the file so a stale preview can never commit
  // something other than what's on disk.
  ipcMain.handle(
    'seed:commit',
    (_e, path: string): IpcResult<SeedCommitResult> => {
      const file = readJson(path);
      if (!file.ok) return { ok: false, code: 'INVALID_INPUT', message: file.message };
      const parsed = seedService.parse(file.raw);
      if (!parsed.ok) {
        const first = parsed.issues[0];
        return {
          ok: false,
          code: 'INVALID_INPUT',
          message: first ? `${first.path}: ${first.message}` : 'seed.json tidak valid',
        };
      }
      try {
        return { ok: true, data: seedService.commit({ db: deps.db }, parsed.seed) };
      } catch (e) {
        if (e instanceof SeedAlreadyCommittedError) {
          return { ok: false, code: 'DUPLICATE', message: e.message };
        }
        throw e;
      }
    },
  );
}
