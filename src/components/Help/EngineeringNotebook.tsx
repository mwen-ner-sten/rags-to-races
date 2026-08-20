import { CONDITION_LABELS, type CoreSlot } from "@/data/parts";
import type { BuiltVehicle } from "@/engine/build";
import {
  selectEngineeringHistory,
  type EngineeringHistoryEntry,
} from "@/engine/engineeringHistory";
import type { RaceOutcome } from "@/engine/race";

const RESULT_LABELS: Record<RaceOutcome["result"], string> = {
  win: "Win",
  loss: "Loss",
  dnf: "DNF",
};

const RESULT_COLORS: Record<RaceOutcome["result"], string> = {
  win: "var(--success)",
  loss: "var(--warning)",
  dnf: "var(--danger)",
};

function ReportDetails({ entry }: { entry: EngineeringHistoryEntry }) {
  const report = entry.report;
  if (!report) {
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
        No engineering report was recorded for this race. The result and circuit remain available without reconstructing a diagnosis from today&apos;s garage.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Focus</dt>
          <dd className="mt-0.5 capitalize" style={{ color: "var(--text-primary)" }}>{report.focus}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Component</dt>
          <dd className="mt-0.5" style={{ color: "var(--text-primary)" }}>{report.component ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Component condition</dt>
          <dd className="mt-0.5" style={{ color: "var(--text-primary)" }}>
            {report.componentCondition ? CONDITION_LABELS[report.componentCondition] : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Vehicle condition</dt>
          <dd className="mt-0.5" style={{ color: "var(--text-primary)" }}>
            {report.vehicleCondition == null ? "Not recorded" : `${Math.round(report.vehicleCondition)}%`}
          </dd>
        </div>
      </dl>
      <div className="rounded-md border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--divider)" }}>
        <p className="font-semibold" style={{ color: "var(--text-white)" }}>{report.headline}</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-heading)" }}>
          <strong>Evidence:</strong> {report.observation}
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          <strong>Recommended action:</strong> {report.action}
        </p>
      </div>
    </div>
  );
}

export default function EngineeringNotebook({
  raceHistory,
  garage,
  onInspectBuild,
}: {
  raceHistory: readonly RaceOutcome[];
  garage: readonly BuiltVehicle[];
  onInspectBuild?: (vehicleId: string, slot: CoreSlot) => void;
}) {
  const entries = selectEngineeringHistory(raceHistory, garage);

  return (
    <section data-testid="engineering-notebook" aria-labelledby="engineering-notebook-heading" className="p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="engineering-notebook-heading" className="text-base font-bold" style={{ color: "var(--text-white)" }}>
            Engineering Notebook
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Recent race-time evidence from Race History. Stored reports are never recalculated from the current active vehicle.
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--panel-border)", color: "var(--text-muted)" }}>
          {entries.length} recent {entries.length === 1 ? "race" : "races"}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm" style={{ borderColor: "var(--panel-border)", color: "var(--text-muted)" }}>
          No races recorded yet. Your first result will start the notebook.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {entries.map((entry, index) => (
            <article
              key={`${entry.circuitId}-${entry.vehicleId ?? "legacy"}-${index}`}
              data-testid="engineering-history-entry"
              className="min-w-0 rounded-lg border p-3 sm:p-4"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
              aria-labelledby={`engineering-history-title-${index}`}
            >
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id={`engineering-history-title-${index}`} className="font-semibold" style={{ color: "var(--text-white)" }}>
                    {entry.circuitName}
                  </h3>
                  <p className="mt-1 break-words text-sm" style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-heading)" }}>Raced vehicle:</strong> {entry.vehicleLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide" style={{ color: RESULT_COLORS[entry.result], background: "var(--divider)" }}>
                  {RESULT_LABELS[entry.result]} · P{entry.position}/{entry.totalRacers}
                </span>
              </header>
              <ReportDetails entry={entry} />
              {entry.vehicleAvailability === "available" && entry.vehicleId && entry.report?.slot && onInspectBuild && (
                <button
                  type="button"
                  onClick={() => onInspectBuild(entry.vehicleId!, entry.report!.slot!)}
                  aria-label={`Inspect ${entry.vehicleId} ${entry.report.slot} in Garage`}
                  className="mt-3 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}
                >
                  Inspect raced build
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
