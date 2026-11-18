/** Play a repair-only first career through both kinds of Shop Move, without entering any race. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { apply, createGame, must, type Action } from "../src/core";
import { getPart, REPAIR_TECHNIQUE, STRIP_YIELD } from "../src/core/content/parts";
import { getVehicle } from "../src/core/content/vehicles";
import { reservedPartUids } from "../src/core/garage";
import { jobBlocker } from "../src/core/jobs";
import { SHOP_LAYER, TEAM_LAYER } from "../src/core/layers";
import { CUSTOMER_IDS, CUSTOMERS, customerLeads, serviceCandidates } from "../src/core/serviceShop";
import { initialConfig } from "../src/core/state";
import type { GameState, JobSpec, MaterialId } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const output = process.argv[3] ?? "test-results/service-careers";
const trials = Number(process.argv[2] ?? 8);
const hours = (ms: number) => Math.round(ms / 360_000)/10;
mkdirSync(output, {recursive:true});
function visit(game: GameState): Action {
  const enqueue = (spec: JobSpec): Action => ({ type: "enqueue", spec });
  const inventory = game.run.inventory;
  const book = game.run.serviceBook;
  const pending = CUSTOMER_IDS.filter((id) => !book?.invoices.some((r) => r.client === id));
  const ticket = book?.ticket;
  const active = game.run.jobs[0];
  if (active) return { type: "advance", ms: Math.ceil(active.remaining)+1 };
  const part = inventory.find((p) => p.uid === ticket?.partUid);
  let ingredient: MaterialId | undefined;
  if (ticket && part) {
    if (ticket.worked && part.condition >= CUSTOMERS[ticket.client].threshold) return { type: "service", move: { type: "deliver" } };
    if (part.condition < 2) return enqueue({ kind: "clean", partUid: part.uid });
    const tech = REPAIR_TECHNIQUE[getPart(part.partId).category];
    if (tech && game.run.available.includes(tech) && !game.run.learned.includes(tech)) return enqueue({ kind: "study", knowhowId: tech });
    const repair = { kind: "repair", partUid: part.uid } as const;
    if (!jobBlocker(game,repair)) return enqueue(repair);
    ingredient = game.run.materials.metal === 0 ? "metal" : "wiring";
  }
  if (!ticket) {
    for (const client of pending) {
      const customer = game.config.shopLegacy;
      const options = serviceCandidates(game,client).filter((p) => customer?.type !== "client" || customer.client !== client || p.referral === client).sort((a,b) => b.condition-a.condition);
      if (options[0]) return { type: "service", move: { type: "register",client,partUid:options[0].uid } };
    }
    const plan = "blueprint:riding_mower";
    if (game.run.available.includes(plan) && !game.run.learned.includes(plan)) return enqueue({kind:"study",knowhowId:plan});
    if (game.run.learned.includes(plan) && !game.run.vehicles.length) {
      const parts: Record<string,string> = {};
      for (const slot of getVehicle("riding_mower").slots.filter((s) => s.required)) {
        const p = inventory.find((p) => slot.accepts.includes(p.partId) && p.condition > 0);
        if (p) parts[slot.slot]=p.uid;
        else {
          const scrap = inventory.find((p) => slot.accepts.includes(p.partId));
          if (scrap) return enqueue({ kind:"clean",partUid:scrap.uid });
        }
      }
      if (game.run.materials.metal < 2) ingredient="metal";
      if (Object.keys(parts).length===3 && !ingredient) return enqueue({kind:"assemble",vehicleId:"riding_mower",name:"Service mule",partUids:parts});
    }
  }
  if (ingredient) {
    const spare = inventory.find((p) => p.uid !== ticket?.partUid && STRIP_YIELD[getPart(p.partId).category][ingredient!]);
    if (spare) return enqueue({kind:"strip",partUid:spare.uid});
  }
  if ((game.run.tools.parts_washer ?? 0) === 0 && game.run.cash >= 45) return {type:"buyTool",toolId:"parts_washer"};
  if (inventory.length >= 10) {
    const groups = new Set<string>();
    const sell = inventory.filter((p) => {
      if (p.uid === ticket?.partUid || reservedPartUids(game).has(p.uid)) return false;
      const cat = getPart(p.partId).category;
      if (groups.has(cat) || cat==="junk") return true;
      groups.add(cat);return false;
    });
    if (sell.length) return {type:"sell",partUids:sell.map((p) => p.uid)};
  }
  return enqueue({kind:"haul",placeId:"curb",focus:customerLeads(game)});
}

function fillBook(start: GameState) {
  let game=start;
  for (let actions=0;actions<10000;actions++) {
    if (SHOP_LAYER.gate(game).ok) return game;
    const action=visit(game);
    const result=apply(game,action);
    if(result.error) throw Error("Action "+JSON.stringify(action)+" failed: "+result.error);
    game=result.state;
  }
  throw Error("Shop move unavailable after 10000 decisions");
}

const rows = [];
for(let i=0;i<trials;i++) {
  let game=fillBook(createGame("customer-book-"+i));
  if (!SHOP_LAYER.gate(game).ok || !decodeGameState(game)) throw Error("Career timed out at "+JSON.stringify(game.run.serviceBook));
  if (!(game.run.tools.parts_washer ?? 0)) game=must(game,{type:"buyTool",toolId:"parts_washer"});
  const moved = ["tool","client"].map((route) => {
    const shopLegacy=route==="tool"?{type:"tool",tool:"parts_washer"} as const:{type:"client",client:"orchard"} as const;
    let next=must(game,{type:"reset",layer:"shop",choices:{...initialConfig(),shopLegacy}});
    next=must(next,{type:"enqueue",spec:{kind:"haul",placeId:"curb",...(route==="client" && {focus:"engine"})}});
    next=must(next,{type:"advance",ms:60_000,away:true});
    if(!decodeGameState(next) || next.meta.seasonLog?.at(-1)?.endedBy!=="shop") throw Error("Invalid transfer");
    const second=fillBook(next);
    const opposite=route==="tool"?{type:"client",client:"orchard"} as const:{type:"tool",tool:"parts_washer"} as const;
    const third=fillBook(must(second,{type:"reset",layer:"shop",choices:{...initialConfig(),shopLegacy:opposite}}));
    if (!TEAM_LAYER.gate(third).ok) throw Error("Referral pathway failed: "+JSON.stringify(third.meta.serviceReferences));
    if (i===0 && route==="tool") writeFileSync(join(output,"charter-ready.txt"),Buffer.from(JSON.stringify({game:third,savedAt:Date.now()})).toString("base64"));
    const team=must(third,{type:"reset",layer:"team",choices:{...initialConfig(),organization:"collective",discipline:"dirt",teamName:"Landing Service Union",colors:["#271","#eee"]}});
    if (!decodeGameState(team) || !team.era?.crew || team.meta.stateWonEver) throw Error("Invalid workshop founding");
    return {route, foundingSeason:team.meta.seasonsPlayed, hours:hours(game.run.seasonMs+second.run.seasonMs+third.run.seasonMs)};
  });
  if(i===0) writeFileSync(join(output,"ready-to-move.txt"),Buffer.from(JSON.stringify({game,savedAt:Date.now()})).toString("base64"));
  rows.push({seed:i,hours:hours(game.run.seasonMs),hauls:game.run.stats.hauls,receipts:game.run.serviceBook!.invoices.map((r) => r.partId),races:game.run.races.length,moved});
  writeFileSync(join(output,"results.json"),JSON.stringify(rows,null,2));console.log(rows.at(-1));
}
