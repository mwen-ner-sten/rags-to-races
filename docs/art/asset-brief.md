# Art & asset brief

Status: direction v1, 2026-09-04. Companion to the Harmony Brief.

## The look in one sentence

**Grimy painted objects inside a cold neon instrument panel.** The junk is warm,
rusty, photographic and hand-worn; the interface around it is Midnight Circuit
cyan on deep teal with magenta reserved for alarms. The contrast is the identity:
the player's stuff is dirty, the player's *tools* are clean.

## What already exists (keep it)

| Folder | Count | Size | Style notes |
|---|---|---|---|
| `parts` | 41 | 64×64 | Painted realism, warm metal tones, transparent ground, ~8% padding |
| `addons` | 22 | 64×64 | Same |
| `vehicles` | 11 | 64×64 (+source 1254²) | Three-quarter front view, consistent camera, rust to gloss across tiers |
| `stations`, `crew/specializations`, `equipment/*` | 6 / 8 / 15 | 64×64 | Same object language |
| `crew/roles`, `rivals` | 4 / 4 | 256×256 | Portrait busts, painterly |
| `circuits`, `locations` | 7 / 6 | 512×288 | Aerial painted scenes, 16:9 |

Pipeline: source sheets are generated externally on a transparent grid, then
`scripts/process_asset_sheet.py --input sheet.png --out-dir public/sprites/<folder>
--ids a,b,c --cols N` crops, alpha-normalises, pads and resizes.
`scripts/generate_asset_contact_sheets.py` renders review sheets.

## Style rules for every new object sprite

1. **Camera**: three-quarter view from slightly above, light from upper left.
2. **Ground**: transparent. No drop shadow baked in; the UI supplies the surface.
3. **Palette**: warm. Rust `#8a3b12`, oil-black, brass, worn chrome. Never cyan or
   magenta inside an object sprite; those belong to the interface. A part that is
   "enhanced" gets its glow from a UI frame, not from the pixels.
4. **Wear tells tier**: rusted → dented → clean → polished → artifact. Condition
   is the long progression axis, so the same object must read at five wear levels
   (frames handle this today via `equipment/rarity`; parts should follow).
5. **Silhouette first**: readable at 24px. The contact sheet at 16px is the test.
6. **No text in sprites.**

## Backlog, in the order the resource rail needs it

### P0 — resources (the rail shows these every minute)

| Id | Object | Notes |
|---|---|---|
| `scrap_bucks` | Banded roll of grubby bills with a bolt through it | Currency, 64px |
| `rep` | Trophy-shop plaque, brass, one dent | 64px |
| `lp` | Blueprint tube with a red ribbon | Legacy Points |
| `tp` | Pit-crew headset | Team Points |
| `op` | Ring of keys with a fob | Owner Points |
| `pt` | Chequered flag on a rusted pole | Prestige Tokens |
| `forge_tokens` | Cast iron slug, still warm | |
| `reforge_shards` | Broken cast iron pieces | Not in HUD today; will be |
| `metalScrap` | Bent steel offcuts | Materials, 64px |
| `rubberCompound` | Black rubber block, tread marks | |
| `heatCore` | Glowing exhaust core, dull orange | |
| `circuitFragment` | Snapped PCB, solder points | |
| `carbonDust` | Grey powder in a torn bag | |
| `greaseSludge` | Coffee tin of black grease | |
| `fatigue` | Sweat-stained rag over a wrench | The rail shows fatigue as a resource |
| `parts` | Milk crate of assorted parts | Loose-parts storage |

### P1 — things the player opens (Workshop lines, 39)

One 64px object per line in `src/data/upgrades.ts`, drawn as the *tool* the line
installs (bench, lift, compressor, parts bin, tick accelerator as a stopwatch on
a chain). These become the icons on the timed-project cards in Phase 2.

### P2 — trophies (achievements, 33)

64px trophies, plaques and dashboard stickers. Achievement art may use a *little*
cyan on a sticker; it is the one place the two worlds touch.

### P3 — people

Four rival portraits exist. Crew roster members and any new rivals follow the
256px bust format. Later.

## UI icons are not sprites

Navigation, actions, states (rate up/down, cap, locked, warning) are a **24-glyph
SVG set drawn in code** (`src/components/icons/`), 1.5px stroke on a 20px grid,
`currentColor`, so they tint with the theme. No emoji anywhere in the shell.

Glyphs: junkyard, garage, race, workshop, upgrades, crew, help, log, settings,
dev, rate-up, rate-down, rate-flat, cap, locked, unlocked, warning, danger,
success, info, close, chevron, external, search.

## Format and weight

- Author at 128×128 PNG, ship 64×64 **WebP** (quality 85). Today's 138 PNGs are
  ~14 MB; the WebP set should land under 2 MB.
- Contact and review sheets live in `docs/art/review/`, never in `public/`.
- `src/assets/manifest.ts` keys `kind:id` → path. A missing asset must render a
  visible placeholder glyph in dev, not `null`.

## Generation prompt scaffold

> "Single [object], three-quarter view from slightly above, key light upper left,
> painted realism, worn and greasy, warm rust and oil tones, no text, no
> background, transparent PNG, centred, 128px, consistent with a junkyard racing
> game sprite set."

For condition variants append: "rusted and pitted" / "dented, dull paint" /
"clean, matte" / "polished, subtle reflections" / "pristine, faint heat shimmer".
