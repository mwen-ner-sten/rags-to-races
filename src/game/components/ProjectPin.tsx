"use client";
import { careerPinStep, PIN_NAMES, possiblePins, selectedPin, type CareerPin } from "@/core/careerPin";
import type { CareerDestination } from "@/core/careerAdvice";
import type { GameState } from "@/core/types";
import { useGame } from "../store";

export function ProjectPin({ game, onOpen }: { game: GameState; onOpen: (target: CareerDestination) => void }) {
  const dispatch = useGame((s) => s.dispatch);
  const selected = selectedPin(game);
  const options = possiblePins(game);
  if (selected && !options.includes(selected)) options.push(selected);
  if (!options.length) return null;
  const step = selected && careerPinStep(game, selected);
  return (
    <section aria-label="Pinned project">
      <label>
        Pin a project{" "}
        <select
          value={selected ?? ""}
          onChange={(e) => dispatch({ type: "pinCareer", pin: e.target.value ? (e.target.value as CareerPin) : null })}
        >
          <option value="">Choose as you play</option>
          {options.map((id) => (
            <option value={id} key={id}>
              {PIN_NAMES[id]}
            </option>
          ))}
        </select>
      </label>
      {step && (
        <>
          <p>{step.detail}</p>
          <button className="btn small" onClick={() => onOpen(step.destination)}>
            {step.label}
          </button>
        </>
      )}
    </section>
  );
}
