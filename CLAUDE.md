@AGENTS.md

# Quality checks

Run before committing:

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm test            # Vitest unit tests
```

# UI / UX design checklist

**Read this before writing or modifying any UI code.** Every single one of these rules exists because we broke it and wasted dev time fixing the regression.

## Breakpoints & responsive layout

- **Mobile breakpoint is `640px`** (`max-width: 640px`). Check every UI change at both ≤640px and ≥641px before reporting done.
- The app uses **two different nav components**: `DesktopSidebar` (fixed left, 200px) and `MobileNav` (fixed bottom, 56px). When you change navigation, you must update BOTH.
- Desktop reserves left space via `.shell-content { margin-left: 200px }`. Mobile reserves bottom space via `.shell-content { padding-bottom: 56px }`. If you change nav dimensions, update these too.
- There is a 3rd nav pattern: `MobileSubNav` used inside panels for sub-tabs. Don't confuse it with `MobileNav`.

## Fixed-position elements (the #1 source of bugs)

When you add or move any `position: fixed` element, you must answer ALL of these:

1. **Does it cover other content?** If it's at `bottom: 0` or `top: 0`, add matching `padding-{top|bottom}` to `.shell-content` (or the outer scroll container). Do NOT add padding to `<main>` alone — footers and other siblings still overlap.
2. **Does it conflict with existing fixed elements?** Check the z-index table below. The desktop sidebar, mobile bottom nav, tutorial overlay, and modals all have reserved ranges.
3. **Does it work on mobile AND desktop?** Fixed bottom elements on desktop usually don't need to exist. Fixed top elements usually need `top` offsets on mobile if the header wraps.
4. **Is the shape of the visual effect matching the shape of the element?** Halos/borders/shadows on circular elements need `rounded-full`, not `rounded`.

### Z-index ranges (reserved)

| Range | Use |
|-------|-----|
| 0–99 | Background decoration (scanlines, grids, ambient effects) |
| 100–199 | DesktopSidebar (100), panel sticky headers |
| 1000 | Mobile bottom nav |
| 1001 | Mobile nav popovers |
| 9996–9999 | Tutorial highlights and halos |
| 10000 | Tutorial cards and goal badges |
| 10001+ | Modals that must appear above tutorials |

When in doubt, search for existing `zIndex` or `z-[...]` usage to find the right layer.

## Tutorial system

- **Tutorial steps are 0-indexed and sequential.** Changing step numbers requires updating:
  - `STEPS` array in `TutorialOverlay.tsx`
  - `isStepConditionMet()` switch cases
  - `advanceTutorial` terminal step in `store.ts` (currently `>= 21`)
  - `HUD.tsx` step-specific conditionals
  - Any `tutorialStep === N` references (grep for them before editing)
- Tutorial goals need:
  - A condition in `isStepConditionMet()` for auto-advancement
  - A goal badge renderer (search for `tutorialStep === N` inside `goalContent`)
  - Matching HUD tracker for long grind steps
- Tutorial halos target elements via `data-tutorial="name"`. If you rename an element or add a fallback, update BOTH the element and the tutorial's target lookup.

## Game terminology — don't conflate these

- **Scrap** = the physical parts/materials you scavenge in the Junkyard (engine, wheel, etc.). Never use "scrap" to mean money.
- **Scrap Bucks** = the currency. Earned from racing (prize money) and from *selling* scavenged scrap/parts. Always write the full phrase in player-facing copy: "Scrap Bucks", not "scrap", not "bucks".
- **Rep** = reputation points earned from races. Unlocks locations, circuits, vehicles.
- **LP / Legacy Points** = prestige currency earned on Scrap Reset.
- **Scrap Reset** = the prestige action (proper noun, capitalized both words).

Player-facing examples:
- ✅ "Earn more **Scrap Bucks** by racing or selling parts."
- ❌ "Earn more scrap by racing." (ambiguous — sounds like parts)
- ✅ "Collect an **engine** and a **wheel**" (scrap = parts)
- ❌ "Lifetime scrap" when you mean "Lifetime Scrap Bucks"

In bonus-description text inside `achievements.ts` / `upgrades.ts`, prefer the full "Scrap Bucks" to keep UI copy precise.

## Theming

- There are **16 theme shells** in `ThemeShell.tsx`, each with inline `<header>/<nav>/<main>/<footer>` styles. Global CSS rules for these elements need `!important` to override the inline styles.
- Never hardcode colors. Use CSS variables: `var(--panel-bg)`, `var(--accent)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--text-white)`, `var(--text-heading)`, `var(--success)`, `var(--danger)`, `var(--panel-border)`, `var(--accent-bg)`, `var(--accent-border)`, `var(--btn-primary-bg)`, `var(--btn-primary-text)`.
- Provide fallback colors for CSS vars on inline styles: `"var(--accent, #c83e0c)"`.

## Before marking any UI task complete

You MUST verify ALL of these:

1. **Mobile test**: Resize to ≤640px. Scroll to the bottom of every modified panel. Are ANY cards, buttons, footers, or content elements hidden behind the bottom nav? (The page must scroll enough that the last element sits above the 56px nav.)
2. **Desktop test**: Resize to ≥641px. Does the 200px sidebar still clear all content?
3. **Tutorial walkthrough**: If tutorial-adjacent, run through the entire tutorial step sequence from 0. No broken halos, no dead ends, no missing targets.
4. **Z-index sanity**: Open the feature while a tutorial is active AND while a modal is open. Does anything layer incorrectly?
5. **Shape matching**: Every `tutorial-pulse`, `box-shadow`, halo, or border matches its target's actual shape (rounded, circular, square).
6. **Existing content**: Grep for any `tutorialStep === N`, step number, or element ID you changed. Update every caller.

## Common mistakes to NOT repeat

These are real mistakes we've made. Don't make them again.

- ❌ Adding fixed bottom/top UI without reserving space in `.shell-content`.
- ❌ Adding `padding-bottom` to `<main>` only — siblings (footer) still overlap.
- ❌ Hardcoding step numbers in multiple files without a central constant.
- ❌ Using `rounded` on halos for circular buttons (should be `rounded-full`).
- ❌ Adding navigation on one of mobile/desktop only.
- ❌ Using `position: fixed` without checking z-index against tutorials and modals.
- ❌ Forgetting to update `partialize` in the Zustand store when adding new state fields.
- ❌ Adding `any` types to silence TypeScript strict warnings.
- ❌ Inventing new CSS color values instead of using theme variables.
- ❌ Assuming `npm test` = 70 tests (we've added tests; check actual count).
- ❌ Positioning an element "above" another by setting `top = anchorRect.top - offset`. That puts the TOP of the element at that position, extending DOWN and overlapping the anchor. Correct: `top = anchorRect.top - elementHeight - offset`.
- ❌ Tutorial card positioning needs to account for fixed bottom nav. If the anchor is IN the nav, the card's top is `anchorRect.top - cardH - 16`, not `anchorRect.top - 16`.

## When adding a new fixed-position element — template

```
1. Grep for other `position: fixed` elements in the relevant range.
2. Pick an explicit z-index using the table above.
3. If it occupies screen edge space, reserve it in `.shell-content` or the
   outermost scroll container — NEVER on a child like `<main>`.
4. Add a media query if it should only exist on mobile or desktop.
5. Test mobile. Test desktop. Test tutorial overlay.
6. Run typecheck + lint + tests.
```
