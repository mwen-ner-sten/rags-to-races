"use client";
import { useState } from "react";
import { seriesEligible, seriesTerms, forecastSeries } from "@/engine/series";
import { getVehicleById } from "@/data/vehicles";
import Button from "@/components/ui/Button";

import { useGameStore } from "@/state/store";
import {
  TRACK_PERK_DEFINITIONS,
  TRACK_PERK_CATEGORIES,
  TRACK_PERK_CATEGORY_LABELS,
  trackPerkCost,
  type TrackPerkCategory,
} from "@/data/trackPerks";
import { type OwnedTrackConfig } from "@/data/trackVenue";

export default function TrackSubTab() {
  const trackPrestigeTokens = useGameStore((s) => s.trackPrestigeTokens);
  const trackPerkLevels = useGameStore((s) => s.trackPerkLevels);
  const purchaseTrackPerk = useGameStore((s) => s.purchaseTrackPerk);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-heading)" }}
          className="text-sm font-semibold uppercase tracking-widest"
        >
          Track Perks
        </h2>
        <span
          style={{ color: "var(--accent)" }}
          className="font-mono text-sm font-bold"
        >
          {trackPrestigeTokens} PT
        </span>
      </div>

      <VenueManager />

      {TRACK_PERK_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          currency={trackPrestigeTokens}
          levels={trackPerkLevels}
          onPurchase={purchaseTrackPerk}
        />
      ))}
    </div>
  );
}

const CONFIG_OPTIONS: { key: keyof OwnedTrackConfig; label: string; values: string[] }[] = [
  { key: "surface", label: "Surface", values: ["grass", "gravel", "asphalt"] }, { key: "length", label: "Length", values: ["short", "medium", "long"] },
  { key: "cornerDensity", label: "Corners", values: ["low", "medium", "high"] }, { key: "timeRule", label: "Conditions", values: ["day", "night", "variable_weather"] },
  { key: "vehicleClass", label: "Vehicle class", values: ["open", "scrap", "street", "prototype"] }, { key: "riskReward", label: "Payout tier", values: ["1", "2", "3", "4", "5"] },
];

function VenueManager() {
  const state = useGameStore();
  const [selected, setSelected] = useState("");
  const config = state.ownedTrackConfig;
  const eligible = state.garage.filter((v) => seriesEligible(state, v, config));
  const vehicle = eligible.find((v) => v.id === selected) ?? eligible[0];
  const terms = vehicle ? seriesTerms(config, vehicle, state) : null;
  const forecast = vehicle ? forecastSeries(state, vehicle, config) : [];
  return <section className="rounded-lg border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
    <h3>Build a three-round series</h3>
    <p className="my-2 text-sm">Commit a spare vehicle and an entry budget. Round two tests cornering; round three tests endurance. Vehicle condition carries between rounds. Configure the series to suit your build.</p>
    <div className="grid gap-2 sm:grid-cols-3">{CONFIG_OPTIONS.map(({key,label,values}) => <label key={key} className="text-sm">{label}<select className="block w-full rounded border p-2" style={{background:"var(--panel-bg)",color:"var(--text-primary)"}} value={String(config[key])} onChange={(e) => state.updateOwnedTrackConfig({...config,[key]:key === "riskReward" ? Number(e.target.value) : e.target.value})}>{values.map((v) => <option key={v} disabled={(key === "riskReward" && Number(v) > 3 && !state.trackPerkLevels.track_custom_circuits) || (key === "timeRule" && v === "night" && !state.trackPerkLevels.track_night_racing)}>{v}</option>)}</select></label>)}</div>
    {(state.trackPerkLevels.track_endurance ?? 0) > 0 && <label className="my-2 block"><input type="checkbox" checked={config.endurance} onChange={(e) => state.updateOwnedTrackConfig({...config,endurance:e.target.checked})} /> Endurance series: double duration and prize, double wear</label>}
    <label className="my-3 block">Series vehicle<select aria-label="Series vehicle" className="block w-full rounded border p-2" style={{background:"var(--panel-bg)",color:"var(--text-primary)"}} value={vehicle?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>{!vehicle && <option value="">Build or repair a spare vehicle for this class</option>}{eligible.map((v) => <option key={v.id} value={v.id}>{getVehicleById(v.definitionId)?.name} · {v.condition}% condition</option>)}</select></label>
    {terms && <p className="my-2 text-sm">Entry: {terms.fee} Scrap Bucks · Maximum prize: {terms.prize} · Round win forecasts: {forecast.map((p) => `${Math.round(p*100)}%`).join(" / ")}. Later-round wear can reduce these starting-condition forecasts.</p>}
    <Button disabled={!vehicle || !terms || state.scrapBucks < terms.fee} onClick={() => state.hostTrackEvent(vehicle?.id)}>Start series</Button>
    <div className="mt-3 space-y-2">{state.hostedEvents.map((event) => <div key={event.id} className="rounded border p-3" style={{borderColor:"var(--panel-border)"}}><strong>{event.name}</strong><p>{event.status === "complete" ? `${event.reward} Scrap Bucks earned` : `${event.remainingTicks} ticks remaining`}</p>{event.rounds && <p>{event.rounds.map((r,i) => `Round ${i+1}: ${r.result === "dnf" ? "DNF" : `P${r.position}`}`).join(" · ")}</p>}{event.status === "complete" && <Button onClick={() => state.collectHostedEvent(event.id)}>Collect</Button>}</div>)}</div>
  </section>;
}

function CategorySection({
  category,
  currency,
  levels,
  onPurchase,
}: {
  category: TrackPerkCategory;
  currency: number;
  levels: Record<string, number>;
  onPurchase: (id: string) => void;
}) {
  const perks = TRACK_PERK_DEFINITIONS.filter(
    (u) => u.category === category,
  );

  return (
    <div>
      <h3
        style={{ color: "var(--text-dim)" }}
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
      >
        {TRACK_PERK_CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {perks.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = maxed ? 0 : trackPerkCost(def, level + 1);
          const canAfford = currency >= cost;
          const currentEffect = def.effect.valuePerLevel * level;
          const nextEffect = maxed
            ? currentEffect
            : def.effect.valuePerLevel * (level + 1);

          return (
            <div
              key={def.id}
              style={{
                background: "var(--panel-bg)",
                borderColor: maxed
                  ? "var(--accent-border)"
                  : "var(--panel-border)",
              }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div
                    style={{ color: "var(--text-heading)" }}
                    className="text-sm font-semibold"
                  >
                    {def.name}
                  </div>
                  <div
                    style={{ color: "var(--text-dim)" }}
                    className="text-xs"
                  >
                    {def.description}
                  </div>
                </div>
                <span
                  style={{
                    color: maxed ? "var(--accent)" : "var(--text-dim)",
                  }}
                  className="whitespace-nowrap font-mono text-xs"
                >
                  {level}/{def.maxLevel}
                </span>
              </div>

              {level > 0 && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-1 font-mono text-xs"
                >
                  Current: {formatEffect(def.effect.type, currentEffect)}
                  {!maxed && (
                    <span style={{ color: "var(--text-dim)" }}>
                      {" \u2192 "}
                      {formatEffect(def.effect.type, nextEffect)}
                    </span>
                  )}
                </div>
              )}

              {!maxed && (
                <button
                  onClick={() => onPurchase(def.id)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? "var(--accent)" : "transparent",
                    color: canAfford
                      ? "var(--panel-bg)"
                      : "var(--text-dim)",
                    borderColor: "var(--panel-border)",
                  }}
                  className="mt-2 w-full rounded border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cost} PT
                </button>
              )}
              {maxed && (
                <div
                  style={{ color: "var(--accent)" }}
                  className="mt-2 text-center text-xs font-semibold"
                >
                  MAXED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEffect(type: string, value: number): string {
  switch (type) {
    case "custom_circuits":
    case "night_variants":
    case "endurance_races":
    case "crew_auto_recruit":
    case "eternal_workshop":
      return value >= 1 ? "Active" : "Inactive";
    case "lower_currency_mult":
      return `+${Math.round(value * 100)}%`;
    case "extra_track":
      return `${value}`;
    case "passive_scrap":
      return `+${Math.round(value * 20)}%`;
    case "tick_speed_reduction":
      return `-${value}s`;
    default:
      return `${value}`;
  }
}
