"use client";

import { useState } from "react";
import { getPart } from "@/core/content/parts";
import { locateBatonPart } from "@/core/countyBaton";
import { TOOL_BY_ID } from "@/core/content/tools";
import { reservedPartUids } from "@/core/garage";
import { jobBlocker } from "@/core/jobs";
import { scrapAward, SHOP_LAYER } from "@/core/layers";
import {
  CUSTOMER_IDS,
  CUSTOMERS,
  TRANSFER_TOOLS,
  shopFoundingReady,
  serviceCandidates,
  serviceDelivery,
  shopLegacyName,
  type CustomerId,
  type ShopLegacy,
} from "@/core/serviceShop";
import { initialConfig } from "@/core/state";
import type { GameState } from "@/core/types";
import { conditionName } from "../format";
import { useGame } from "../store";
import { ResetCommitments } from "./ResetCommitments";
import { CheckpointShelf } from "./CheckpointShelf";

function Transfer({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [choice, setChoice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const gate = SHOP_LAYER.gate(game);
  if (!gate.ok) return <p>{gate.reason}</p>;
  const options: ShopLegacy[] = [
    ...TRANSFER_TOOLS.filter((tool) => (game.run.tools[tool] ?? 0) > 0).map((tool): ShopLegacy => ({
      type: "tool",
      tool,
    })),
    ...CUSTOMER_IDS.map((client): ShopLegacy => ({ type: "client", client })),
  ];
  const legacy = options.find((option) => shopLegacyName(option) === choice);
  const baton = game.run.countyBaton;
  const abandonsBaton = baton && (baton.leg === "qualify" || baton.completedAt === undefined);
  const guardedBaton = baton?.qualified && locateBatonPart(game, baton.qualified.uid).part;
  return (
    <section>
      <h4>Move the shop</h4>
      <p>
        Close this garage and start a new Season in the same county. Your cars enter the Hall of Fame. Your team, banked
        points and records carry over. This move clears your loadout, loose stock and active event entries, and pays
        zero of the {scrapAward(game)} Legacy Points available through racing.
      </p>
      <CheckpointShelf />
      <label>
        Take one thing with you{" "}
        <select
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            setConfirmed(false);
          }}
        >
          <option value="">Choose a transfer</option>
          {options.map((o) => (
            <option key={shopLegacyName(o)} value={shopLegacyName(o)}>
              {o.type === "tool" ? "Move " : "Keep the route for "}
              {shopLegacyName(o)}
            </option>
          ))}
        </select>
      </label>
      {legacy && (
        <>
          <p>
            {legacy.type === "tool"
              ? TOOL_BY_ID[legacy.tool].blurb
              : "Ask this client for leads on " +
                CUSTOMERS[legacy.client].category +
                " finds. Your first trip can focus on this category before you learn Scouting."}
          </p>
          <ResetCommitments game={game} />
          {abandonsBaton && <p className="why">This move ends the unfinished County Baton attempt. Earned freight permits and Parts With a Past records stay.</p>}
          {guardedBaton?.batonGuard && <p className="why">The safeguarded {getPart(guardedBaton.partId).name} will be scrapped.</p>}
          <label>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Close this
            garage and begin the next Season.{guardedBaton?.batonGuard && " I’m ready to scrap the safeguarded part."}
          </label>
          <button
            className="btn primary"
            disabled={!confirmed}
            onClick={() => {
              if (dispatch({ type: "reset", layer: "shop", choices: { ...initialConfig(), shopLegacy: legacy } })) {
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

export function ServiceCounter({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [selected, setSelected] = useState<CustomerId>("marina");
  const [partUid, setPart] = useState("");
  if (!game.run.revealed.includes("bench") && !game.run.serviceBook && !game.config.shopLegacy) return null;
  const book = game.run.serviceBook;
  const ticket = book?.ticket;
  const pending = CUSTOMER_IDS.filter((id) => !book?.invoices.some((r) => r.client === id));
  const client = ticket?.client ?? (pending.includes(selected) ? selected : pending[0]);
  const request = client && CUSTOMERS[client];
  const candidates = client ? serviceCandidates(game, client) : [];
  const part = ticket
    ? game.run.inventory.find((p) => p.uid === ticket.partUid)
    : (candidates.find((p) => p.uid === partUid) ?? candidates[0]);
  const busy = !!part && reservedPartUids(game).has(part.uid);
  const task = part && { kind: part.condition < 2 ? ("clean" as const) : ("repair" as const), partUid: part.uid };
  const blocked = task && jobBlocker(game, task);
  return (
    <details className="section">
      <summary id="service-counter">
        Customer repairs · {book?.invoices.length ?? 0}/{CUSTOMER_IDS.length} paid invoices
      </summary>
      {game.config.shopLegacy && <p>From the last shop · {shopLegacyName(game.config.shopLegacy)}</p>}
      {request && (
        <>
          {!ticket && (
            <label>
              Open request{" "}
              <select
                value={client}
                onChange={(e) => {
                  setSelected(e.target.value as CustomerId);
                  setPart("");
                }}
              >
                {pending.map((id) => (
                  <option value={id} key={id}>
                    {CUSTOMERS[id].name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>
            <strong>{request.job}</strong> · {conditionName(request.threshold)} or better · {request.cash} Scrap Bucks
            and 2 Rep
          </p>
          {!ticket && (
            <>
              {part ? (
                <label>
                  Register a part{" "}
                  <select value={part.uid} onChange={(e) => setPart(e.target.value)}>
                    {candidates.map((p) => (
                      <option key={p.uid} value={p.uid}>
                        {getPart(p.partId).name} · {conditionName(p.condition)} · {p.origin}
                        {p.referral && " · client lead"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p>
                  Bring a {request.category} part below {conditionName(request.threshold)} condition into the garage to
                  start.
                </p>
              )}
              <button
                className="btn small"
                disabled={!part}
                onClick={() =>
                  part && dispatch({ type: "service", move: { type: "register", client, partUid: part.uid } })
                }
              >
                Register for service
              </button>
            </>
          )}
          {ticket && (
            <>
              <p>
                {part
                  ? getPart(part.partId).name + " · " + conditionName(part.condition) + " · " + part.origin
                  : "The registered part is outside your inventory. Return it to the garage or release the request."}
              </p>
              {part && task && (part.condition < request.threshold || !ticket.worked) && (
                <>
                  <button
                    className="btn small"
                    disabled={busy || !!blocked}
                    onClick={() => dispatch({ type: "enqueue", spec: task })}
                  >
                    {task.kind === "clean" ? "Clean" : "Repair"} registered part
                  </button>
                  {(busy || blocked) && <span className="muted"> {busy ? "Booked on the bench." : blocked}</span>}
                </>
              )}
              <button
                className="btn small"
                id="service-delivery"
                disabled={typeof serviceDelivery(game) === "string"}
                onClick={() => dispatch({ type: "service", move: { type: "deliver" } })}
              >
                Deliver part and collect payment
              </button>
              {part?.batonGuard && <p className="why">Release County Baton protection in the Garage to deliver this part.</p>}
              <button className="link-btn" onClick={() => dispatch({ type: "service", move: { type: "release" } })}>
                Release request
              </button>
            </>
          )}
        </>
      )}
      {!!book?.invoices.length && (
        <ul className="plain">
          {book.invoices.map((r) => (
            <li key={r.client}>
              {CUSTOMERS[r.client].name} paid for {getPart(r.partId).name} · {conditionName(r.condition)}
            </li>
          ))}
        </ul>
      )}
      {(book?.invoices.length ?? 0) < 2 && (
        <p>Fill two invoices and the grounds crew will share the Riding Mower plans for your study bench.</p>
      )}
      {!game.era && (game.config.shopLegacy || game.meta.serviceReferences) && (
        <section>
          <h4>Workshop Collective charter</h4>
          <ul>
            <li>
              {game.meta.serviceReferences?.equipment ? "Signed" : "Open"} · Fill a service invoice in a shop set up
              with transferred equipment.
            </li>
            <li>
              {game.meta.serviceReferences?.referral ? "Signed" : "Open"} · Use a returning client’s leads on a focused
              trip, repair that find and deliver it to the same client.
            </li>
          </ul>
          <p>
            {shopFoundingReady(game)
              ? "The committee signed your charter. Open Team to found the Workshop Collective."
              : "Both references carry across Seasons. Bring them to a shop with three paid invoices and a Riding Mower or larger hauler to found a team."}
          </p>
        </section>
      )}
      <Transfer game={game} />
    </details>
  );
}
