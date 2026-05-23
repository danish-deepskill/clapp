# CLApp — Engineering Handoff

> Single-machine offline desktop app for SLM Kelompok Cilandak A (Indonesian Islamic congregation). Manages member rosters, attendance, monthly reports, meetings, circulars, and the event log. Rotating non-technical operator, possibly older users.

---

## 1. Tech stack (locked decisions)

| Layer | Choice | Why |
|---|---|---|
| Shell | **Electron** (Forge or Builder) | Cross-platform, fully offline, native print/PDF, file-system access |
| Language | **TypeScript** strict | Type safety end-to-end |
| Bundler | **Vite** (via `electron-vite` template) | Fast HMR, well-trodden Electron+TS+React path |
| DB | **SQLite via better-sqlite3** | Synchronous, single-file, embeddable, no daemon |
| ORM | **Drizzle** | Type-safe queries, schema-first, clean migrations |
| UI | **React 18** | Matches prototype JSX |
| Styling | **Tailwind CSS** + custom theme (NO shadcn) | See §3 |
| Primitives | **Radix UI** (unstyled) | Dialog, DropdownMenu, Popover, Toast, Toggle, Tooltip |
| Icons | **lucide-react** | Stroke-only style matches prototypes |
| State | **Zustand** | Tiny global store for selected period, etc. |
| Forms | **React Hook Form + Zod** | Zod doubles as seed.json validator |
| Excel export | **ExcelJS** | Pixel-accurate `.xlsx` for manager-facing reports |
| Print/PDF | `window.print()` + `@media print`; Electron `webContents.printToPDF()` for letterhead docs |

**Not used / explicitly rejected:**
- ❌ **shadcn/ui** — defaults are too rounded/consumer-app and would require heavy override. Use Radix directly.
- ❌ **Inter / system fonts** — IBM Plex Sans + Plex Mono only.
- ❌ **CSS-in-JS** (styled-components, emotion) — Tailwind is enough.
- ❌ **Login / auth / encryption** — single-machine offline, no accounts.
- ❌ **Re-import from Excel after seeding** — see §6.

---

## 2. Data model

**Source of truth: `ERD.html` (open in browser)**

Key principles:
- English schema names, Indonesian enum values
- Three event log tables (`vital_records`, `member_movements`, `member_changes`) presented as one UNION view in Catatan Peristiwa
- `members.is_active` only flips via `member_movements` insert — never directly
- `monthly_reports.lima_bab_*` derived from attendance, cached only on finalize
- `activity_records.source_kind` discriminator drives auto-fill from meetings vs sessions

First migration must match the ERD 1:1.

---

## 3. Design system

**Two reference documents:**
- `Arah Visual.html` — tokens (color, typography, spacing, density rules)
- `Komponen.html` — component contract (buttons, toast, loading, empty, dialog, validation, badges, toggle, banner)

### Tailwind config essentials

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        paper:    '#F5F1E8',
        'paper-2':'#EFE9DC',
        surface:  '#FCFAF5',
        'surface-2':'#F9F5EC',
        'ink-900':'#1B1814',
        'ink-700':'#4A4640',
        'ink-500':'#7A746A',
        'ink-400':'#9C968B',
        'ink-300':'#C8C2B5',
        'ink-200':'#DCD6C8',
        rule:     '#D9D2C2',
        'rule-strong':'#B8B0A0',
        hadir:    '#2E7048', 'hadir-ink':'#1E4D31', 'hadir-bg':'#E1ECDC',
        alpa:     '#B23A3A', 'alpa-ink':'#7E2828', 'alpa-bg':'#F4DCD8',
        sakit:    '#325E8C', 'sakit-ink':'#234062', 'sakit-bg':'#DCE5F0', // slate blue
        izin:     '#B17A1F', 'izin-ink':'#7F5614', 'izin-bg':'#F2E5C7',   // ochre
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',  // ← NON-NEGOTIABLE: max radius is 3px
        sm:      '2px',
        md:      '3px',
      },
    },
  },
};
```

### Non-negotiables

- **Border radius ≤ 3px everywhere**. No `rounded-lg`, no `rounded-xl`, no `rounded-full` except for actual circular elements (badge dots, avatars if added).
- **Status colors are semantic, not decorative**. Hadir=forest green, Alpa=brick red, Sakit=slate blue, Izin=ochre. These four colors must NEVER appear except to convey their specific meaning.
- **Density**: ~38px row height in tables; hairline `--rule` dividers; tabular numerals (Plex Mono) for any number/date/currency.
- **Typography**: Plex Sans for labels & names, Plex Mono for numbers, IDs, codes, eyebrow labels (uppercase + letter-spacing).
- **Indonesian labels** everywhere user-facing. English only in code identifiers.
- **No emojis** in UI chrome. Only inside seed/operator-typed text.

---

## 4. Screens — file map

Each prototype HTML maps to one screen. Read these for **structure and interaction**, NOT for CSS copy-paste.

| Prototype file | Live screen | Notes |
|---|---|---|
| `Dashboard.html` | `/` Beranda | Hero + Perlu Tindakan + Tindakan Cepat + recent panels |
| `Absensi.html` | `/absensi` | Input kehadiran (30+ rows, status pills, footer tally) |
| `Rekap Absensi.html` | `/rekap-absensi` | Read-only matrix, sticky columns, % Hadir color-coded |
| `Jamaah.html` | `/jamaah` | Member directory grouped by KK + Tambah/Edit/Edit-KK modals |
| `Catatan Peristiwa.html` | `/catatan-peristiwa` | Event log (UNION view of 3 tables) |
| `Musyawarah.html` | `/musyawarah` | Meeting list + detail editor with Hadir picker |
| `Serkiler.html` | `/serkiler` | Curated roster + paraf + iuran + print sheet |
| `Pengaturan.html` | `/pengaturan` | Master data + Backup + Cloud + Pembaruan |
| `Laporan Bulanan.html` | `/laporan-bulanan` | Sectioned monthly report editor |
| `Komponen.html` | (not in app — devtools only) | Component reference |
| `Arah Visual.html` | (not in app — devtools only) | Design tokens reference |
| `ERD.html` | (not in app — devtools only) | Data model reference |

**Build order recommendation:**
1. Pengaturan (master data drives dropdowns elsewhere)
2. Jamaah (+ Tambah/Edit modals + Edit-KK)
3. Absensi → Rekap Absensi
4. Musyawarah
5. Catatan Peristiwa
6. Serkiler
7. Laporan Bulanan (composes from all of the above)
8. Dashboard (composes from everything)
9. First-run wizard (seed.json import)

---

## 5. Shared components / DRY

These exist as inline duplicates in the prototypes — **canonicalize them as React components on day one**:

- `<CLAppNavBar active={...} />` — already extracted in `clapp-navbar.jsx`, port to TSX
- `<SectionCard label title meta readOnly>` — pattern from Pengaturan/Laporan Bulanan
- `<Button variant="primary|outline|danger|danger-ghost" disabled>` — see Komponen
- `<Input>`, `<Select>`, `<TextArea>` — unify the Jamaah `.ipt` and Pengaturan `input` patterns
- `<Toast variant="success|info|warn|error" action dismissible duration>` — see Komponen
- `<Toggle on />` — see Komponen
- `<EmptyState icon title sub cta />` — see Komponen
- `<Banner variant="info|warn|danger">` — see Komponen
- `<StatusBadge variant="hadir|alpa|sakit|izin">`, `<EventTag>`, `<RoleBadge>`, `<KepalaBadge>` — see Komponen
- `<ConfirmDialog>` (Radix Dialog wrapped) — see Komponen
- `<DateRangeFilter>` (Bulan + Tahun dropdowns) — appears on Catatan Peristiwa, Musyawarah, Serkiler, Laporan, Rekap

**Helpers** (extract to `src/lib/`):
- `BULAN_ID`, `BULAN_SHORT`, `HARI_ID`
- `fmtIDR(n)`, `fmtDateID(date)`, `fmtDay(iso)`, `parseIDR(s)`
- `currentMonthYear()`, `availableYears(startYear)`

---

## 6. Seed & first-run wizard

**Format: `seed.json`** (file in this project — canonical example)

Wizard flow on fresh install:
1. Pick `seed.json` file
2. Validate against Zod schema (same enums as ERD)
3. Preview: "30 jama'ah across 8 KK, 4 with Dapukan, 2 marked inactive — Konfirmasi?"
4. Commit in one transaction; create initial `households` + `members` rows
5. Show Dashboard

**Critical rule**: after the wizard commits, **never re-import**. SQLite becomes the source of truth immediately. Recovery is from backup, not re-import.

**Verify with client after seeding**: confirm the active member count + total household count against the client's hand-maintained roster. The seed source (Excel) has documented drift; "matches the sheet" ≠ "confirmed correct."

---

## 7. Excel export (for manager-facing reports)

Use **ExcelJS**. One generator function per document type:

```
src/exports/
├── laporanBulananXlsx.ts
├── rekapAbsensiXlsx.ts
├── serkilerXlsx.ts
└── shared/excelTheme.ts   ← Plex font names, border styles, color tokens
```

Each must mirror the manager's existing layout exactly — column widths, merged cells, borders, supercolumn structure, "SLM Kelompok Cilandak A / Bulan {Month} Tahun {Year}" header, etc. See the sample screenshot for Laporan Bulanan demographic header.

**Don't** try to export HTML to Excel. **Don't** use html2canvas + Excel image. Real cells only.

---

## 8. Auto-trigger / service-layer rules

These are described in the prototypes but **not wired** there. Engineer must implement:

| Trigger | Effect |
|---|---|
| Tambah Jama'ah (logAs=Lahir, Kelas=Balita) | Insert `vital_records(Lahir)` |
| Tambah Jama'ah (logAs=Sambung Baru) | Insert `member_movements(Sambung Baru)` |
| Edit Jama'ah · Status Keanggotaan → Pindah Sambung | Insert `member_movements(Pindah Sambung)` + set `is_active=false` (one txn) |
| Edit Jama'ah · Status Keanggotaan → Meninggal | Insert `vital_records(Meninggal)` + set `is_active=false` (one txn) |
| Edit Jama'ah · marital_status change | Insert `member_changes(Menikah, old→new)` |
| Edit Jama'ah · life_stage change | Insert `member_changes(Perubahan Kelas, old→new)` |
| Edit Jama'ah · role_id change | Insert `member_changes(Perubahan Dapukan, old→new)` |
| Save Musyawarah (type=Kelompok / 5 Unsur / Pengkoreksian KU) | UPSERT `activity_records` for current month + set `source_meeting_id` |
| Save Absensi for session_type linked to an `activity_types.source_kind=session` row | UPSERT `activity_records` to Terlaksana |
| Late finalize of past month | Compute `demographics_snapshot` by walking `member_movements` backward |

**All of these are single transactions** in the service layer, never split into "UI fires two writes."

---

## 9. Known drift in prototypes — ignore in handoff

The prototype HTML files have accumulated some inconsistencies during iteration. Engineer should **converge to the canonical component library**, not copy any one prototype's pattern blindly:

- Dead inline `function NavBar()` definitions in every screen — superseded by `clapp-navbar.jsx`
- Inline sample data (`PERISTIWA`, `MEETINGS_INIT`, `INITIAL_IURAN`, etc.) — superseded by `clapp-data.jsx` + real DB
- `.ipt` class (Jamaah) vs raw input styling (other screens) — converge to `<Input>` component
- Multiple empty-state patterns — use Komponen's `<EmptyState>`
- Multiple toast styles — use Komponen's refined toast spec (border-left accent + action + dismiss + tiered durations + ARIA roles)
- "+Tambah" sometimes primary, sometimes ghost — pick one per context, document in component
- Frame chrome (`.frame-wrap`, `.frame-chrome`) is **prototype-only scaffolding** (fake desktop window) — disappears entirely in Electron app
- `Absensi-print.html`, `Absensi Pengajian (offline).html`, `tweaks-panel.jsx` — leftover artifacts, delete

---

## 10. Operational notes

(Source: `OPERATIONS.md` in original handoff package)

- **Auto-backup**: daily snapshot of SQLite file, keep last N (configurable, default 14). User-configurable path so they can point at Drive/OneDrive.
- **Cloud sync (optional)**: weekly push to user-configured cloud folder. Pull is destructive (replaces local) — confirm dialog required.
- **Updates**: notify-only on app launch when online. Manual download and install. No auto-install (no code-signing needed).
- **Mandatory movement rule**: every `members.is_active` toggle MUST be tied to a `member_movements` insert. Enforced at service layer.
- **Finalize is manual** via Kunci button. Reversible (Buka Kunci). On finalize, snapshot demographics + lima bab into `monthly_reports` JSON column.
- **No login**: single-machine, single-operator-at-a-time. Brand badge shows Perlu Tindakan count as the only "notification" UI.

---

## 11. Suggested first PR

1. Scaffold `electron-vite` TS template
2. Install Tailwind + Radix + lucide + Drizzle + better-sqlite3 + Zustand + React Hook Form + Zod
3. Apply Tailwind config from §3
4. Build `<Button>`, `<Input>`, `<Toast>`, `<Toggle>` components from Komponen.html
5. Drizzle schema from ERD.html
6. First migration

After that, screens in the order from §4. Each screen PR should pair with a `*.spec.ts` for the service-layer rules from §8.

---

## 12. Open items / pending specs

Things HANDOFF.md references but doesn't fully nail down — the engineer should resolve these early.

### 12.1 Companion docs to ship alongside this file

Include in the handoff zip:
- `ERD.md` (⚠ partial / historical — predates roles, address, source_kind, member_changes. **`ERD.html` is the authoritative spec.** Ship `ERD.md` only as rationale prose, not as a schema source.)
- `OPERATIONS.md` (operational decisions: backup retention, mandatory-movement rule, finalize, etc.)
- `seed.json` (canonical example — already in project; production seed must be regenerated from client data)
- `clapp-icon.jpg` and any letterhead PNG (when ready)
- This file (`HANDOFF.md`)

### 12.2 Zod schema for seed.json

Lock the import contract on day one. Sketch:

```ts
// src/seed/schema.ts
import { z } from 'zod';

const Gender      = z.enum(['Laki-Laki','Perempuan']);
const LifeStage   = z.enum(['Balita','AUD','Cabe Rawit','Pra Remaja','Remaja','Muda-mudi','Dewasa']);
const Marital     = z.enum(['Belum Menikah','Menikah','Janda','Duda']);
const BloodType   = z.enum(['A','B','AB','O','Tidak Tahu']);
const Rhesus      = z.enum(['Positif','Negatif','Tidak Tahu']);
const HouseholdType = z.enum(['KK','KK-S']);

// Role is **NOT an enum** — it's a seeded lookup table (`roles`).
// Pengaturan lets operators add/rename roles without a code change.
// The seed value must match a row in `roles.name`. The initial role list
// (Imam, Wakil, Sekretaris, Bendahara, Penerobos, KU, KMM, Aghnia, Muballigh,
// PJP) is provisional — CONFIRM WITH CLIENT before seeding. The schema
// accepts any string; validation against `roles.name` happens at import time
// after the roles table is seeded.
const RoleName = z.string().nullable();

const Member = z.object({
  full_name:      z.string().min(2),
  nickname:       z.string().nullable(),
  gender:         Gender,
  life_stage:     LifeStage,
  marital_status: Marital,
  blood_type:     BloodType,
  rhesus:         Rhesus,
  birth_place:    z.string().nullable(),
  birth_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  is_head:        z.boolean(),
  is_active:      z.boolean(),
  role:           RoleName,
});

const Household = z.object({
  household_no: z.string().regex(/^\d{3}$/),
  type:         HouseholdType,
  address:      z.string().nullable(),    // ← nullable: production seed has null addresses
  members:      z.array(Member).min(1),
}).refine(h => h.members.filter(m => m.is_head).length === 1,
          { message: 'Exactly one is_head per household' });

export const SeedSchema = z.object({
  version: z.literal('1.0.0'),
  kelompok: z.object({ name: z.string(), region: z.string() }),
  households: z.array(Household).min(1),
});

export type Seed = z.infer<typeof SeedSchema>;
```

### 12.3 First-run wizard

UX (see `Setup Wizard.html` prototype — to be built):
1. **Welcome step** — "CLApp belum punya data. Mulai dengan mengimpor file seed.json dari pengurus pusat."
2. **File picker** — operator drags `seed.json` or clicks "Pilih File"
3. **Parse + validate** — runs `SeedSchema.parse()`; on error shows inline list of issues with row numbers
4. **Preview** — read-only Demografi grid + KK count + Pengurus count + inactive count
5. **Confirm** — primary "Mulai" button; secondary "Pilih File Lain"
6. **Commit** — one transaction: insert households (with nullable head_member_id), insert members, then UPDATE each household.head_member_id once all member rows exist
7. **Land on Dashboard** with empty Perlu Tindakan (no events yet)

### 12.4 Excel layout specs

For each manager-facing export, the engineer needs a literal coordinate spec. At minimum: Laporan Bulanan (sample screenshot exists). Recommended format:

```
src/exports/specs/
├── laporan-bulanan.md   ← cells, merges, widths, fonts
├── rekap-absensi.md
└── serkiler.md
```

Each spec maps SQL query → Excel coordinates. The engineer should request the manager's existing `.xlsx` templates if available — those are the ground truth.

### 12.5 activity_types seed (Pengkoreksian + sessions) — ⚠ confirm with client

The mapping below is the **best inference** from the operator's description ("Pengkoreksian KU is musyawarah, Pertemuan 5 Unsur is Musyawarah 5 Unsur, Pengajian Ibu-Ibu and Penderasan ASAD are session pengajian"). Confirm each row with the client before seeding the production database — especially whether "Pertemuan 5 Unsur" and "Musyawarah 5 Unsur" really are the same gathering, or whether they should map to distinct `meeting_type` values.

Seed `activity_types` per the ERD section discriminator:

| name | source_kind | meeting_type | session_type_id |
|---|---|---|---|
| Musyawarah Kelompok | `meeting` | `Musyawarah Kelompok` | null |
| Musyawarah 5 Unsur | `meeting` | `Musyawarah 5 Unsur` | null |
| Pertemuan 5 Unsur | `meeting` | `Musyawarah 5 Unsur` | null |
| Pengkoreksian KU Bulanan | `meeting` | `Pengkoreksian KU Bulanan` | null |
| Pengajian Ibu-Ibu Kelompok | `session` | null | FK → session_types['Pengajian Ibu-Ibu'] |
| Penderesan ASAD | `session` | null | FK → session_types['Penderesan ASAD'] |

Add `'Pengajian Ibu-Ibu'` and `'Penderesan ASAD'` to the seeded `session_types` master list (currently has Hasda / Dalil-dalil / Penerobos Desa / Qur'an / Q+K.Zakat — these need to coexist).

### 12.6 Testing

- **Framework**: Vitest + `@testing-library/react` for components
- **DB tests**: better-sqlite3 in-memory `:memory:` database, run migrations, exercise service layer
- **Service-layer tests are mandatory** for each auto-trigger rule in §8 — e.g. `editMember.spec.ts` proves that flipping `is_active=false` without a movement throws

### 12.7 Backup file format

- Name: `clapp-backup-{YYYY-MM-DD}-{HH-mm-ss}.sqlite`
- Path: user-configured (default `~/Documents/CLApp/backups/`)
- Retention: keep last **14** by default (configurable in Pengaturan)
- Rotation: delete oldest beyond N on every successful backup
- Manual "Backup Sekarang" button creates a backup with the same naming + appends `-manual` suffix to distinguish

### 12.8 A11y

- Status pills must respond to keyboard: focus a row, press `H` / `A` / `S` / `I` to set status (Absensi screen)
- All toasts: `role="status"` for non-urgent, `role="alert"` for errors (see Komponen)
- All Dialogs: focus trap, Esc to dismiss, click outside to dismiss (except destructive — those require explicit Batal click)
- All form inputs: associated `<label htmlFor>`, error text linked via `aria-describedby`
- Color contrast: every text/bg pair meets WCAG AA at minimum (verified for the cream palette already)
- Minimum tap target: 28px height for any clickable element

### 12.9 Error handling pattern

| Situation | UI |
|---|---|
| Form validation (field-level) | Inline `<FieldError>` below the input, red border on input |
| Save succeeds | Toast success, auto-dismiss 2.5s |
| Save succeeds with destructive option | Toast success + "Urungkan" action, 5s window |
| Save fails (DB error) | Toast error, **sticky** (must dismiss), include "Coba Lagi" action |
| Async operation in progress (backup, import) | Modal with spinner; do not let user navigate away |
| Validation passes but logical conflict (e.g. duplicate `household_no`) | Banner.danger at top of form, not a toast |

### 12.10 No telemetry

CLApp ships **with zero analytics or telemetry**. No Sentry, no Posthog, no error reporting service. Offline-only single-machine app — no network calls except the optional weekly cloud sync (user-configured folder, not a remote service). State this explicitly in any privacy notice/about page.

---

## 13. Architecture & code conventions

### 13.1 Folder structure

```
clapp/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
│
├── src/
│   ├── main/                         # Electron main process
│   │   ├── index.ts                  # app entry
│   │   ├── window.ts                 # BrowserWindow setup
│   │   ├── ipc.ts                    # registerHandlers(channel, fn)
│   │   ├── handlers/                 # one file per domain — thin wrappers
│   │   │   ├── memberHandlers.ts
│   │   │   ├── attendanceHandlers.ts
│   │   │   └── ...
│   │   ├── db/                       # SQLite + Drizzle
│   │   │   ├── connection.ts
│   │   │   ├── schema.ts             # full schema from ERD.html
│   │   │   ├── migrations/           # append-only
│   │   │   └── seed.ts               # imports seed.json
│   │   ├── services/                 # business rules (pure functions)
│   │   │   ├── memberService.ts
│   │   │   ├── attendanceService.ts
│   │   │   ├── meetingService.ts
│   │   │   ├── reportService.ts
│   │   │   └── eventLogService.ts
│   │   ├── exports/                  # ExcelJS generators
│   │   │   ├── laporanBulananXlsx.ts
│   │   │   ├── rekapAbsensiXlsx.ts
│   │   │   └── serkilerXlsx.ts
│   │   └── backup/
│   │       ├── createBackup.ts
│   │       └── rotateBackups.ts
│   │
│   ├── preload/
│   │   └── index.ts                  # typed bridge: window.clapp.<domain>.<action>
│   │
│   ├── renderer/                     # React app
│   │   ├── main.tsx                  # ReactDOM.createRoot
│   │   ├── App.tsx                   # screen router
│   │   ├── screens/                  # one folder per screen in HANDOFF §4
│   │   │   ├── Dashboard/
│   │   │   ├── Absensi/
│   │   │   ├── Jamaah/
│   │   │   └── ...
│   │   ├── components/               # canonical from Komponen.html
│   │   │   ├── NavBar.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Banner.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── SectionCard.tsx
│   │   │   ├── DateRangeFilter.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── icon/                 # lucide re-exports
│   │   ├── lib/
│   │   │   ├── format.ts             # fmtIDR, fmtDateID, fmtDay
│   │   │   ├── dates.ts              # BULAN_ID, HARI_ID, currentMonth, availableYears
│   │   │   └── seedSchema.ts         # Zod schema for seed.json
│   │   ├── store/                    # Zustand
│   │   │   ├── periodStore.ts        # selected bulan/tahun shared across screens
│   │   │   └── perluTindakanStore.ts # count for brand badge
│   │   └── styles/
│   │       ├── globals.css
│   │       └── tokens.css            # CSS vars (used by anything Tailwind can't reach)
│   │
│   └── shared/                       # types used by both main + renderer
│       ├── types.ts                  # Member, Household, Session, etc.
│       └── enums.ts                  # all enum value unions
│
└── tests/                            # Vitest
    ├── services/
    └── exports/
```

### 13.2 IPC pattern

Renderer never talks to SQLite directly. All DB access goes through typed IPC:

```ts
// src/preload/index.ts
contextBridge.exposeInMainWorld('clapp', {
  member: {
    list:   (filter: MemberFilter) => ipcRenderer.invoke('member:list', filter),
    create: (input: NewMember)     => ipcRenderer.invoke('member:create', input),
    edit:   (id: number, input: EditMember) => ipcRenderer.invoke('member:edit', id, input),
  },
  // ...
});

// src/main/handlers/memberHandlers.ts
ipcMain.handle('member:list', (_, filter) => memberService.list(deps, filter));
ipcMain.handle('member:create', (_, input) => memberService.create(deps, input));
ipcMain.handle('member:edit', (_, id, input) => memberService.edit(deps, id, input));
```

- Channels: `<domain>:<action>` (always two parts)
- Handler is a thin wrapper — **business logic lives in the service**
- Services receive `deps` (db, clock, file system) injected — makes testing trivial

### 13.3 Service-layer pattern

```ts
// src/main/services/memberService.ts
type Deps = { db: DB; clock: Clock; eventLog: EventLogService };

export function edit(deps: Deps, id: number, input: EditMember) {
  return deps.db.transaction(() => {
    const current = deps.db.select().from(members).where(eq(members.id, id)).get();
    const updates = computeUpdates(current, input);

    deps.db.update(members).set(updates).where(eq(members.id, id)).run();

    // Auto-trigger per HANDOFF §8
    if (input.life_stage && input.life_stage !== current.life_stage) {
      deps.eventLog.recordChange({ memberId: id, field: 'life_stage',
        from: current.life_stage, to: input.life_stage, when: deps.clock.now() });
    }
    // ...same for marital_status, role_id
    return deps.db.select().from(members).where(eq(members.id, id)).get();
  });
}
```

- Every business rule = one exported function
- Transactions wrap **all** writes for a single user action
- No `console.log`; pass an optional `logger` via deps if needed

### 13.4 Migration policy

- Migrations are **append-only**. Never edit a committed migration.
- New schema change = new migration file: `migrations/0007_add_role_id_to_members.sql`
- Always run `drizzle-kit generate` after schema.ts edits
- On every backup: include the latest migration in the backup metadata
- On app launch: run pending migrations in a transaction; on failure, abort with clear error UI

### 13.5 Git / PR conventions

- **Branches**: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`
- **Commits**: conventional commits — `feat(absensi): add keyboard shortcuts for status pills`
- **PR**: one screen or one cohesive feature per PR; include before/after screenshots comparing to the prototype HTML
- **PR description**: include `Closes #N` or a brief rationale; list any deviations from HANDOFF.md and why
- **Required checks**: typecheck, lint, vitest, build

### 13.6 What "MVP done" looks like

- All 9 screens from §4 functional, matching prototypes
- First-run wizard imports `seed.json` correctly
- All auto-trigger rules from §8 have passing tests
- Backup runs daily, last-14 retention works
- Laporan Bulanan exports to `.xlsx` matching the manager's layout
- App builds, signs (deferred — notify-only updates), packages for Windows + macOS
- No console errors on any screen
- 100% Indonesian labels (no leftover English in UI)
