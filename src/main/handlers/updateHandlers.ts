import { app, ipcMain, shell, type BrowserWindow } from 'electron';

import type { IpcResult } from '../../shared/ipc';
import type { UpdateInfo } from '../../shared/update';
import { REPO, checkForUpdate } from '../update/updateCheck';

export function registerUpdateHandlers(): void {
  ipcMain.handle(
    'update:check',
    (): Promise<UpdateInfo> => checkForUpdate({ currentVersion: app.getVersion() }),
  );

  // Only the project's own release pages may be opened from the renderer.
  ipcMain.handle('update:openRelease', async (_e, url: string): Promise<IpcResult<null>> => {
    if (!url.startsWith(`https://github.com/${REPO}/`)) {
      return { ok: false, code: 'INVALID_INPUT', message: 'Tautan bukan halaman rilis CLApp' };
    }
    await shell.openExternal(url);
    return { ok: true, data: null };
  });
}

/**
 * One check shortly after launch (CONTEXT §5). A newer release is pushed to
 * the renderer, which shows a toast linking to the download; an offline
 * machine stays silent.
 */
export function scheduleLaunchUpdateCheck(win: BrowserWindow, delayMs = 10_000): () => void {
  const timer = setTimeout(() => {
    void checkForUpdate({ currentVersion: app.getVersion() }).then((info) => {
      if (info.isNewer && !win.isDestroyed()) win.webContents.send('update:available', info);
    });
  }, delayMs);
  return () => clearTimeout(timer);
}
