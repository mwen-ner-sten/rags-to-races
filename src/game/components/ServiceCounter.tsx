"use client";

import { experimentalCareers } from "@/core/features";
import { useState } from "react";
import { getPart } from "@/core/content/parts";
import { locateBatonPart } from "@/core/countyBaton";
import { TOOL_BY_ID } from "@/core/content/tools";
import { benchCost, partSellValue, reservedPartUids } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import { scrapAward, SHOP_LAYER } from "@/core/layers";
import {
  depotCharter,
  CUSTOMER_IDS,
  CUSTOMERS,
  TRANSFER_TOOLS,
  shopFoundingReady,
  shopMoveReady,
  serviceCandidates,
  serviceDelivery,
  stockedServiceClient,
  shopLegacyName,
  type CustomerId,
  type ShopLegacy,
} from "@/core/serviceShop";
import { initialConfig } from "@/core/state";
import type { GameState, PartInstance } from "@/core/types";
import { conditionName } from "../format";
import { useGame } from "../store";
import { ResetCommitments } from "./ResetCommitments";
import { CheckpointShelf } from "./CheckpointShelf";
import { PartTitle } from "./BuildSlotRow";
import { ChoiceList, type ChoiceItem } from "./ChoiceList";
import { OpeningComparison } from "./OpeningComparison";

const clientBlurb = (client: CustomerId) =>
  "Ask this client for leads on " + CUSTOMERS[client].category + " finds. Your first trip can focus on this category before you learn Scouting.";

function transferItems(options: readonly ShopLegacy[]): ChoiceItem[] {
  const rows = options.map((option): ChoiceItem => ({
    id: shopLegacyName(option),
    title: (option.type === "tool" ? "Move " : "Keep the route for ") + shopLegacyName(option),
    meta: option.type === "tool" ? TOOL_BY_ID[option.tool].blurb : clientBlurb(option.client),
  }));
  return [{ id: "", title: "Nothing yet", meta: "Choose a transfer before you move." }, ...rows];
}

function Transfer({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [choice, setChoice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  if (!SHOP_LAYER.gate(game).ok) return null;
  const options: ShopLegacy[] = [
    ...TRANSFER_TOOLS.filter((tool) => (game.run.tools[tool] ?? 0) > 0).map((tool): ShopLegacy => ({
      type: "tool",
      tool,
    })),
    ...CUSTOMER_IDS.map((client): ShopLegacy => ({ type: "client", client })),
  ];
  const legacy = options.find((option) => shopLegacyName(option) === choice);
  const choices = { ...initialConfig(), shopLegacy: legacy };
  const blocker = SHOP_LAYER.validate(game, choices);
  const baton = game.run.countyBaton;
  const abandonsBaton = baton && (baton.leg === "qualify" || baton.completedAt === undefined);
  const guardedBaton = baton?.qualified && locateBatonPart(game, baton.qualified.uid).part;
  return (
    <section className="customer-block">
      <h3>Move the shop</h3>
      <p>
        Close this garage and start a new Season in the same county. Your cars enter the Hall of Fame. Your team, banked
        points and records carry over. This move clears your loadout, loose stock and active event entries, and pays
        zero of the {scrapAward(game)} Legacy Points available through racing.
      </p>
      <CheckpointShelf />
      <ChoiceList
        label="Take one thing with you"
        items={transferItems(options)}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setConfirmed(false);
        }}
      />
      <OpeningComparison game={game} layer="shop" choices={choices} blocker={blocker} />
      {legacy && (
        <>
          <ResetCommitments game={game} />
          {abandonsBaton && <p className="why">This move ends the unfinished County Baton attempt. Earned freight permits and Parts With a Past records stay.</p>}
          {guardedBaton?.batonGuard && <p className="why">The safeguarded {getPart(guardedBaton.partId).name} will be scrapped.</p>}
          <label>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Close this
            garage and begin the next Season.{guardedBaton?.batonGuard && " I’m ready to scrap the safeguarded part."}
          </label>
          <button
            className="btn primary"
            disabled={!confirmed || !!blocker}
            onClick={() => {
              if (dispatch({ type: "reset", layer: "shop", choices })) {
                setChoice("");
                setConfirmed(false);
              }
            }}
          >
            Move the shop
          </button>
        </>
      )}
    </section>
  );
}

/** Customer work shows once the bench is open, or whenever this shop already has service history. */
export function serviceCounterVisible(game: GameState): boolean {
  if (!experimentalCareers()) return false;
  return game.run.revealed.includes("bench") || !!game.run.serviceBook || !!game.config.shopLegacy;
}

/** A customer job the player can move forward right now: a part to take on, or a finished one to hand over. */
export function serviceActionReady(game: GameState): boolean {
  if (!serviceCounterVisible(game)) return false;
  return game.run.serviceBook?.ticket ? typeof serviceDelivery(game) !== "string" : !!stockedServiceClient(game);
}

const WANTED_PART: Record<string, string> = { wheel: "a wheel", engine: "an engine", fuel: "a fuel tank" };
const wantedPart = (category: string) => WANTED_PART[category] ?? `a ${category} part`;
const HANDOVER_REP = 2;

interface JobCardProps {
  game: GameState;
  client: CustomerId;
}

function partLine(part: PartInstance): string {
  return `${getPart(part.partId).name} · ${conditionName(part.condition)} · ${part.origin}`;
}

function PaidCard({ game, client }: JobCardProps) {
  const done = game.run.serviceBook?.invoices.find((r) => r.client === client);
  return (
    <article className="customer-card done">
      <header className="customer-head">
        <h3>{CUSTOMERS[client].name}</h3>
        <span className="customer-tag paid">Paid</span>
      </header>
      {done && (
        <p className="muted">
          Took the {getPart(done.partId).name} · {conditionName(done.condition)}
        </p>
      )}
    </article>
  );
}

function ActiveJob({ game, client }: JobCardProps) {
  const dispatch = useGame((s) => s.dispatch);
  const ticket = game.run.serviceBook?.ticket;
  const request = CUSTOMERS[client];
  const part = ticket && game.run.inventory.find((p) => p.uid === ticket.partUid);
  const needsWork = !!part && !!ticket && (part.condition < request.threshold || !ticket.worked);
  const task = part && { kind: part.condition < 2 ? ("clean" as const) : ("repair" as const), partUid: part.uid };
  const busy = !!part && reservedPartUids(game).has(part.uid);
  const workWhy = busy ? "Booked on the bench." : task ? jobBlocker(game, task) : null;
  const delivery = serviceDelivery(game);
  const deliverWhy = part?.batonGuard
    ? "Release County Baton protection in the Garage to hand this part over."
    : typeof delivery === "string"
      ? delivery
      : null;
  return (
    <article className="customer-card active">
      <header className="customer-head">
        <h3>{request.name}</h3>
        <span className="customer-tag">Your job now</span>
      </header>
      <p>{request.job}</p>
      <p className="muted">
        {part
          ? `${partLine(part)} · wants ${conditionName(request.threshold)} or better`
          : "The part for this job is no longer in your inventory. Return it to the garage or drop the job."}
      </p>
      <div className="customer-actions">
        {part && task && needsWork && (
          <>
            <button className="btn small primary" disabled={!!workWhy} onClick={() => dispatch({ type: "enqueue", spec: task })}>
              {task.kind === "clean" ? "Clean" : "Repair"} the {getPart(part.partId).name}
            </button>
            {workWhy && <p className="why">{workWhy}</p>}
          </>
        )}
        <button
          className={"btn small" + (needsWork ? "" : " primary")}
          id="service-delivery"
          disabled={deliverWhy !== null}
          onClick={() => dispatch({ type: "service", move: { type: "deliver" } })}
        >
          Hand over · {request.cash} Scrap Bucks and {HANDOVER_REP} Rep
        </button>
        {deliverWhy && <p className="why">{deliverWhy}</p>}
        <button className="link-btn" onClick={() => dispatch({ type: "service", move: { type: "release" } })}>
          Drop this job
        </button>
      </div>
    </article>
  );
}

interface PartPickerProps {
  parts: PartInstance[];
  value: string;
  onChange: (uid: string) => void;
}

function PartPicker({ parts, value, onChange }: PartPickerProps) {
  const items = parts.map((part): ChoiceItem => ({
    id: part.uid,
    title: <PartTitle part={part} />,
    meta: part.origin + (part.referral ? " · client lead" : ""),
  }));
  return <ChoiceList label="Part to fix up" items={items} value={value} onChange={onChange} />;
}

function OpenJob({ game, client }: JobCardProps) {
  const dispatch = useGame((s) => s.dispatch);
  const [picked, setPicked] = useState("");
  const request = CUSTOMERS[client];
  const otherActive = !!game.run.serviceBook?.ticket;
  const candidates = serviceCandidates(game, client);
  const part = candidates.find((p) => p.uid === picked) ?? candidates[0];
  return (
    <article className="customer-card">
      <header className="customer-head">
        <h3>{request.name}</h3>
      </header>
      <p>{request.job}</p>
      <p className="muted">
        Wants {wantedPart(request.category)} in {conditionName(request.threshold)} or better.
      </p>
      <p className="customer-pay">
        Pays {request.cash} Scrap Bucks and {HANDOVER_REP} Rep
      </p>
      {otherActive && <p className="why">Finish the current job first.</p>}
      {!otherActive && !part && (
        <p className="why">
          You need {wantedPart(request.category)} that is worse than {conditionName(request.threshold)} to fix up. Look
          for one on a trip.
        </p>
      )}
      {!otherActive && part && (
        <div className="customer-actions">
          <PartPicker parts={candidates} value={part.uid} onChange={setPicked} />
          <p className="muted">
            Dealer offer today · {partSellValue(game, part)} Scrap Bucks as is.
            {" "}For this job, {request.threshold === 2 ? "clean to Worn" : (
              (part.condition < 2 ? "clean to Worn, then repair" : "repair") + " with " +
              Object.entries(benchCost(part, "repair")).map(([name, count]) => count + " " + name).join(" and ")
            )}.
          </p>
          <button
            className="btn small primary"
            onClick={() => dispatch({ type: "service", move: { type: "register", client, partUid: part.uid } })}
          >
            Take this job
          </button>
        </div>
      )}
    </article>
  );
}

function CustomerCard({ game, client }: JobCardProps) {
  const book = game.run.serviceBook;
  if (book?.invoices.some((r) => r.client === client)) return <PaidCard game={game} client={client} />;
  if (book?.ticket?.client === client) return <ActiveJob game={game} client={client} />;
  return <OpenJob game={game} client={client} />;
}

function Progress({ game }: { game: GameState }) {
  const done = game.run.serviceBook?.invoices.length ?? 0;
  return (
    <>
      <p className="customer-progress">
        <strong>
          {done} of {CUSTOMER_IDS.length} jobs done
        </strong>
      </p>
      {done < 2 && (
        <p className="muted">Two jobs done and the grounds crew shares the Riding Mower plans for your study bench.</p>
      )}
      {shopMoveReady(game) ? (
        <p className="muted">Your customer book is full. Stay and race, or move the shop to start a new Season.</p>
      ) : null}
    </>
  );
}

function Charter({ game }: { game: GameState }) {
  if (game.era || !(game.config.shopLegacy || game.meta.serviceReferences)) return null;
  const refs = game.meta.serviceReferences;
  return (
    <section className="customer-block">
      <h3>Workshop Collective charter</h3>
      <ul>
        <li>{refs?.equipment ? "Signed" : "Open"} · Finish a customer job in a shop set up with transferred equipment.</li>
        <li>
          {refs?.referral ? "Signed" : "Open"} · Use a returning client’s leads on a focused trip, fix up that find and
          hand it over to the same client.
        </li>
      </ul>
      <p>
        {(shopFoundingReady(game) || depotCharter(game))
          ? "The committee signed your charter. Open Team to found the Workshop Collective."
          : "One signed reference and a depot rig open the County Motor Pool. Collect both freight deliveries in one Season for a charter. You can also qualify with both references, three paid jobs this Season and a hauler."}
      </p>
    </section>
  );
}

export function ServiceCounter({ game }: { game: GameState }) {
  if (!serviceCounterVisible(game)) return null;
  const legacy = game.config.shopLegacy;
  return (
    <section className="section">
      <h2 id="service-counter" tabIndex={-1}>
        Customer jobs
      </h2>
      <p className="sub">Locals pay Scrap Bucks and Rep for a part you fix up. Each customer has one job a Season.</p>
      <Progress game={game} />
      <div className="customer-list">
        {CUSTOMER_IDS.map((client) => (
          <CustomerCard key={client} game={game} client={client} />
        ))}
      </div>
      {legacy && (
        <section className="customer-block">
          <h3>From the last shop</h3>
          <p>{shopLegacyName(legacy)}</p>
        </section>
      )}
      <Charter game={game} />
      <Transfer game={game} />
    </section>
  );
}
