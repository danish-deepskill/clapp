import { MasterDataList } from './MasterDataList';
import { PlaceholderSection } from './PlaceholderSection';

export function Settings() {
  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="border-b border-rule bg-surface px-6 pb-3.5 pt-4">
        <div className="mx-auto max-w-[820px]">
          <p className="mb-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-500">
            Master Data &amp; Backup
          </p>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink-900">
            Pengaturan
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8 pt-6">
        <div className="mx-auto flex max-w-[820px] flex-col gap-[18px]">
          <MasterDataList
            kind="activityTypes"
            label="Jenis Kegiatan"
            titleNote="(kegiatan kelompok yang dijalankan)"
            addPlaceholder="Tambah jenis kegiatan baru…"
          />
          <MasterDataList
            kind="sessionTypes"
            label="Jenis Pertemuan"
            titleNote="(opsi dropdown di layar Absensi)"
            addPlaceholder="Tambah jenis pertemuan baru…"
          />
          <MasterDataList
            kind="roles"
            label="Dapukan"
            titleNote="(peran organisasi jama'ah — geser untuk mengubah urutan)"
            addPlaceholder="Tambah dapukan baru… (contoh: Penasihat)"
            reorderable
            onReorder={(ids) => window.clapp.masterData.roles.reorder(ids)}
          />

          <PlaceholderSection
            label="Backup &amp; Data"
            title="Cadangan Otomatis"
            description={
              <>
                Auto-backup harian, pemilihan folder cadangan, &amp; Pulihkan
                dari Backup akan tersedia di pembaruan berikutnya.
              </>
            }
          />
          <PlaceholderSection
            label="Sinkronisasi Cloud"
            description={
              <>
                Push mingguan ke folder cloud (Drive / OneDrive) &amp; Tarik
                dari operator utama akan tersedia setelah mekanisme cloud
                difinalisasi.
              </>
            }
          />
          <PlaceholderSection
            label="Pembaruan"
            description={
              <>
                Periksa Pembaruan &amp; tampilan versi akan tersedia setelah
                infrastruktur version-feed dipasang.
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
