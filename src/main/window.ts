import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

const isMac = process.platform === 'darwin';
const TITLE_BAR_HEIGHT = 32;

function resolveIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'clapp-icon.jpg')
    : join(app.getAppPath(), 'src', 'main', 'assets', 'clapp-icon.jpg');
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#F5F1E8',
    autoHideMenuBar: true,
    icon: resolveIconPath(),
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? {}
      : {
          titleBarOverlay: {
            color: '#cfc7b4', // keep in sync with tailwind.config 'chrome' token
            symbolColor: '#1B1814',
            height: TITLE_BAR_HEIGHT,
          },
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
