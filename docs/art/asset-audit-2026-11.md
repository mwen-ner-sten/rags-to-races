# Asset audit: what is out of place against Midnight Circuit

Date: 2026-11-18. Companion to `asset-brief.md`. No image was changed for this
audit; it lists what to update next.

> **Direction changed after this audit (same day).** The owner does not want the
> painted look: sprites are to be modelled in Blender in a Tron-like style, highly
> detailed but not photorealistic, lit in the interface's teal and fuchsia. Samples
> are in `samples/midnight-circuit/`. Read this audit as an inventory: its facts
> (families, sizes, white edge strips, unused folders, missing sources) still hold,
> but its verdicts are reversed. The painted and photoreal sets are now the ones to
> replace, the "Rules to add to the brief" section no longer applies, and
> `asset-brief.md` needs rewriting once the sample look is approved.

The interface is now neon teal and fuchsia on near-black (`#05060d`). The brief's
rule still holds: **grimy painted objects inside a cold neon instrument panel.**
Sprites should be warm, rusty and painted, on a transparent ground, with no cyan
or magenta in the pixels.

Method: every folder under `public/sprites/` was viewed on the dark background,
the render scripts in `scripts/` were read for provenance, and alpha, edge
columns and display sizes were measured. Where provenance is inferred from the
pixels, it says "appears to be".

## The short version

There are four visual families in the repo. Only the first matches the brief.

| Family | Folders | Verdict |
|---|---|---|
| Painted warm junk objects | `parts`, `addons`, `vehicles` (11 tier cars), `stations`, `crew`, `rivals`, `equipment` | Canonical. Keep. |
| Cinematic scenes | `circuits` (7 venues), `locations`, `organizations` | Photoreal or storybook, bright, no shared grade. Out of place. |
| Blender toy renders | `garage` (21), `vehicles/roadbook_special`, `rally` (3), `circuits/*-stage` (3) | Clean, pastel, plasticky, teal and cream. Out of place. |
| Outlined cartoon | `vehicles/service_runabout` | One file. Out of place. |

The brief is silent on scenes, on Blender output, on garage views and on
top-down cameras, and its prompt scaffold says "painted realism", which a
Blender script cannot produce on its own. Each new batch chose its own tool and
look.

## Update next, in order of how much it shows in play

### 1. Venue and place scenes

Files: `circuits/{backyard_derby,dirt_track,regional_circuit,national_circuit,continental_grand_prix,endurance_series,world_championship}.webp` and `locations/*.webp`.

- They read as photoreal or cinematic renders, not paintings. This is probably
  the "possibly photorealistic" material. Whether they are photos or generated
  could not be confirmed from the pixels.
- Six of the seven venue scenes have a 1 to 3 px near-white strip baked into the
  left or right edge, a crop artifact. On the old paper theme it was invisible;
  on black it is a white hairline. Worst: `dirt_track`, `regional_circuit`,
  `endurance_series` (left edge), `world_championship` (right edge).
- `continental_grand_prix` is a sunny Mediterranean scene and `endurance_series`
  a cool night scene. They match neither each other nor the warm junkyard set.
- `locations/floodplain` and `locations/quarry_breakers` are 720×480 (3:2) and
  painterly; their six siblings are 512×288 (16:9) and photoreal.
- Shown at 120×64 on the Race tab and 96×64 on Trips. `endurance_series` and
  `world_championship` are not mapped to a venue yet.

Fix: choose one scene style (painted aerial, dusk or overcast, warm-dark) and
redo the set in it. At minimum crop the bad edges and bring the two 3:2 images
to 16:9.

### 2. Garage part renders (Blender)

Files: all 21 in `garage/` (`scripts/render_garage_parts.py`).

- Glossy, flat-shaded toys with pastel colour blocking. No rust, grease or wear,
  so the brief's "wear tells tier" rule is lost.
- `beater_shell`, `frame_tube`, `wheel_river` and the cylinders on
  `engine_turbo4` are saturated teal ("petrol blue enamel" in the script). That
  is the interface accent inside a sprite.
- Three-light rig with a cool fill from the right, not a key from upper left.
- Padding varies a great deal between files.
- These replace the painted sprite for 21 core parts, so the Parts list shows
  both styles side by side in one row (40px; 144px in the Notebook).

Fix: re-render with the rules below, or repaint in the `parts` style. If only
one thing is done, retint the four teal ones.

### 3. Vehicles: two odd ones out, and all of them too small

- `vehicles/roadbook_special.webp` (384×256, Blender): a clean low-poly toy,
  cream with teal trim and an orange "07" decal, which is text in a sprite. It
  has six times the pixel area of its siblings and a different camera angle.
- `vehicles/service_runabout.webp` (192×128): dark comic outline and flat
  shading. The palette is right; the style is not. Provenance unknown.
- The other 11 are 64×64 with the car filling about 58×26 px, but vehicle cards
  draw them at 120×80, so they are upscaled about 2× and look soft.
- `hypercar` and `stock_car` are blue or teal.

Fix: regenerate all vehicles at 256 px wide or more, cropped tight, one camera.
Redo the two odd ones in the painted style, with no decal.

### 4. Rally cars and stage maps (Blender)

Files: `rally/{kart,mower,saloon}.webp`, `circuits/{fast_straight,forest,tight_infield}-stage.webp`.

- The cars are top-down plastic toys (pale teal saloon, coral mower), a camera
  no other asset uses.
- The stage maps are flat pastel olive with light gravel, the brightest images
  in the game, shown at full panel width.

Fix: re-render the stages in a dusk or night grade with darker ground. Top-down
is acceptable for the maps only. Repaint the cars as worn bodywork.

### 5. Team garage scenes

Files: `organizations/{collective,independent}.webp` (880×495).

Warm, sunny storybook paintings with a sunset sky. Right subject, but too bright
and saturated for the panel, and they match no other family. They are the
largest images shown (up to 640px on the Team tab).

Fix: regrade with the other scenes once a scene style is chosen.

### Lower priority: not drawn by the current build

Nothing in `src/` references `addons`, `crew/*`, `rivals`, `stations` or
`equipment/*`. They fit the painted family, so fix them only when they are wired
in. Known nits: `rivals` are 64px cars where the brief describes 256px portrait
busts; several addons and parts carry blue (`addon_nitrous`, `addon_air_filter`,
`addon_tire_warmers`, `addon_weight_reduction`, `engine_v6`, `engine_turbo_v6`,
`exhaust_titanium`); `equipment/affixes/{handling,logistics}` and
`equipment/sets/slipstream` have blue or green accents.

Housekeeping: `vehicles/source` is not tracked, and the Blender batches, rally
stages and organization scenes have no originals under `docs/art/source/`.

## Rules to add to the brief

1. One look for every sprite: painted, warm, worn, rust and oil. If a tool
   cannot produce that, its output is a base for a paint pass, not a final.
2. Scenes are in scope. Dusk or overcast, warm-dark, no sky brighter than the
   interface text, no baked borders, no text, one aspect ratio (16:9) per set.
3. Check every opaque image's first and last four rows and columns for light
   strips before it ships.
4. No cyan, teal or magenta materials. A script should reject any sprite with
   more than about 3% of its opaque pixels in those hue bands.
5. Blender materials: oxidised enamel, painted steel, brass, worn chrome, each
   with a rust and grease layer. No saturated primaries.
6. Blender lighting: one warm key from upper left, one weak fill of the same
   colour, neutral dark world. No coloured fill.
7. Blender camera: one orthographic rig for all objects, three-quarter from
   above. Top-down only for maps.
8. Blender output: transparent film, fixed padding, no decals or text.
9. Author at twice the largest display size. Vehicles are shown at 120×80, so
   ship at least 240×160.
10. Keep the original of every shipped image under `docs/art/source/`.

## Not verified

- Whether the venue and place scenes are photos, generated images or a mix.
- Where `service_runabout` came from.
- How the unused folders will read in place, since nothing draws them yet.
