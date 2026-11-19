"use client";

import { useState } from "react";
import { getPart } from "@/core/content/parts";
import { carryFor } from "@/core/haul";
import { MOWER_EXCHANGE, retirementPlan, type RetirementMove } from "@/core/retirement";
import { hasPerk } from "@/core/rules";
import type { GameState, Vehicle } from "@/core/types";
import { conditionName } from "../format";
import { useGame } from "../store";

export function VehicleRetirement({ game, vehicle }: { game: GameState; vehicle: Vehicle }) {
  const dispatch = useGame((state) => state.dispatch);
  const [kind, setKind] = useState<RetirementMove["kind"]>("dismantle");
  const [picked, setPicked] = useState("");
  const parts = Object.values(vehicle.parts).filter((part) => part !== undefined);
  const keep = parts.find((part) => part.uid === picked) ?? parts[0];
  const move: RetirementMove = kind === "exchange" ? { kind } : { kind, keepUid: keep?.uid ?? "" };
  const plan = retirementPlan(game, vehicle.uid, move);
  const remaining = game.run.vehicles.filter((car) => car.uid !== vehicle.uid);
  const carry = carryFor(game);
  const nextCarry = carryFor({ ...game, run: { ...game.run, vehicles: remaining } });
  const losesTow = vehicle.vehicleId === "riding_mower" && !remaining.some((car) => car.vehicleId === "riding_mower");
  const losesJunkyard = losesTow && game.run.placesOpen.includes("junkyard") && !hasPerk(game, "borrowed_trailer");
  const materials = typeof plan === "string" ? [] : Object.entries(plan.materials).map(([material, amount]) => `${amount} ${material}`);

  return (
    <details className="retirement">
      <summary>Retire {vehicle.name}</summary>
      <p>Retiring removes this mower from your garage and keeps its race record and build in the Notebook.</p>
      {carry !== nextCarry && <p className="why">Haul capacity changes from {carry} to {nextCarry} parts.</p>}
      {losesJunkyard && <p className="why">Marisol&apos;s Junkyard trips need a replacement Riding Mower or Borrowed Trailer.</p>}
      {losesTow && game.run.habitSlots.length > 1 && <p className="why">The Riding Mower&apos;s extra Habit slot goes with it.</p>}
      <label className="inline">
        <span>Retirement route</span>
        <select value={kind} onChange={(event) => setKind(event.target.value === "exchange" ? "exchange" : "dismantle")}>
          <option value="dismantle">Dismantle and keep a part</option>
          <option value="exchange">Trade for a Push Mower kit</option>
        </select>
      </label>
      {kind === "dismantle" ? (
        <>
          <label className="inline">
            <span>Installed part to keep</span>
            <select value={keep?.uid ?? ""} onChange={(event) => setPicked(event.target.value)}>
              {parts.length === 0 && <option value="">Nothing installed</option>}
              {parts.map((part) => <option key={part.uid} value={part.uid}>{getPart(part.partId).name} · {conditionName(part.condition)}</option>)}
            </select>
          </label>
          <p>{materials.length > 0 ? `The remaining installed parts yield ${materials.join(", ")}.` : "Any other installed parts become materials."} The chosen part keeps its wear.</p>
        </>
      ) : (
        <p>Trade the complete mower and {MOWER_EXCHANGE.cash} Scrap Bucks for a {MOWER_EXCHANGE.parts.map((partId) => `${conditionName(MOWER_EXCHANGE.condition)} ${getPart(partId).name}`).join(" and ")}. Both fit the free Push Mower plans.</p>
      )}
      {typeof plan === "string" && <p className="why">{plan}</p>}
      <button className="btn wrap" disabled={typeof plan === "string"} onClick={() => dispatch({ type: "retireVehicle", vehicleUid: vehicle.uid, move })}>
        {kind === "exchange" ? "Confirm mower exchange" : "Confirm dismantling"}
      </button>
    </details>
  );
}
