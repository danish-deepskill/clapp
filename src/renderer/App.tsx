import { useEffect, useState, type ReactElement } from 'react';

import { NavBar, type Screen } from './components/NavBar';
import { TitleBar } from './components/TitleBar';
import { ToastProvider, useToast } from './components/Toast';
import { AttendanceRecap } from './screens/AttendanceRecap';
import { Dashboard } from './screens/Dashboard';
import { EventLog } from './screens/EventLog';
import { Meetings } from './screens/Meetings';
import { Members } from './screens/Members';
import { MonthlyReport } from './screens/MonthlyReport';
import { Serkiler } from './screens/Serkiler';
import { Settings } from './screens/Settings';
import { SetupWizard } from './screens/Setup';
import { useActionItemsStore } from './store/actionItemsStore';

export function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

/** Notify-only update toast (CONTEXT §5): link to the download, never install. */
function useUpdateToast() {
  const { showToast } = useToast();
  useEffect(
    () =>
      window.clapp.update.onAvailable((info) => {
        showToast({
          variant: 'info',
          duration: null,
          message: (
            <>
              CLApp <b>v{info.latestVersion}</b> tersedia (terpasang v{info.currentVersion}).
              Unduh dan pasang manual.
            </>
          ),
          action: {
            label: 'Lihat',
            onClick: () => void window.clapp.update.openRelease(info.releaseUrl),
          },
        });
      }),
    [showToast],
  );
}

function Shell() {
  useUpdateToast();
  const [active, setActive] = useState<Screen>('Beranda');
  // null = not checked yet; true = database has no members → first-run wizard
  // (OPERATIONS: gated on emptiness, self-disables after seeding).
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const perluTindakanCount = useActionItemsStore((s) => s.count);
  const refreshBadge = useActionItemsStore((s) => s.refresh);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await window.clapp.seed.status();
        if (!cancelled) setNeedsSetup(!s.hasMembers);
      } catch {
        // Bridge unavailable (plain-browser dev) or IPC failure: show the app;
        // the wizard can never be reached by accident this way.
        if (!cancelled) setNeedsSetup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = `CLApp — ${needsSetup ? 'Persiapan Awal' : active}`;
  }, [active, needsSetup]);

  // The brand badge is the app's only "notification" UI (HANDOFF §10).
  // Recount via the count-only IPC on every screen change; screens also call
  // refreshActionItems() right after a save, so a fix never lags the badge.
  useEffect(() => {
    if (needsSetup === false) void refreshBadge();
  }, [active, needsSetup, refreshBadge]);

  return (
    <>
      <div className="flex h-full flex-col bg-paper">
        <TitleBar subtitle={needsSetup ? 'Persiapan Awal' : active} />
        {needsSetup === false && (
          <NavBar
            active={active}
            onNavigate={setActive}
            perluTindakanCount={perluTindakanCount}
          />
        )}
        <main className="flex-1 overflow-hidden">
          {needsSetup === null ? null : needsSetup ? (
            <SetupWizard
              onDone={() => {
                setNeedsSetup(false);
                setActive('Beranda');
              }}
            />
          ) : (
            renderScreen(active, setActive)
          )}
        </main>
      </div>
    </>
  );
}

// Declared return type on purpose: if a Screen is added without a case here,
// this fails to compile instead of rendering an empty <main>.
function renderScreen(
  screen: Screen,
  navigate: (s: Screen) => void,
): ReactElement {
  switch (screen) {
    case 'Beranda':
      return <Dashboard onNavigate={navigate} />;
    case 'Rekap Absensi':
      return <AttendanceRecap />;
    case "Jama'ah":
      return <Members />;
    case 'Musyawarah':
      return <Meetings />;
    case 'Catatan Peristiwa':
      return <EventLog />;
    case 'Laporan Bulanan':
      return <MonthlyReport />;
    case 'Serkiler':
      return <Serkiler />;
    case 'Pengaturan':
      return <Settings />;
  }
}
