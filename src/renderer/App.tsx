import { useEffect, useState } from 'react';

import { NavBar, type Screen } from './components/NavBar';
import { TitleBar } from './components/TitleBar';
import { ToastProvider } from './components/Toast';
import { Attendance } from './screens/Attendance';
import { Members } from './screens/Members';
import { Settings } from './screens/Settings';

export function App() {
  const [active, setActive] = useState<Screen>('Absensi');

  useEffect(() => {
    document.title = `CLApp — ${active}`;
  }, [active]);

  return (
    <ToastProvider>
      <div className="flex h-full flex-col bg-paper">
        <TitleBar subtitle={active} />
        <NavBar active={active} onNavigate={setActive} perluTindakanCount={0} />
        <main className="flex-1 overflow-hidden">
          {active === 'Absensi' ? (
            <Attendance />
          ) : active === "Jama'ah" ? (
            <Members />
          ) : active === 'Pengaturan' ? (
            <Settings />
          ) : (
            <Placeholder screen={active} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}

function Placeholder({ screen }: { screen: Screen }) {
  return (
    <div className="mx-auto h-full max-w-3xl px-8 py-12">
      <p className="font-mono text-eyebrow uppercase text-ink-500">
        CLApp · Belum Dibangun
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
        {screen}
      </h1>
      <p className="mt-3 max-w-prose text-ink-700">
        Layar ini belum dibangun. Lihat HANDOFF.md §4 untuk urutan pengerjaan.
      </p>
    </div>
  );
}
