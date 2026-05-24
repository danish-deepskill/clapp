import { useEffect, useMemo, useState } from 'react';

import { Button } from '@renderer/components/Button';
import { FormField, FormSection } from '@renderer/components/FormField';
import { HintLine, HintPill } from '@renderer/components/HintLine';
import { Input } from '@renderer/components/Input';
import { Modal } from '@renderer/components/Modal';
import { Select } from '@renderer/components/Select';
import { useToast } from '@renderer/components/Toast';
import type { HouseholdRow } from '@shared/household';
import type { MemberRow } from '@shared/member';

export interface EditHouseholdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdRow | null;
  members: MemberRow[];
  onSaved: () => void;
}

export function EditHouseholdModal({
  open,
  onOpenChange,
  household,
  members,
  onSaved,
}: EditHouseholdModalProps) {
  const { showToast } = useToast();
  const [headId, setHeadId] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open && household) {
      setHeadId(household.headMemberId ? String(household.headMemberId) : '');
      setAddress(household.address ?? '');
      setSubmitting(false);
      setSubmitError(null);
    }
  }, [open, household]);

  const candidates = useMemo(
    () =>
      household
        ? members.filter((m) => m.householdId === household.id && m.isActive)
        : [],
    [members, household],
  );

  const dirty = useMemo(() => {
    if (!household) return false;
    const origHead = household.headMemberId
      ? String(household.headMemberId)
      : '';
    const origAddress = household.address ?? '';
    return headId !== origHead || address !== origAddress;
  }, [household, headId, address]);

  const newHeadName = useMemo(() => {
    if (!household) return null;
    if (!headId || String(household.headMemberId) === headId) return null;
    const c = candidates.find((m) => String(m.id) === headId);
    return c?.nickname || c?.fullName || null;
  }, [household, headId, candidates]);

  const onSubmit = async () => {
    if (!household || !dirty) return;
    setSubmitting(true);
    setSubmitError(null);
    const patch: { address?: string | null; headMemberId?: number } = {};
    if (address !== (household.address ?? '')) {
      patch.address = address || null;
    }
    const origHead = household.headMemberId
      ? String(household.headMemberId)
      : '';
    if (headId !== origHead && headId) {
      patch.headMemberId = Number(headId);
    }
    const result = await window.clapp.household.update(household.id, patch);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    showToast({
      variant: 'success',
      message: `KK-${household.householdNo} diperbarui.`,
    });
    onSaved();
    onOpenChange(false);
  };

  if (!household) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Keluarga (KK) · Edit"
      title={`KK-${household.householdNo}`}
      footerHint={
        newHeadName ? (
          <HintLine>
            Kepala KK akan diubah ke <HintPill>{newHeadName}</HintPill>
          </HintLine>
        ) : null
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} disabled={!dirty || submitting}>
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

      <FormSection title="Identitas KK">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="No. KK" hint="otomatis dari urutan">
            <Input value={`KK-${household.householdNo}`} disabled readOnly />
          </FormField>
          <FormField label="Tipe" hint="otomatis dari jumlah jama'ah">
            <Input value={household.type} disabled readOnly />
          </FormField>
        </div>
        <p className="mt-3 rounded border border-rule bg-surface-2 px-3 py-2 text-[12px] text-ink-500">
          <b className="font-semibold text-ink-700">Nomor KK</b> ditentukan oleh
          urutan di daftar — geser baris KK untuk mengubahnya. Tipe{' '}
          <b className="font-semibold text-ink-700">KK-S</b> berlaku untuk
          keluarga beranggotakan satu orang.
        </p>
      </FormSection>

      <FormSection title="Kepala Keluarga">
        {candidates.length === 0 ? (
          <p className="text-[13px] italic text-ink-500">
            Belum ada anggota aktif untuk dijadikan kepala. Tambah jama'ah dulu.
          </p>
        ) : (
          <FormField label="Kepala KK">
            <Select
              aria-label="Kepala KK"
              value={headId}
              onValueChange={setHeadId}
              items={candidates.map((m) => ({
                value: String(m.id),
                label: `${m.fullName} · ${m.gender} · ${m.lifeStage}${m.id === household.headMemberId ? ' (saat ini)' : ''}`,
              }))}
            />
          </FormField>
        )}
      </FormSection>

      <FormSection title="Alamat KK">
        <FormField label="Alamat" hint="opsional">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="contoh: Jl. Cilandak KKO No. 42, RT 003/RW 005"
          />
        </FormField>
      </FormSection>
    </Modal>
  );
}
