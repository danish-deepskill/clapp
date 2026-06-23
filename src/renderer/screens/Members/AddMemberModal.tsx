import { useEffect, useMemo, useState } from 'react';

import { Button } from '@renderer/components/Button';
import { FormField, FormGrid, FormSection } from '@renderer/components/FormField';
import { HintLine, HintPill } from '@renderer/components/HintLine';
import { Input } from '@renderer/components/Input';
import { Modal } from '@renderer/components/Modal';
import { SegmentedControl } from '@renderer/components/SegmentedControl';
import { Select } from '@renderer/components/Select';
import { useToast } from '@renderer/components/Toast';
import { todayISO } from '@renderer/lib/dates';
import {
  BLOOD_TYPE,
  GENDER,
  LIFE_STAGE,
  MARITAL_STATUS,
  RHESUS,
  type BloodType,
  type Gender,
  type LifeStage,
  type MaritalStatus,
  type Rhesus,
} from '@shared/enums';
import type { HouseholdRow } from '@shared/household';
import type { MasterDataItem } from '@shared/masterData';
import type { AddMemberLogAs, NewMemberInput } from '@shared/member';

const NO_ROLE = '__none__';

export interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  households: HouseholdRow[];
  roles: MasterDataItem[];
  onSaved: () => void;
  /** Mode Pendataan Awal — skip event-log writes on submit. */
  silentLog?: boolean;
}

type KKMode = 'create-new' | 'join-existing';

interface FormState {
  fullName: string;
  nickname: string;
  gender: Gender;
  lifeStage: LifeStage;
  maritalStatus: MaritalStatus;
  bloodType: BloodType;
  rhesus: Rhesus;
  birthPlace: string;
  birthDate: string;
  roleId: string;
  kkMode: KKMode;
  kkId: string;
  kkAddress: string;
  logAs: AddMemberLogAs;
  logDate: string;
}


const initial = (): FormState => ({
  fullName: '',
  nickname: '',
  gender: 'Laki-Laki',
  lifeStage: 'Dewasa',
  maritalStatus: 'Belum Menikah',
  bloodType: 'Tidak Tahu',
  rhesus: 'Tidak Tahu',
  birthPlace: '',
  birthDate: '',
  roleId: NO_ROLE,
  kkMode: 'create-new',
  kkId: '',
  kkAddress: '',
  logAs: 'Sambung Baru',
  logDate: todayISO(),
});

export function AddMemberModal({
  open,
  onOpenChange,
  households,
  roles,
  onSaved,
  silentLog,
}: AddMemberModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(initial);
  const [logAsTouched, setLogAsTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when the modal opens.
  useEffect(() => {
    if (open) {
      setForm(initial());
      setLogAsTouched(false);
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  // Auto-suggest logAs based on kelas — sticks once the operator touches it.
  useEffect(() => {
    if (logAsTouched) return;
    setForm((f) => ({
      ...f,
      logAs: f.lifeStage === 'Balita' ? 'Lahir' : 'Sambung Baru',
    }));
  }, [form.lifeStage, logAsTouched]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const nameValid = form.fullName.trim().length >= 2;
  const kkValid = form.kkMode === 'create-new' || form.kkId !== '';
  const canSubmit = nameValid && kkValid && !submitting;

  const consequenceHint = useMemo(() => {
    if (form.kkMode === 'create-new') {
      return (
        <HintLine>
          Akan dibuat <HintPill>KK-S</HintPill> baru dengan jama'ah ini sebagai
          kepala
        </HintLine>
      );
    }
    const target = households.find((h) => String(h.id) === form.kkId);
    if (target) {
      return (
        <HintLine>
          Jama'ah akan bergabung ke{' '}
          <HintPill>KK-{target.householdNo}</HintPill>
          {target.headMemberName && (
            <> (kepala: <b className="font-semibold text-ink-700">{target.headMemberName}</b>)</>
          )}
        </HintLine>
      );
    }
    return null;
  }, [form.kkMode, form.kkId, households]);

  const logAsHint = useMemo(() => {
    switch (form.logAs) {
      case 'Lahir':
        return 'Akan dicatat sebagai Lahir di Catatan Peristiwa — pilih untuk bayi yang baru lahir di keluarga jama\'ah.';
      case 'Sambung Baru':
        return 'Akan dicatat sebagai Sambung Baru — pilih untuk jama\'ah pindahan/mutasi masuk dari luar kelompok.';
      case 'none':
        return 'Tidak akan membuat entri Catatan Peristiwa — gunakan untuk koreksi data atau import data lama.';
    }
  }, [form.logAs]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const input: NewMemberInput = {
      fullName: form.fullName,
      nickname: form.nickname || null,
      gender: form.gender,
      lifeStage: form.lifeStage,
      maritalStatus: form.maritalStatus,
      bloodType: form.bloodType,
      rhesus: form.rhesus,
      birthPlace: form.birthPlace || null,
      birthDate: form.birthDate || null,
      roleId: form.roleId === NO_ROLE ? null : Number(form.roleId),
      household:
        form.kkMode === 'create-new'
          ? { mode: 'create-new', address: form.kkAddress || null }
          : { mode: 'join-existing', householdId: Number(form.kkId) },
      logAs: form.logAs,
      logDate: form.logDate || todayISO(),
      silentLog: silentLog ?? false,
    };
    const result = await window.clapp.member.add(input);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    showToast({
      variant: 'success',
      message: `Jama'ah "${input.fullName.trim()}" disimpan.`,
    });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Jama'ah · Pendataan"
      title="Tambah Jama'ah Baru"
      footerHint={consequenceHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} disabled={!canSubmit}>
            {submitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </>
      }
    >
      {submitError && (
        <div className="mb-3 rounded border border-[#E9CFCB] bg-[#FCF6F4] px-3 py-2 text-[12.5px] text-alpa-ink">
          {submitError}
        </div>
      )}

      <FormSection title="Keluarga (KK)">
        <SegmentedControl<KKMode>
          aria-label="Pilih KK"
          value={form.kkMode}
          onChange={(v) => set('kkMode', v)}
          items={[
            { value: 'create-new', label: 'Buat KK-S baru' },
            { value: 'join-existing', label: 'Gabung ke KK yang ada' },
          ]}
          fill
        />
        {form.kkMode === 'join-existing' && (
          <div className="mt-3">
            <FormField label="Pilih KK" required error={!kkValid && form.kkId === '' ? 'Pilih KK terlebih dahulu' : null}>
              <Select
                aria-label="Pilih KK"
                value={form.kkId}
                onValueChange={(v) => set('kkId', v)}
                placeholder="— Pilih KK —"
                items={households.map((h) => ({
                  value: String(h.id),
                  label: `KK-${h.householdNo} · ${h.headMemberName ?? '(belum ada kepala)'} · ${h.activeMemberCount} jama'ah`,
                }))}
              />
            </FormField>
          </div>
        )}
        {form.kkMode === 'create-new' && (
          <div className="mt-3">
            <FormField label="Alamat (opsional)" hint="bisa diisi kemudian">
              <Input
                value={form.kkAddress}
                onChange={(e) => set('kkAddress', e.target.value)}
                placeholder="contoh: Jl. Cilandak KKO No. 42, RT 003/RW 005"
              />
            </FormField>
          </div>
        )}
      </FormSection>

      <FormSection title="Identitas">
        <FormGrid>
          <FormField
            label="Nama Lengkap"
            required
            error={!nameValid && form.fullName ? 'Minimal 2 karakter' : null}
            className="col-span-2"
          >
            <Input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="contoh: Ahmad Faisal Rahman"
              autoFocus
            />
          </FormField>
          <FormField label="Panggilan">
            <Input
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="opsional"
            />
          </FormField>
          <FormField label="Jenis Kelamin">
            <SegmentedControl<Gender>
              aria-label="Jenis kelamin"
              value={form.gender}
              onChange={(v) => set('gender', v)}
              items={GENDER.map((g) => ({ value: g, label: g }))}
              fill
            />
          </FormField>
          <FormField label="Kelas">
            <Select
              aria-label="Kelas"
              value={form.lifeStage}
              onValueChange={(v) => set('lifeStage', v as LifeStage)}
              items={LIFE_STAGE.map((s) => ({ value: s, label: s }))}
            />
          </FormField>
          <FormField label="Status Pernikahan">
            <Select
              aria-label="Status pernikahan"
              value={form.maritalStatus}
              onValueChange={(v) => set('maritalStatus', v as MaritalStatus)}
              items={MARITAL_STATUS.map((s) => ({ value: s, label: s }))}
            />
          </FormField>
          <FormField
            label="Dapukan"
            hint="opsional · dikelola di Pengaturan"
            className="col-span-2"
          >
            <Select
              aria-label="Dapukan"
              value={form.roleId}
              onValueChange={(v) => set('roleId', v)}
              items={[
                { value: NO_ROLE, label: '— Tidak ada —' },
                ...roles
                  .filter((r) => r.isActive)
                  .map((r) => ({ value: String(r.id), label: r.name })),
              ]}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Kelahiran & Kesehatan">
        <FormGrid>
          <FormField label="Tempat Lahir">
            <Input
              value={form.birthPlace}
              onChange={(e) => set('birthPlace', e.target.value)}
              placeholder="contoh: Jakarta"
            />
          </FormField>
          <FormField label="Tanggal Lahir">
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
              max={todayISO()}
            />
          </FormField>
          <FormField label="Golongan Darah">
            <Select
              aria-label="Golongan darah"
              value={form.bloodType}
              onValueChange={(v) => set('bloodType', v as BloodType)}
              items={BLOOD_TYPE.map((b) => ({ value: b, label: b }))}
            />
          </FormField>
          <FormField label="Rhesus">
            <Select
              aria-label="Rhesus"
              value={form.rhesus}
              onValueChange={(v) => set('rhesus', v as Rhesus)}
              items={RHESUS.map((r) => ({ value: r, label: r }))}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Catat di Catatan Peristiwa sebagai">
        <SegmentedControl<AddMemberLogAs>
          aria-label="Catat sebagai"
          value={form.logAs}
          onChange={(v) => {
            setLogAsTouched(true);
            set('logAs', v);
          }}
          fill
          items={[
            { value: 'Lahir', label: 'Lahir' },
            { value: 'Sambung Baru', label: 'Sambung Baru' },
            { value: 'none', label: 'Tidak dicatat' },
          ]}
          className="w-full"
        />
        <p className="mt-2 text-[12px] italic leading-relaxed text-ink-500">
          {logAsHint}
        </p>
        {form.logAs !== 'none' && (
          <div className="mt-3 max-w-[200px]">
            <FormField label="Tanggal kejadian">
              <Input
                type="date"
                value={form.logDate}
                onChange={(e) => set('logDate', e.target.value)}
                max={todayISO()}
              />
            </FormField>
          </div>
        )}
      </FormSection>
    </Modal>
  );
}

