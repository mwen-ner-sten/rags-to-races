"use client";

import type { OfflineResult } from "@/engine/tick";

interface OfflineProgressModalProps {
  timeAwayMinutes: number;
  result: OfflineResult;
  onDismiss: () => void;
}

function formatTimeAway(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #222 0%, #1a1a1a 100%)",
  boxShadow:
    "0 0 48px rgba(234, 179, 8, 0.22), 0 0 0 1px rgba(255,255,255,0.06), 0 20px 40px -8px rgba(0,0,0,0.5)",
};

interface StatRowProps {
  icon: string;
  label: string;
  value: string;
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-sm text-zinc-300">
        <span className="w-5 text-center">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-amber-300">{value}</span>
    </div>
  );
}

export default function OfflineProgressModal({
  timeAwayMinutes,
  result,
  onDismiss,
}: OfflineProgressModalProps) {
  const rows: StatRowProps[] = [];

  if (result.partsFound.length > 0) {
    rows.push({ icon: "\u{1F529}", label: "Parts scavenged", value: `${result.partsFound.length}` });
  }
  if (result.scrapsEarned > 0) {
    rows.push({ icon: "\u{1F4B0}", label: "Scrap Bucks", value: `+$${result.scrapsEarned.toLocaleString()}` });
  }
  if (result.repEarned > 0) {
    rows.push({ icon: "\u{2B50}", label: "Rep earned", value: `+${Math.round(result.repEarned).toLocaleString()}` });
  }
  if (result.racesCompleted > 0) {
    rows.push({ icon: "\u{1F3C1}", label: "Races completed", value: `${result.racesCompleted}` });
  }
  if (result.lootGearDrops.length > 0) {
    rows.push({ icon: "\u{1F392}", label: "Gear found", value: `${result.lootGearDrops.length}` });
  }
  if (result.modDrops.length > 0) {
    rows.push({ icon: "\u{1F527}", label: "Mods found", value: `${result.modDrops.length}` });
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onDismiss}
    >
      <div
        className="animate-fade-up mx-4 w-full max-w-sm rounded-xl border border-amber-500/20 p-6"
        style={CARD_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-center text-xl font-bold text-amber-300">
          Welcome Back!
        </h2>
        <p className="mb-4 text-center text-sm text-zinc-400">
          You were away for {formatTimeAway(timeAwayMinutes)}
        </p>

        {rows.length > 0 ? (
          <div className="mb-5 divide-y divide-zinc-700/50 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1">
            {rows.map((row) => (
              <StatRow key={row.label} {...row} />
            ))}
          </div>
        ) : (
          <p className="mb-5 text-center text-sm text-zinc-500">
            Nothing happened while you were away.
          </p>
        )}

        <button
          onClick={onDismiss}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
