import { clsx } from 'clsx';

import { FormField } from '@renderer/components/FormField';
import { Input } from '@renderer/components/Input';
import { SegmentedControl } from '@renderer/components/SegmentedControl';
import { Select } from '@renderer/components/Select';
import { ACTIVITY_RECORD_STATUS, type ActivityRecordStatus } from '@shared/enums';
import type {
  ActivityRow,
  ConstructionProject,
  FamilyVisitRow,
  SaveReportInput,
  SickRow,
  VisitPlan,
} from '@shared/report';

import { MiniRow, MiniTable, ReportSection } from './ReportSection';

export interface PickerMember {
  id: number;
  fullName: string;
}
export interface PickerHousehold {
  id: number;
  householdNo: string;
  headMemberName: string | null;
}

export interface EditableProps {
  draft: SaveReportInput;
  onChange: (patch: Partial<SaveReportInput>) => void;
  members: PickerMember[];
  households: PickerHousehold[];
  disabled: boolean;
}

// ─── Kegiatan (activity checklist) ─────────────────────────────────────────

export function KegiatanSection({ draft, onChange, disabled }: EditableProps) {
  const setRow = (i: number, patch: Partial<ActivityRow>) => {
    const next = draft.activities.map((a, idx) =>
      idx === i ? { ...a, ...patch } : a,
    );
    onChange({ activities: next });
  };

  return (
    <ReportSection title="Kegiatan Kelompok" hint="Status tiap kegiatan bulan ini">
      {draft.activities.length === 0 ? (
        <p className="text-[12.5px] italic text-ink-500">
          Belum ada jenis kegiatan. Tambahkan di Pengaturan → Jenis Kegiatan.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {draft.activities.map((a, i) => {
            const done = a.status === 'Terlaksana';
            return (
              <div
                key={a.activityTypeId}
                className="grid grid-cols-[minmax(160px,1.3fr)_180px_110px_1fr] items-center gap-2.5"
              >
                <span className="truncate text-[13px] font-medium text-ink-900">
                  {a.activityName}
                  {a.sourceMeetingId != null && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                      auto
                    </span>
                  )}
                </span>
                <SegmentedControl<ActivityRecordStatus>
                  aria-label={`Status ${a.activityName}`}
                  value={a.status}
                  onChange={(v) =>
                    setRow(
                      i,
                      v === 'Belum'
                        ? {
                            status: v,
                            executedDate: null,
                            attendeeCount: null,
                            location: null,
                          }
                        : { status: v },
                    )
                  }
                  items={ACTIVITY_RECORD_STATUS.map((s) => ({ value: s, label: s }))}
                  fill
                />
                <Input
                  type="date"
                  aria-label={`Tanggal ${a.activityName}`}
                  value={a.executedDate ?? ''}
                  disabled={disabled || !done}
                  onChange={(e) => setRow(i, { executedDate: e.target.value || null })}
                />
                <Input
                  aria-label={`Tempat ${a.activityName}`}
                  placeholder="Tempat / catatan"
                  value={a.location ?? ''}
                  disabled={disabled || !done}
                  onChange={(e) => setRow(i, { location: e.target.value || null })}
                />
              </div>
            );
          })}
        </div>
      )}
    </ReportSection>
  );
}

// ─── Jama'ah Sakit ─────────────────────────────────────────────────────────

export function SakitSection({ draft, onChange, members, disabled }: EditableProps) {
  const update = (rows: SickRow[]) => onChange({ sick: rows });
  return (
    <ReportSection title="Jama'ah Sakit" hint="Yang sakit / butuh perhatian bulan ini">
      <MiniTable
        headers={["Jama'ah", 'Catatan']}
        gridCols="minmax(180px,1fr) minmax(180px,1.4fr)"
        disabled={disabled}
        addLabel="Tambah jama'ah sakit"
        emptyLabel="Belum ada catatan jama'ah sakit."
        onAdd={() =>
          update([
            ...draft.sick,
            { memberId: members[0]?.id ?? 0, notes: null },
          ])
        }
        rows={draft.sick.map((s, i) => (
          <MiniRow
            key={i}
            gridCols="minmax(180px,1fr) minmax(180px,1.4fr)"
            disabled={disabled}
            onRemove={() => update(draft.sick.filter((_, idx) => idx !== i))}
          >
            <Select
              aria-label="Pilih jama'ah"
              value={String(s.memberId)}
              disabled={disabled}
              onValueChange={(v) =>
                update(
                  draft.sick.map((r, idx) =>
                    idx === i ? { ...r, memberId: Number(v) } : r,
                  ),
                )
              }
              items={members.map((m) => ({ value: String(m.id), label: m.fullName }))}
            />
            <Input
              aria-label="Catatan sakit"
              placeholder="contoh: dirawat di RS"
              value={s.notes ?? ''}
              disabled={disabled}
              onChange={(e) =>
                update(
                  draft.sick.map((r, idx) =>
                    idx === i ? { ...r, notes: e.target.value || null } : r,
                  ),
                )
              }
            />
          </MiniRow>
        ))}
      />
    </ReportSection>
  );
}

// ─── Keluarga Dikunjungi ───────────────────────────────────────────────────

export function KeluargaSection({
  draft,
  onChange,
  households,
  disabled,
}: EditableProps) {
  const update = (rows: FamilyVisitRow[]) => onChange({ familyVisits: rows });
  return (
    <ReportSection title="Keluarga Dikunjungi" hint="Anjangsana yang sudah dilakukan">
      <MiniTable
        headers={['Keluarga', 'Catatan']}
        gridCols="minmax(200px,1fr) minmax(180px,1.4fr)"
        disabled={disabled}
        addLabel="Tambah kunjungan"
        emptyLabel="Belum ada kunjungan tercatat."
        onAdd={() =>
          update([
            ...draft.familyVisits,
            {
              householdId: households[0]?.id ?? null,
              familyName: null,
              notes: null,
            },
          ])
        }
        rows={draft.familyVisits.map((v, i) => (
          <MiniRow
            key={i}
            gridCols="minmax(200px,1fr) minmax(180px,1.4fr)"
            disabled={disabled}
            onRemove={() => update(draft.familyVisits.filter((_, idx) => idx !== i))}
          >
            <Select
              aria-label="Pilih keluarga"
              value={v.householdId !== null ? String(v.householdId) : ''}
              disabled={disabled}
              onValueChange={(val) =>
                update(
                  draft.familyVisits.map((r, idx) =>
                    idx === i ? { ...r, householdId: Number(val), familyName: null } : r,
                  ),
                )
              }
              items={households.map((h) => ({
                value: String(h.id),
                label: `KK-${h.householdNo} · ${h.headMemberName ?? '(belum ada kepala)'}`,
              }))}
            />
            <Input
              aria-label="Catatan kunjungan"
              placeholder="contoh: silaturahmi, sakit"
              value={v.notes ?? ''}
              disabled={disabled}
              onChange={(e) =>
                update(
                  draft.familyVisits.map((r, idx) =>
                    idx === i ? { ...r, notes: e.target.value || null } : r,
                  ),
                )
              }
            />
          </MiniRow>
        ))}
      />
    </ReportSection>
  );
}

// ─── Anjangsana (next-month visit plans) ───────────────────────────────────

export function AnjangsanaSection({ draft, onChange, disabled }: EditableProps) {
  const update = (rows: VisitPlan[]) => onChange({ visitPlans: rows });
  const cols = '140px 200px minmax(180px,1fr)';
  return (
    <ReportSection title="Anjangsana" hint="Rencana kunjungan bulan depan">
      <MiniTable
        headers={['Waktu', 'Tempat', 'Agenda']}
        gridCols={cols}
        disabled={disabled}
        addLabel="Tambah rencana"
        emptyLabel="Belum ada rencana anjangsana."
        onAdd={() => update([...draft.visitPlans, { waktu: '', tempat: '', agenda: '' }])}
        rows={draft.visitPlans.map((p, i) => (
          <MiniRow
            key={i}
            gridCols={cols}
            disabled={disabled}
            onRemove={() => update(draft.visitPlans.filter((_, idx) => idx !== i))}
          >
            {(['waktu', 'tempat', 'agenda'] as const).map((field) => (
              <Input
                key={field}
                aria-label={field}
                placeholder={field}
                value={p[field]}
                disabled={disabled}
                onChange={(e) =>
                  update(
                    draft.visitPlans.map((r, idx) =>
                      idx === i ? { ...r, [field]: e.target.value } : r,
                    ),
                  )
                }
              />
            ))}
          </MiniRow>
        ))}
      />
    </ReportSection>
  );
}

// ─── Pembangunan (construction) ────────────────────────────────────────────

export function PembangunanSection({ draft, onChange, disabled }: EditableProps) {
  const update = (rows: ConstructionProject[]) =>
    onChange({ constructionProjects: rows });
  const cols = 'minmax(140px,1.4fr) minmax(120px,1fr) 90px 130px';
  return (
    <ReportSection title="Pembangunan" hint="Proyek pembangunan / renovasi">
      <MiniTable
        headers={['Jenis', 'Tujuan', 'Volume', 'Dana']}
        gridCols={cols}
        disabled={disabled}
        addLabel="Tambah proyek"
        emptyLabel="Belum ada proyek pembangunan."
        onAdd={() =>
          update([
            ...draft.constructionProjects,
            { jenis: '', tujuan: '', volume: '', dana: '' },
          ])
        }
        rows={draft.constructionProjects.map((p, i) => (
          <MiniRow
            key={i}
            gridCols={cols}
            disabled={disabled}
            onRemove={() =>
              update(draft.constructionProjects.filter((_, idx) => idx !== i))
            }
          >
            {(['jenis', 'tujuan', 'volume', 'dana'] as const).map((field) => (
              <Input
                key={field}
                aria-label={field}
                placeholder={field}
                value={p[field]}
                disabled={disabled}
                onChange={(e) =>
                  update(
                    draft.constructionProjects.map((r, idx) =>
                      idx === i ? { ...r, [field]: e.target.value } : r,
                    ),
                  )
                }
              />
            ))}
          </MiniRow>
        ))}
      />
    </ReportSection>
  );
}

// ─── Ringkasan lain (single fields) ────────────────────────────────────────

export function RingkasanSection({ draft, onChange, disabled }: EditableProps) {
  return (
    <ReportSection title="Iuran & Material">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Rencana Bece">
          <Input
            value={draft.rencanaBece ?? ''}
            disabled={disabled}
            placeholder="contoh: Rp 500.000"
            onChange={(e) => onChange({ rencanaBece: e.target.value || null })}
          />
        </FormField>
        <FormField label="Beras Jimpitan">
          <Input
            value={draft.berasJimpitan ?? ''}
            disabled={disabled}
            placeholder="contoh: 25 kg"
            onChange={(e) => onChange({ berasJimpitan: e.target.value || null })}
          />
        </FormField>
        <FormField label="Fotocopy Dalil">
          <Input
            value={draft.fotocopyDalil ?? ''}
            disabled={disabled}
            placeholder="contoh: 50 lembar"
            onChange={(e) => onChange({ fotocopyDalil: e.target.value || null })}
          />
        </FormField>
      </div>
    </ReportSection>
  );
}

// ─── Lain-lain ─────────────────────────────────────────────────────────────

export function LainLainSection({ draft, onChange, disabled }: EditableProps) {
  return (
    <ReportSection title="Lain-lain" hint="Catatan tambahan bebas">
      <textarea
        value={draft.otherNotes ?? ''}
        disabled={disabled}
        placeholder="Catatan tambahan…"
        rows={4}
        onChange={(e) => onChange({ otherNotes: e.target.value || null })}
        className={clsx(
          'min-h-[96px] w-full appearance-none resize-y rounded border border-rule bg-surface px-3 py-2 font-sans text-sm text-ink-900 outline-none transition-colors',
          'placeholder:text-ink-400',
          'hover:enabled:border-rule-strong focus:border-ink-900 focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,24,20,0.08)]',
          'disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-500',
        )}
      />
    </ReportSection>
  );
}
