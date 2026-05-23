import { NavBar } from './components/NavBar';
import type { Screen } from './components/NavBar';
import { useState } from 'react';

export function App() {
  const [active, setActive] = useState<Screen>('Pengaturan');

  return (
    <div className="flex h-full flex-col bg-paper">
      <NavBar active={active} onNavigate={setActive} perluTindakanCount={0} />
      <main className="flex-1 overflow-auto">
        <Placeholder screen={active} />
      </main>
    </div>
  );
}

function Placeholder({ screen }: { screen: Screen }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <p className="font-mono text-eyebrow uppercase text-ink-500">
        CLApp · Scaffold
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
        {screen}
      </h1>
      <p className="mt-3 max-w-prose text-ink-700">
        Layar ini belum dibangun. Lihat HANDOFF.md §4 untuk urutan
        pengerjaan — mulai dari Pengaturan.
      </p>
      <ul className="mt-6 space-y-1 text-sm text-ink-700">
        <li className="font-mono text-eyebrow uppercase text-ink-500">Status</li>
        <li>· Tailwind tokens aktif (cek warna `bg-paper`, `text-ink-900`).</li>
        <li>· IBM Plex Sans + Plex Mono dimuat lokal.</li>
        <li>· Database SQLite + Drizzle siap; migration berjalan saat boot.</li>
        <li>· NavBar berfungsi; klik tab untuk berpindah layar.</li>
      </ul>
    </div>
  );
}
