import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

import { Banner } from '@renderer/components/Banner';
import { Button } from '@renderer/components/Button';
import { SectionCard } from '@renderer/components/SectionCard';
import { fmtDateID, fmtTimeHHMM } from '@renderer/lib/format';
import type { UpdateInfo } from '@shared/update';

/**
 * Pengaturan · Pembaruan. Notify-only (CONTEXT §5): check GitHub's latest
 * release, link to the download page; nothing is installed by the app.
 */
export function PembaruanSection() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    try {
      setInfo(await window.clapp.update.check());
    } finally {
      setBusy(false);
    }
  };

  const status = (() => {
    if (!info) return null;
    if (info.error) {
      return (
        <span className="text-[12.5px] text-ink-700">
          Tidak bisa memeriksa: <b>{info.error}</b>. Coba lagi saat ada koneksi internet.
        </span>
      );
    }
    if (info.isNewer) {
      return (
        <span className="text-[12.5px] text-ink-900">
          Versi <b className="font-mono">v{info.latestVersion}</b> tersedia.
        </span>
      );
    }
    return (
      <span className="text-[12.5px] text-ink-700">
        Sudah versi terbaru{info.latestVersion ? ` (v${info.latestVersion})` : ''}.
      </span>
    );
  })();

  return (
    <SectionCard
      label="Pembaruan"
      title="Versi & Unduh Manual"
      meta={
        info ? (
          <>
            Diperiksa: <b>{fmtDateID(info.checkedAt)}, {fmtTimeHHMM(new Date(info.checkedAt))}</b>
          </>
        ) : undefined
      }
      defaultCollapsed
    >
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        <div className="flex items-center gap-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold tracking-tight text-ink-900">
              Versi terpasang{' '}
              <span className="font-mono">v{info?.currentVersion ?? __APP_VERSION__}</span>
            </div>
            <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-500">
              CLApp memeriksa rilis terbaru saat dibuka (jika ada internet) dan
              hanya memberi tahu — tidak pernah memasang sendiri.
            </div>
            {status && <div className="mt-1.5">{status}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              icon={<RefreshCw size={13} strokeWidth={1.8} />}
              onClick={() => void check()}
              disabled={busy}
            >
              {busy ? 'Memeriksa…' : 'Periksa Pembaruan'}
            </Button>
            {info?.isNewer && (
              <Button
                icon={<Download size={13} strokeWidth={1.8} />}
                onClick={() => void window.clapp.update.openRelease(info.releaseUrl)}
              >
                Unduh Pembaruan
              </Button>
            )}
          </div>
        </div>
        <Banner variant="info" className="max-w-none">
          Pembaruan <b>diunduh dan dipasang manual</b> — jalankan installer yang
          baru, data tetap aman karena database tidak ikut diganti.
        </Banner>
      </div>
    </SectionCard>
  );
}
