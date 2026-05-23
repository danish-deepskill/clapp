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
npm test           # vitest (rebuilds better-sqlite3 for Node, then restores)
npm run build      # typecheck + production bundle
npm run db:generate # regenerate Drizzle migration after schema.ts edits
```

## Known gotchas

### better-sqlite3 ABI dance

better-sqlite3 is a native module. Vitest runs on system Node (ABI 127) but Electron embeds its own Node (ABI 128). The binary can only match one ABI at a time, so npm scripts flip it as needed:

- `predev` / `prebuild` / `posttest` → force-rebuild for Electron (`electron-rebuild -w better-sqlite3 -f`)
- `pretest` → rebuild for system Node (`npm rebuild better-sqlite3`)

If you ever see `NODE_MODULE_VERSION` mismatch errors, run `npm run rebuild:electron` (for dev) or `npm run rebuild:node` (for tests).

### `ELECTRON_RUN_AS_NODE` environment variable

If this env var is set (some automated agent shells set it globally), the Electron binary behaves like plain Node and the GUI never launches. `scripts/run-electron.mjs` strips it from the inherited environment before spawning electron-vite — every `dev`/`preview` script goes through it.

## What's done

- Project scaffold: configs, TypeScript strict, Tailwind tokens from HANDOFF §3, Drizzle wired against ERD.html
- First migration (`src/main/db/migrations/0000_init.sql`) — all 17 tables, FKs, unique indexes
- Migration runner with mandatory backup-before-migrate (per OPERATIONS.md)
- Main → preload → renderer pipeline boots empty, NavBar functional
- Vitest smoke test: in-memory SQLite + migrations + idempotence

## What's next

Per HANDOFF.md §4, screens are built in this order:

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
