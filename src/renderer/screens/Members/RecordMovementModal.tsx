import { useEffect, useMemo, useState } from 'react';

import { Banner } from '@renderer/components/Banner';
import { Button } from '@renderer/components/Button';
import { FormField, FormSection } from '@renderer/components/FormField';
import { Input } from '@renderer/components/Input';
import { Modal } from '@renderer/components/Modal';
import { SegmentedControl } from '@renderer/components/SegmentedControl';
import { Select } from '@renderer/components/Select';
import { useToast } from '@renderer/components/Toast';
import { todayISO } from '@renderer/lib/dates';
import type { MemberRow, MovementKind, RecordMovementInput } from '@shared/member';

export interface RecordMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberRow | null;
  /** All members of the same household, used to populate the new-head picker
      when the affected member is the head. */
  householdMembers: MemberRow[];
  onSaved: () => void;
}

export function RecordMovementModal({
  open,
  onOpenChange,
  member,
  householdMembers,
  onSaved,
}: RecordMovementModalProps) {
  const { showToast } = useToast();
  const [kind, setKind] = useState<MovementKind>('Pindah Sambung');
  const [date, setDate] = useState<string>(todayISO());
  const [notes, setNotes] = useState<string>('');
  const [newHeadId, setNewHeadId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active members of this household, excluding the member being moved.
  const headCandidates = useMemo(
    () =>
      member
        ? householdMembers.filter((m) => m.isActive && m.id !== member.id)
        : [],
    [member, householdMembers],
  );

  const needsNewHead = Boolean(member?.isHead);
  const canPickNewHead = headCandidates.length > 0;

  useEffect(() => {
    if (open && member) {
      setKind('Pindah Sambung');
      setDate(todayISO());
      setNotes('');
      setSubmitting(false);
      setSubmitError(null);
      if (needsNewHead) {
        // Pre-select earliest-joined active member.
        window.clapp.household
          .suggestNewHead(member.householdId)
          .then((id) => {
            if (id) setNewHeadId(String(id));
            else setNewHeadId('');
          })
          .catch(() => setNewHeadId(''));
      } else {
        setNewHeadId('');
      }
    }
  }, [open, member, needsNewHead]);

  const canSubmit =
    !submitting &&
    Boolean(date) &&
    (!needsNewHead || newHeadId !== '') &&
    (!needsNewHead || canPickNewHead);

  const consequenceHint = useMemo(() => {
    if (kind === 'Pindah Sambung') {
      return "Akan dicatat sebagai Pindah Sambung di Catatan Peristiwa & jama'ah ditandai Mutasi.";
    }
    return "Akan dicatat sebagai Meninggal di Catatan Peristiwa & jama'ah ditandai Mutasi.";
  }, [kind]);

  const onSubmit = async () => {
    if (!member || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    const input: RecordMovementInput = {
      memberId: member.id,
      kind,
      date,
      notes: notes.trim() || null,
      ...(needsNewHead ? { newHeadMemberId: Number(newHeadId) } : {}),
    };
    const result = await window.clapp.member.recordMovement(input);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    showToast({
      variant: 'success',
      message:
        kind === 'Pindah Sambung'
          ? `"${member.fullName}" dicatat sebagai Pindah Sambung.`
          : `"${member.fullName}" dicatat sebagai Meninggal.`,
    });
    onSaved();
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Catatan Peristiwa · Tindakan Destruktif"
      title={`Catat Kepindahan — ${member.fullName}`}
      footerHint={consequenceHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => void onSubmit()} disabled={!canSubmit}>
            {submitting ? 'Menyimpan…' : 'Simpan & Catat'}
          </Button>
        </>
      }
    >
      {submitError && (
        <div className="mb-3 rounded border border-[#E9CFCB] bg-[#FCF6F4] px-3 py-2 text-[12.5px] text-alpa-ink">
          {submitError}
        </div>
      )}

      <FormSection title="Jenis Kepindahan">
        <SegmentedControl<MovementKind>
          aria-label="Jenis kepindahan"
          value={kind}
          onChange={(v) => setKind(v)}
          items={[
            { value: 'Pindah Sambung', label: 'Pindah Sambung' },
            { value: 'Meninggal', label: 'Meninggal' },
          ]}
          className="w-full"
        />
      </FormSection>

      <FormSection title="Detail">
        <div className="grid grid-cols-[160px_1fr] gap-4">
          <FormField label="Tanggal" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
            />
          </FormField>
          <FormField
            label={kind === 'Pindah Sambung' ? 'Ke (lokasi) / catatan' : 'Catatan'}
            hint="opsional"
          >
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                kind === 'Pindah Sambung'
                  ? 'contoh: Jogja, mutasi kerja'
                  : 'contoh: wafat di RS Fatmawati'
              }
            />
          </FormField>
        </div>
      </FormSection>

      {needsNewHead && (
        <FormSection title="Pilih Kepala KK Baru">
          {canPickNewHead ? (
            <>
              <Banner variant="warn" className="mb-3">
                <b>{member.fullName}</b> adalah kepala KK saat ini. Pilih kepala
                baru sebelum menyimpan — kandidat dengan tanggal bergabung paling
                awal dipilih otomatis.
              </Banner>
              <FormField label="Kepala KK baru" required>
                <Select
                  aria-label="Kepala KK baru"
                  value={newHeadId}
                  onValueChange={setNewHeadId}
                  items={headCandidates.map((c) => ({
                    value: String(c.id),
                    label: `${c.fullName}${c.nickname ? ` (${c.nickname})` : ''} · ${c.gender} · ${c.lifeStage}`,
                  }))}
                />
              </FormField>
            </>
          ) : (
            <Banner variant="danger">
              <b>Tidak ada calon kepala KK aktif lain.</b> {member.fullName}{' '}
              adalah satu-satunya anggota aktif di KK ini. Tambah jama'ah baru
              terlebih dahulu, atau ubah kepala KK lewat <b>Edit KK</b>.
            </Banner>
          )}
        </FormSection>
      )}
    </Modal>
  );
}
