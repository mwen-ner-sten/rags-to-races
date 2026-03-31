"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import {
  COMMUNITY_CHALLENGES,
  classifyArchetype,
  exportBuildString,
  getCurrentEventWindow,
  getReplaySnapshots,
  getRuns,
  getSeasonWindow,
  importBuildString,
  submitRun,
  type Archetype,
  type CommunityRun,
} from "@/utils/community";

const BOARD_NAMES: Record<Archetype, string> = {
  global: "Global",
  grip: "Grip",
  drift: "Drift",
  budget: "Budget",
};

export default function CommunityPanel() {
  const [playerName, setPlayerName] = useState("You");
  const [importValue, setImportValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Archetype>("global");
  const [tick, setTick] = useState(0);

  const garage = useGameStore((s) => s.garage);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const selectedCircuitId = useGameStore((s) => s.selectedCircuitId);
  const lastRaceOutcome = useGameStore((s) => s.lastRaceOutcome);
  const setPendingVehicle = useGameStore((s) => s.setPendingVehicle);
  const setPendingPart = useGameStore((s) => s.setPendingPart);
  const inventory = useGameStore((s) => s.inventory);

  const activeVehicle = garage.find((v) => v.id === activeVehicleId) ?? null;
  void tick;
  const dailyEvent = getCurrentEventWindow("daily");
  const weeklyEvent = getCurrentEventWindow("weekly");
  const season = getSeasonWindow();
  const runs = getRuns();
  const snapshots = getReplaySnapshots();

  const boardRows = useMemo(() => {
    const filtered = selectedBoard === "global"
      ? runs
      : runs.filter((r) => r.archetype === selectedBoard);
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [runs, selectedBoard]);

  const canSubmit = !!activeVehicle && !!lastRaceOutcome;

  function refreshCommunity() {
    setTick((n) => n + 1);
  }

  function handleSubmitRun(challengeId?: string) {
    if (!activeVehicle || !lastRaceOutcome) return;
    const archetype = classifyArchetype(activeVehicle);
    const event = dailyEvent;
    const baseScore = Math.max(0, lastRaceOutcome.scrapsEarned * 4 + lastRaceOutcome.repEarned * 10 + (9 - lastRaceOutcome.position) * 50);

    const run: Omit<CommunityRun, "id" | "submittedAt"> = {
      playerName: playerName.trim() || "Anonymous",
      eventId: event.eventId,
      seed: event.seed,
      gameVersion: event.gameVersion,
      archetype,
      score: baseScore,
      finishText: `P${lastRaceOutcome.position}/${lastRaceOutcome.totalRacers}`,
      circuitId: selectedCircuitId,
      vehicleId: activeVehicle.definitionId,
      buildSummary: `${activeVehicle.definitionId} (${archetype})`,
      outcome: lastRaceOutcome.result,
      challengeId,
    };

    if (challengeId) {
      const challenge = COMMUNITY_CHALLENGES.find((c) => c.id === challengeId);
      if (!challenge) {
        setStatus("Unknown challenge.");
        return;
      }
      if (!challenge.rule(run)) {
        setStatus(`Run rejected: does not satisfy ${challenge.name}.`);
        return;
      }
    }

    submitRun(run);
    setStatus(challengeId ? "Challenge run submitted." : "Run submitted to community boards.");
    refreshCommunity();
  }

  async function handleCopyBuild() {
    if (!activeVehicle) {
      setStatus("Select an active vehicle first.");
      return;
    }
    const encoded = exportBuildString({
      vehicleDefinitionId: activeVehicle.definitionId,
      engineDefinitionId: activeVehicle.parts["engine"]?.part.definitionId ?? "",
      wheelDefinitionId: activeVehicle.parts["wheel"]?.part.definitionId ?? "",
      frameDefinitionId: activeVehicle.parts["frame"]?.part.definitionId ?? "",
      fuelDefinitionId: activeVehicle.parts["fuel"]?.part.definitionId ?? "",
    });
    await navigator.clipboard.writeText(encoded);
    setStatus("Build string copied.");
  }

  function handleImportBuild() {
    const parsed = importBuildString(importValue);
    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }

    const { vehicleDefinitionId, engineDefinitionId, wheelDefinitionId, frameDefinitionId, fuelDefinitionId } = parsed.data;
    const findPart = (definitionId: string) => inventory.find((p) => p.definitionId === definitionId) ?? null;

    const selectedEngine = findPart(engineDefinitionId);
    const selectedWheel = findPart(wheelDefinitionId);
    const selectedFrame = findPart(frameDefinitionId);
    const selectedFuel = findPart(fuelDefinitionId);

    if (!selectedEngine || !selectedWheel || !selectedFrame || !selectedFuel) {
      setStatus("Import failed: missing one or more required parts in inventory.");
      return;
    }

    setPendingVehicle(vehicleDefinitionId);
    setPendingPart("engine", selectedEngine);
    setPendingPart("wheel", selectedWheel);
    setPendingPart("frame", selectedFrame);
    setPendingPart("fuel", selectedFuel);
    setStatus("Build imported into garage builder.");
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-lg border p-4 lg:col-span-1" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Event Windows</h2>
        <EventCard title="Daily Event" eventId={dailyEvent.eventId} seed={dailyEvent.seed} modifiers={dailyEvent.modifiers} />
        <EventCard title="Weekly Event" eventId={weeklyEvent.eventId} seed={weeklyEvent.seed} modifiers={weeklyEvent.modifiers} />

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--divider)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Season</h3>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Current: <strong>{season.seasonId}</strong></p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resets on {season.endsAtLabel}. Cosmetic rewards only.</p>
        </div>
      </section>

      <section className="rounded-lg border p-4 lg:col-span-2" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Leaderboards</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(BOARD_NAMES) as Archetype[]).map((board) => (
            <button
              key={board}
              onClick={() => setSelectedBoard(board)}
              className="rounded border px-2 py-1 text-xs"
              style={selectedBoard === board
                ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--text-white)" }
                : { borderColor: "var(--panel-border)", color: "var(--text-secondary)" }}
            >
              {BOARD_NAMES[board]}
            </button>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          {boardRows.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No runs submitted yet.</p>
          ) : boardRows.map((run, idx) => (
            <div key={run.id} className="flex items-center justify-between rounded border px-2 py-1" style={{ borderColor: "var(--divider)" }}>
              <span style={{ color: "var(--text-primary)" }}>#{idx + 1} {run.playerName} · {run.finishText}</span>
              <span className="font-mono" style={{ color: "var(--accent)" }}>{formatNumber(run.score)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Public Handle</label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => handleSubmitRun()}
              disabled={!canSubmit}
              className="w-full rounded px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }}
            >
              Submit Last Race
            </button>
          </div>
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--divider)" }}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Challenges</h3>
          <div className="space-y-2">
            {COMMUNITY_CHALLENGES.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2" style={{ borderColor: "var(--divider)" }}>
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.description}</p>
                </div>
                <button
                  onClick={() => handleSubmitRun(c.id)}
                  disabled={!canSubmit}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  style={{ borderColor: "var(--btn-border)", color: "var(--text-secondary)" }}
                >
                  Submit Challenge Run
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-4 lg:col-span-2" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Build Share</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopyBuild} className="rounded border px-3 py-1.5 text-sm" style={{ borderColor: "var(--btn-border)", color: "var(--text-secondary)" }}>
            Copy Build String
          </button>
          <input
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
            placeholder="Paste B1:..."
            className="min-w-[280px] flex-1 rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
          />
          <button onClick={handleImportBuild} className="rounded border px-3 py-1.5 text-sm" style={{ borderColor: "var(--btn-border)", color: "var(--text-secondary)" }}>
            Import
          </button>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Format: B1:vehicle:engine:wheel:frame:fuel</p>
      </section>

      <section className="rounded-lg border p-4 lg:col-span-1" style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>Replay Snapshots</h2>
        <div className="space-y-2 text-sm">
          {snapshots.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No snapshots yet. Submit high-ranked runs.</p>
          ) : snapshots.slice(0, 5).map((s) => (
            <div key={s.runId} className="rounded border p-2" style={{ borderColor: "var(--divider)" }}>
              <p style={{ color: "var(--text-primary)" }}>{s.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {status && <p className="text-sm lg:col-span-3" style={{ color: "var(--info)" }}>{status}</p>}
    </div>
  );
}

function EventCard({ title, eventId, seed, modifiers }: { title: string; eventId: string; seed: number; modifiers: string[] }) {
  return (
    <div className="mb-3 rounded border p-3" style={{ borderColor: "var(--divider)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{eventId} · seed {seed}</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs" style={{ color: "var(--text-secondary)" }}>
        {modifiers.map((m) => <li key={m}>{m}</li>)}
      </ul>
    </div>
  );
}
