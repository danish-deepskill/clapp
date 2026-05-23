# CONTEXT.md — CLApp Decision History & Rationale

> **Purpose of this file:** `HANDOFF.md` says *what* to build and *how* (stack, structure, build order). This file explains *why* — the decisions made during design, what was **deliberately rejected**, and what is still an **open client question**. Read this before "improving" anything: several things that look like omissions are deliberate choices. When in doubt, this file records the reasoning; the schema source of truth is `ERD.html`.

---

## 0. What CLApp is

An **offline, single-machine desktop app** to manage SLM Kelompok Cilandak A, an Indonesian Islamic congregation (pengajian). It replaces a sprawling Excel workbook. The operator is **non-technical, possibly older, and rotates** between people over time — so the app must be immediately learnable and forgiving. It was reverse-engineered from the client's real file (`05_..._SLM_Cilandak.xlsx`).

**The four client pain points it solves** (these are the north star — every feature traces back to one):
1. Re-typing paper attendance into Excel by hand → **fast attendance entry** (the #1 priority screen, Absensi).
2. A member change cascading across many sheets → **single source of truth** (the `members` table; change once, everything updates).
3. Assembling the monthly report by hand → **the Laporan Bulanan composer**.
4. Unstructured meeting records → **the Musyawarah screen**.

---

## 1. Deliberately rejected — DO NOT re-introduce

These were considered and **rejected on purpose.** If you find yourself adding one because "a professional app should have it," stop — re-read the reasoning.

- **Login / authentication / user accounts.** Single-machine, single-operator-at-a-time. A local login adds a forgotten-password lockout risk (no reset infrastructure on an offline app) and protects nothing the physical machine doesn't already gate. The data file is right there on disk. If at-rest protection is ever wanted, it's an OS-level concern (disk encryption), not an app login. *(A polished welcome/splash screen is fine — that's aesthetics, not a gate.)*
- **At-rest encryption (SQLCipher).** Dropped. A rotating non-technical operator + a forgotten passphrase = total, unrecoverable data loss. That risk outweighs the theft risk for a congregation roster. (Encrypting the *cloud-pushed copy* is worth reconsidering separately — see §5.)
- **Re-import from Excel after first-run seed.** The seed is **one-time**. After the wizard commits, SQLite is the source of truth forever. Recovery is from backup, never re-import. The Excel is dead after seeding.
- **Telemetry / analytics / error reporting.** Zero. No Sentry, no Posthog. Offline app; the only network call is the optional user-configured cloud-folder sync.
- **shadcn/ui.** Too rounded/consumer-app; would need heavy override. Use Radix primitives directly. (Border radius ≤ 3px is non-negotiable — see Arah Visual.)
- **A standalone "Backup & Export" view.** Folded into Pengaturan. Per-document export already lives on each screen's "Unduh" button (Rekap, Laporan), so a separate export view was redundant.
- **Decorative dashboard.** No charts, graphs, stat cards, or activity feeds. See §3 (Dashboard).
- **Auto-installing updates.** Notify-only on launch; manual download/install. Avoids code-signing overhead. See §5.

---

## 2. Core data-model decisions (the "why" behind ERD.html)

The schema source of truth is **ERD.html**. `ERD.md` is **stale/historical** — it predates roles, address, household reordering, `source_kind`, and `member_changes`. Use ERD.html. This section is the rationale.

- **English schema names, Indonesian enum *values*.** Code reads in English; user-facing data (H/A/S/I, Laki-Laki, etc.) stays Indonesian.
- **`members` is the single source of truth.** Soft-delete only (`is_active`), never hard-delete — preserves attendance history. This directly addresses pain point #2.
- **Mandatory-movement rule (critical, enforce at service layer):** `members.is_active` NEVER flips by a bare toggle. Every activation/deactivation MUST be tied to a `member_movements` insert (Sambung Baru = arrival, Pindah Sambung = departure) or a `vital_records` insert (Meninggal). A flag changed without a movement breaks demographic reconstruction. The UI must route deactivation through a deliberate "Catat Kepindahan" action, never an inline toggle.
- **Demographic summary is computed live, NEVER stored** — except it's **snapshotted at finalize** (`monthly_reports.demographics_snapshot`). Late finalize reconstructs the as-of-month-end state by walking `member_movements` backward. This is why the movement log is mandatory.
- **Donation (shodaqoh)** is `donation_amount` on `attendance` (1:1 per session). It is **shodaqoh**, not "donasi" — use the religious term in UI.
- **Attendance status = H/A/S/I.** Rows written **on save (batch)**, not on screen-open. No row = "not recorded" (≠ absent).
- **Attendance % = (H + S + I) / total sessions.** Only Alpa is excluded; Sakit and Izin count as legitimate non-absence. (Matches the source's Oct-2024 sheet. The source was internally inconsistent — this was the chosen resolution. Flagged for client sanity-check, see §6.)
- **Sessions are on-the-fly, any day, no scheduling.** A session is born when attendance is entered. Date defaults to today, back-dating is normal, future dates blocked. `UNIQUE(session_type_id, session_date)` — a type occurs ≤1×/day; a duplicate attempt loads the existing session for editing.
- **`life_stage` vs `marital_status` are two separate enums.** The source put "Menikah L/P" in the life-stage column (a terminal adult rung) — that maps to `life_stage = Dewasa`, with marital status in its own field. Never conflate them.
- **Activities split into `activity_types` (master list) + `activity_records` (per-month status).** Avoids re-typing the recurring activities every month.
- **`activity_types.source_kind` discriminator** (`manual` | `meeting` | `session`) drives auto-fill of the monthly report's Kegiatan section — so the operator doesn't double-enter ("I recorded the meeting, why re-tick the activity?"). Meeting-sourced → done if a meeting of that type happened this month; session-sourced → done if ≥1 session of that type; manual → operator ticks. **Status should be computed live (frozen only at finalize), not materialized at month-open** — so a meeting logged mid-month is reflected immediately, no stale stored flag. *(The specific activity→event mapping is an open client question — see §6.)*
- **Three event-log tables** (`vital_records`, `member_movements`, `member_changes`), surfaced as ONE union view in Catatan Peristiwa. `member_changes` logs marital/life-stage/role changes (Menikah, Perubahan Kelas, Perubahan Dapukan) as old→new.
- **`roles` is an editable lookup table + `members.role_id`** (nullable, ONE role max per member). Pengurus ARE members with a role. Roles are operator-editable in Pengaturan (same pattern as activity/session types) — **NOT a hardcoded enum.** Define the role list in ONE place so the seed-validator and runtime can't drift. *(The actual role list is unconfirmed — see §6.)* Distinct from `households.head_member_id` (a household role) — a person can have both, one, or neither.
- **`household_no` is a reorderable POSITION, not an identity.** Families are NOT referred to by number. Drag-and-drop reorders households and **renumbers contiguously** (no gaps). This is why ERD.md's old "auto-assigned MAX+1" note is wrong/stale.
- **`households.address`** (nullable, free text) — exists for letterhead/Serkiler printing and family visits. **Nullable** — the seed has it null everywhere (source has no address column); populated in-app later. *(HANDOFF §12.2 wrongly typed it as required `z.string()` — it must be `.nullable()`.)*
- **`circular_roster`** = a CURATED SUBSET of members (not everyone) + paraf (signed) + `circulation_amount` (iuran/dues — confirmed real). Print blank → sign on paper → record paraf back.
- **`monthly_reports.finalized_at`** is the lock (NULL = open, dated = locked). The timestamp IS the lock — no separate boolean. Finalize is manual (Kunci button) and reversible (Buka Kunci).
- **Meeting attendee count is DERIVED** from the attendee junction, never a typed/stored number. **Meeting notes = ONE combined Markdown field** (notulen + saran together), not two separate fields.

---

## 3. UI / UX decisions (the "why" behind the prototypes & Komponen)

- **App name: CLApp** (CLA = Cilandak A). Spell out "Cilandak A" in the About screen so a successor isn't lost.
- **Navigation = a priority-plus top navbar** (NOT a left sidebar — that's stale in old VIEWS.md). Tabs fill the bar in priority order; whatever doesn't fit overflows into a "Lainnya ▾" menu that only appears when needed. Priority order (last = first to overflow): Absensi, Anggota/Jamaah, Rekap Absensi, Laporan Bulanan, Log/Catatan Peristiwa, Musyawarah, Serkiler, Pengaturan, Backup. The app title on the left = home/Dashboard link. *(May be hardcoded as "show first N, rest in Lainnya" since window size is stable — simpler than true responsive measurement.)*
- **Dashboard is minimal and actionable ONLY.** It is deliberately NOT a typical dashboard — no charts, no feeds. Only: a "Perlu Tindakan" to-do list (things the app detects as *incomplete* — unfinalized past months, unmarked activities, headless households), one quiet active-count line, and a "Terakhir diinput" orientation line. Rationale: anything recorded-after-the-fact (meetings, movements) is never "pending," so it's never a to-do — it's browsing, which belongs in its own view. A busy dashboard would show pseudo-insights the data can't honestly support. Empty state = "Semua beres ✓".
- **Jamaah (member list) defaults to grouped-by-KK**, with a "Daftar" (flat) toggle. Households are the primary social unit. Shows all 9 member columns (Nama frozen + horizontal scroll for the rest); role badge + KEPALA badge on the name (distinct styles — org-role vs household-head are different things).
- **Edit affordance = an always-visible per-row "view/detail" control** (eye/chevron, NOT a pencil — pencil implies immediate edit; the click opens a read-only detail panel first). Editing is a deliberate second step inside the detail. Deactivation is a separate "Catat Kepindahan" action, never an inline toggle (enforces the mandatory-movement rule in the UI). Rationale: a rotating non-technical operator won't discover hover-only controls, and browse-heavy screens shouldn't risk accidental edits.
- **Tambah Jama'ah modal** leads with the household choice (Buat KK baru [default → new KK-S head] / Gabung ke KK yang ada), with a live consequence footer and a "Catat sebagai Sambung Baru" checkbox (ties to the movement log).
- **Period filter = TWO dropdowns, Bulan ▾ + Tahun ▾** (NOT a combined month-year picker), defaulting to the current period. Used on all month-filtered views (Catatan Peristiwa, Rekap, Laporan, Serkiler, Musyawarah list). A *single-event date* (a meeting's date, a session's date) is a full date picker — different concept. (Idea noted for later: a shared global current-period that all month-views follow.)
- **Read-only sections** (Demografi, Peristiwa in Laporan) must look visibly different from editable ones — they're computed/pulled, not typed.
- **Status colors are semantic, never decorative:** Hadir=forest green, Alpa=brick red, Sakit=slate blue, Izin=ochre. These four colors must never appear except to convey their meaning. Density (~38px rows), Plex Mono for all numerals, ≤3px radius — see Arah Visual.
- **Destructive actions need cautious styling + confirmation:** Restore, cloud Pull, Catat Kepindahan. Pull especially OVERWRITES local data — it must warn and confirm and back-up-before-replace (see §5). Keep the overwrite warning; don't let it be "cleaned up" away.
- **Qurban** is a FUTURE module — a disabled tab with a "Segera" badge in the Lainnya menu. Not designed, not built.

---

## 4. Seed (first-run import)

- The app ships **empty**. A one-time first-run wizard imports `seed.json` (pick file → Zod-validate → preview demografi/counts → confirm → commit in one transaction → land on Dashboard). After commit, never re-import.
- `seed.json` was generated from the client's real Excel. **63 households (44 KK + 19 KK-S), 192 members, all active.** The parse independently reproduced the sheet's own footer totals (L 95 / P 97 / 192) — strong validation.
- **`role`, `address`, `birth_date` are null for everyone at seed** — the source simply has no such columns. They are populated in-app later, not invented.
- One judgment call: a single minor (an AUD child) with blank marital status was defaulted to "Belum Menikah" (a child's status is unambiguous), applied only to minor life-stages, logged in seed-report.md.
- **The 192 active count must be verified by the client by hand** — it matches the sheet's total, but the source has a history of count drift. "Matches the sheet" ≠ "confirmed correct." See §6.

---

## 5. Backup, cloud sync & updates

- **Two-tier backup, different jobs:** (a) **daily local** auto-backup (cheap, granular, same-machine recovery — keep last N, default 14, rotate oldest); (b) **weekly cloud** push (survives losing the whole machine). They are NOT redundant — local can't survive a dead laptop; weekly cloud can't give fine-grained recovery. Both stay.
- The backup folder is **user-configurable** so the operator can point it at their own Google Drive/OneDrive folder — that gets data off-machine with zero server to build.
- **Cloud sync = one-way file relay between two CLApp installs.** The operator's install (master) pushes the DB weekly when online; a second person's install (mirror) pulls it to view. **Strictly one writer, one reader** — this is what makes it safe (no two-way sync, no conflicts). The reader is **read-only by choice** (no formal read-only mode was built — it was deemed unnecessary; the reader simply doesn't edit). Pull is **destructive** (replaces local) → must confirm + back-up-before-replace + warn.
- Mechanism is **file storage, NOT Neon** (Neon is Postgres — wrong tool for moving a SQLite file). Simplest = a shared Drive folder; a custom Vercel/blob endpoint is the heavier alternative. *(Mechanism still to be finalized at build time. Consider encrypting the cloud copy since it leaves the machine.)*
- **Updates = notify-only on launch.** When online, the app checks a version file; if newer, shows a toast linking to a manual download. No auto-install (so no code-signing needed). Version info + a "Periksa Pembaruan" button live in Pengaturan.

---

## 6. OPEN CLIENT QUESTIONS — confirm before treating as fact

These got written into specs as if settled, but only the client/group can confirm them. **Do not build them as certain.** (See also CLIENT_QUESTIONS.md.)

1. **The active roster count (192).** Matches the source sheet, but the source drifts. Must be verified by hand before go-live — a wrong seed is a permanent, invisible offset on every future demographic figure.
2. **The role list.** The vocabulary used in HANDOFF §12.2 (Imam, Wakil, Sekretaris, Bendahara, Penerobos, KU, KMM, Aghnia, Muballigh, PJP) is partly inferred — some values (e.g. KMM, Aghnia, PJP) were not in the source. Confirm the real roles. (Seed has role:null for everyone, so nothing breaks meanwhile.)
3. **The activity_types → meeting/session mapping** (HANDOFF §12.5). The specific mapping is a guess. In particular: **is "Pertemuan 5 Unsur" the same gathering as "Musyawarah 5 Unsur"** (→ dedupe) or different (→ separate)? Only the group knows.
4. **The five "Lima Bab" categories.** Only ~4 labels are known (Lancar, Kurang Lancar, Kurang Sambung, Tabayyun); "Lima" implies five. Confirm the real five and what each measures.
5. **The session-types seed list.** Currently Hasda, Dalil-dalil, Penerobos Desa, Qur'an, Q+K.Zakat (plus Pengajian Ibu-Ibu and Penderesan ASAD need to coexist for the activity mapping). Confirm complete/current.
6. **Household address** — does the group record addresses, and want them in the app? (Field exists, nullable, empty at seed.)
7. **Serkiler roster** — is the curated list a *standing* list (same people each period) or *re-chosen* per period? Determines whether "manage roster" is one-time or per-period.
8. **The attendance % formula** `(H+S+I)/total` — confirm this matches how the group thinks about attendance (it's a values choice: does sick/excused "count"? Their own records wavered). One-line change if they disagree.

---

## 7. How this app was designed (provenance, for trust)

The schema and screens were reverse-engineered from the client's real Excel file, then refined through a long design process: schema design → 11 view designs with ASCII layouts → a visual system ("Arah Visual") → screen-by-screen visual prototypes (the `*.html` files) → this handoff. The prototypes are **visual references for structure and interaction, not CSS to copy** — converge to the canonical component library (Komponen) instead. Where a prototype and a spec disagree, the spec (ERD.html / this file / HANDOFF) wins; the prototypes accumulated some drift during iteration (see HANDOFF §9).
