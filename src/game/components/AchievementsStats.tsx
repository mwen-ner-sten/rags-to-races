"use client";

import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS } from "@/core/content/achievements";
import { VENUES, venueName } from "@/core/content/events";
import type { GameState } from "@/core/types";
import { duration, num } from "../format";

function when(at: number): string {
  try {
    return new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/** Earned and still-locked achievements, grouped. Hidden ones stay "???" until earned. */
export function Achievements({ game }: { game: GameState }) {
  const unlocked = game.meta.achievements;
  const total = ACHIEVEMENTS.length;
  const earned = ACHIEVEMENTS.filter((a) => unlocked[a.id] !== undefined).length;
  return (
    <div className="achievements">
      <p className="ach-count" role="status">
        <strong className="num">{earned} / {total}</strong> achievements
      </p>
      {ACHIEVEMENT_GROUPS.map((group) => {
        const defs = ACHIEVEMENTS.filter((a) => a.group === group);
        const done = defs.filter((a) => unlocked[a.id] !== undefined).length;
        return (
          <section key={group} className="ach-group" aria-label={group}>
            <h3 className="label">{group} <span className="num muted">{done} / {defs.length}</span></h3>
            <ul className="ach-grid">
              {defs.map((a) => {
                const at = unlocked[a.id];
                const has = at !== undefined;
                const veiled = a.hidden && !has;
                return (
                  <li key={a.id} className="ach-card" data-state={has ? "earned" : "locked"}>
                    <span className="ach-mark" aria-hidden="true">{has ? "✓" : "•"}</span>
                    <div>
                      <strong>{veiled ? "???" : a.name}</strong>
                      <p>{veiled ? "A hidden achievement. Keep racing." : a.description}</p>
                      {has && <span className="ach-when muted">{when(at)}</span>}
                      <span className="sr-only">{has ? "Earned" : "Locked"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

type Row = [label: string, value: string];

function rows(game: GameState): { title: string; rows: Row[] }[] {
  const s = game.meta.stats;
  const rivalsBeaten = Object.values(game.meta.rivals).reduce((sum, r) => sum + r.wins, 0);
  const owner = game.owner?.titles ?? 0;
  const records = VENUES.filter((v) => game.meta.records[v.id] !== undefined).map((v): Row => [
    `Best ${venueName(v.id, game.era?.discipline ?? "dirt")} Feature`, duration(game.meta.records[v.id]),
  ]);
  return [
    { title: "Career", rows: [
      ["First played", s.firstPlayedAt ? when(s.firstPlayedAt) : "Unknown"],
      ["Seasons played", num(game.meta.seasonsPlayed)],
      ["Scrap Resets", num(s.scrapResets)],
      ["Team Resets", num(game.meta.totalTeamResets)],
      ["Legacy Points earned", num(game.scrap.lifetimeLp)],
    ] },
    { title: "Scavenging", rows: [
      ["Trips completed", num(s.trips)],
      ["Parts found", num(s.partsFound)],
      ["Parts sold", num(s.partsSold)],
      ["Parts stripped", num(s.partsStripped)],
    ] },
    { title: "Garage", rows: [
      ["Bench jobs done", num(s.benchJobs)],
      ["Parts cleaned", num(s.partsCleaned)],
      ["Parts repaired", num(s.partsRepaired)],
      ["Parts restored", num(s.partsRestored)],
      ["Vehicles built", num(s.vehiclesBuilt)],
      ["Vehicles in the Hall of Fame", num(game.meta.hallOfFame.length)],
    ] },
    { title: "Racing", rows: [
      ["Races entered", num(s.racesEntered)],
      ["Race wins", num(s.raceWins)],
      ["Podium finishes", num(s.podiums)],
      ["DNFs", num(s.dnfs)],
      ["Feature wins", num(s.featureWins)],
      ["Best win streak", num(s.bestWinStreak)],
      ["Rivals beaten", num(rivalsBeaten)],
      ["Dares completed", num(game.meta.daresCompleted.length)],
      ["Championships won", num(owner)],
      ["Records broken", num(s.recordsBroken)],
      ...records,
    ] },
    { title: "Scrap Bucks", rows: [
      ["Earned in total", num(s.cashEarned)],
      ["Spent in total", num(s.cashSpent)],
      ["Won in prize money", num(s.prizeMoney)],
    ] },
  ];
}

/** Lifetime counters as a plain two-column table. */
export function LifetimeStatsTable({ game }: { game: GameState }) {
  return (
    <div className="lifetime-stats">
      {rows(game).map((section) => (
        <table key={section.title} className="stat-table">
          <caption className="label">{section.title}</caption>
          <tbody>
            {section.rows.map(([label, value]) => (
              <tr key={label}><th scope="row">{label}</th><td className="num">{value}</td></tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
