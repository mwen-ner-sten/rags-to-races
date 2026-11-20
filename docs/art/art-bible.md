# Art bible: Midnight Circuit sprites

The one standard for every image in `public/sprites/`. It replaced the
painted-art brief and the 2026-11 asset audit (both in git history).

## The look in one sentence

**Real things at night, lit like Tron.** Objects and places are grounded:
a pull-start engine, a dirt oval behind a feed store, a junkyard. They are
modelled in Blender at real proportions, given dark, worn, real materials,
and lit by the interface's two colours: a teal rim from back left, a fuchsia
rim from back right, a dim cool key from the front. Each subject gets one or
two neon accents that mean something (a spark-plug lead, heat in a muffler,
a lit sign bar, the light strip on a track wall).

Not wanted:

- Painted, grimy, warm "antique store" art (the old brief).
- Photoreal or AI-generated photos and paintings.
- Pure sci-fi Tron: infinite grid floors, glowing wireframe on every edge,
  abstract shapes that are not a real object.
- Toy-like flat plastic in bright or pastel colours.

## How every sprite is made

Every shipped sprite is produced by a script, so it can be re-rendered and
so new sprites cannot drift from the house look.

1. Model it in a script under `scripts/art/` using `scripts/art/kit.py`
   (materials, lights, cameras, render settings) and, for scenes,
   `scripts/art/props.py` (fences, light poles, sheds, trees, cars).
2. Render: `blender --background --factory-startup --python scripts/art/<script>.py -- <name>`.
   Raw output goes to `.tmp/art/raw/<category>/<name>.png` (git-ignored).
3. Finish: `python scripts/art/finish.py <category>`. This adds the glow pass,
   crops and fits, and writes `public/sprites/<category>/<name>.webp`.
4. Check: `python scripts/art/check_sprites.py` (also run by `npm test` through
   `src/game/__tests__/sprites.test.ts`).
5. Review: `python scripts/art/contact_sheet.py` writes sheets to
   `docs/art/review/`. Look at the sheet at the in-game size, next to its
   neighbours, before shipping.

No hand-painted, photographed or image-generator files. If a script cannot
make it, change the script.

## Rules the kit enforces (don't work around them)

- **Materials** come from `kit.SURFACES` (steel, cast, alloy, chrome, rubber,
  plastic, enamel, oxblood, rust, wood, canvas, glass, dirt, grass, asphalt,
  concrete, foliage, water). They are dark and slightly worn. Paint colour
  variation uses `tint` on `enamel`/`oxblood`; the kit caps brightness.
- **Light colours** come from `kit.LIGHTS`: teal, fuchsia and ice (cool white),
  each with a dim variant. No other emissive colours. No amber, green, red
  or yellow lights.
- **Object camera** (`object_rig`): orthographic, three-quarter view from front
  right and above (`OBJECT_VIEW`), auto-fitted. Every part and vehicle uses it.
  Rally markers use `top_down=True`.
- **Scene camera** (`scene_rig`): perspective drone view at night, faint
  moonlight. Scenes light themselves with practical lights: floodlights
  (`flood`, `light_pole`), lamps (`point`), sign bars, wall light strips.
- **No text, numbers or logos** in any sprite. The UI supplies words.

## Composition rules

Objects (parts, vehicles, rally markers):

- One subject, whole, no ground plane, transparent background.
- Recognisable at 40×40: a clear silhouette and one bright accent.
- Wear tells tier. Scrap and junk parts are rusted, dented, missing pieces.
  Race parts are clean machined alloy with more precise accents. Do not use
  more neon to mean "better"; use better materials and finish.
- Teal is the default accent; fuchsia marks heat, danger, wear or damage.

Scenes (venues, places, organizations, stages):

- Night. Dark ground, a readable subject in the middle (the track, the yard,
  the building), lit by its own lamps.
- The subject must read at the in-game thumbnail size (venues 120×64,
  places 96×64): a bright closed shape (a lit track wall, a fence line, a
  lit doorway) helps.
- No bright sky, no daylight, no sunsets. Horizon can carry a faint teal or
  fuchsia town glow.
- Each venue looks like its description in `src/core/content/events.ts`;
  each place like `src/core/content/places.ts`.

## Sizes

Defined once in `scripts/art/spec.py` and checked by `check_sprites.py`.
Each ships at twice the largest size the game draws it.

| Category | File | Ships at | Shown at |
|---|---|---|---|
| parts | `parts/<part id>.webp` | 288×288, transparent | 40×40 list, 144×144 Notebook |
| vehicles | `vehicles/<vehicle id>.webp` | 360×240, transparent | 120×80 cards, race track marker |
| rally | `rally/<shape>.webp` | 160×120, transparent, top-down | rally stage marker |
| venues | `venues/<venue id>.webp` | 480×256, opaque | 120×64 |
| places | `places/<place id>.webp` | 384×256, opaque | 96×64 |
| organizations | `organizations/<id>.webp` | 880×495, opaque | up to 640 wide |
| stages | `stages/<layout>.webp` | 1152×480, opaque | rally stage, full width |

File names are content ids. `src/game/sprites.ts` maps ids to paths without
lookup tables, so a new part or venue needs only a model and a render.

## Adding art for new content

1. Add a builder function to the right script (`parts_*.py`,
   `render_vehicles.py`, `render_venues.py`, ...) and register it in that
   script's dict under the content id.
2. Render, finish, run the checker, and look at the contact sheet.
3. `npm test` fails if any part, vehicle, place or venue in `src/core/content`
   has no sprite, or if a sprite breaks a check (size, palette, edges).

## Automated checks (`scripts/art/check_sprites.py`)

- Every file under `public/sprites/` belongs to a category in `spec.py` and
  has the category's exact size and alpha mode.
- Palette: opaque pixels that are saturated and bright must sit between teal
  and fuchsia (through blue and violet), or be near-neutral. Anything else (orange, yellow, green,
  red) over 2% of the image fails.
- Darkness: the mean brightness of opaque pixels stays under the limit, so
  nothing reads as a daylight image.
- Edges: object sprites have a transparent border; scenes have no light
  hairline in their outer rows and columns.
