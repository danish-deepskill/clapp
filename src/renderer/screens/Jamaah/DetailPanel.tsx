import { type ReactNode } from 'react';

import { Button } from '@renderer/components/Button';
import {
  ActiveBadge,
  KepalaBadge,
  RoleBadge,
} from '@renderer/components/badges';
import { Drawer } from '@renderer/components/Drawer';
import { fmtDateID } from '@renderer/lib/format';
import type { HouseholdRow } from '@shared/household';
import type { MemberRow as Member } from '@shared/member';

export interface DetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  household: HouseholdRow | null;
  onEdit: () => void;
  onCatatKepindahan: () => void;
}

export function DetailPanel({
  open,
  onOpenChange,
  member,
  household,
  onEdit,
  onCatatKepindahan,
}: DetailPanelProps) {
  if (!member) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        eyebrow="Jama'ah"
        title="—"
      >
        <div className="px-5 py-6 text-[13px] text-ink-500">Tidak ada data.</div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Jama'ah · Detail"
      title={
        <span className="flex items-center gap-2.5">
          <span className="truncate">{member.fullName}</span>
          {member.isHead && <KepalaBadge />}
        </span>
      }
      headerActions={
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <ActiveBadge active={member.isActive} />
          {member.roleName && <RoleBadge name={member.roleName} />}
        </div>

        <Section title="Identitas">
          <Field label="Nama Lengkap" value={member.fullName} />
          <Field label="Panggilan" value={member.nickname} italic />
          <Field label="Jenis Kelamin" value={member.gender} />
          <Field label="Kelas" value={member.lifeStage} mono />
          <Field label="Status Pernikahan" value={member.maritalStatus} />
          <Field label="Dapukan" value={member.roleName ?? null} />
        </Section>

        <Section title="Keluarga">
          <Field
            label="No. KK"
            value={household ? `KK-${household.householdNo}` : null}
            mono
          />
          <Field label="Tipe" value={household?.type ?? null} mono />
          <Field
            label="Kepala KK"
            value={household?.headMemberName ?? null}
          />
          <Field label="Alamat" value={household?.address ?? null} italic />
        </Section>

        <Section title="Kelahiran &amp; Kesehatan">
          <Field label="Tempat Lahir" value={member.birthPlace} />
          <Field
            label="Tanggal Lahir"
            value={member.birthDate ? fmtDateID(member.birthDate) : null}
            mono
          />
          <Field label="Golongan Darah" value={member.bloodType} mono />
          <Field label="Rhesus" value={member.rhesus} mono />
        </Section>

        <div className="border-t border-rule pt-5">
          <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Tindakan
          </p>
          <Button
            variant="danger-ghost"
            onClick={onCatatKepindahan}
            disabled={!member.isActive}
            className="w-full"
            title={
              !member.isActive
                ? 'Jama\'ah sudah dalam status mutasi'
                : undefined
            }
          >
            Catat Kepindahan (Pindah / Meninggal)
          </Button>
          <p className="mt-2 text-[11.5px] italic text-ink-500">
            Status keanggotaan hanya bisa diubah lewat tindakan ini — bukan
            inline toggle (CLApp tracks every perpindahan di Catatan Peristiwa).
          </p>
        </div>
      </div>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {title}
      </p>
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {children}
      </dl>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  italic,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  italic?: boolean;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd
        className={[
          mono ? 'font-mono tabular-nums' : '',
          italic ? 'italic' : '',
          empty ? 'text-ink-400' : 'text-ink-900',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {empty ? '—' : value}
      </dd>
    </>
  );
}
