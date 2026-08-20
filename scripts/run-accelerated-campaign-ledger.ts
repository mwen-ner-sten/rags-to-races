import { CRAFT_RECIPES } from "../src/data/craftRecipes";
import { OWNER_UPGRADE_DEFINITIONS } from "../src/data/ownerUpgrades";
import { PLAYSTYLE_NODE_DEFINITIONS } from "../src/data/playstyleUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "../src/data/teamUpgrades";
import { TRACK_PERK_DEFINITIONS } from "../src/data/trackPerks";
import { createInitialState, useGameStore } from "../src/state/store";
import { createGameplayFixture, type GameplayFixtureName } from "../src/testing/gameplayFixtures";
import { SeededRandomSource, withRandomSource } from "../src/utils/random";

type Snapshot = ReturnType<typeof snapshot>;

function load(name: GameplayFixtureName) {
  useGameStore.setState({ ...createInitialState(), ...createGameplayFixture(name).payload.state });
}

function snapshot() {
  const state = useGameStore.getState();
  return {
    scrap: state.scrapBucks,
    rep: state.repPoints,
    lp: state.legacyPoints,
    tp: state.teamPoints,
    op: state.ownerPoints,
    pt: state.trackPrestigeTokens,
    inventory: state.inventory.length,
    garage: state.garage.length,
    stations: state.stationEquipmentInventory.length,
    equippedStations: Object.values(state.equippedStationEquipment).filter(Boolean).length,
    philosophy: state.teamOperatingPhilosophy,
    crew: state.crewRoster.map((member) => `${member.id}:${member.role}:L${member.level}:XP${member.xp}:${member.specialization ?? "none"}`),
    materials: Object.values(state.materials).reduce((sum, amount) => sum + amount, 0),
    forgeTokens: state.forgeTokens,
    reforgeShards: state.reforgeShards,
    fatigue: state.fatigue,
    activeCondition: state.garage.find((vehicle) => vehicle.id === state.activeVehicleId)?.condition ?? null,
  };
}

function record(ledger: Array<{ action: string; before: Snapshot; after: Snapshot; changed: boolean }>, action: string, run: () => void) {
  const before = snapshot();
  withRandomSource(new SeededRandomSource(`ledger:${action}`), run);
  const after = snapshot();
  ledger.push({ action, before, after, changed: JSON.stringify(before) !== JSON.stringify(after) });
}

const workshop: Array<{ action: string; before: Snapshot; after: Snapshot; changed: boolean }> = [];
load("workshop_ready");

const initialInventory = useGameStore.getState().inventory;
record(workshop, "sell part", () => useGameStore.getState().sellPart(initialInventory.find((part) => part.definitionId === "misc_junk")!.id));
record(workshop, "decompose part", () => useGameStore.getState().decomposePart(useGameStore.getState().inventory.find((part) => part.definitionId === "misc_seat")!.id));
record(workshop, "enhance part", () => useGameStore.getState().enhancePart(useGameStore.getState().inventory.find((part) => part.type === "part" && part.condition === "decent")!.id));
record(workshop, "trade up three parts", () => {
  const candidates = useGameStore.getState().inventory.filter((part) => part.type === "part" && part.condition === "good" && part.definitionId.startsWith("engine_")).slice(0, 3);
  useGameStore.getState().tradeUpParts(candidates.map((part) => part.id) as [string, string, string]);
});
record(workshop, "fabricate part", () => useGameStore.getState().craftPart(CRAFT_RECIPES[0]));
record(workshop, "install add-on", () => useGameStore.getState().installAddon(useGameStore.getState().activeVehicleId!, "engine", useGameStore.getState().inventory.find((part) => part.definitionId === "addon_air_filter")!.id));
record(workshop, "remove add-on", () => {
  const vehicle = useGameStore.getState().garage.find((candidate) => candidate.id === useGameStore.getState().activeVehicleId)!;
  useGameStore.getState().removeAddon(vehicle.id, "engine", vehicle.parts.engine.addons[0].id);
});
record(workshop, "dealer purchase", () => useGameStore.getState().buyFromDealer("fixture_dealer_engine"));
record(workshop, "dealer refresh", () => useGameStore.getState().refreshDealer());
record(workshop, "workshop upgrade", () => useGameStore.getState().purchaseUpgrade("keen_eye"));
record(workshop, "forge station item", () => useGameStore.getState().forgeStationItem("diagnostics", "rare"));
const forgedId = useGameStore.getState().stationEquipmentInventory.at(-1)!.id;
record(workshop, "equip station item", () => useGameStore.getState().equipStationItem(forgedId));
record(workshop, "enhance station item", () => useGameStore.getState().enhanceStationItem(forgedId));
record(workshop, "forge salvage candidate", () => useGameStore.getState().forgeStationItem("lift", "common"));
const salvageId = useGameStore.getState().stationEquipmentInventory.at(-1)!.id;
record(workshop, "salvage station item", () => useGameStore.getState().salvageStationItem(salvageId));
record(workshop, "fatigue drink", () => useGameStore.getState().purchaseFatigueDrink());
record(workshop, "Garage Philosophy node", () => useGameStore.getState().purchasePlaystyleNode(PLAYSTYLE_NODE_DEFINITIONS[0].id));

const layers = [];
load("first_scrap_reset_ready");
const scrapBefore = snapshot();
useGameStore.getState().prestige();
layers.push({ layer: "scrap", choices: ["reset now", "continue momentum"], beforePurchases: scrapBefore, afterPurchases: scrapBefore, afterReset: snapshot() });
for (const layer of [
  { fixture: "team_reset_ready" as const, currency: "tp", definitions: TEAM_UPGRADE_DEFINITIONS, purchase: (id: string) => useGameStore.getState().purchaseTeamUpgrade(id), reset: () => useGameStore.getState().teamReset("engineering_works") },
  { fixture: "owner_reset_ready" as const, currency: "op", definitions: OWNER_UPGRADE_DEFINITIONS, purchase: (id: string) => useGameStore.getState().purchaseOwnerUpgrade(id), reset: () => useGameStore.getState().ownerReset() },
  { fixture: "track_reset_ready" as const, currency: "pt", definitions: TRACK_PERK_DEFINITIONS, purchase: (id: string) => useGameStore.getState().purchaseTrackPerk(id), reset: () => useGameStore.getState().trackReset() },
]) {
  load(layer.fixture);
  const beforePurchases = snapshot();
  layer.purchase(layer.definitions[0].id);
  layer.purchase(layer.definitions[1].id);
  const afterPurchases = snapshot();
  layer.reset();
  const afterReset = snapshot();
  layers.push({ layer: layer.fixture.replace("_reset_ready", ""), choices: layer.fixture === "team_reset_ready" ? ["Junkyard Works", "Engineering Works", "Driver-Led Team"] : [layer.definitions[0].name, layer.definitions[1].name], beforePurchases, afterPurchases, afterReset });
}

const output = { workshop, layers };
console.log(JSON.stringify(
  process.argv.includes("--team-only")
    ? layers.find((layer) => layer.layer === "team")
    : output,
  null,
  2,
));
