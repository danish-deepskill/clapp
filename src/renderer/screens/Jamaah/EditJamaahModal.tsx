import { useEffect, useMemo, useState } from 'react';

import { Button } from '@renderer/components/Button';
import { FormField, FormGrid, FormSection } from '@renderer/components/FormField';
import { Input } from '@renderer/components/Input';
import { Modal } from '@renderer/components/Modal';
import { SegmentedControl } from '@renderer/components/SegmentedControl';
import { Select } from '@renderer/components/Select';
import { useToast } from '@renderer/components/Toast';
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
import type { EditMemberInput, MemberRow } from '@shared/member';

const NO_ROLE = '__none__';

export interface EditJamaahModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberRow | null;
  households: HouseholdRow[];
  roles: MasterDataItem[];
  onSaved: () => void;
}

type KKMode = 'join-existing' | 'create-new';

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
}

function fromMember(m: MemberRow): FormState {
  return {
    fullName: m.fullName,
    nickname: m.nickname ?? '',
    gender: m.gender,
    lifeStage: m.lifeStage,
    maritalStatus: m.maritalStatus,
    bloodType: m.bloodType,
    rhesus: m.rhesus,
    birthPlace: m.birthPlace ?? '',
    birthDate: m.birthDate ?? '',
    roleId: m.roleId ? String(m.roleId) : NO_ROLE,
    kkMode: 'join-existing',
    kkId: String(m.householdId),
    kkAddress: '',
  };
}

export function EditJamaahModal({
  open,
  onOpenChange,
  member,
  households,
  roles,
  onSaved,
}: EditJamaahModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open && member) {
      setForm(fromMember(member));
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open, member]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const nameValid = (form?.fullName.trim().length ?? 0) >= 2;
  const kkValid =
    !form || form.kkMode === 'create-new' || form.kkId !== '';

  // Detect changes vs the original member to keep Save disabled on no-op.
  const dirty = useMemo(() => {
    if (!form || !member) return false;
    const orig = fromMember(member);
    return JSON.stringify(form) !== JSON.stringify(orig);
  }, [form, member]);

  const canSubmit = nameValid && kkValid && dirty && !submitting;

  const householdHint = useMemo(() => {
    if (!form || !member) return null;
    if (form.kkMode === 'create-new') {
      return "Akan dibuat KK-S baru dengan jama'ah ini sebagai kepala.";
    }
    const newId = Number(form.kkId);
    if (newId !== member.householdId) {
      const oldKk = households.find((h) => h.id === member.householdId);
      const newKk = households.find((h) => h.id === newId);
      if (oldKk && newKk) {
        return `Jama'ah dipindahkan dari KK-${oldKk.householdNo} ke KK-${newKk.householdNo}.`;
      }
    }
    return null;
  }, [form, member, households]);

  const onSubmit = async () => {
    if (!form || !member || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const orig = fromMember(member);
    const patch: EditMemberInput = {};
    if (form.fullName !== orig.fullName) patch.fullName = form.fullName;
    if (form.nickname !== orig.nickname) {
      patch.nickname = form.nickname || null;
    }
    if (form.gender !== orig.gender) patch.gender = form.gender;
    if (form.lifeStage !== orig.lifeStage) patch.lifeStage = form.lifeStage;
    if (form.maritalStatus !== orig.maritalStatus) {
      patch.maritalStatus = form.maritalStatus;
    }
    if (form.bloodType !== orig.bloodType) patch.bloodType = form.bloodType;
    if (form.rhesus !== orig.rhesus) patch.rhesus = form.rhesus;
    if (form.birthPlace !== orig.birthPlace) {
      patch.birthPlace = form.birthPlace || null;
    }
    if (form.birthDate !== orig.birthDate) {
      patch.birthDate = form.birthDate || null;
    }
    if (form.roleId !== orig.roleId) {
      patch.roleId = form.roleId === NO_ROLE ? null : Number(form.roleId);
    }
    if (form.kkMode === 'create-new') {
      patch.household = {
        mode: 'create-new',
        address: form.kkAddress || null,
      };
    } else if (form.kkId !== orig.kkId) {
      patch.household = {
        mode: 'join-existing',
        householdId: Number(form.kkId),
      };
    }
    const result = await window.clapp.member.edit(member.id, patch);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    showToast({
      variant: 'success',
      message: `Perubahan disimpan untuk "${result.data.fullName}".`,
    });
    onSaved();
    onOpenChange(false);
  };

  if (!form || !member) {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Jama'ah"
        footer={
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        }
      >
        <p className="text-[13px] text-ink-500">Memuat…</p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Jama'ah · Edit"
      title={member.fullName}
      footerHint={householdHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} disabled={!canSubmit}>
            {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
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
            { value: 'join-existing', label: 'Pindah / tetap di KK' },
            { value: 'create-new', label: 'Pisah ke KK-S baru' },
          ]}
        />
        {form.kkMode === 'join-existing' && (
          <div className="mt-3">
            <FormField label="KK" required>
              <Select
                aria-label="Pilih KK"
                value={form.kkId}
                onValueChange={(v) => set('kkId', v)}
                items={households.map((h) => ({
                  value: String(h.id),
                  label: `KK-${h.householdNo} · ${h.headMemberName ?? '(belum ada kepala)'}${h.id === member.householdId ? ' (saat ini)' : ''}`,
                }))}
              />
            </FormField>
          </div>
        )}
        {form.kkMode === 'create-new' && (
          <div className="mt-3">
            <FormField label="Alamat KK baru" hint="opsional">
              <Input
                value={form.kkAddress}
                onChange={(e) => set('kkAddress', e.target.value)}
                placeholder="contoh: Jl. Cilandak KKO No. 42"
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
            />
          </FormField>
          <FormField label="Panggilan">
            <Input
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
            />
          </FormField>
          <FormField label="Jenis Kelamin">
            <SegmentedControl<Gender>
              aria-label="Jenis kelamin"
              value={form.gender}
              onChange={(v) => set('gender', v)}
              items={GENDER.map((g) => ({ value: g, label: g }))}
              className="w-full"
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
            hint="dikelola di Pengaturan"
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
            />
          </FormField>
          <FormField label="Tanggal Lahir">
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
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

      <p className="border-t border-rule pt-4 text-[12px] italic text-ink-500">
        Status keanggotaan (Pindah Sambung / Meninggal) tidak diubah di sini —
        gunakan tombol <b className="not-italic font-semibold text-ink-700">Catat Kepindahan</b> di panel detail.
      </p>
    </Modal>
  );
}
