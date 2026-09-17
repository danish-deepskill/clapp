import { useCallback, useState, type DragEvent } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Check, FileJson, Upload } from 'lucide-react';

import { Banner } from '@renderer/components/Banner';
import { Button } from '@renderer/components/Button';
import { useToast } from '@renderer/components/Toast';
import type { SeedIssue, SeedPreview } from '@shared/seed';

import { PreviewPanel } from './PreviewPanel';

type Step =
  | { kind: 'welcome' }
  | { kind: 'checking'; path: string }
  | { kind: 'issues'; path: string; issues: SeedIssue[] }
  | { kind: 'preview'; preview: SeedPreview }
  | { kind: 'committing'; preview: SeedPreview };

export interface SetupWizardProps {
  /** Called once the seed is committed; the app then shows Beranda. */
  onDone: () => void;
}

/**
 * First-run wizard (HANDOFF §12.3). Shown only while the database has no
 * members; after commit it never appears again — recovery is backup
 * restore, never re-import (CONTEXT §1, §4).
 */
export function SetupWizard({ onDone }: SetupWizardProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>({ kind: 'welcome' });
  const [dragOver, setDragOver] = useState(false);

  const check = useCallback(async (path: string) => {
    setStep({ kind: 'checking', path });
    try {
      const r = await window.clapp.seed.preview(path);
      if (r.ok) setStep({ kind: 'preview', preview: r.preview });
      else setStep({ kind: 'issues', path, issues: r.issues });
    } catch (err: unknown) {
      setStep({
        kind: 'issues',
        path,
        issues: [{ path: '(file)', message: err instanceof Error ? err.message : String(err) }],
      });
    }
  }, []);

  const pick = async () => {
    const path = await window.clapp.seed.pickFile();
    if (path) await check(path);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await check(window.clapp.seed.pathForFile(file));
  };

  const commit = async (preview: SeedPreview) => {
    setStep({ kind: 'committing', preview });
    const r = await window.clapp.seed.commit(preview.path);
    if (!r.ok) {
      showToast({ variant: 'error', message: r.message });
      setStep({ kind: 'preview', preview });
      return;
    }
    showToast({
      variant: 'success',
      message: (
        <>
          Data awal diimpor: <b>{r.data.members}</b> jama'ah dalam{' '}
          <b>{r.data.households}</b> KK.
        </>
      ),
    });
    onDone();
  };

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-7 pb-12 pt-10">
        <header>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">
            CLApp · Persiapan Awal
          </p>
          <h1 className="text-[24px] font-bold leading-[1.15] tracking-tight text-ink-900">
            Selamat datang di CLApp
          </h1>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-700">
            CLApp belum punya data. Mulai dengan mengimpor file{' '}
            <span className="font-mono text-ink-900">seed.json</span> dari
            pengurus pusat. Impor hanya dilakukan <b>sekali</b>; setelah itu semua
            perubahan dicatat langsung di aplikasi.
          </p>
        </header>

        {(step.kind === 'welcome' || step.kind === 'checking' || step.kind === 'issues') && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => void onDrop(e)}
            className={clsx(
              'flex flex-col items-center gap-3 rounded border border-dashed px-6 py-10 text-center transition-colors',
              dragOver
                ? 'border-ink-900 bg-[#FFFDF8]'
                : 'border-rule-strong bg-surface',
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded bg-ink-900 text-surface">
              <FileJson size={22} strokeWidth={1.5} />
            </span>
            <div className="text-[14.5px] font-semibold text-ink-900">
              Tarik file seed.json ke sini
            </div>
            <div className="text-[12.5px] text-ink-500">atau</div>
            <Button
              icon={<Upload size={13} strokeWidth={1.8} />}
              onClick={() => void pick()}
              disabled={step.kind === 'checking'}
            >
              {step.kind === 'checking' ? 'Memeriksa…' : 'Pilih File'}
            </Button>
          </div>
        )}

        {step.kind === 'issues' && (
          <section className="overflow-hidden rounded border border-rule-strong bg-surface">
            <div className="flex items-center gap-2.5 border-b border-rule-strong bg-paper-2 px-4 py-[11px]">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-700">
                File tidak bisa diimpor
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[11px] text-ink-500">
                <b className="font-semibold text-ink-900">{step.issues.length}</b> masalah
              </span>
            </div>
            <div className="px-4 pt-3">
              <Banner variant="danger" className="max-w-none">
                Perbaiki masalah di bawah pada <span className="font-mono">{fileName(step.path)}</span>,
                lalu pilih file itu lagi. Tidak ada data yang tersimpan.
              </Banner>
            </div>
            <ul className="max-h-[320px] overflow-y-auto px-4 py-3">
              {step.issues.map((it, i) => (
                <li
                  key={`${it.path}-${i}`}
                  className="flex items-start gap-2.5 border-b border-rule py-2 text-[13px] last:border-b-0"
                >
                  <AlertTriangle size={13} strokeWidth={1.6} className="mt-0.5 shrink-0 text-alpa" />
                  <span className="shrink-0 font-mono text-[12px] text-ink-700">{it.path}</span>
                  <span className="text-ink-900">{it.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(step.kind === 'preview' || step.kind === 'committing') && (
          <>
            <PreviewPanel preview={step.preview} />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                icon={<Check size={13} strokeWidth={2} />}
                onClick={() => void commit(step.preview)}
                disabled={step.kind === 'committing'}
              >
                {step.kind === 'committing' ? 'Mengimpor…' : 'Mulai'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep({ kind: 'welcome' })}
                disabled={step.kind === 'committing'}
              >
                Pilih File Lain
              </Button>
              <span className="text-[12px] text-ink-500">
                Periksa jumlah jama'ah aktif dengan daftar pengurus sebelum
                menekan Mulai — angka ini menjadi dasar semua laporan berikutnya.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
