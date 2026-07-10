import { ADDON_DEFINITIONS } from "@/data/addons";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { CREW_ROLES, CREW_ROLE_LABELS, CREW_SPECIALIZATIONS } from "@/data/crew";
import { GARAGE_STATIONS } from "@/data/garageStations";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { PART_DEFINITIONS } from "@/data/parts";
import { RIVAL_DEFINITIONS } from "@/data/rivals";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";

export type FixedAssetKind =
  | "vehicle"
  | "rival"
  | "part"
  | "addon"
  | "station"
  | "location"
  | "circuit"
  | "crew_role"
  | "crew_specialization";

export interface FixedAsset {
  id: string;
  name: string;
  kind: FixedAssetKind;
  src: string;
  source: { width: number; height: number };
  anchor: { x: number; y: number };
  displaySizes: readonly number[];
  alt: string;
}

function squareAsset(kind: FixedAssetKind, folder: string, id: string, name: string, size = 64): FixedAsset {
  return {
    id,
    name,
    kind,
    src: `/sprites/${folder}/${id}.png`,
    source: { width: size, height: size },
    anchor: { x: size / 2, y: size / 2 },
    displaySizes: kind === "vehicle" || kind === "rival" ? [16, 24, 32, 64] : [24, 32, 48, 64],
    alt: `${name} ${kind.replace("_", " ")} artwork`,
  };
}

function thumbnailAsset(kind: "location" | "circuit", id: string, name: string): FixedAsset {
  return {
    id,
    name,
    kind,
    src: `/sprites/${kind}s/${id}.png`,
    source: { width: 512, height: 288 },
    anchor: { x: 256, y: 144 },
    displaySizes: [160, 256, 320, 512],
    alt: `${name} ${kind} artwork`,
  };
}

export const FIXED_ASSET_MANIFEST: FixedAsset[] = [
  ...VEHICLE_DEFINITIONS.map((definition) => squareAsset("vehicle", "vehicles", definition.id, definition.name)),
  ...RIVAL_DEFINITIONS.map((definition) => squareAsset("rival", "rivals", definition.id, definition.name)),
  ...PART_DEFINITIONS.map((definition) => squareAsset("part", "parts", definition.id, definition.name)),
  ...ADDON_DEFINITIONS.map((definition) => squareAsset("addon", "addons", definition.id, definition.name)),
  ...GARAGE_STATIONS.map((definition) => squareAsset("station", "stations", definition.id, definition.name)),
  ...LOCATION_DEFINITIONS.map((definition) => thumbnailAsset("location", definition.id, definition.name)),
  ...CIRCUIT_DEFINITIONS.map((definition) => thumbnailAsset("circuit", definition.id, definition.name)),
  ...CREW_ROLES.map((role) => squareAsset("crew_role", "crew/roles", role, CREW_ROLE_LABELS[role], 256)),
  ...CREW_SPECIALIZATIONS.map((definition) => squareAsset("crew_specialization", "crew/specializations", definition.id, definition.name)),
];

export const FIXED_ASSETS_BY_ID = Object.fromEntries(
  FIXED_ASSET_MANIFEST.map((asset) => [`${asset.kind}:${asset.id}`, asset]),
) as Record<string, FixedAsset>;

export function getFixedAsset(kind: FixedAssetKind, id: string): FixedAsset | undefined {
  return FIXED_ASSETS_BY_ID[`${kind}:${id}`];
}
