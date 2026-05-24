import { Pencil, Trash2, Users } from 'lucide-react';
import { useCallback } from 'react';
import { clsx } from 'clsx';

import { Button } from '@renderer/components/Button';
import { FormField } from '@renderer/components/FormField';
import { Input } from '@renderer/components/Input';
import { Select } from '@renderer/components/Select';
import { fmtDateID, fmtDay } from '@renderer/lib/format';
import { MEETING_TYPE, type MeetingType } from '@shared/enums';
import type { EligibleAttendee } from '@shared/meeting';

import { AttendeePicker } from './AttendeePicker';

export interface MeetingDraft {
  meetingDate: string;
  type: MeetingType;
  title: string;
  resultNotes: string;
  suggestions: string;
  attendeeMemberIds: number[];
}

export interface MeetingEditorProps {
  /** Null = creating a new meeting (no Hapus button, no read mode). */
  meetingId: number | null;
  draft: MeetingDraft;
  onChange: (next: MeetingDraft) => void;
  eligibleAttendees: EligibleAttendee[];
  /** ISO YYYY-MM-DD — date picker's max attribute. */
  maxDate: string;
  /** Read-only display mode (Edit button reveals editable form). */
  readOnly: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export function MeetingEditor({
  meetingId,
  draft,
  onChange,
  eligibleAttendees,
  maxDate,
  readOnly,
  isDirty,
  isSaving,
  onEnterEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: MeetingEditorProps) {
  const titleTrimmed = draft.title.trim();
  const canSave =
    !readOnly &&
    isDirty &&
    !isSaving &&
    titleTrimmed.length > 0 &&
    Boolean(draft.meetingDate);

  const patch = useCallback(
    (p: Partial<MeetingDraft>) => onChange({ ...draft, ...p }),
    [draft, onChange],
  );

  const isNew = meetingId === null;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-paper">
      {/* Editable mode keeps a compact chrome header for context.
          Read mode hides it — the document's own hero header takes over. */}
      {!readOnly && (
        <div className="flex shrink-0 items-baseline justify-between gap-4 border-b border-rule bg-surface px-6 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {isNew ? 'Musyawarah Baru' : `Musyawarah · ${draft.type}`}
            </span>
            <span className="truncate text-[15px] font-semibold text-ink-900">
              {titleTrimmed || 'Tanpa judul'}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] text-ink-500">
            {fmtDateID(draft.meetingDate)}
          </span>
        </div>
      )}

      {/* Body — scrolls */}
      <div className="flex-1 overflow-y-auto">
        {readOnly ? (
          <ReadOnlyView draft={draft} eligibleAttendees={eligibleAttendees} />
        ) : (
          <div className="px-6 py-5">
            <div className="grid max-w-[920px] grid-cols-1 gap-4 sm:grid-cols-2">
              <EditableFields
                draft={draft}
                patch={patch}
                maxDate={maxDate}
                eligibleAttendees={eligibleAttendees}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-rule bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          {!isNew && (
            <Button
              variant="danger-ghost"
              size="sm"
              icon={<Trash2 size={13} strokeWidth={1.6} />}
              onClick={onDelete}
              disabled={isSaving}
            >
              Hapus
            </Button>
          )}
          {!readOnly && isDirty && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-izin-ink">
              Belum disimpan
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <Button
              size="sm"
              icon={<Pencil size={13} strokeWidth={1.7} />}
              onClick={onEnterEdit}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button size="sm" onClick={onSave} disabled={!canSave}>
                {isNew ? 'Simpan' : 'Simpan Perubahan'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Editable mode ───────────────────────────────────────────────────────

function EditableFields({
  draft,
  patch,
  maxDate,
  eligibleAttendees,
}: {
  draft: MeetingDraft;
  patch: (p: Partial<MeetingDraft>) => void;
  maxDate: string;
  eligibleAttendees: EligibleAttendee[];
}) {
  return (
    <>
      <FormField label="Tanggal" required>
        <Input
          type="date"
          value={draft.meetingDate}
          max={maxDate}
          onChange={(e) => patch({ meetingDate: e.target.value })}
        />
      </FormField>

      <FormField label="Jenis Musyawarah">
        <Select
          aria-label="Pilih jenis musyawarah"
          value={draft.type}
          onValueChange={(v) => patch({ type: v as MeetingType })}
          items={MEETING_TYPE.map((t) => ({ value: t, label: t }))}
        />
      </FormField>

      <FormField label="Judul" required className="sm:col-span-2">
        <Input
          value={draft.title}
          placeholder="contoh: Persiapan pengajian bulanan Mei"
          onChange={(e) => patch({ title: e.target.value })}
        />
      </FormField>

      {/* Not a FormField — <label> forwards clicks to the first descendant button,
          which would cause clicking any chip to also fire the first chip's remove. */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-medium text-ink-700">
            Daftar Hadir
          </span>
          <span className="text-[11px] italic text-ink-500">
            {draft.attendeeMemberIds.length} pengurus dipilih
          </span>
        </span>
        <AttendeePicker
          eligible={eligibleAttendees}
          selectedIds={draft.attendeeMemberIds}
          onChange={(ids) => patch({ attendeeMemberIds: ids })}
        />
      </div>

      <FormField
        label="Hasil Musyawarah"
        hint="Catatan hasil & kesepakatan"
        className="sm:col-span-2"
      >
        <NotesArea
          value={draft.resultNotes}
          onChange={(v) => patch({ resultNotes: v })}
          placeholder="Tulis ringkasan hasil rapat…"
        />
      </FormField>

      <FormField
        label="Saran"
        hint="Usulan & saran untuk tindak lanjut"
        className="sm:col-span-2"
      >
        <NotesArea
          value={draft.suggestions}
          onChange={(v) => patch({ suggestions: v })}
          placeholder="Tulis saran perbaikan…"
        />
      </FormField>
    </>
  );
}

function NotesArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={5}
      className={clsx(
        'min-h-[120px] w-full appearance-none resize-y rounded border border-rule bg-surface px-3 py-2 font-sans text-sm text-ink-900 outline-none transition-colors',
        'placeholder:text-ink-400',
        'hover:bg-[#FFFDF8] hover:border-rule-strong',
        'focus:bg-white focus:border-ink-900 focus:shadow-[0_0_0_3px_rgba(27,24,20,0.08)]',
      )}
    />
  );
}

// ─── Read-only mode (document layout) ────────────────────────────────────

function ReadOnlyView({
  draft,
  eligibleAttendees,
}: {
  draft: MeetingDraft;
  eligibleAttendees: EligibleAttendee[];
}) {
  const dayLabel = fmtDay(draft.meetingDate);
  const dateLabel = fmtDateID(draft.meetingDate);
  const hadirCount = draft.attendeeMemberIds.length;

  return (
    <article className="mx-auto max-w-[760px] px-8 py-8">
      {/* Hero — eyebrow + title + meta line */}
      <header className="border-b border-rule pb-6">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">
          {draft.type}
        </p>
        <h2 className="mt-1.5 text-[24px] font-semibold leading-[1.25] tracking-tight text-ink-900">
          {draft.title.trim() || (
            <span className="italic text-ink-400">Tanpa judul</span>
          )}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
          <span>
            <span className="font-medium text-ink-700">{dayLabel}</span>
            {dayLabel !== '—' && ', '}
            <span className="font-mono">{dateLabel}</span>
          </span>
          <span className="text-ink-300">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} strokeWidth={1.7} className="text-ink-400" />
            <span className="font-mono">{hadirCount} pengurus hadir</span>
          </span>
        </div>
      </header>

      {/* Daftar Hadir */}
      <ReadSection title="Daftar Hadir">
        <AttendeePicker
          eligible={eligibleAttendees}
          selectedIds={draft.attendeeMemberIds}
          onChange={() => undefined}
          readOnly
        />
      </ReadSection>

      {/* Hasil */}
      <ReadSection title="Hasil Musyawarah">
        <Prose value={draft.resultNotes} emptyLabel="Belum ada catatan hasil." />
      </ReadSection>

      {/* Saran */}
      <ReadSection title="Saran" last>
        <Prose value={draft.suggestions} emptyLabel="Belum ada saran." />
      </ReadSection>
    </article>
  );
}

function ReadSection({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx('py-6', !last && 'border-b border-rule')}
    >
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Minimal markdown-ish renderer for the notes textareas. Recognizes:
 * - lines starting with "- " or "* " → bulleted list (consecutive lines group)
 * - blank lines → paragraph break
 * Everything else renders as paragraphs with preserved whitespace.
 */
function Prose({ value, emptyLabel }: { value: string; emptyLabel: string }) {
  const trimmed = value.trim();
  if (!trimmed) {
    return (
      <p className="text-[13.5px] italic text-ink-500">{emptyLabel}</p>
    );
  }
  const blocks = parseProseBlocks(trimmed);
  return (
    <div className="space-y-3 text-[14px] leading-[1.65] text-ink-900">
      {blocks.map((b, i) =>
        b.kind === 'ul' ? (
          <ul
            key={i}
            className="list-disc space-y-1.5 pl-5 marker:text-ink-300"
          >
            {b.items.map((item, j) => (
              <li key={j} className="pl-1">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}

type ProseBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] };

function parseProseBlocks(text: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let pBuf: string[] = [];
  let ulBuf: string[] = [];
  const flushP = () => {
    if (pBuf.length > 0) {
      blocks.push({ kind: 'p', text: pBuf.join('\n').trim() });
      pBuf = [];
    }
  };
  const flushUl = () => {
    if (ulBuf.length > 0) {
      blocks.push({ kind: 'ul', items: ulBuf });
      ulBuf = [];
    }
  };
  for (const line of text.split('\n')) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushP();
      ulBuf.push(bullet[1] ?? '');
    } else if (line.trim() === '') {
      flushP();
      flushUl();
    } else {
      flushUl();
      pBuf.push(line);
    }
  }
  flushP();
  flushUl();
  return blocks;
}
