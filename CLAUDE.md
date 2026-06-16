# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Next.js 13)
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (type-check only)
```

There are no tests in this project.

## Architecture

This is a Next.js 13 App Router PWA for tracking Quran reading/memorization (French UI). All data is stored in `localStorage` — there is no backend or auth (Supabase is wired up in `lib/supabase/` but not actively used; `FEATURES.AUTH_ENABLED = false`).

**The two modes** (`lecture` / `memorisation`) are the primary axis of all data. Every section, revision log, and progress record is scoped to a `modeKey`. The active mode is persisted in `useModeStore`.

**Quran hierarchy** (defined in `data/quran/`): Juz (30) → Hizb (60) → Rub (240) → Sourate (114). Section IDs are prefixed: `juz-1`, `hizb-2`, `rub-3`, `surah-4`. Each hizb has exactly 4 rubs (`hizb.childrenIds = ['rub-1'..'rub-4']` etc.). The hierarchy is static data — never stored in state.

**Tracking flow:**
1. User selects sections in `/config` (grouped) or `/config-individuel` (per-section).
2. `useTrackerStore.selectSections()` auto-expands every selected hizb to also track its 4 rubs, then persists via `LocalTrackerProvider`.
3. `loadData()` runs an auto-migration on startup: any tracked hizb that lacks rub entries in `qt:sections` gets them added automatically (wrapped in try/catch so it can never crash).
4. On the home page, `getSectionsWithStatus()` computes each section's `SectionStatus` (`today` / `done` / `upcoming` / `overdue` / `new`) using `lib/tracker/status-engine.ts` and next-revision dates from `lib/tracker/cycle-engine.ts`.
5. `markAsRevised()` uses cascade logic: marking a juz marks all its hizbs+rubs; marking a hizb marks its 4 rubs; marking all rubs of a hizb auto-marks the hizb; marking all hizbs of a juz auto-marks the juz. `undoRevision()` cascades in reverse.

**State layer** (`store/`):
- `useTrackerStore` — sections, revisions, daily progress; backed by Zustand `persist` to `localStorage` key `qt:tracker-store` (partializes: sections, revisions, dailyProgress only — `todayRevisionIds: Set<string>` is NOT persisted, rebuilt by `loadData`).
- `useSettingsStore` — `TrackerSettings` (tracking level, cycle days, mode); key `qt:settings-store`.
- `useModeStore` — active mode + color theming; key `qt:mode-store`.

`LocalTrackerProvider` (`lib/providers/LocalTrackerProvider.ts`) is the raw localStorage CRUD layer (key `qt:sections`). `localSaveSections()` does an upsert (not overwrite). Always call through the Zustand store — don't bypass it.

**Dual storage**: `qt:sections` (LocalTrackerProvider) and `qt:tracker-store` (Zustand persist) both store sections. `loadData()` always reads from `qt:sections` as the source of truth and overwrites Zustand state.

**Cycle engine** (`lib/tracker/cycle-engine.ts`): `computeNextRevisionDate` adjusts cycle length by difficulty (`difficile` → ×0.5, `moyen` → ×0.75) and `internalCycleMultiplier`. `computeCycleStats` drives the header progress display.

**Status filter on home page**: The `'today'` filter covers both `today` AND `overdue` statuses (overdue = must read now to stay on track). There is no separate overdue chip. The helper `statusMatches()` in `app/page.tsx` centralises this logic.

**App layout**: `AppShell` wraps every page with `TopModeBar` (mode switcher) + `BottomNav` (Groupe / Individuel / Stats). Max-width is 420px — mobile-first.

**UI components**: shadcn/ui in `src/components/ui/` (generated, don't hand-edit). Domain components are in `src/components/tracker/` and `src/components/layout/`. Use `lucide-react` for icons; do not add other icon libraries.

**Difficulty & cycle multiplier**: Both are set on individual sections (hizb-level in practice). Difficulty buttons F/M/D appear inline on `HizbCard` and on hizb rows inside `JuzCard`. The `internalCycleMultiplier` shows as a `×N` badge on the card when > 1. Both are also editable on the detail page (`app/detail/[type]/[id]/page.tsx`).

**Rub progress display**: `HizbCard` and hizb rows in `JuzCard` show a `doneRubs/4` counter (0/4 → 4/4) with 4 fill segments. Individual `RubRow` components show a dot indicator (not a fraction label) plus page number — no transliteration text.

**Feature flags** (`src/config/features.ts`): `LOCAL_USER_ID = 'local-user'` is the hardcoded user ID used everywhere while auth is off.

**Routing**: App Router pages are in `app/` (at the root). Detail pages use `app/detail/[type]/[id]/page.tsx`. All pages are `'use client'` since the app is state-driven. Pages import from `src/` via the `@/` alias (e.g. `@/store/useTrackerStore`).

## Project structure

```
app/          ← Next.js App Router pages (routing only, stays at root)
src/
  components/ ← layout/ and tracker/ domain components + ui/ (shadcn)
  config/     ← feature flags (features.ts)
  data/       ← static Quran structure (juz, hizb, rub, surahs)
  hooks/      ← React hooks (use-toast)
  lib/        ← business logic: tracker/, utils/, providers/, supabase/
  store/      ← Zustand stores (useModeStore, useSettingsStore, useTrackerStore)
  types/      ← TypeScript types (tracker, quran, modes, database)
public/       ← static assets + manifest.json
```

The `@/` alias (tsconfig `paths`) resolves to `src/`, so `@/store/foo` → `src/store/foo`.
