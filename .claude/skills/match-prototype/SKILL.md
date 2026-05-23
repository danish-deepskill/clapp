---
name: match-prototype
description: Use when matching a CLApp screen's visuals to its prototype HTML — for adding a new screen, fixing color drift, debugging "why doesn't this look like the prototype" issues. Greps the prototype CSS, lists token usage per selector, and proposes Tailwind translations. Triggers on phrases like "match prototype", "prototype fidelity", "looks like prototype", "follow prototype", or when the user shares a prototype screenshot asking to compare.
---

# match-prototype

CLApp's visual fidelity comes from translating prototype HTML's CSS into Tailwind utilities + theme tokens. Guessing wastes 3–5 screenshot review cycles per screen. This skill codifies the grep-then-translate workflow that actually works.

## When to use

- Operator asks "match the prototype" / "looks different from prototype" / "what color is X in the prototype"
- Building a NEW screen (run this before writing the layout, not after)
- Fixing a polish issue post-build
- Operator shares a prototype screenshot asking to compare against current rendering

## Workflow

### 1. Identify the screen + selectors in question

Ask which prototype file if unclear. Files live at `clapp-handoff/prototypes/*.html`:
- `Absensi.html`, `Jamaah.html`, `Pengaturan.html`, `Rekap Absensi.html`, `Laporan Bulanan.html`, `Musyawarah.html`, `Catatan Peristiwa.html`, `Serkiler.html`, `Dashboard.html`
- Plus `Komponen.html` (canonical component CSS) and `Arah Visual.html` (token reference)

### 2. Grep the prototype CSS for relevant selectors

```sh
# Per-selector usage
grep -nE "^\s*\.(filt|kk-header|colhead|fbar|sess|month-bar|...)" clapp-handoff/prototypes/<Screen>.html

# Background tokens used
grep -nE "background:\s*var\(--(paper|paper-2|surface|surface-2|chrome)\)" clapp-handoff/prototypes/<Screen>.html

# Border + rule tokens
grep -nE "border.*:\s*1px solid var\(--(rule|rule-strong)" clapp-handoff/prototypes/<Screen>.html

# Specific selector deep-read
grep -nA 5 "^\s*\.kk-header" clapp-handoff/prototypes/<Screen>.html
```

### 3. Build a per-element token map

For each element in the screen, list:
- **Selector** (e.g. `.filt .cell`)
- **Background** (e.g. `surface-2`)
- **Padding** (e.g. `10px 16px`)
- **Border** (e.g. `border-right: 1px solid var(--rule)`)
- **Notable behavior** (e.g. "input is `border: 0; background: transparent` — always borderless")

### 4. Translate to Tailwind utilities

- `surface-2` → `bg-surface-2`
- `padding: 10px 16px` → `px-4 py-2.5`
- `border-right: 1px solid var(--rule)` → `border-r border-rule`
- One-off hex (e.g. `#F1ECDD` for KK header hover) → `hover:bg-[#F1ECDD]` arbitrary value (don't add to Tailwind config unless reused)

### 5. Diff against current code

If a screen exists already, grep its component files for the same selectors / utilities and list discrepancies as a table:

| Element | Prototype | Mine | Fix |
|---|---|---|---|
| FilterBar bg | `surface-2` | `surface` | Change `bg-surface` → `bg-surface-2` |
| Search input | borderless + transparent always | uses `<Input>` with border + focus ring | Skip `<Input>`, render raw input with `focus-visible:!ring-0` |

### 6. Apply + verify

- Apply edits.
- Run `npm run typecheck`.
- Restart dev (`npm run dev`).
- Ask operator for screenshot review against prototype.

## Tokens already known (don't re-discover)

From the Jamaah polish iteration:
- FilterBar bg = `surface-2` (#F9F5EC), NOT `surface`
- KK header bg = `surface-2` (#F9F5EC), NOT `paper-2`. Hover = `#F1ECDD`
- Column header row bg = `paper-2` (#EFE9DC)
- Member rows bg = `surface` (#FCFAF5)
- Title bar bg = `chrome` (#cfc7b4) — Tailwind token
- Search inputs across CLApp = `border: 0; background: transparent` always, including focus (override `focus-visible:!ring-0`)
- Drag handles = persistent, not hover-only

## Anti-patterns to avoid

- **Don't guess colors from HANDOFF §3** — that's the token catalog, not the per-screen usage map. Always grep the prototype.
- **Don't transplant raw hex** when a Tailwind theme token exists. Translate `#F9F5EC` → `bg-surface-2`.
- **Don't promote a one-off hex to a Tailwind token** unless it appears in 3+ places. `#F1ECDD` is the KK header hover only — leave as arbitrary value.
- **Don't add a redundant page header** above the FilterBar — the NavBar tab already names the screen (Pengaturan has one because it's a settings page; most screens don't need it).
- **Don't make drag handles or pencils hover-only** — non-technical operators won't discover them.

## Related project memory

- `feedback-prototype-fidelity` — same lessons, broader context
- `feedback-spec-drifts` — CONTEXT > prototype when they disagree
- `feedback-patterns-applied` — single source of truth for tokens
