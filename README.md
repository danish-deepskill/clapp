# CLApp

Offline desktop app for **SLM Kelompok Cilandak A** — member roster, attendance, monthly reports, meetings, circulars, event log. Single machine, no login, no cloud, no telemetry.

> **Spec lives in [`clapp-handoff/`](clapp-handoff/).** Read `CLAUDE.md` and `HANDOFF.md` before any task. Prototypes in `clapp-handoff/prototypes/` are visual reference — translate, don't transplant.

## Stack

Electron 32 · TypeScript strict · Vite (electron-vite) · React 18 · Tailwind 3 · Radix primitives · Drizzle ORM · better-sqlite3 · Zustand · React Hook Form + Zod · ExcelJS · Vitest.

## Folder layout

```
src/
├── main/          Electron main process — DB, services, IPC handlers, exports, backup
│   └── db/        Drizzle schema, migrations (append-only), connection, runner
├── preload/       contextBridge → window.clapp typed API
├── renderer/      React app — screens, components, lib, store, styles
└── shared/        Enums + cross-process types (used by main + renderer)

clapp-handoff/     Authoritative spec, prototypes, seed.json — DO NOT EDIT
scripts/           Launcher utilities (run-electron.mjs)
tests/             Vitest specs
```

## Run

```sh
npm install        # one-time
npm run dev        # launch the app (force-rebuilds better-sqlite3 for Electron)
npm run dev -- -w  # same, and also restart Electron when main/ or preload/ change
npm test           # vitest (rebuilds better-sqlite3 for Node, then restores)
npm run build      # typecheck + production bundle
npm run db:generate # regenerate Drizzle migration after schema.ts edits
npm run dist:win   # Windows installer (NSIS) → dist/CLApp-Setup-<version>.exe
npm run dist:mac   # macOS disk image → dist/CLApp-<version>.dmg (build on a Mac)
npm run dist:linux # AppImage, handy for a smoke test of the packaged app
```

## Releasing an update

Updates are notify-only (CONTEXT §5): the app checks GitHub's latest release
on launch (when online) and in Pengaturan › Pembaruan, and links the
operator to the release page. Nothing is auto-installed and nothing is
signed. To ship a version:

1. Bump `version` in `package.json` and commit.
2. `npm run dist:win` (and `dist:mac` on a Mac); installers land in `dist/`.
3. Tag `vX.Y.Z`, create a GitHub release with that tag, attach the installers.
4. The app compares the release tag with its own version; a newer one shows a
   toast and a download link. Reinstalling never touches the database
   (`userData`); migrations run on the next launch with a backup first.

Unsigned builds trigger the usual first-run warnings: SmartScreen on Windows
("More info → Run anyway"), and right-click → Open on macOS.

## Known gotchas

### better-sqlite3 ABI dance

better-sqlite3 is a native module. Vitest runs on system Node (ABI 127) but Electron embeds its own Node (ABI 128). The binary can only match one ABI at a time, so npm scripts flip it as needed:

- `predev` / `prebuild` / `posttest` → force-rebuild for Electron (`electron-rebuild -w better-sqlite3 -f`)
- `pretest` → rebuild for system Node (`npm rebuild better-sqlite3`)

If you ever see `NODE_MODULE_VERSION` mismatch errors, run `npm run rebuild:electron` (for dev) or `npm run rebuild:node` (for tests).

### Node 22 for tests (`.nvmrc`)

On Node 24, better-sqlite3 ≤ 12 aborts Vitest workers at teardown (`Assertion failed: (env) != nullptr` in `RemoveEnvironmentCleanupHook`) — a known finalizer-vs-environment race, independent of test content. Run tests on Node 22 (`nvm use` picks it up from `.nvmrc`). The permanent fix is upgrading to better-sqlite3 ≥ 13 (N-API), which is a stack decision.

### `ELECTRON_RUN_AS_NODE` environment variable

If this env var is set (some automated agent shells set it globally), the Electron binary behaves like plain Node and the GUI never launches. `scripts/run-electron.mjs` strips it from the inherited environment before spawning electron-vite — every `dev`/`preview` script goes through it.

## What's done

- Scaffold, Tailwind tokens (HANDOFF §3), Drizzle schema matching ERD.html, append-only migrations 0000–0003
- Migration runner with mandatory backup-before-migrate (per OPERATIONS.md)
- Screens: Beranda (dashboard), Jama'ah, Rekap Absensi (+ Absensi drawer), Musyawarah, Catatan Peristiwa, Serkiler, Laporan Bulanan, Pengaturan
- Beranda: live "Perlu Tindakan" (headless KK, unlocked past months, pending kegiatan) feeds the NavBar brand badge; recent sessions / meetings / events panels
- Past months everywhere (Rekap, Laporan demografi / Lima Bab, Beranda) use the month-end roster via `historyService.rosterForPeriod`; late finalize snapshots it (HANDOFF §8 #10)
- Backup: daily auto-backup (on launch + hourly check), user-chosen folder, retention of automatic copies, "Backup Sekarang", validated restore with pre-restore copy + relaunch (HANDOFF §12.7). Settings live in `userData/settings.json`
- First-run wizard: on an empty database the app opens Persiapan Awal — pick or drop `seed.json`, see every validation issue at once, preview demografi / KK / Dapukan counts, confirm, one-transaction commit (HANDOFF §12.3). Provisional roles + session/activity types from HANDOFF §12.2/§12.5 are seeded alongside (all editable in Pengaturan)
- Packaging via electron-builder (`npm run dist:*`) and a notify-only update check against GitHub releases (Pengaturan › Pembaruan + launch toast)
- Excel exports (Unduh on Laporan Bulanan, Rekap Absensi, Serkiler) built with ExcelJS after the manager's workbook in `clapp-handoff/`; coordinate specs in `src/main/exports/specs/`; `tests/exports/laporanFidelity.spec.ts` diffs the Laporan against the manager's sheets (merges, labels, effective border weights, fonts)
- Service-layer Vitest specs for every HANDOFF §8 auto-trigger + migrations smoke test

## What's next

Remaining per HANDOFF.md §4 / §7 / §10 (the screen order below is historical):


Original build order:

1. **Pengaturan** (master data drives dropdowns elsewhere)
2. Jamaah + Tambah/Edit/Edit-KK modals
3. Absensi → Rekap Absensi
4. Musyawarah
5. Catatan Peristiwa
6. Serkiler
7. Laporan Bulanan
8. Dashboard (composes from above)
9. First-run wizard (seed.json import)

One PR per screen. Each must pair with `*.spec.ts` covering the relevant auto-trigger rules from HANDOFF §8.
