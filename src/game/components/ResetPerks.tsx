"use client";

import { venueName } from "@/core/content/events";
import { DARE_BY_ID, PERKS, type PerkDef } from "@/core/content/modifiers";
import { perkUnlocked } from "@/core/perks";
import type { DisciplineId, GameState } from "@/core/types";
import { num } from "../format";

/** How a perk that isn't on the shelf yet becomes available. */
export function unlockHow(perk: PerkDef, discipline: DisciplineId): string {
  if (perk.unlock.type === "dare") {
    const dare = DARE_BY_ID[perk.unlock.dareId];
    return dare ? `Complete the dare ${dare.name}: ${dare.text}` : "Complete its dare";
  }
  if (perk.unlock.type === "milestone") return `Win the ${venueName(perk.unlock.venueId, discipline)} Feature`;
  return "Spend Legacy Points";
}

interface ResetPerksProps {
  game: GameState;
  ranks: Record<string, number>;
  lpLeft: number;
  slots: number;
  equipped: string[];
  purchases: number;
  onBuy: (perkId: string) => void;
  onUndo: () => void;
  onEquip: (perkIds: string[]) => void;
}

export function ResetPerks({ game, ranks, lpLeft, slots, equipped, purchases, onBuy, onUndo, onEquip }: ResetPerksProps) {
  const shelf = PERKS.filter((p) => perkUnlocked(game, p));
  const locked = PERKS.filter((p) => !shelf.includes(p));
  const discipline = game.era?.discipline ?? "dirt";
  return (
    <fieldset>
      <legend>
        Perks · <span className="num">{num(lpLeft)}</span> Legacy Points to spend
      </legend>
      <h3 className="label">On the shelf</h3>
      <ul className="perks">
        {shelf.map((p) => {
          const rank = ranks[p.id] ?? 0;
          const cost = p.cost[rank];
          const canBuy = rank < p.maxRank && cost !== undefined && lpLeft >= cost;
          const isEquipped = equipped.includes(p.id);
          return (
            <li key={p.id} className={isEquipped ? "equipped" : ""}>
              <div>
                <strong>{p.name}</strong> <span className="chip">{p.kind}</span>
                {p.maxRank > 1 && (
                  <span className="muted num">
                    {" "}
                    rank {rank}/{p.maxRank}
                  </span>
                )}
                <p className="blurb">{p.text}</p>
              </div>
              <div className="perk-actions">
                {rank < p.maxRank && (
                  <>
                    <button className="btn small wrap" disabled={!canBuy} onClick={() => onBuy(p.id)}>
                      Buy · {cost} Legacy Points
                    </button>
                    {!canBuy && cost !== undefined && <span className="why">Needs {cost - lpLeft} more Legacy Points</span>}
                  </>
                )}
                {rank > 0 && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={isEquipped}
                      disabled={!isEquipped && equipped.length >= slots}
                      onChange={(e) => onEquip(e.target.checked ? [...equipped, p.id] : equipped.filter((id) => id !== p.id))}
                    />
                    Equip
                  </label>
                )}
                {rank > 0 && !isEquipped && equipped.length >= slots && <span className="why">No free perk slot</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {equipped.length}/{slots} slots used.{" "}
        {purchases > 0 && (
          <button className="link-btn" onClick={onUndo}>
            Undo purchases
          </button>
        )}
      </p>
      {locked.length > 0 && (
        <details className="reset-locked">
          <summary>
            <span className="label">Locked ({locked.length})</span>
          </summary>
          <ul className="perks locked">
            {locked.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong> <span className="chip">{p.kind}</span>
                  <p className="blurb">{p.text}</p>
                  <p className="why">{unlockHow(p, discipline)}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </fieldset>
  );
}
