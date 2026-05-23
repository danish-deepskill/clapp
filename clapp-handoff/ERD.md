# ERD — SLM Kelompok Cilandak A Management App

**Stack:** Electron + TypeScript + SQLite (better-sqlite3) + Drizzle ORM

**Conventions**
- Table & column names: **English** (developer standard).
- Enum / status **values**: **Indonesian** (kept as-is from the source Excel — they are data, not code).
- Free-text data values (names, places, notes): Indonesian, untouched.
- `notes` fields hold **Markdown** text.
- `*_at` columns are timestamps; `id` is autoincrement integer PK.
- `──→` = required (NOT NULL) FK · `┄┄→` = nullable FK · ★ = design-critical table.

---

## Entity overview

**15 tables.** (Was 12; `activities` split into `activity_types` + `activity_records`, `sick_records` added, and `session_types` reintroduced as a lookup for `sessions`.)

| Table | Indonesian term | Purpose |
|---|---|---|
| `households` | Keluarga / KK | Family units (KK or single KK-S) |
| `members` ★ | Anggota | Single source of truth for every person |
| `sessions` | Pertemuan / Pengajian | A gathering on a date (references a session_type) |
| `session_types` | Jenis Pertemuan | Master list of session names (Hasda, Qur'an, …) |
| `attendance` ★ | Absensi | One row per member per session (+ shodaqoh) |
| `circular_roster` | Serkiler | Curated rotation list with paraf (signature) |
| `meetings` | Musyawarah | Meetings; result stored as one Markdown note |
| `meeting_attendees` | — | Junction: who attended each meeting |
| `vital_records` | Melahirkan & Meninggal | Births / deaths log |
| `member_movements` | Pindah / Sambung Baru | Member in/out log |
| `activity_types` | Jenis Kegiatan | Master list of recurring activities (edited once) |
| `activity_records` | Kegiatan Kelompok | Per-month status of each activity (Belum/Terlaksana) |
| `sick_records` | Sakit | Members logged as sick in a month |
| `monthly_reports` | Laporan Bulanan | Per-month leftovers not derivable elsewhere |
| `family_visits` | Keluarga Dikunjungi | Families visited in a month |

> The monthly report's **demographic summary** (Balita/AUD/…/Janda counts) is **NOT stored** — it is computed live from `members` grouped by `life_stage` + `gender`.
> **Suggestions** (saran) are **not** a table — they live in the relevant meeting's `notes`.

---

## Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ households (Keluarga / KK)                                           │
│ ───────────────────────────                                          │
│ PK  id                                                               │
│     household_no       -- auto-assigned (MAX+1)                       │
│     type               -- enum: 'KK' | 'KK-S'                        │
│ FK  head_member_id  ┄┄→ members.id   (nullable; resolves the cycle)  │
└────────────────────────────────────────────────────────────────────┘
       │ 1
       │ has many                       ▲ 1  (head of household)
       │ N                              ┊
┌────────────────────────────────────────────────────────────────────┐
│ members (Anggota)                                       ★            │
│ ───────────────────                                                  │
│ PK  id                                                               │
│ FK  household_id  ──→ households.id                                  │
│     full_name          -- "KH. Aceng Karimullah"                     │
│     nickname           -- Nama Panggilan                             │
│     gender             -- enum: 'Laki-Laki' | 'Perempuan'            │
│     life_stage         -- enum (age ladder, see below)               │
│     marital_status     -- enum: 'Belum Menikah'|'Menikah'|           │
│                                 'Janda'|'Duda'                       │
│     blood_type         -- enum: 'A'|'B'|'AB'|'O'|'Tidak Tahu'        │
│     rhesus             -- enum: 'Positif'|'Negatif'|'Tidak Tahu'     │
│     birth_place        -- Tempat Lahir                               │
│     birth_date         -- nullable (enables auto life_stage later)   │
│     is_active          -- soft delete; false when left/deceased      │
│     created_at         -- timestamp                                  │
│     updated_at         -- timestamp                                  │
└────────────────────────────────────────────────────────────────────┘
   │            │              │                │
   │            │              │                │ logged-by (see logs below)
   │            │              │                └┄┄→ vital_records, member_movements
   │            │              │
   │            │              │ N
   │            │     ┌────────────────────────────────────────┐
   │            │     │ meeting_attendees (junction)           │
   │            │     │ ──────────────────────────             │
   │            │     │ PK  id                                 │
   │            │     │ FK  meeting_id  ──→ meetings.id        │
   │            │     │ FK  member_id   ──→ members.id         │
   │            │     │ UNIQUE(meeting_id, member_id)          │
   │            │     └────────────────────────────────────────┘
   │            │                 │ N
   │            │                 │ belongs to
   │            │                 │ 1
   │            │     ┌────────────────────────────────────────┐
   │            │     │ meetings (Musyawarah)                  │
   │            │     │ ──────────────────────                 │
   │            │     │ PK  id                                 │
   │            │     │     meeting_date                       │
   │            │     │     type   -- enum: 'Musyawarah        │
   │            │     │              Kelompok'|'Musyawarah     │
   │            │     │              5 Unsur'|'Lainnya'        │
   │            │     │     title                              │
   │            │     │     notes  -- Markdown (notulen +      │
   │            │     │              saran/masukan)            │
   │            │     └────────────────────────────────────────┘
   │            │
   │            │ N
   │  ┌─────────────────────────────────────────┐
   │  │ circular_roster (Serkiler)              │
   │  │ ───────────────────────────             │
   │  │ PK  id                                  │
   │  │ FK  member_id  ──→ members.id           │
   │  │     period   -- month (timestamp)       │
   │  │     paraf    -- boolean (signed?)       │
   │  └─────────────────────────────────────────┘
   │
   │ N
┌────────────────────────────────────────────────────────────────────┐
│ attendance (Absensi)                                    ★            │
│ ─────────────────────                                                │
│ PK  id                                                               │
│ FK  member_id   ──→ members.id                                       │
│ FK  session_id  ──→ sessions.id                                      │
│     status           -- enum: 'H'|'A'|'S'|'I'                        │
│                         (Hadir/Absen/Sakit/Izin)                     │
│     arrival_at       -- timestamp, nullable (null when not present)  │
│     donation_amount  -- shodaqoh, rupiah, nullable                   │
│     created_at       -- timestamp                                    │
│     updated_at       -- timestamp                                    │
│ UNIQUE(member_id, session_id)                                        │
│ NOTE: rows are written on SAVE, not on screen-open. No row = the     │
│       session was not recorded (≠ absent). Fast-entry pre-displays   │
│       all members as 'H'; only persists on save (batch insert).      │
└────────────────────────────────────────────────────────────────────┘
       │ N
       │ belongs to
       │ 1
┌────────────────────────────────────────────────────────────────────┐
│ sessions (Pertemuan / Pengajian)                                     │
│ ─────────────────────────────────                                    │
│ PK  id                                                               │
│     session_date                                                     │
│ FK  session_type_id  ──→ session_types.id                            │
│ UNIQUE(session_type_id, session_date)                                │
│ NOTE: created on-the-fly at attendance entry. Date may be TODAY or   │
│       PAST (back-dating is the normal flow — paper entered later);   │
│       FUTURE dates blocked (can't record attendance for a gathering  │
│       that hasn't happened). Same date + DIFFERENT type is allowed   │
│       (Hasda + Qur'an same day); same date + SAME type is blocked by │
│       the UNIQUE → a repeat attempt LOADS the existing session for    │
│       editing rather than erroring. (Assumes a type occurs ≤1×/day.) │
└────────────────────────────────────────────────────────────────────┘
       ▲ N
       ┊ belongs to
       ┊ 1
┌────────────────────────────────────────────────────────────────────┐
│ session_types (master list — edited once, like activity_types)       │
│ ─────────────────────────────────                                    │
│ PK  id                                                               │
│     name       -- "Hasda" | "Dalil-dalil" | "Penerobos Desa"        │
│                   | "Qur'an" | "Q+K.Zakat" | ...                     │
│     is_active  -- soft-retire, keeps history                         │
└────────────────────────────────────────────────────────────────────┘
   (Feeds the Absensi session dropdown and the Pengaturan "Nama Sesi"
    editor. Sessions are created on-the-fly when attendance is entered;
    Rekap derives one column per session row in the month.)


╔══════════════════════════════════════════════════════════════════════╗
║ EVENT LOGS — carry their own date, queried by month for the report     ║
╚══════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────┐
│ vital_records (Melahirkan & Meninggal)                               │
│ ───────────────────────────────────────                              │
│ PK  id                                                               │
│     event_type  -- enum: 'Lahir' | 'Meninggal'                       │
│     event_date                                                       │
│ FK  member_id  ┄┄→ members.id  (nullable — newborn not yet a member) │
│     name        -- free text when no member (e.g. newborn)           │
│     gender      -- enum: 'Laki-Laki' | 'Perempuan'                   │
│     notes       -- Keterangan (Markdown)                             │
│     created_at  -- timestamp                                         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ member_movements (Pindah Sambung / Sambung Baru)                     │
│ ────────────────────────────────────────────────                    │
│ PK  id                                                               │
│     movement_type -- enum: 'Pindah Sambung' | 'Sambung Baru'         │
│     movement_date                                                    │
│ FK  member_id  ──→ members.id  (required — create member first)      │
│     notes        -- "Pindah ke Jogja", "Dari Kebon Jeruk" (Markdown) │
│     created_at   -- timestamp                                        │
└────────────────────────────────────────────────────────────────────┘
   (Workflow: a new arrival is created as a member — defaulting to a new
    single household 'KK-S' — THEN a 'Sambung Baru' movement is logged.
    A 'Pindah Sambung' also flips members.is_active = false.)


╔══════════════════════════════════════════════════════════════════════╗
║ MONTHLY REPORT (Laporan Bulanan)                                       ║
╚══════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────┐
│ monthly_reports                                                      │
│ ─────────────────                                                    │
│ PK  id                                                               │
│     month, year         -- UNIQUE(month, year)                       │
│     lima_bab_lancar           -- % (real)                            │
│     lima_bab_kurang_lancar    -- %                                   │
│     lima_bab_kurang_sambung   -- %                                   │
│     lima_bab_tabayyun         -- %                                   │
│     rencana_bece        -- text  (domain term, kept)                 │
│     beras_jimpitan      -- text  (domain term, kept)                 │
│     fotocopy_dalil      -- text  (domain term, kept)                 │
│     other_notes         -- Markdown ("Lain-lain")                    │
│     visit_plans            -- JSON [{ time, place, agenda, notes }]   │
│     construction_projects  -- JSON [{ type, purpose, volume,         │
│                                       funds, condition }]            │
│     finalized_at        -- timestamp; NULL = open/draft, dated = LOCK│
│     demographics_snapshot -- JSON; frozen Demografi counts captured  │
│                              at finalize (reconstructed as-of        │
│                              month-end if finalized late). NULL until│
│                              first finalize → report computes live.  │
└────────────────────────────────────────────────────────────────────┘
       │ 1
       │ has many
       │ N
   ┌──────────────────────────────────────────────┐
   │ family_visits (Keluarga Dikunjungi)          │
   │ ──────────────────────────────────           │
   │ PK  id                                       │
   │ FK  report_id     ──→ monthly_reports.id     │
   │ FK  household_id  ┄┄→ households.id           │
   │     family_name   -- fallback for outsiders  │
   │     notes         -- Markdown                │
   └──────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────┐
   │ sick_records (Sakit)                         │
   │ ───────────────────────                      │
   │ PK  id                                       │
   │ FK  report_id  ──→ monthly_reports.id        │
   │ FK  member_id  ──→ members.id  (members-only)│
   │     notes      -- Markdown (condition/details)│
   │     created_at -- timestamp                  │
   └──────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────┐
   │ activity_records (per-month status)          │
   │ ───────────────────────────────              │
   │ PK  id                                       │
   │ FK  report_id        ──→ monthly_reports.id  │
   │ FK  activity_type_id ──→ activity_types.id   │
   │     status        -- enum: 'Belum'|'Terlaksana'│
   │     executed_date -- nullable                │
   │     attendee_count -- nullable               │
   │     location      -- nullable                │
   │ UNIQUE(report_id, activity_type_id)          │
   └──────────────────────────────────────────────┘
              ▲ N
              ┊ belongs to
              ┊ 1
   ┌──────────────────────────────────────────────┐
   │ activity_types (master list — edited once)   │  ← NOT a child of
   │ ───────────────────────────────              │    monthly_reports.
   │ PK  id                                       │    Free-standing master
   │     name      -- "Musyawarah Kelompok",      │    data. The 6 recurring
   │                  "Penderesan ASAD", ...      │    activities live here
   │     is_active -- soft-retire, keeps history  │    once; each month's
   └──────────────────────────────────────────────┘    view is generated by
       (On month-open: SELECT active types, LEFT JOIN   left-joining types
        activity_records for that report. Unmarked =     against this list.
        'Belum'. Persist a record only when filled in.)
```

---

## Enum value reference (Indonesian codes)

| Field | Values |
|---|---|
| `households.type` | `KK`, `KK-S` |
| `members.gender` / `vital_records.gender` | `Laki-Laki`, `Perempuan` |
| `members.life_stage` | `Balita`, `AUD`, `Cabe Rawit`, `Pra Remaja`, `Remaja`, `Muda-mudi`, `Dewasa` |
| `members.marital_status` | `Belum Menikah`, `Menikah`, `Janda`, `Duda` |
| `members.blood_type` | `A`, `B`, `AB`, `O`, `Tidak Tahu` |
| `members.rhesus` | `Positif`, `Negatif`, `Tidak Tahu` |
| `attendance.status` | `H`, `A`, `S`, `I` (Hadir, Absen, Sakit, Izin) |
| `meetings.type` | `Musyawarah Kelompok`, `Musyawarah 5 Unsur`, `Lainnya` |
| `vital_records.event_type` | `Lahir`, `Meninggal` |
| `member_movements.movement_type` | `Pindah Sambung`, `Sambung Baru` |
| `activity_records.status` | `Belum`, `Terlaksana` |

> `life_stage` is the **age ladder only**. The terminal adult rung is `Dewasa` (renamed from the source's `Menikah L/P` to avoid colliding with `marital_status`). Marital states (`Belum Menikah`/`Menikah`/`Janda`/`Duda`) live solely in `marital_status`. The two enums now share **no** literal value, and must be modeled as two distinct types in code. (Source sheet used `Menikah L`/`Menikah P` for this life-stage and plain `Menikah` for marital status; mapping `Menikah L|P` → `Dewasa` on import.)

---

## Relationship summary

- A **household** has many **members**; it points back to one as its head (`head_member_id`, nullable to break the insert cycle). New members default to their own new **KK-S** household via the `addMember` service.
- **members** is the hub — referenced by `attendance`, `circular_roster`, `meeting_attendees`, `member_movements` (required), and `vital_records` (nullable, for births).
- **attendance** is the junction of **members** × **sessions**, with shodaqoh folded in as `donation_amount`. `UNIQUE(member, session)` prevents double entry.
- **meetings** ↔ **members** is many-to-many via **meeting_attendees**; attendee count is derived from the junction, not stored. Meeting results (incl. saran/masukan) live in `meetings.notes` as Markdown.
- **monthly_reports** owns **family_visits**, **activity_records**, and **sick_records** (all by `report_id`). **vital_records** and **member_movements** are free-floating logs tied to a month by their own dates.
- **activity_types** is free-standing master data (the recurring activities), NOT a child of `monthly_reports`. Each month's activity view is generated by left-joining active `activity_types` against that report's `activity_records`; an `activity_records` row is persisted only when filled in.
- **sick_records** links a **member** to a **monthly_report** (members-only; no free-text fallback).
- The demographic summary block is **computed** from `members`, never stored.

---

## Design decisions (rationale)

1. **`is_active` soft-delete on members** — leaving/death must not destroy historical attendance. Flag instead of delete; member drops from current views and counts but past records stay intact. (Directly addresses the client's "changing a member breaks related fields" pain point.)
2. **Single source of truth** — a person is one row; everything references `members.id`, so a name change or departure is a one-row edit.
3. **Report is generated, not authored** — demographics computed; births/deaths/movements/activities logged as they happen; only genuinely month-specific leftovers (Lima Bab %, misc notes, freeform JSON lists) are stored on `monthly_reports`.
4. **Donation merged into attendance** — source sheet pairs them 1:1 per session; promote to its own table later only if multi-type or attendance-independent giving appears.
5. **Suggestions removed** — redundant with `meetings.notes`.
6. **`session_types` lookup table** (reversing an earlier draft that collapsed `event_types` into a free-text `sessions.name`) — session names are a small recurring vocabulary the operator picks from a dropdown, so they must be a controlled list, not free text (free text reintroduces the spelling drift the app exists to fix). Same master-data pattern as `activity_types`; editable in Pengaturan without code changes. `sessions.session_type_id` references it.
7. **New-arrival workflow** — create member first (defaulting to a new KK-S household), then log the `Sambung Baru` movement; all wrapped in one DB transaction at the service layer.
8. **Activities split into `activity_types` + `activity_records`** — the recurring activities (Penderesan ASAD, Musyawarah Kelompok, Musyawarah 5 Unsur, Pengkoreksian KU Bulanan, Pertemuan 5 Unsur, Pengajian Ibu-Ibu Kelompok) are master data living once in `activity_types`; only their per-month status lives in `activity_records`. Avoids re-entering names every month (same pain point as #1/#2). Each month auto-shows all active types.
9. **`life_stage` value `Menikah` → `Dewasa`** — eliminates the literal-string collision with `marital_status.Menikah`. The two are distinct enum types in code.
10. **Attendance written on save, not on open** — no row = session not recorded (≠ absent); fast-entry pre-displays all as `H` and batch-inserts on save. Keeps "a row exists" meaning "a human reviewed this."
11. **Head reassignment is prompted, never silent** — when a household head goes `is_active = false`, flag the household and ask the user to choose a new head (pre-selecting the earliest-joined active member as a suggestion). No silent auto-assignment of something as semantically loaded as head-of-family.
12. **Audit timestamps** — `created_at`/`updated_at` on `members` and `attendance`; `created_at` on the event/log tables (`vital_records`, `member_movements`, `sick_records`). Cheap insurance for an app whose purpose is fixing data drift.
13. **Monthly report finalize + demographic snapshot** — `finalized_at` (NULL = open, dated = locked; the timestamp *is* the lock, no separate boolean) is set manually via "Kunci", never auto at month-end (would freeze incomplete data). Finalizing stores `demographics_snapshot` (JSON) so a finalized report's computed Demografi block stops drifting when membership later changes. Reversible: "Buka kembali" clears `finalized_at`, re-Kunci re-snapshots. No revision counter (nobody acts on first-vs-amended). See `OPERATIONS.md`.
14. **Late finalize reconstructs as-of month-end** — if finalized after churn, `demographics_snapshot` is computed by winding the current roster back through dated `member_movements` to month-end state, not by reading today's `members`. **This makes the movement log mandatory: no bare `is_active` flag-flips — every activation/deactivation MUST be a logged `member_movements` record (the Anggota UI enforces this; deactivation = "log a Pindah Sambung", arrival = "Sambung Baru"). A flag changed without a movement vanishes from reconstruction.** See `OPERATIONS.md`.
15. **Sessions are on-the-fly, any day, no scheduling** — the group's rhythm is irregular (usually Mon/Thu, occasional Wed/Sun, minus holidays), so no pre-created slots, recurrence, or holiday logic. A session is born when attendance is entered. Date defaults to **today**, may be back-dated freely (entering paper later is the normal flow), future dates blocked. `UNIQUE(session_type_id, session_date)` blocks same-type-same-day duplicates (assumes a type occurs ≤1×/day — confirmed with client); a repeat attempt loads the existing session for editing.
16. **Download formats are per-document** — Serkiler → **PDF** (printed blank, signed on paper); Rekap Absensi → **Excel + PDF** (it's a grid worth manipulating + a circulated sheet); Monthly Report → **PDF** (formal prose document). DOCX dropped — nothing here is a hand-edited prose doc. (Resolves the earlier PDF-vs-DOCX open question.)

---

## Open questions / deferred (resolve before or during build)

- **Attendance % formula → `(H + S + I) / total sessions`** (decided). Only `A` (Alpa)
  is excluded; Sakit and Izin both count as legitimate non-absence. Matches the source's
  Oct-2024 sheet. Used by the Rekap % column and any report attendance figure.
- **View/page inventory** — done; see `VIEWS.md` (10 views, sidebar, per-screen layouts). Lifecycle/operational decisions (seed import, finalize, updates, migrations, backup, no-encryption) are in `OPERATIONS.md`.
- **Session controlled vocabulary** — session names live in the `session_types` lookup table (Hasda, Dalil-dalil, Penerobos Desa, Qur'an, Q+K.Zakat as seed values; HASDA/ASRAMA confirmed as names, not a separate track). Sessions are created **on-the-fly** when attendance is entered (no pre-scheduling), so the app cannot detect "missing/expected" sessions — final seed list to be confirmed with client (`CLIENT_QUESTIONS.md`).
- **Import normalization** — source data has spelling drift (`Caberawit`/`Cabe Rawit`, `Muda mudi`/`Muda-mudi`) and `Menikah L|P` → `Dewasa` mapping; migration needs a fuzzy-mapping pass, not a clean copy. Some attendance/serkiler names (e.g. "Hj. Bahiro", "H. Giyanto") are not in the current roster — import as inactive members to preserve their history.

---

## Flippable defaults (change if your reality differs)

- `vital_records.member_id` is **nullable** (+ free-text `name`) to allow births of not-yet-registered people. Make it required if every birth must create a member first.
- `family_visits.household_id` is **nullable** (+ `family_name` fallback) to allow visiting non-registered families. Make it required if visits are always to registered households.
- `households.household_no` is auto-assigned (MAX+1). Drop it if KK numbers aren't referenced by people; keep if "KK number 23" is meaningful.
