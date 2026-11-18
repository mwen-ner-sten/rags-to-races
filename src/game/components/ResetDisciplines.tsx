"use client";

import { DISCIPLINES, disciplineBlocker } from "@/core/content/events";
import type { DisciplineId, GameState } from "@/core/types";

interface ResetDisciplinesProps {
  game: GameState;
  chosen: DisciplineId;
  onChoose: (id: DisciplineId) => void;
}

/** The Team layer's discipline choice, with what each one changes. */
export function ResetDisciplines({ game, chosen, onChoose }: ResetDisciplinesProps) {
  return (
    <div className="disciplines">
      {(["dirt", "drag", "rally"] as const).map((id) => (
        <label key={id} className={`card choice ${chosen === id ? "on" : ""}`}>
          <input id={`reset-discipline-${id}`} type="radio" name="discipline" disabled={!!disciplineBlocker(game, id)} checked={chosen === id} onChange={() => onChoose(id)} />
          <strong>{DISCIPLINES[id].name}</strong>
          {disciplineBlocker(game, id) && <p className="why">{disciplineBlocker(game, id)}</p>}
          <p className="blurb">{DISCIPLINES[id].blurb}</p>
          <ul className="plain reset-rules">
            {DISCIPLINES[id].rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="muted small">
            Mastery: {DISCIPLINES[id].mastery.text}. You have {game.meta.disciplineMastery[id] ?? 0} levels.
          </p>
        </label>
      ))}
    </div>
  );
}
