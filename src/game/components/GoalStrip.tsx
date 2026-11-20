"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { nextGoals, seasonTrack, type Goal, type GoalTab, type SeasonPip } from "@/core/goals";
import { num } from "../format";
import { useGame } from "../store";

interface GoalStripProps {
  /** The first-Season Guide card is on screen: show only the Season track, not goals. */
  guideVisible: boolean;
  /** Tabs the player can currently open (a goal never jumps to a tab that isn't there). */
  canShow: (tab: GoalTab) => boolean;
  onShow: (tab: GoalTab) => void;
}

const pct = (g: Goal) => (g.target <= 0 ? 100 : Math.max(0, Math.min(100, (g.current / g.target) * 100)));

function pipState(p: SeasonPip) {
  return p.won ? "Feature won" : p.open ? "open" : "locked";
}

/** The five venues as pips: locked, open, or Feature won this Season. */
function SeasonTrack({ pips, names }: { pips: SeasonPip[]; names: boolean }) {
  return (
    <ol className="goal-track" aria-label="Season track" data-names={names ? "true" : "false"}>
      {pips.map((p) => (
        <li key={p.venueId} className="goal-pip" data-state={p.won ? "won" : p.open ? "open" : "locked"} title={`${p.name}: ${pipState(p)}`}>
          <span className="goal-pip-dot" aria-hidden="true" />
          <span className={names ? "goal-pip-name" : "sr-only"}>
            {p.name}
            <span className="sr-only">: {pipState(p)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Bar({ goal, bump }: { goal: Goal; bump: boolean }) {
  const label = `${goal.label}: ${num(goal.current)} of ${num(goal.target)}${goal.unit ? ` ${goal.unit}` : ""}`;
  return (
    <div className="goal-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={Math.min(goal.current, goal.target)} data-full={goal.current >= goal.target} data-bump={bump}>
      <div className="goal-bar-fill" style={{ width: `${pct(goal)}%` }} />
    </div>
  );
}

/** Goal ids whose value rose since the last change, so their bar can flash briefly. */
function useRisers(goals: Goal[]): Set<string> {
  const values = Object.fromEntries(goals.map((g) => [g.id, g.current]));
  const key = goals.map((g) => `${g.id}=${g.current}`).join("|");
  const [seen, setSeen] = useState({ key, values });
  const [risers, setRisers] = useState<Set<string>>(new Set());
  if (seen.key !== key) {
    setSeen({ key, values });
    setRisers(new Set(goals.filter((g) => seen.values[g.id] !== undefined && g.current > seen.values[g.id]).map((g) => g.id)));
  }
  useEffect(() => {
    if (risers.size === 0) return;
    const t = window.setTimeout(() => setRisers(new Set()), 900);
    return () => window.clearTimeout(t);
  }, [risers]);
  return risers;
}

/**
 * An always-there "what next" strip. Collapsed it is one line (the top goal and its bar);
 * tapping expands every goal and the Season track. Not fixed-position: it scrolls with the page,
 * so it never fights the bottom nav or tutorial layers.
 */
export function GoalStrip({ guideVisible, canShow, onShow }: GoalStripProps) {
  const game = useGame((s) => s.game);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const goals = useMemo(() => (game ? nextGoals(game) : []), [game]);
  const pips = useMemo(() => (game ? seasonTrack(game) : []), [game]);
  const risers = useRisers(goals);
  if (!game) return null;

  if (guideVisible) {
    return (
      <section className="goal-strip goal-strip-track" aria-label="Season track">
        <SeasonTrack pips={pips} names />
      </section>
    );
  }
  const top = goals[0];
  if (!top) return null;
  const rest = goals.slice(1);
  return (
    <section className="goal-strip" aria-label="Next goals" data-open={open}>
      <button type="button" className="goal-head" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <span className="goal-kicker">Next</span>
        <span className="goal-label">{top.label}</span>
        <span className="goal-value num">
          {num(top.current)}/{num(top.target)}
          {top.unit ? ` ${top.unit}` : ""}
        </span>
        <span className="goal-chevron" aria-hidden="true" />
      </button>
      <Bar goal={top} bump={risers.has(top.id)} />
      {!open && (
        <div className="goal-inline-track">
          <SeasonTrack pips={pips} names={false} />
        </div>
      )}
      <div id={panelId} className="goal-more" hidden={!open}>
        <p className="goal-detail">{top.detail}</p>
        {top.tab && canShow(top.tab) && (
          <button type="button" className="btn small" onClick={() => onShow(top.tab!)}>
            Go
          </button>
        )}
        {rest.map((g) => (
          <div key={g.id} className="goal-row">
            <div className="goal-row-head">
              <span className="goal-row-label">{g.label}</span>
              <span className="goal-value num">
                {num(g.current)}/{num(g.target)}
                {g.unit ? ` ${g.unit}` : ""}
              </span>
            </div>
            <Bar goal={g} bump={risers.has(g.id)} />
            <p className="goal-detail">{g.detail}</p>
            {g.tab && canShow(g.tab) && (
              <button type="button" className="btn small" onClick={() => onShow(g.tab!)}>
                Go
              </button>
            )}
          </div>
        ))}
        <SeasonTrack pips={pips} names />
      </div>
    </section>
  );
}
