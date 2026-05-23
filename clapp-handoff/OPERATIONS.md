# OPERATIONS — SLM Kelompok Cilandak A Management App

Companion to `ERD.md` (data model) and `VIEWS.md` (screens). This file covers the
**lifecycle**: how the app is seeded, shipped, updated, migrated, and kept alive — the
decisions that aren't schema and aren't a screen. Planning artifact.

---

## Operator & context

- **Single operator, single machine.** "The operator" = whoever uses the laptop. The
  role rotates over time (congregation roles change hands).
- **Fully offline.** No server, no network, no accounts, no sync. The app runs as a
  normal desktop application; the DB is a local SQLite file in `app.getPath('userData')`.
- **Design consequences of a rotating, non-technical operator:**
  - UX must be dead simple (no jargon, obvious first action).
  - Exported reports (PDF, plus Excel for the attendance grid) are **institutional
    memory** — they outlive the app and survive a handoff to a successor who may not know
    the tool.
  - No mandatory passphrase (see Security) — a forgotten secret must never be able to
    lock the data away from a successor.

---

## Seed / first-run import

- **App ships empty.** No hardcoded roster — data is never baked into the code. A fresh
  install has an empty database.
- **First-run wizard.** On launch the app checks whether the DB has any members. Empty →
  show the setup wizard; populated → show the normal Dashboard. The wizard is gated on
  emptiness, so it self-disables after seeding and can't be re-triggered by accident.
- **Seed source = the client's existing Excel** (`05_..._SLM_Cilandak.xlsx`). The wizard
  reads the KK sheet, normalizes messy values (`Caberawit`/`Cabe Rawit` → `Cabe Rawit`,
  `Menikah L|P` → `Dewasa`, `Muda mudi` → `Muda-mudi`), and imports.
- **Parse → preview → confirm → commit.** The preview step shows the parsed members and
  the active count so the client can verify *before* anything is written. This is what
  makes the seed **exact**, not just imported.
- **One-time only.** After seeding, the Excel is dead. All member changes flow through
  the app (Anggota + logged movements), never through re-import. Recovery is via Backup
  & Restore, not re-import.

> ### ⚠ The seed is load-bearing
> Demographic reconstruction (below) winds *today's* roster back through dated
> movements. Movements only exist for changes after go-live, so the seed is the
> baseline everything reconstructs from. A wrong seed (e.g. importing the spreadsheet's
> own 192-vs-197 drift) becomes a **permanent, invisible** offset on every reconstructed
> month. → The seed import must be verified by hand against the client's real active
> roster as of go-live. Highest-stakes data moment in the project.

> **Pre-go-live members** (departed people in old attendance, e.g. "Hj. Bahiro",
> "H. Giyanto") are imported as **inactive** — preserves their attendance history
> without inflating the active seed count. Months *before* go-live can't be
> reconstructed (no movements existed); they are snapshotted as-imported.

---

## Monthly report finalize & demographic snapshot

(Cross-ref: `ERD.md` `monthly_reports.finalized_at`, `demographics_snapshot`.)

- **Finalize is manual**, via a "Kunci" action on Laporan Bulanan. NOT automatic at
  month-end — month-end (the date) and report-complete (the state) differ; the last
  gathering's attendance is often entered days into the next month, so auto-locking
  would freeze incomplete data.
- **`finalized_at` IS the lock.** NULL = open/draft; dated = locked. No separate boolean.
- **Reversible.** "Buka kembali" clears `finalized_at` → editable again; re-"Kunci"
  sets a fresh date and re-snapshots. No revision counter — nobody acts differently on a
  first finalize vs an amendment, so it isn't tracked. (Add later only if a manager ever
  needs "did this change since I received it?")
- **Snapshot on finalize.** Finalizing stores the computed demographic block
  (`demographics_snapshot` JSON) so the report stops drifting. Re-opening a report
  months later must not silently change its numbers.
- **Late finalize → reconstruct as-of month-end.** If finalized late (after membership
  churn), the snapshot is computed by winding the current roster back through dated
  `member_movements` to the month-end state — NOT by reading today's `members`.
- **Dashboard nag** surfaces unfinalized past months, so on-time finalizing is
  encouraged (reconstruction makes late finalizes *correct*, but on-time is still best).

> ### ⚠ Mandatory-movement workflow rule
> Reconstruction is only valid if **every** activation/deactivation is a logged, dated
> `member_movements` record. Therefore: **no bare `is_active` flag-flips.** The Anggota
> UI must have no raw active/inactive switch — deactivation is always "log a Pindah
> Sambung" (which sets the flag as a side effect); arrival is always "Sambung Baru".
> A flag changed without a movement vanishes from reconstruction and reintroduces drift.

---

## Updates (delivering new app versions)

- **Manual reinstall** for now. Build a new installer (electron-builder), send it
  (Drive/USB/email), client runs it. One client = no update infrastructure needed.
- **Reinstalling does NOT touch the database** — the DB lives in `userData`, untouched
  by replacing the app binary. Data survives the app swap. (This is good, but it means
  the *app* must migrate the DB itself — see below.)
- **Auto-update** (`electron-updater`) is deliberately deferred — it needs a hosted
  update feed + code signing, which is fleet-management overhead this single-client
  project doesn't have. Revisit only if the app serves many groups.

---

## Migrations (evolving the schema without losing data)

This is the **high-stakes** lifecycle concern — far more than delivery. A botched
migration on a machine you can't reach loses irreplaceable attendance history.

- **Drizzle-driven.** Each schema change in `schema.ts` generates a numbered migration
  via drizzle-kit. (This is a core reason Drizzle was chosen over raw SQL.)
- **Auto-migrate on launch.** The app stores the DB's schema version and, on startup,
  applies any pending migrations in order before opening normally. A client jumping from
  app v1 to v5 gets migrations 2–5 applied automatically, data intact.
- **⚠ Backup-before-migrate is mandatory.** Before applying any migration, copy the DB
  file. If a migration fails on the client's machine, they keep an intact pre-migration
  copy rather than a corrupted DB. Non-negotiable for an offline app with no remote
  debugging.
- **Test against a copy of the real seeded DB** before shipping any migration.

---

## Backup & restore

With no encryption, "don't lose the file" IS the entire data-safety story — so backup
is the single most valuable safeguard in the app.

- **Plain SQLite file** → backup is just a file copy. Simple, inspectable, restorable.
- **Auto-backup, don't rely on the operator.** A non-technical, rotating operator will
  not remember to click "backup." Auto-backup on a schedule (e.g. on launch and/or
  weekly), keeping the last N copies in `userData`. Manual "Backup Sekarang" also
  available.
- **Restore preserves history** — recovery is "restore a real backup," never "re-import
  the stale Excel" (which would lose everything recorded since seeding).
- Pairs with backup-before-migrate above (same copy mechanism).

---

## Security — explicitly NO at-rest encryption

**Decision: SQLCipher dropped.** Recorded with reasoning so it isn't re-litigated.

- **What it would protect:** someone with physical access to the DB file reading
  personal data (names, addresses, attendance, donations) by copying it off the machine.
- **Why dropped:** this is a congregation roster, not financial/medical/secret data. The
  realistic, *more probable* risk for a rotating non-technical operator is **forgetting
  the passphrase → permanent total data loss** (encryption's guarantee is "no key = no
  data"; a real reset would mean the encryption wasn't real). That self-inflicted-loss
  risk outweighs the theft risk it defends against.
- **What still protects the data:** the laptop's own user login + physical control of the
  machine. Proportionate for this data.
- **Optional middle ground (not chosen, noted):** leave the live DB unencrypted but
  encrypt *backups* placed on USB/Drive — protects at-rest copies without a forgotten key
  ever locking the live app. Revisit only if the client asks.

---

## Exports / downloads (per-document format)

Format is matched to what each artifact *is*, not one global choice (this resolved the
earlier PDF-vs-DOCX question; **DOCX dropped** — nothing here is a hand-edited prose doc):

- **Serkiler → PDF.** A physical circulation sheet: print blank → members sign by hand →
  operator records paraf from the paper. Excel pointless (nobody manipulates a signature
  sheet). Printing a period also seeds that period's `circular_roster` rows.
- **Rekap Absensi → Excel + PDF.** It's a grid (members × sessions) — Excel lets the
  operator sort/recompute; PDF freezes it for circulation.
- **Monthly Report → PDF.** Formal prose-and-sections document, circulated/archived.

Build implication: a **PDF generator** (all three) + an **Excel writer** (Rekap only) —
two export paths.

---

## What NOT to build (avoid over-engineering)

Explicitly out of scope — engineering for scale this app will never hit:

- Multi-user / accounts / permissions / login
- Concurrency, sync, cloud
- Performance tuning (≈200 members; SQLite is trivially fast here)
- i18n beyond Indonesian display labels
- Auto-update infrastructure (until many clients)

The biggest practical risk to this project is **over-designing and never shipping**, not
a missing feature. The design is structurally sound; remaining risks are operational
(backup, seed correctness, migration safety), not architectural.

---

## Build order (from ERD/VIEWS, with operations slotted in)

```
1. Scaffold            electron-vite + React + TS
2. Schema + migrations schema.ts → drizzle-kit migrations + version table
3. DB client           better-sqlite3 + Drizzle, pointed at userData path
4. One IPC round-trip   prove main↔renderer bridge works
5. Absensi             attendance entry — highest client-felt value
6. Anggota             member CRUD + addMember service + movement-only deactivation
7. Rekap / Laporan     monthly recap + report (finalize/snapshot here)
8. Musyawarah/Serkiler/Log Peristiwa
9. First-run wizard    seed import (parse→preview→confirm)
10. Dashboard          aggregates the above; the "belum input"/nag panel
11. Backup + auto-backup + migration-on-launch safety
12. Package            electron-builder installer
```

Notes: backup/migration safety should land **before the first post-launch update**, not
last — the first schema change you ship to the client needs the safety net already in
place. Dashboard is late because it aggregates other views' state.
