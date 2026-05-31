# Generated Vehicle Sprites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate production-quality raster vehicle sprites and wire them into the race track and Dev sprite viewer with full T0-T10 coverage.

**Architecture:** The final runtime assets live in `public/sprites/vehicles/` and are referenced by root-relative public paths. A focused manifest maps vehicle IDs to sprite metadata. `VehicleSprite` renders bitmap previews for UI surfaces, while `RaceTrackSVG` renders SVG `<image>` nodes so existing path-following, rotation, opacity, glow, and shake behavior remain intact.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SVG `<image>`, public static PNG assets, built-in image generation, local image normalization.

---

## File Structure

- Create `public/sprites/vehicles/source/`: review-only generated source concepts and contact sheets.
- Create `public/sprites/vehicles/*.png`: final transparent game-ready runtime sprites.
- Create `public/sprites/vehicles/contact-sheet.png`: generated QA sheet for the final assets.
- Create `src/components/RaceTrack/vehicleSpriteManifest.ts`: presentation manifest for runtime sprite paths, sizes, anchors, and labels.
- Modify `src/components/RaceTrack/VehicleSprite.tsx`: render bitmap sprites in HTML UI contexts, with a high-contrast missing-asset fallback.
- Modify `src/components/RaceTrack/RaceTrackSVG.tsx`: render manifest sprites as SVG `<image>` nodes at track scale.
- Modify `src/components/Admin/AdminPanel.tsx`: keep the Dev Vehicle Sprites panel as the QA surface and update copy/revision to reflect generated bitmap assets.
- Create `src/components/RaceTrack/__tests__/vehicleSpriteManifest.test.ts`: verify every `VEHICLE_DEFINITIONS` entry has sprite metadata and expected paths.
- Modify `vitest.config.ts`: exclude local scratch/worktree folders from test discovery so `npm run test` verifies only this checkout.

## Task 0: Keep Local Scratch Folders Out Of Test Discovery

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Update Vitest config**

Replace `vitest.config.ts` with:

```ts
import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, ".claude/**", ".superpowers/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Run baseline tests**

Run:

```powershell
npm run test
```

Expected: PASS for tests in the current checkout. Tests under untracked `.claude/` and `.superpowers/` are not discovered.

## Task 1: Generate And Normalize Vehicle Assets

**Files:**
- Create: `public/sprites/vehicles/source/vehicle-concept-sheet.png`
- Create: `public/sprites/vehicles/source/vehicle-sprite-source.png`
- Create: `public/sprites/vehicles/push_mower.png`
- Create: `public/sprites/vehicles/riding_mower.png`
- Create: `public/sprites/vehicles/go_kart.png`
- Create: `public/sprites/vehicles/beater_car.png`
- Create: `public/sprites/vehicles/street_racer.png`
- Create: `public/sprites/vehicles/rally_car.png`
- Create: `public/sprites/vehicles/stock_car.png`
- Create: `public/sprites/vehicles/prototype_racer.png`
- Create: `public/sprites/vehicles/supercar.png`
- Create: `public/sprites/vehicles/hypercar.png`
- Create: `public/sprites/vehicles/prototype_x.png`
- Create: `public/sprites/vehicles/contact-sheet.png`

- [ ] **Step 1: Generate source concept art**

Use the built-in image generation tool with this prompt:

```text
Use case: stylized-concept
Asset type: production source art for browser game vehicle sprites
Primary request: Create a cohesive lineup of 11 top-down racing vehicle concepts for an incremental game called Rags to Races, progressing from junkyard scrap machines to exotic late-game race cars.
Subject: 11 separate vehicles arranged in a clean 4-column contact sheet, each vehicle fully visible, top-down or slightly top-down orthographic, facing right.
Style/medium: polished game asset concept art that can be normalized into crisp pixel-art sprites; high personality, readable silhouettes, not placeholder blocks.
Vehicle ladder:
1 push mower - crude backyard machine, exposed blade deck, handle, salvaged motor
2 riding mower - improvised lawn tractor racer, chunky seat, small engine, mismatched wheels
3 go-kart - welded scrap kart, exposed frame, roll hoop, tiny aggressive stance
4 beater car - dented junkyard sedan, rust, taped panels, mismatched doors
5 street racer - upgraded rough tuner car, spoiler lip, performance hood, street livery
6 rally car - wide stance, rally lamps, mud flaps, roof scoop, rough dirt-race energy
7 stock car - oval racer, number mark, big flat sides, long low body
8 prototype racer - open-cockpit race prototype, rear wing, sharp aero, lightweight body
9 supercar - sleek mid-engine exotic, sculpted body, dramatic vents
10 hypercar - advanced exotic, aggressive aero, glowing accents, carbon-like panels
11 prototype racer X - impossible scrap-built ultimate racer, extreme aero, twin fins, futuristic materials, unmistakably beyond the hypercar
Composition/framing: each vehicle isolated with generous padding inside its own invisible slot; no overlap; no labels; no scenery.
Lighting/mood: consistent soft studio lighting from upper left, readable shadows only inside the vehicle forms.
Color palette: varied production game colors with some shared junkyard-to-racing progression; avoid neon green because a chroma key pass may use green.
Constraints: perfectly flat solid #00ff00 chroma-key background only; no ground plane, no cast shadow, no text, no watermark, no UI, no logos, no driver, no scenery, no poster composition.
Avoid: generic toy cars, rectangular placeholder cars, side-view cars, front-facing cars, realistic photos, extra vehicles, labels, decals containing readable text.
```

Expected: one generated source image with all 11 vehicles clearly visible and no labels.

- [ ] **Step 2: Save source art into the workspace**

Copy the selected generated image from the built-in image generation output location into:

```powershell
New-Item -ItemType Directory -Force public\sprites\vehicles\source | Out-Null
Copy-Item "<generated-image-path>" public\sprites\vehicles\source\vehicle-concept-sheet.png
```

Expected: `public/sprites/vehicles/source/vehicle-concept-sheet.png` exists.

- [ ] **Step 3: Normalize final sprite PNGs**

Create a local normalization script or one-off Node/Python image processing pass that:

1. Removes the flat #00ff00 chroma key to alpha.
2. Crops each approved vehicle from the source image.
3. Fits each crop into a transparent 64 by 64 canvas.
4. Keeps the visual center anchored around 32,32.
5. Writes the eleven final PNG files listed above.
6. Writes `public/sprites/vehicles/contact-sheet.png` showing the final assets at 64px, 32px, 24px, and 16px.

The normalization logic must not leave green background corners in final files.

Expected: all eleven final PNGs have alpha channels and transparent corners.

- [ ] **Step 4: Inspect generated assets**

Use local image inspection on `public/sprites/vehicles/contact-sheet.png`.

Expected:
- all eleven vehicles are present
- all face right
- T9 and T10 are visually distinct from T8
- assets are not generic block placeholders
- 24px previews remain legible enough for the track, with 16px included as the lower-bound reality check

## Task 2: Add Sprite Manifest Coverage Test

**Files:**
- Create: `src/components/RaceTrack/__tests__/vehicleSpriteManifest.test.ts`
- Create: `src/components/RaceTrack/vehicleSpriteManifest.ts`

- [ ] **Step 1: Create the failing manifest test**

Create `src/components/RaceTrack/__tests__/vehicleSpriteManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { VEHICLE_SPRITE_MANIFEST, getVehicleSpriteAsset } from "../vehicleSpriteManifest";

describe("vehicle sprite manifest", () => {
  it("has bitmap sprite metadata for every vehicle definition", () => {
    for (const vehicle of VEHICLE_DEFINITIONS) {
      const sprite = getVehicleSpriteAsset(vehicle.id);

      expect(sprite, vehicle.id).toBeDefined();
      expect(sprite?.src).toBe(`/sprites/vehicles/${vehicle.id}.png`);
      expect(sprite?.width).toBe(64);
      expect(sprite?.height).toBe(64);
      expect(sprite?.anchor).toEqual({ x: 32, y: 32 });
    }
  });

  it("does not contain manifest entries for unknown vehicles", () => {
    expect(getVehicleSpriteAsset("missing_vehicle")).toBeUndefined();
  });

  it("keeps manifest order aligned to progression tiers", () => {
    const manifestIds = Object.keys(VEHICLE_SPRITE_MANIFEST);
    const definitionIds = VEHICLE_DEFINITIONS.map((vehicle) => vehicle.id);

    expect(manifestIds).toEqual(definitionIds);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npx vitest run src/components/RaceTrack/__tests__/vehicleSpriteManifest.test.ts
```

Expected: FAIL because `vehicleSpriteManifest.ts` does not exist.

- [ ] **Step 3: Add manifest implementation**

Create `src/components/RaceTrack/vehicleSpriteManifest.ts`:

```ts
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";

export interface VehicleSpriteAsset {
  id: string;
  name: string;
  tier: number;
  src: string;
  width: number;
  height: number;
  anchor: {
    x: number;
    y: number;
  };
}

export const VEHICLE_SPRITE_SIZE = 64;
export const VEHICLE_TRACK_SPRITE_SIZE = 24;

export const VEHICLE_SPRITE_MANIFEST: Record<string, VehicleSpriteAsset> =
  Object.fromEntries(
    VEHICLE_DEFINITIONS.map((vehicle) => [
      vehicle.id,
      {
        id: vehicle.id,
        name: vehicle.name,
        tier: vehicle.tier,
        src: `/sprites/vehicles/${vehicle.id}.png`,
        width: VEHICLE_SPRITE_SIZE,
        height: VEHICLE_SPRITE_SIZE,
        anchor: { x: VEHICLE_SPRITE_SIZE / 2, y: VEHICLE_SPRITE_SIZE / 2 },
      },
    ]),
  );

export function getVehicleSpriteAsset(
  vehicleId: string | undefined,
): VehicleSpriteAsset | undefined {
  if (!vehicleId) return undefined;
  return VEHICLE_SPRITE_MANIFEST[vehicleId];
}
```

- [ ] **Step 4: Run focused test and verify it passes**

Run:

```powershell
npx vitest run src/components/RaceTrack/__tests__/vehicleSpriteManifest.test.ts
```

Expected: PASS.

## Task 3: Render Bitmap Sprites In UI Preview

**Files:**
- Modify: `src/components/RaceTrack/VehicleSprite.tsx`
- Modify: `src/components/Admin/AdminPanel.tsx`

- [ ] **Step 1: Replace `VehicleSprite.tsx` with bitmap renderer plus fallback**

Implement `VehicleSprite.tsx` as:

```tsx
import { getVehicleSpriteAsset } from "./vehicleSpriteManifest";

/** Shown in Dev -> Vehicle Sprites so you can confirm the running bundle has new art. */
export const VEHICLE_SPRITE_ART_REVISION = 4;

interface VehicleSpriteProps {
  vehicleId: string;
  size?: number;
  color?: string;
  className?: string;
}

function MissingVehicleSprite({
  size,
  color,
  className,
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", shapeRendering: "crispEdges" }}
      aria-label="Missing vehicle sprite"
    >
      <rect x={4} y={4} width={56} height={56} fill="rgba(0,0,0,.65)" />
      <path d="M16 20h32v24H16z" fill={color} opacity={0.35} />
      <path d="M20 20l24 24M44 20 20 44" stroke="#ff4d4d" strokeWidth={5} />
    </svg>
  );
}

export default function VehicleSprite({
  vehicleId,
  size = 64,
  color = "var(--accent)",
  className,
}: VehicleSpriteProps) {
  const sprite = getVehicleSpriteAsset(vehicleId);

  if (!sprite) {
    return <MissingVehicleSprite size={size} color={color} className={className} />;
  }

  return (
    // Plain img is intentional here: these are tiny pixel-art runtime assets
    // from /public, and SVG track rendering also consumes the same root path.
    <img
      src={sprite.src}
      alt={`${sprite.name} sprite`}
      width={size}
      height={size}
      className={className}
      style={{
        display: "block",
        imageRendering: "pixelated",
        width: size,
        height: size,
      }}
    />
  );
}
```

- [ ] **Step 2: Update Dev panel explanatory copy**

In `src/components/Admin/AdminPanel.tsx`, change the Vehicle Sprites copy to:

```tsx
Generated bitmap assets (transparent PNGs, pixelated display). Hard-refresh if this number does not match your deploy.
```

Expected: Admin panel still maps `VEHICLE_DEFINITIONS` and renders `VehicleSprite` at large and small preview sizes.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

## Task 4: Render Bitmap Sprites On The Race Track

**Files:**
- Modify: `src/components/RaceTrack/RaceTrackSVG.tsx`

- [ ] **Step 1: Update imports**

Replace:

```ts
import { sprites } from "@/components/RaceTrack/VehicleSprite";
```

with:

```ts
import {
  getVehicleSpriteAsset,
  VEHICLE_TRACK_SPRITE_SIZE,
} from "@/components/RaceTrack/vehicleSpriteManifest";
```

- [ ] **Step 2: Replace sprite constants**

Replace:

```ts
const SPRITE_SIZE = 16;
const SPRITE_HALF = SPRITE_SIZE / 2;
```

with:

```ts
const SPRITE_SIZE = VEHICLE_TRACK_SPRITE_SIZE;
const SPRITE_HALF = SPRITE_SIZE / 2;
```

- [ ] **Step 3: Replace renderer lookup and SVG rendering**

Inside the racer map, replace:

```tsx
const renderer = vId ? sprites[vId] : undefined;
```

with:

```tsx
const sprite = getVehicleSpriteAsset(vId);
```

Then replace the `renderer ? (...) : (...)` block with:

```tsx
{sprite ? (
  <image
    href={sprite.src}
    x={-SPRITE_HALF}
    y={-SPRITE_HALF}
    width={SPRITE_SIZE}
    height={SPRITE_SIZE}
    preserveAspectRatio="xMidYMid meet"
    style={{ imageRendering: "pixelated" }}
  />
) : (
  <polygon
    points={isPlayer ? "-7,-5 8,0 -7,5" : "-5,-3.5 6,0 -5,3.5"}
    fill={color}
  />
)}
```

- [ ] **Step 4: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

## Task 5: Verify And Commit

**Files:**
- Verify all modified files and generated assets.

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
npm run typecheck
npm run lint
npm run build
npm run test
```

Expected: all commands pass.

- [ ] **Step 2: Browser-check Dev sprite panel**

Open the app in a browser, navigate to Dev, and inspect Vehicle Sprites.

Expected:
- all 11 vehicles render from bitmap assets
- large previews show transparent backgrounds
- small previews remain recognizable
- T9 and T10 are not placeholders

- [ ] **Step 3: Browser-check race track**

Use the Dev panel or existing game flow to unlock/build/run a race, then inspect the Race tab.

Expected:
- bitmap vehicles follow the track path
- rotation still matches the path tangent
- player glow remains visible
- mechanical-event opacity and shake still work
- opponent opacity scaling remains intact

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add public/sprites/vehicles src/components/RaceTrack src/components/Admin/AdminPanel.tsx docs/superpowers/plans/2026-05-31-generated-vehicle-sprites.md
git commit -m "Add generated bitmap vehicle sprites"
```

Expected: one implementation commit containing assets, manifest, renderer changes, tests, and the plan.

## Self-Review

- Spec coverage: The plan covers generated source art, normalized final PNGs, manifest metadata, Dev QA previews, Race track rendering, T9/T10 coverage, and automated/browser verification.
- Placeholder scan: The plan rejects placeholder art and does not accept block sprites as final output.
- Type consistency: `VehicleSpriteAsset`, `VEHICLE_SPRITE_MANIFEST`, `getVehicleSpriteAsset`, `VEHICLE_SPRITE_SIZE`, and `VEHICLE_TRACK_SPRITE_SIZE` are defined before use and used consistently across tasks.
