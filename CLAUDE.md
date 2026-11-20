@AGENTS.md

# Quality checks

Run before committing:

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm test            # Vitest unit tests (src/core)
npm run sim         # Pacing simulator: npm run sim -- mixed 30 sprint 3
npx tsx scripts/pacing-check.ts 8   # Pacing goals, PASS/FAIL (run after any content number change)
npx tsx scripts/balance-report.ts   # Win odds of reference builds at every event (dirt | drag)
npm run test:e2e    # Playwright smoke tests
```

# Architecture (the rebuild, 2026-10)

The pre-rebuild game is archived at the git tag `archive/pre-rebuild`. Design source of truth: `docs/design/era-1-and-team.md`.

- `src/core/` is a headless engine with no React. The UI and the simulator change state only through `apply(state, action)` in `src/core/actions.ts`, which clones the state and returns a new one.
  - **Scopes decide what a reset keeps** (`src/core/types.ts`): `meta` (forever), `scrap` (Scrap layer), `team`, `era` (current team), `run` (the Season) and `config` (choices made at reset). Never add a hand-written "keep list". Put the field in the right scope.
  - **Resets are data.** `src/core/layers.ts` defines a `LayerDef` per layer and one `performReset()`. A new layer is a new entry.
  - **One time path.** `advance()` in `src/core/jobs.ts` runs live ticks, offline catch-up and the simulator. Don't add a second settlement path.
  - **Bonuses go through channels** (`src/core/channels.ts`). A test enforces at most 3 sources per channel and at most 2 channels per source. Car performance never takes a global percentage; it comes from the car itself.
  - **Rule changes are flags** (`src/core/rules.ts`, `resolveFlags`). Hardships, perks and disciplines are content (`src/core/content/`), not `if` branches scattered through the engine.
  - **Parts are authored, never random.** Alternatives within a tier trade one stat for another, and each venue weights the stats differently (`VenueDef.demand`). `depth.test.ts` checks that every alternative is the better pick at some venue: add a row when you add a part.
  - **Races come in two formats** (`DisciplineDef.format`): an oval field (`rollOval`) or a Drag elimination bracket (`rollBracket`). A discipline's rules, second-call effects (`CALL2`) and rival styles (`RivalDef`) are data in `content/events.ts`.
  - **Tell the player what happened** through `pushFeed()` (`src/core/feed.ts`). Give repeats a `key` so they fold into one line. `run.notices` is only for things that need attention.
  - **New state fields** must be added to the zod schema in `src/game/save.ts` (it strips unknown keys) and defaulted in `upgradeSave` so older saves load.
- `src/game/` is the UI: a Zustand store (`store.ts`: save/load, 500 ms tick, offline catch-up capped at 48 h, race replays) plus panels in `components/`.
- `scripts/sim-core.ts` is the pacing bot (`src/core/sim/bot.ts`). Re-run it after changing any number in `src/core/content/`. Targets: Season 1 takes 7–10 days at 4×15 min visits a day, and a push player founds a team in about 3–5 weeks.

# Game terminology: don't conflate these

- **Scrap** means the physical parts you find (engine, wheel, etc.). Never use "scrap" to mean money. (The **Scrap** condition is the lowest part condition.)
- **Scrap Bucks** is the currency. Always write the full phrase in player-facing copy.
- **Rep** is local standing, earned from races and spent to open places and the Dirt Track.
- **Season** is one run. **Scrap Reset** ends a Season (proper noun, both words capitalised). **LP / Legacy Points** are earned by it.
- **Team Reset** / **Founding** is the second layer. **TP / Team Points** are earned by it.
- **Know-how** tiers are Learning, Familiar and Second Nature. **Habits** are automation earned by repetition.

# UI rules

- Mobile breakpoint is `640px`, and the two-column layout collapses at `960px`. Check both sides of each.
- One look, "Midnight Circuit": neon on near-black, dark only (no light mode). `data-era` on `.game` tunes it: `curb` is teal (`--accent`) with fuchsia (`--accent-2`) for emphasis; `shop` swaps both for the team's colours (`--team-a`/`--team-b`, lifted to a readable lightness). All colours are tokens at the top of `src/app/globals.css`. Never hardcode a colour in a component, and write `var(--accent)`, never a literal teal, so the Team era can recolour it.
- Token names still come from the old notebook theme (`--paper`, `--ink`, `--card`, `--tape`, `--highlight`, `--font-hand`); the comment above the token block maps each to its role. Fuchsia is for emphasis (the player's own car, selected, guide notes), never for errors: `--ok`/`--warn`/`--bad` stay semantic.
- Fonts load once in `src/app/layout.tsx` (`--font-orbitron`, `--font-rajdhani`, `--font-plex-mono`). Use `--font-display` (Orbitron: headings and small caps labels, 0.55–1.15rem, uppercase, letter-spaced), the body default (Rajdhani) for reading text, and `--font-num` for numbers.
- Sprites sit in a dark well (`--well`); never filter or hue-shift an image. **Before adding or changing any image, read `docs/art/art-bible.md`.** Every sprite is modelled by a Blender script in `scripts/art/` on the shared kit (`kit.py`): real objects and places at night, dark worn materials, teal and fuchsia rim light, one or two meaningful neon accents. No painted, photographed or image-generator art. File name = content id (`src/game/sprites.ts` has no lookup tables). `npm test` fails if content lacks a sprite, a file is unused or a size is wrong; `python scripts/art/check_sprites.py` (run in CI) checks palette, darkness and edges; review `python scripts/art/contact_sheet.py` sheets before shipping.
- Era 1 reveals one system at a time (`src/core/reveal.ts`). Never show crew, disciplines, hardships or other Team-era systems before the player founds a team.
- Navigation is `TabNav.tsx`. With a mouse it's a top tab bar that shows edge fades and chevrons when it overflows. Under `(max-width: 640px), (hover: none) and (pointer: coarse)` it becomes a fixed bottom bar (first four tabs plus a More sheet) so it stays in thumb reach: never put navigation at the top on touch layouts. `.game` reserves the bar's height; toasts are lifted above it.
- The **Notebook** tab holds records only (Journal, Codex, Rivals, Hall of Fame, Seasons, Timecards). Anything the player learns, buys or works on goes in the **Workshop** tab as a sub-tab (`workshopSections()` in `WorkshopPanel.tsx`).
- Z-index: sticky header 100, top tabs 99, bottom tab bar 1000, More sheet 1001, toast 10001. Dialogs use native `<dialog>.showModal()`.
- Every disabled action shows why (`jobBlocker`, `canOpenPlace`, `counterBlocker` return the reason text).
- Never put a paywall, ad or premium hook in the game. It's free and open source.

## Common mistakes to NOT repeat

- ❌ Mutating `state` outside `apply()`: the store would miss the change.
- ❌ Adding a bonus that bypasses `channels.ts`, or a source that feeds many channels.
- ❌ Shortening Era 1 for convenience: the owner wants it slow and hands-on. Make waiting meaningful instead.
- ❌ Adding `any` types to silence TypeScript.
- ❌ Changing content numbers without re-running `npm run sim` and `scripts/pacing-check.ts`.
- ❌ Adding a repeatable income source without a brake. Dealer saturation and the shrinking purse (`purseFactor`) exist because unattended loops printed money.
- ❌ Random stats on parts or crew. Variety comes from authored content.
