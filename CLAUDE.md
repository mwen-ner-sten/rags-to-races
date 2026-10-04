@AGENTS.md

# Quality checks

Run before committing:

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm test            # Vitest unit tests (src/core)
npm run sim         # Pacing simulator: npm run sim -- mixed 30 sprint 3
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
- One look per era via `data-era` on `.game`: `curb` (backyard notebook) and `shop` (race shop in the team's colours, `--team-a`/`--team-b`). All colours are tokens in `src/app/globals.css`, with dark mode under `prefers-color-scheme`. Never hardcode a colour in a component.
- Fonts load once in `src/app/layout.tsx` (`--font-kalam`, `--font-barlow`, `--font-plex-sans`, `--font-plex-mono`).
- Era 1 reveals one system at a time (`src/core/reveal.ts`). Never show crew, disciplines, hardships or other Team-era systems before the player founds a team.
- Z-index: sticky header 100, tabs 99, toast 10001. Dialogs use native `<dialog>.showModal()`.
- Every disabled action shows why (`jobBlocker`, `canOpenPlace`, `counterBlocker` return the reason text).
- Never put a paywall, ad or premium hook in the game. It's free and open source.

## Common mistakes to NOT repeat

- ❌ Mutating `state` outside `apply()`: the store would miss the change.
- ❌ Adding a bonus that bypasses `channels.ts`, or a source that feeds many channels.
- ❌ Shortening Era 1 for convenience: the owner wants it slow and hands-on. Make waiting meaningful instead.
- ❌ Adding `any` types to silence TypeScript.
- ❌ Changing content numbers without re-running `npm run sim`.
