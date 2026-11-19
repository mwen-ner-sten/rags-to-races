"use client";

import { useState } from "react";
import { swapMeetBlocker } from "@/core/actions";
import { PARTS, getPart } from "@/core/content/parts";
import { reservedPartUids } from "@/core/garage";
import { hasPerk } from "@/core/rules";
import type { GameState } from "@/core/types";
import { conditionName } from "../format";
import { useGame } from "../store";

export function SwapMeet({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  if (!hasPerk(game, "swap_meet")) return null;
  const reserved = reservedPartUids(game);
  const free = game.run.inventory.filter((part) => !reserved.has(part.uid));
  const chosen = selected.filter((uid) => free.some((part) => part.uid === uid));
  const seen = PARTS.filter((part) => (game.meta.codex.parts[part.id] ?? 0) > 0);
  const blocker = swapMeetBlocker(game, chosen, target);

  return (
    <section className="section" aria-labelledby="swap-meet-h">
      <h2 id="swap-meet-h">Swap meet</h2>
      <p className="sub">Trade three free parts from your garage for one part you’ve seen before, in Worn condition. Include at least one part of the tier you want back. Offered parts are gone after the trade.</p>
      <fieldset>
        <legend>Offer three parts ({chosen.length}/3)</legend>
        <div className="grid-list">
          {free.map((part) => (
            <label className="check" key={part.uid}>
              <input
                type="checkbox"
                checked={chosen.includes(part.uid)}
                disabled={chosen.length >= 3 && !chosen.includes(part.uid)}
                onChange={(e) => setSelected(e.target.checked ? [...chosen, part.uid] : chosen.filter((uid) => uid !== part.uid))}
              />
              {getPart(part.partId).name} · {conditionName(part.condition)} · Tier {getPart(part.partId).tier}
            </label>
          ))}
        </div>
        {free.length < 3 && <p className="why">You need three parts that aren’t installed, queued, or on the bench.</p>}
      </fieldset>
      <label className="block">
        <span className="label">Receive at the swap meet</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose a part</option>
          {seen.map((part) => <option key={part.id} value={part.id}>{part.name} · Tier {part.tier} · Worn</option>)}
        </select>
      </label>
      <div className="actions">
        <button className="btn primary" disabled={!!blocker} onClick={() => {
          if (dispatch({ type: "swapMeet", partUids: chosen, partId: target })) {
            setSelected([]);
            setMessage(`Received a Worn ${getPart(target).name}.`);
          }
        }}>Trade three parts</button>
        {blocker && <span className="why">{blocker}</span>}
      </div>
      {message && <p className="notice" role="status">{message}</p>}
    </section>
  );
}
