import { getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import { TOOL_BY_ID } from "./content/tools";
import { pushFeed } from "./feed";
import { reservedPartUids } from "./garage";
import { logSeason } from "./journal";
import type { Condition, GameState, PartInstance } from "./types";

export const CUSTOMERS = {
  marina: {
    name: "Mira at the landing",
    category: "wheel",
    threshold: 2,
    cash: 24,
    job: "A trailer wheel for the launch ramp",
  },
  orchard: {
    name: "Orchard grounds crew",
    category: "engine",
    threshold: 3,
    cash: 65,
    job: "A rebuilt engine for the cutting deck",
  },
  courier: {
    name: "County mail carrier",
    category: "fuel",
    threshold: 3,
    cash: 48,
    job: "A pressure-tested spare tank",
  },
} as const;

export const CUSTOMER_IDS = ["marina", "orchard", "courier"] as const;
export type CustomerId = (typeof CUSTOMER_IDS)[number];
export const TRANSFER_TOOLS = [
  "parts_washer",
  "tire_machine",
  "impact_wrench",
  "welder",
  "second_bench",
  "engine_stand",
] as const;
export type TransferTool = (typeof TRANSFER_TOOLS)[number];
export type ShopLegacy = { type: "tool"; tool: TransferTool } | { type: "client"; client: CustomerId };
export interface Invoice {
  client: CustomerId;
  partId: string;
  partUid: string;
  condition: Condition;
  origin: string;
}
export interface ServiceReferences {
  equipment?: { tool: TransferTool; season: number; invoice: Invoice };
  referral?: { season: number; invoice: Invoice };
}
export interface ServiceBook {
  ticket?: { client: CustomerId; partUid: string; worked: boolean };
  invoices: Invoice[];
}
export type ShopMove =
  { type: "register"; client: CustomerId; partUid: string } | { type: "release" } | { type: "deliver" };

export function customerLeads(game: GameState) {
  return game.config.shopLegacy?.type === "client" ? CUSTOMERS[game.config.shopLegacy.client].category : undefined;
}

export function shopMoveReady(game: GameState) {
  return (
    game.run.serviceBook?.invoices.length === CUSTOMER_IDS.length &&
    game.run.vehicles.some((car) => getVehicle(car.vehicleId).tier >= 1)
  );
}

export function depotCharter(game: GameState): boolean {
  const receipts = game.run.depotReceipts;
  return !!receipts?.includes("ramp") && receipts.includes("pump");
}
/** Either route grants the Collective charter; ordinary race qualifications still permit either organization. */
export function workshopCharterOnly(game: GameState): boolean {
  if (!game.era) return !game.meta.stateWonEver && (shopFoundingReady(game) || depotCharter(game));
  return depotCharter(game) && game.run.featureWins.county_fair === undefined && game.run.regularityFeatures?.county_fair === undefined;
}

export function shopFoundingReady(game: GameState) {
  const references = game.meta.serviceReferences;
  return !!references?.equipment && !!references.referral && shopMoveReady(game);
}

export function transferBlocker(game: GameState, choice?: ShopLegacy): string | null {
  if (!choice) return "Choose which part of the business to take.";
  if (choice.type === "tool")
    return TRANSFER_TOOLS.includes(choice.tool) && (game.run.tools[choice.tool] ?? 0) > 0
      ? null
      : "Choose a tool you own.";
  return game.run.serviceBook?.invoices.some((r) => r.client === choice.client)
    ? null
    : "Choose a customer whose job you finished.";
}

/** Existing callers sometimes pass their outgoing RunConfig as the next loadout. Its old transfer simply expires. */
export function sameShopLegacy(left: ShopLegacy, right?: ShopLegacy): boolean {
  return left.type === "tool" ? right?.type === "tool" && right.tool === left.tool : right?.type === "client" && right.client === left.client;
}

export function shopLegacyName(choice: ShopLegacy) {
  return choice.type === "tool" ? TOOL_BY_ID[choice.tool].name : CUSTOMERS[choice.client].name;
}

export function serviceCandidates(game: GameState, client: CustomerId) {
  const request = CUSTOMERS[client];
  return game.run.inventory.filter(
    (p) => getPart(p.partId).category === request.category && p.condition < request.threshold && !p.inherited && !p.batonGuard,
  );
}

export function unpaidServiceClients(game: GameState): CustomerId[] {
  return CUSTOMER_IDS.filter((client) => !game.run.serviceBook?.invoices.some((invoice) => invoice.client === client));
}

export function stockedServiceClient(game: GameState, clients = unpaidServiceClients(game)): CustomerId | undefined {
  return clients.find((client) => serviceCandidates(game, client).length > 0);
}

export function recordService(game: GameState, part: PartInstance) {
  const order = game.run.serviceBook?.ticket;
  if (order?.partUid === part.uid) order.worked = true;
}

export function serviceDelivery(game: GameState) {
  const ticket = game.run.serviceBook?.ticket;
  if (!ticket) return "Take a customer job first.";
  const part = game.run.inventory.find((p) => p.uid === ticket.partUid);
  const client = CUSTOMERS[ticket.client];
  if (!part || getPart(part.partId).category !== client.category || !ticket.worked || part.condition < client.threshold)
    return "Fix the part up to the condition the customer wants first.";
  if (part.batonGuard) return "Release County Baton protection first.";
  if (reservedPartUids(game).has(part.uid)) return "Finish the booked bench work first.";
  return { ticket, part, client };
}

export function applyShopOrder(game: GameState, move: ShopMove): string | null {
  const book = (game.run.serviceBook ??= { invoices: [] });
  if (move.type === "register") {
    if (book.ticket) return "Release or deliver the current part first.";
    if (!Object.hasOwn(CUSTOMERS, move.client) || book.invoices.some((r) => r.client === move.client))
      return "Choose an open service request.";
    if (!serviceCandidates(game, move.client).some((p) => p.uid === move.partUid))
      return "Choose a repairable part from your garage.";
    book.ticket = { client: move.client, partUid: move.partUid, worked: false };
    return null;
  }
  const ticket = book.ticket;
  if (!ticket) return "Take a customer job first.";
  if (move.type === "release") {
    delete book.ticket;
    return null;
  }
  const delivery = serviceDelivery(game);
  if (typeof delivery === "string") return delivery;
  const { part, client } = delivery;
  game.run.inventory = game.run.inventory.filter((p) => p.uid !== part.uid);
  const invoice = {
    client: ticket.client,
    partId: part.partId,
    partUid: part.uid,
    condition: part.condition,
    origin: part.origin,
  };
  book.invoices.push(invoice);
  const legacy = game.config.shopLegacy;
  if (legacy) {
    const refs = (game.meta.serviceReferences ??= {});
    const season = game.meta.seasonsPlayed + 1;
    if (legacy.type === "tool" && !refs.equipment && (game.run.tools[legacy.tool] ?? 0) > 0) {
      refs.equipment = { tool: legacy.tool, season, invoice };
      logSeason(
        game,
        "workshop-machine-reference",
        "The grounds committee signed off a job from your relocated workshop.",
      );
    }
    if (
      legacy.type === "client" &&
      !refs.referral &&
      legacy.client === ticket.client &&
      part.referral === ticket.client
    ) {
      refs.referral = { season, invoice };
      logSeason(
        game,
        "workshop-client-reference",
        "Your returning customer vouched for the part you found through their lead.",
      );
    }
  }
  game.run.cash += client.cash;
  game.run.rep += 2;
  delete book.ticket;
  pushFeed(
    game,
    "bench",
    client.name + " collected the " + getPart(part.partId).name + " and paid " + client.cash + " Scrap Bucks.",
  );
  logSeason(
    game,
    "service:" + ticket.client,
    client.name + " signed for a " + getPart(part.partId).name + " from " + part.origin + ".",
  );
  return null;
}

export function serviceReferencesValid(game: GameState): boolean {
  const book = game.run.serviceBook;
  const refs = game.meta.serviceReferences;
  if (refs?.referral && refs.equipment?.season === refs.referral.season) return false;
  for (const ref of [refs?.referral, refs?.equipment]) {
    if (!ref) continue;
    if (
      ref.season > game.meta.seasonsPlayed + 1 ||
      getPart(ref.invoice.partId).category !== CUSTOMERS[ref.invoice.client].category ||
      ref.invoice.condition < CUSTOMERS[ref.invoice.client].threshold
    )
      return false;
  }
  if (!book) return true;
  const ids = book.invoices.map((r) => r.client);
  if (new Set(ids).size !== ids.length || new Set(book.invoices.map((r) => r.partUid)).size !== ids.length)
    return false;
  if (
    book.invoices.some(
      (r) => getPart(r.partId).category !== CUSTOMERS[r.client].category || r.condition < CUSTOMERS[r.client].threshold,
    )
  )
    return false;
  return !book.ticket || !ids.includes(book.ticket.client);
}
