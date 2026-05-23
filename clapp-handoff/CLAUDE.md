# CLAUDE.md — Project Instructions for Claude Code

> Read this first on every task. Read `HANDOFF.md` for the full spec. Read prototypes in `prototypes/` for visual reference.

## What this project is

CLApp is an **offline desktop app for an Indonesian Islamic congregation** (SLM Kelompok Cilandak A). Rotating non-technical operator. Replaces an Excel workbook. Single machine. No login. No telemetry. No cloud auth.

## Stack — locked, do not deviate

Electron · TypeScript strict · Vite · React 18 · Tailwind · Radix primitives · Drizzle ORM · better-sqlite3 · Zustand · React Hook Form + Zod · ExcelJS · lucide-react · Vitest.

See `HANDOFF.md §1` for full table. **Do not add libraries without justification in the PR description.**

## Read these before coding

1. `HANDOFF.md` — the constitution
2. `prototypes/Arah Visual.html` — design tokens
3. `prototypes/Komponen.html` — component contract
4. `prototypes/ERD.html` — data model
5. The specific screen prototype you're building (`prototypes/<Screen>.html`)

## Always do

- **Read the matching prototype before building a screen.** Open it in a browser; replicate layout, density, hierarchy.
- **Read `Komponen.html` before building any reusable component.** Match the spec exactly: button hierarchy, toast variants + tiered durations + dismiss + ARIA, empty states, validation, banners.
- **Translate CSS to Tailwind utilities + theme tokens.** Don't hard-code hex values — use `bg-paper`, `text-ink-900`, `border-rule`, etc.
- **Border radius ≤ 3px everywhere.** Use `rounded-sm` or `rounded` (= 3px in our config). Never `rounded-lg`/`xl`/`2xl`/`full` (except actual circles like badge dots).
- **Plex Sans for text, Plex Mono for numbers/IDs/dates/eyebrow labels.** No Inter, no system fonts.
- **Indonesian labels** for all user-facing strings. English only in code identifiers.
- **Status colors are semantic.** Hadir=green, Alpa=red, Sakit=slate blue, Izin=ochre. Never use them for decoration. Never invent new colors.
- **All `members.is_active` flips go through a `member_movements` insert** in a single transaction (see HANDOFF §8).
- **Every auto-trigger rule** in HANDOFF §8 must have a Vitest test.
- **One canonical formatter** per type: `fmtIDR`, `fmtDateID`, `fmtDay`. Put them in `src/lib/format.ts`. Import everywhere; do not redeclare.

## Never do

- ❌ **Add shadcn/ui.** Use Radix primitives directly + custom Tailwind wrappers.
- ❌ **Copy CSS verbatim from prototypes.** The prototypes use raw hex/px values; the live app uses Tailwind theme tokens. Translate, don't transplant.
- ❌ **Add a router library before there are >1 actual route per screen.** The first version is single-page state navigation.
- ❌ **Add login / authentication / encryption.** Out of scope by design.
- ❌ **Add analytics / Sentry / Posthog / any telemetry.** Out of scope by design.
- ❌ **Re-import seed.json after first commit.** SQLite is source of truth from minute one. Recovery = backup restore, not re-import.
- ❌ **Use ChatGPT-style soft-shadow rounded card aesthetics.** This is utilitarian register design. Sharp corners. Cream paper.
- ❌ **Add emoji to UI chrome.** Only inside seed/operator-typed text.
- ❌ **Inline sample data in screens** the way the prototypes do. All data flows from Drizzle queries / Zustand.
- ❌ **Use `flex` + whitespace instead of `gap`** for spacing siblings. Always `gap`.
- ❌ **Add a CSS file outside `src/styles/`.** Tailwind utilities cover 99% of cases; add to `globals.css` only if absolutely necessary.

## When to ask vs decide

**Decide yourself:**
- Component file naming, internal hooks structure
- Whether to extract a helper function or inline it (judgment call)
- Test naming, test file organization
- Vite plugin choices for trivial needs (e.g. svg imports)
- Tailwind utility ordering

**Ask before deciding:**
- Adding a new library to the stack
- Changing the ERD schema (must update `ERD.html` first)
- Changing an enum value (cascades to validators, dropdowns, seed files)
- Changing the `seed.json` shape (breaks the import contract)
- Changing the design tokens (color, font, radius, density)
- Adding a new screen not in `HANDOFF.md §4`
- Adding a new auto-trigger rule

## Code patterns to follow

- **Service layer is pure**: `(deps, input) => output`. Side effects (DB writes, file writes) happen via `deps` parameter. Makes testing trivial.
- **One screen = one Zustand store** for its local state; cross-screen state is in `src/store/`.
- **IPC handlers in `src/main/handlers/` mirror service-layer function names.** No business logic in handlers — they're thin wrappers.
- **Migrations are append-only.** Never edit an existing migration; add a new one.
- **One PR per screen.** Pair with `*.spec.ts` for service-layer rules.
- **Conventional commits**: `feat(absensi): wire status pill keyboard shortcuts`, `fix(serkiler): paraf count off by one when filter active`.

## File size + structure

- Soft limit: **300 lines per file**. Beyond that, split.
- React component files: one component per file (related sub-components OK if tiny).
- Service files: group by domain (`memberService.ts`, `attendanceService.ts`).
- Avoid `utils.ts` dump files. Specific files per concern: `format.ts`, `dates.ts`, `idr.ts`.

## When stuck

- Re-read `HANDOFF.md` — the spec might already answer it.
- Open the matching prototype HTML in a browser.
- Open `Komponen.html` for the component contract.
- If still ambiguous, **ask** in PR description rather than guess.

## What "done" looks like for a screen

1. Matches the prototype visually (verify side-by-side in browser)
2. All auto-trigger rules from `HANDOFF.md §8` covered with passing Vitest tests
3. Form validation matches `Komponen.html` patterns
4. Toast/empty/banner states use canonical components, not ad-hoc divs
5. Keyboard accessible (focus ring, Esc dismisses dialogs, arrow keys in selects, status pill shortcuts where applicable)
6. Indonesian labels reviewed for natural phrasing — not literal translation
7. No console warnings in dev
8. Conventional commit + brief PR description
