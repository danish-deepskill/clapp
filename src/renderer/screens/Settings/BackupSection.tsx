import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Download, FolderOpen, Info, Upload } from 'lucide-react';

import { Banner } from '@renderer/components/Banner';
import { Button } from '@renderer/components/Button';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';
import { Input } from '@renderer/components/Input';
import { SectionCard } from '@renderer/components/SectionCard';
import { Toggle } from '@renderer/components/Toggle';
import { useToast } from '@renderer/components/Toast';
import { fmtDateID, fmtTimeHHMM } from '@renderer/lib/format';
import type { BackupFile, BackupKind, BackupState } from '@shared/backup';
import { BACKUP_RETENTION_MAX, BACKUP_RETENTION_MIN } from '@shared/backup';

const KIND_LABEL: Record<BackupKind, string> = {
  auto: 'Otomatis',
  manual: 'Manual',
  'pre-restore': 'Pra-pemulihan',
  'pre-migration': 'Pra-migrasi',
};

function fmtWhen(iso: string | null): string {
  if (!iso) return 'belum pernah';
  return `${fmtDateID(iso)}, ${fmtTimeHHMM(new Date(iso))}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Pengaturan · Backup & Data. Daily auto-backup toggle, folder picker,
 * retention, "Backup Sekarang", and the destructive "Pulihkan dari Backup"
 * (HANDOFF §12.7, CONTEXT §3 — restore must warn, confirm, and copy first).
 */
export function BackupSection() {
  const { showToast } = useToast();
  const [state, setState] = useState<BackupState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retentionText, setRetentionText] = useState('');
  const [busy, setBusy] = useState<null | 'backup' | 'folder' | 'restore'>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<string | null>(null);

  const apply = useCallback((s: BackupState) => {
    setState(s);
    setRetentionText(String(s.settings.retention));
    setLoadError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await window.clapp.backup.getState();
        if (cancelled) return;
        if (!r.ok) setLoadError(r.message);
        else apply(r.data);
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const onToggleAuto = async (on: boolean) => {
    const r = await window.clapp.backup.setSettings({ autoBackup: on });
    if (!r.ok) return showToast({ variant: 'error', message: r.message });
    apply(r.data);
  };

  const commitRetention = async () => {
    if (!state) return;
    const n = Number(retentionText);
    if (!Number.isInteger(n) || n < BACKUP_RETENTION_MIN || n > BACKUP_RETENTION_MAX) {
      setRetentionText(String(state.settings.retention));
      return showToast({
        variant: 'warn',
        message: `Jumlah salinan harus ${BACKUP_RETENTION_MIN}–${BACKUP_RETENTION_MAX}.`,
      });
    }
    if (n === state.settings.retention) return;
    const r = await window.clapp.backup.setSettings({ retention: n });
    if (!r.ok) return showToast({ variant: 'error', message: r.message });
    apply(r.data);
  };

  const onChooseFolder = async () => {
    setBusy('folder');
    try {
      const r = await window.clapp.backup.chooseFolder();
      if (!r.ok) return showToast({ variant: 'error', message: r.message });
      if (r.data) {
        apply(r.data);
        showToast({ variant: 'success', message: 'Lokasi backup diperbarui.' });
      }
    } finally {
      setBusy(null);
    }
  };

  const onBackupNow = async () => {
    setBusy('backup');
    try {
      const r = await window.clapp.backup.runNow();
      if (!r.ok) {
        return showToast({
          variant: 'error',
          message: (
            <>
              Backup gagal: <b>{r.message}</b>
            </>
          ),
          action: { label: 'Coba Lagi', onClick: () => void onBackupNow() },
        });
      }
      const s = await window.clapp.backup.getState();
      if (s.ok) apply(s.data);
      showToast({
        variant: 'success',
        message: (
          <>
            Backup tersimpan: <b>{r.data.fileName}</b>
          </>
        ),
      });
    } finally {
      setBusy(null);
    }
  };

  const onPickRestore = async () => {
    const r = await window.clapp.backup.chooseRestoreFile();
    if (!r.ok) return showToast({ variant: 'error', message: r.message });
    if (r.data) setRestoreCandidate(r.data);
  };

  const onConfirmRestore = async () => {
    const source = restoreCandidate;
    if (!source) return;
    setBusy('restore');
    const r = await window.clapp.backup.restore(source);
    if (!r.ok) {
      setBusy(null);
      setRestoreCandidate(null);
      return showToast({ variant: 'error', message: r.message });
    }
    // The main process relaunches the app in a moment; keep the busy state.
    showToast({
      variant: 'info',
      message: 'Data dipulihkan. CLApp akan dimulai ulang…',
      duration: null,
    });
  };

  const settings = state?.settings;
  const restoreFileName = restoreCandidate?.split(/[\\/]/).pop() ?? '';

  return (
    <SectionCard
      label="Backup & Data"
      title="Cadangan Otomatis"
      meta={
        <>
          Terakhir: <b>{fmtWhen(state?.lastBackupAt ?? null)}</b>
        </>
      }
    >
      {loadError && (
        <div className="px-5 pt-4">
          <Banner variant="danger">
            Gagal memuat pengaturan backup: <b>{loadError}</b>
          </Banner>
        </div>
      )}

      {settings && state && (
        <div className="flex flex-col gap-4 px-5 py-[18px]">
          {/* Auto-backup toggle */}
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold tracking-tight text-ink-900">
                Auto-backup setiap hari
              </div>
              <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-500 [&_b]:font-mono [&_b]:font-semibold [&_b]:text-ink-900">
                CLApp menyimpan salinan otomatis ke <b>Lokasi Backup</b> sekali
                sehari (saat aplikasi dibuka). Backup otomatis terakhir:{' '}
                <b>{fmtWhen(state.lastAutoBackupAt)}</b>.
              </div>
            </div>
            <Toggle
              pressed={settings.autoBackup}
              onPressedChange={(on) => void onToggleAuto(on)}
              aria-label="Auto-backup setiap hari"
            />
          </div>

          {/* Folder */}
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-[13.5px] font-semibold tracking-tight text-ink-900">
                Lokasi Backup
              </div>
              <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-500">
                Arahkan ke folder yang tersinkron ke cloud Anda (Google Drive /
                OneDrive) supaya cadangan ikut tersimpan di luar perangkat ini.
              </div>
            </div>
            <div className="flex items-stretch gap-2">
              <Input
                readOnly
                value={settings.folder}
                aria-label="Lokasi folder backup"
                className="h-9 font-mono text-[13px]"
              />
              <Button
                variant="ghost"
                onClick={() => void onChooseFolder()}
                disabled={busy !== null}
                className="shrink-0 whitespace-nowrap"
              >
                Pilih Folder
              </Button>
            </div>
          </div>

          {/* Retention */}
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold tracking-tight text-ink-900">
                Simpan salinan otomatis terakhir
              </div>
              <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-500">
                Salinan otomatis yang lebih lama dihapus setiap backup berhasil.
                Salinan manual dan pra-pemulihan tidak pernah dihapus otomatis.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={BACKUP_RETENTION_MIN}
                max={BACKUP_RETENTION_MAX}
                value={retentionText}
                onChange={(e) => setRetentionText(e.target.value)}
                onBlur={() => void commitRetention()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                aria-label="Jumlah salinan otomatis yang disimpan"
                className="h-9 w-[76px] text-center font-mono"
              />
              <span className="text-[13px] text-ink-700">salinan</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              icon={<Download size={13} strokeWidth={1.8} />}
              onClick={() => void onBackupNow()}
              disabled={busy !== null}
            >
              {busy === 'backup' ? 'Menyimpan…' : 'Backup Sekarang'}
            </Button>
            <Button
              variant="danger-ghost"
              icon={<Upload size={13} strokeWidth={1.8} />}
              onClick={() => void onPickRestore()}
              disabled={busy !== null}
            >
              Pulihkan dari Backup…
            </Button>
            <Button
              variant="ghost"
              icon={<FolderOpen size={13} strokeWidth={1.8} />}
              onClick={() => void window.clapp.backup.openFolder()}
            >
              Buka Folder
            </Button>
          </div>

          <Banner variant="info" icon={<Info size={14} strokeWidth={1.4} />} className="max-w-none">
            Database CLApp tersimpan sebagai <b>file lokal</b> di perangkat ini.
            Aplikasi <b>offline, satu mesin</b> — tidak ada sinkronisasi ke server.
            Backup rutin sangat disarankan agar data tetap aman jika perangkat
            rusak atau hilang.
          </Banner>

          <BackupList backups={state.backups} />
        </div>
      )}

      <ConfirmDialog
        open={restoreCandidate !== null}
        onOpenChange={(o) => {
          if (!o && busy !== 'restore') setRestoreCandidate(null);
        }}
        eyebrow="Konfirmasi · Tindakan Destruktif"
        title="Pulihkan dari backup?"
        description={
          <>
            Data saat ini akan <b>diganti seluruhnya</b> dengan isi{' '}
            <span className="font-mono">{restoreFileName}</span>. Semua input
            setelah backup itu dibuat akan hilang. CLApp akan dimulai ulang
            setelah pemulihan.
          </>
        }
        warning={
          <>
            Salinan data saat ini disimpan dulu sebagai backup{' '}
            <span className="font-mono">-pre-restore</span> di Lokasi Backup,
            jadi langkah ini masih bisa dibatalkan dengan memulihkan salinan itu.
          </>
        }
        confirmLabel={busy === 'restore' ? 'Memulihkan…' : 'Ya, Pulihkan'}
        onConfirm={() => void onConfirmRestore()}
        busy={busy === 'restore'}
      />
    </SectionCard>
  );
}

function BackupList({ backups }: { backups: BackupFile[] }) {
  return (
    <div className="overflow-hidden rounded border border-rule">
      <div className="flex items-center justify-between border-b border-rule bg-paper-2 px-3.5 py-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-700">
          Salinan tersimpan
        </span>
        <span className="font-mono text-[11px] text-ink-500">
          <b className="font-semibold text-ink-900">{backups.length}</b> file
        </span>
      </div>
      {backups.length === 0 ? (
        <div className="px-3.5 py-5 text-center text-[13px] italic text-ink-500">
          Belum ada salinan di folder ini.
        </div>
      ) : (
        <div className="max-h-[220px] overflow-y-auto">
          {backups.map((b, i) => (
            <div
              key={b.path}
              className={clsx(
                'grid grid-cols-[1fr_110px_200px_70px] items-center gap-3 px-3.5 py-2 text-[12.5px]',
                i % 2 === 0 ? 'bg-surface' : 'bg-surface-2',
              )}
            >
              <span className="truncate font-mono text-[12px] text-ink-900" title={b.path}>
                {b.fileName}
              </span>
              <span className="inline-flex h-5 w-fit items-center rounded-sm border border-rule-strong bg-surface-2 px-[7px] text-[10.5px] font-semibold tracking-[0.04em] text-ink-700">
                {KIND_LABEL[b.kind]}
              </span>
              <span className="font-mono text-[12px] text-ink-700">{fmtWhen(b.createdAt)}</span>
              <span className="text-right font-mono text-[12px] text-ink-500">{fmtSize(b.sizeBytes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
