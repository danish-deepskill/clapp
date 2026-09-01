# CLApp — Code Review Handoff

> For a fresh reviewer agent. This briefs you to review the work from one
> build session: **5 new screens/features + 1 cross-cutting refactor**.
> Scope is this session's commits + one uncommitted branch. Throwaway file —
> delete after review.

---

## 0. Orient yourself first (read in this order)

The codebase has pinned specs + an auto-memory that encode non-obvious rules.
**Read these before judging anything** — several "odd" choices are deliberate:

1. `clapp-handoff/CLAUDE.md` — non-negotiable rules (radius ≤3px, Indonesian
   labels, semantic status colors, service-layer pattern, "ask before deciding").
2. `clapp-handoff/CONTEXT.md` — the *why* + deliberately-rejected ideas. Cite
   §-numbers when flagging. Especially §2 (data model), §6 (open client
   questions), §3 (UX).
3. `clapp-handoff/prototypes/ERD.html` — **authoritative schema**. `ERD.md` is
   stale; ignore it.
4. Auto-memory at `C:/Users/DELL/.claude/projects/c--Files-Side-clapp/memory/`
   — start at `MEMORY.md`, then the linked files. Critical for review:
   - `feedback-patterns-applied` — the DRY/SOLID/KISS lines actually drawn
     (e.g. "3 parallel modules > 1 factory if typing fights"; don't
     over-abstract). Use this as the bar, not generic clean-code dogma.
   - `feedback-spec-drifts` — settled prototype-vs-spec conflicts; don't
     re-litigate.
   - `feedback-technical-gotchas` — Radix Select empty-string crash,
     **better-sqlite3 ABI dance**, globals.css focus-ring override, Drizzle
     DBLike, electron Drawer offset.
   - `project-attendance-eligibility`, `project-one-pengajian-per-day`,
     `project-open-questions` (deferred decisions — DO NOT flag these as
     "missing"; they're consciously deferred, see §6 below).

**What CLApp is:** offline single-machine Electron desktop app for an
Indonesian Islamic congregation (SLM Kelompok Cilandak A). Replaces an Excel
workbook. Non-technical rotating operator. Stack: Electron + electron-vite +
React 18 + TS strict + Tailwind 3 + Radix + Drizzle + better-sqlite3 + Vitest.

---

## 1. What to review

**Commit range:** everything on `main` after `1351367` (the last pre-session
merge), **plus** the uncommitted branch `chore/period-dedup`.

```
git log --oneline 1351367..main      # merged work
git diff main...chore/period-dedup   # the pending refactor (currently checked out)
```

Architecture invariants that should hold across ALL of it:
- **Service layer is pure** `(deps, input) => output`; deps carry `db` + optional
  `clock`. Multi-write actions wrapped in `deps.db.transaction`.
- **Renderer never imports from `src/main/`.** Cross-process types live in
  `src/shared/`. IPC envelope is `IpcResult<T>` (`src/shared/ipc.ts`).
- **Handlers are thin** `tryCall` wrappers mapping domain errors → IPC codes.
- **Every HANDOFF §8 auto-trigger has a Vitest test** (non-negotiable).
- **`members.is_active` only flips via a movement/vital insert** (mandatory-
  movement rule) — never a bare toggle.

---

## 2. Features in scope (with the specific things to scrutinize)

### A. Musyawarah (meeting log) — `src/main/services/meetingService.ts`, `src/renderer/screens/Meetings/`, 34 specs
- §8 trigger: saving a meeting of a trigger-eligible type UPSERTs
  `activity_records` (mirror of attendance→activity). **Check:** `Lainnya`
  must NOT trigger; idempotent re-save; `source_meeting_id` set; monthly_report
  auto-created.
- Attendee picker filters to Pengurus (`role_id IS NOT NULL`); retired-role
  members still render as chips but are hidden from the picker
  (`roleIsActive`). **Check** that history isn't lost when a role is retired.
- `meetings` has TWO notes fields (`result_notes` + `suggestions`) per ERD —
  CONTEXT §55 prose says "one combined", ERD wins (settled drift).

### B. Catatan Peristiwa (event-log UNION) — `eventLogService.listByPeriod`, `src/renderer/screens/EventLog/`, 18 specs
- Read-only merged stream over `vital_records` + `member_movements` +
  `member_changes`. **Check:** the same-date tiebreak (vital → movement →
  change), month-boundary (event on last day belongs to that month),
  member-name fallback chain (member.fullName → vital.name → "(tidak
  diketahui)").
- Deliberately NO manual "+ Tambah" (prototype had one) — entries are
  side-effects of member ops. This is intentional (project-open-questions #2).

### C. Mode Setup (`silentLog`) — `memberService` + `src/renderer/screens/Members/`, specs in memberService.spec
- A session-only toggle that makes AddMember/EditMember/RecordMovement skip
  ALL event-log writes (so day-1 bulk data entry doesn't flood Catatan
  Peristiwa). **Check:** state changes (is_active, field updates) STILL apply
  when log is silenced — only the audit write is skipped. 8 specs.

### D. Serkiler (iuran rotation) — `serkilerService.ts`, `src/renderer/screens/Serkiler/`, migration 0003, 12 specs
- Membership = standing `members.is_serkiler` flag (set in Edit Jama'ah), NOT
  per-period rows. Per-period paraf/iuran in `circular_roster`, lazily
  upserted. **Check the history-correct `list`:** roster = active flagged
  members UNION anyone-with-a-row-this-period (so un-flagging keeps past
  periods intact). Print sheet uses Tailwind `print:` utilities.

### E. Laporan Bulanan — split across 2 PRs
- **Service** `reportService.ts` (21 specs): composes Demografi (live count),
  Lima Bab (bucketed %Hadir from attendance), Peristiwa (reuses eventLog),
  Saran (meeting suggestions) + stored fields + child tables. `finalize`
  (§8 #10) snapshots `demographics_snapshot` + caches lima_bab_* columns;
  `unlock` clears them. **Check:** lock guard on save; snapshot freeze
  (post-finalize member changes don't move the numbers); getReport merges ALL
  active activity_types into the Kegiatan checklist.
- **Screen** `src/renderer/screens/MonthlyReport/` (11 sections, read-only vs
  editable, Kunci/Buka Kunci). Excel export deferred to a future PR (Unduh is
  a stub toast).

### F. Historical reconstruction — `historyService.reconstructRosterAsOf`, `src/renderer/screens/Members/{HistoryBar,AsOfRoster}`, 13 specs
- **This is the highest-risk algorithm — review hardest.** Folds the event log
  backward from current `members` to rebuild any past month-end roster.
  Answers "who were the jama'ah 3 months ago." Surfaced via Jama'ah "Riwayat"
  mode (read-only).
- **Scrutinize the fold rules:** arrival-after-D → didn't exist; departure/
  death-after-D → was active; Perubahan Kelas/Dapukan/Menikah-after-D → revert
  to oldValue; events processed most-recent-first so multi-change reverts land
  on the value in effect at D. Verify the 13 specs actually cover: re-entry,
  null-member_id vital, no-arrival-event (seed) members, month boundary.
- **Documented limitations (correct, not bugs):** members added with
  `logAs='none'` have no logged arrival → treated as always-existing;
  household moves aren't event-logged → KK uses current.

### G. ⭐ `chore/period-dedup` (UNCOMMITTED — review most carefully) — `git diff main...chore/period-dedup`
- Extracts `src/shared/period.ts` (`monthRange`, `monthKey`, `assertMonthYear`,
  one `InvalidPeriodError`) replacing 5 per-service copies + 5 distinct
  `Invalid*PeriodError` classes. And `src/renderer/components/PeriodSelect.tsx`
  replacing 6 hand-rolled Bulan/Tahun pairs. Net −233 LoC, 230 tests green.
- **Check:** no behavioral change (handlers still map → `INVALID_INPUT`); the
  half-open `[start, end)` range semantics are identical to the old per-service
  versions; serkiler's `monthKey` (`YYYY-MM`) vs everyone else's `monthRange`
  (date strings) is correct for `circular_roster.period`.

---

## 3. How to verify (gotchas included)

```bash
npm run typecheck         # node + web tsconfig
npm test                  # vitest — pretest rebuilds better-sqlite3 for Node ABI
npx electron-vite build   # production bundle
```

**ABI gotcha (you WILL hit this):** better-sqlite3 has one native binary
matched to either Node (tests) or Electron (app). If tests fail with
`NODE_MODULE_VERSION 12x` mismatch: `npm run rebuild:node`. If it errors EBUSY,
a stale Electron holds the `.node` file — kill it
(`Get-Process electron | Stop-Process -Force`) then rebuild. The `dev`/`build`
scripts auto-rebuild for Electron via predev/prebuild.

Expected: **228 service specs + 2 migration smoke = 230 passing**, typecheck
clean, build clean. (Counts: attendance 47, member 46, masterData 37, meeting
34, report 21, eventLog 18, history 13, serkiler 12.)

Visual/UX was NOT verifiable in the build session (no GUI). If you can run
`npm run dev` (after `rm -f ~/AppData/Roaming/clapp/clapp.sqlite* && npm run
seed:dev`), sanity-check: Laporan lock flow, Jama'ah Riwayat mode, Serkiler
print sheet, the zebra-striped tables.

---

## 4. Deferred / open — do NOT flag these as defects

Tracked in `project-open-questions` memory:
1. **Catatan Peristiwa entry correction/edit** — no edit/delete UI yet
   (deliberate; correction model unresolved pending real operator usage).
2. **Manual "+ Tambah Peristiwa"** — only vital_records would be legitimate;
   deferred.
3. **Historical roster in Rekap + Laporan late-finalize** — the
   `reconstructAsOf` engine (F) now EXISTS but is not yet threaded into
   `attendanceService.loadRecap` or `reportService` demografi. Those still show
   current-state membership for past periods. Intentional next step.
4. **Excel export** for Laporan/Rekap/Serkiler (HANDOFF §7) — not built.
5. **No startup assertion that every preload channel has a registered handler**
   — a real "serkiler:list not registered" bug occurred this session (fixed);
   a guard against that class is noted but not built.

CONTEXT §6 also lists genuine open *client* questions (role list, 192 count,
activity mapping, Lima Bab categories) — not for you to resolve.

---

## 5. Review checklist — answer these

1. **Correctness:** Do the §8 triggers (meeting→activity, attendance→activity,
   report finalize snapshot) each have a test that would fail if the trigger
   broke? Any trigger path untested?
2. **The fold (F):** Find a roster-history edge case the 13 specs miss. Re-entry
   after departure, simultaneous same-date events, role-change-then-departure.
3. **period-dedup (G):** Is `monthRange`/`monthKey` byte-for-byte equivalent to
   each removed per-service version? Any off-by-one at Dec→Jan?
4. **DRY/SOLID/KISS per `feedback-patterns-applied`:** Is anything *over*-
   abstracted now? Anything still duplicated worth extracting (the review
   deliberately skipped: read-only table scaffold in EventTable/RosterTable/
   AsOfRoster, `tryCall` ×8, duplicate `MemberNotFoundError`)? Agree or push back.
5. **Spec adherence:** radius ≤3px, semantic colors not decorative, Indonesian
   user-facing strings, English identifiers, ≤300 LoC files.
6. **Renderer/main boundary:** any `src/main` import leaking into renderer? any
   business logic in handlers?
7. **Error handling at IO boundaries:** loaders wrap IPC in try/catch (a
   rejected IPC must surface a banner, not hang on "Memuat…").

Report findings grouped High / Medium / Low with `file:line` cites. Prefer
concrete repro/repro-test suggestions over opinion. Where you disagree with a
deferral, say so but mark it as such.
