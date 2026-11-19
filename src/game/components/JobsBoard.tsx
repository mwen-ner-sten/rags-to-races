"use client";

import { channel } from "@/core/channels";
import { nowhereToStow } from "@/core/garage";
import { habitThreshold, templateBase } from "@/core/habits";
import { jobRate, nextEventInMs } from "@/core/jobs";
import type { ActiveJob, GameState } from "@/core/types";
import { duration } from "../format";
import { habitLabel, habitOptions, jobLabel, laneLabel } from "../labels";
import { useGame } from "../store";
import { Lately } from "./Feed";
import { RaceLive } from "./race/RaceLive";
import { Tips } from "./Tips";

function JobProgress({ job, label }: { job: Pick<ActiveJob, "remaining" | "duration">; label: string }) {
  const done = 100 * (1 - job.remaining / job.duration);
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(done)}>
      <span style={{ width: `${Math.min(100, done)}%` }} />
    </div>
  );
}

function JobRow({ game, job }: { game: GameState; job: ActiveJob }) {
  const dispatch = useGame((s) => s.dispatch);
  const label = jobLabel(game, job.spec);
  const rate = jobRate(game, job, false);
  if (job.spec.kind === "race" && job.race) {
    return (
      <li className="job job-race">
        <div className="job-head">
          <span className="job-lane">{laneLabel(job.lane)}</span>
          <span className="job-name">{label}</span>
          <span className="job-time num">{duration(job.remaining / Math.max(rate, 0.01))}</span>
        </div>
        <RaceLive game={game} job={job} compact />
      </li>
    );
  }
  return (
    <li className="job">
      <div className="job-head">
        <span className="job-lane">{laneLabel(job.lane)}</span>
        <span className="job-name">{label}</span>
        <span className="job-time num">{duration(job.remaining / Math.max(rate, 0.01))}</span>
        {!job.looping && job.spec.kind !== "race" && (
          <div className="job-actions">
            <button className="link-btn" onClick={() => dispatch({ type: "pauseJob", jobId: job.id })} aria-label={`Pause ${label}`}>Pause</button>
            <button className="link-btn" onClick={() => dispatch({ type: "cancelJob", jobId: job.id })} aria-label={`Cancel ${label}`}>Cancel</button>
          </div>
        )}
      </div>
      <JobProgress job={job} label={label} />
    </li>
  );
}

function HabitSlots({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  if (game.run.habitSlots.length === 0 || !game.run.revealed.includes("habits")) return null;
  const options = habitOptions(game);
  return (
    <div className="habit-slots">
      <h3 className="label">Habit slots</h3>
      {game.run.habitSlots.map((template, i) => (
        <label key={i} className="habit-slot">
          <span className="sr-only">Habit slot {i + 1}</span>
          <select value={template ?? ""} onChange={(e) => dispatch({ type: "setHabit", slot: i, template: e.target.value || null })}>
            <option value="">Empty slot</option>
            {options.map((t) => (
              <option key={t} value={t}>
                {habitLabel(game, t)}
              </option>
            ))}
          </select>
          {template?.startsWith("haul:") && nowhereToStow(game) && <span className="hint">Paused: the garage and driveway are full.</span>}
        </label>
      ))}
      {game.run.habitsKnown.length === 0 && <p className="hint">Repeat a job enough times and it becomes a Habit you can drop in a slot.</p>}
    </div>
  );
}

export function JobsBoard() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  if (!game) return null;
  const pausedJobs = game.run.pausedJobs ?? [];
  const handsBusy = game.run.jobs.some((j) => j.lane === "hands");
  const nextHabits = Object.entries(game.run.reps)
    .filter(([t]) => !game.run.habitsKnown.includes(t))
    .map(([t, n]) => ({ t, n, need: habitThreshold(game, t) }))
    .sort((a, b) => b.n / b.need - a.n / a.need)
    .slice(0, 2);
  const benches = Math.floor(channel(game, "benches"));
  return (
    <aside className="board" aria-label="Work in progress">
      <h2 className="board-title">On the go</h2>
      {game.run.raceNight && <p className="notice">Race Night has reserved your hands. Queued trips and studies wait until it ends.</p>}
      <Tips ids={["queue", "habits"]} />
      {!handsBusy && !game.run.raceNight && game.run.queue.length === 0 && <p className="notice">Your hands are free. {pausedJobs.length ? "Resume a paused job or start something else." : "Queue a trip or a study before you step away."}</p>}
      <ul className="jobs">
        {game.run.jobs.map((job) => (
          <JobRow key={job.id} game={game} job={job} />
        ))}
      </ul>
      {pausedJobs.length > 0 && (
        <div>
          <h3 className="label">Paused jobs</h3>
          <ul className="jobs">
            {pausedJobs.map((job) => {
              const label = jobLabel(game, job.spec);
              return (
                <li key={job.id} className="job">
                  <div className="job-head">
                    <span className="job-lane">Paused</span>
                    <span className="job-name">{label}</span>
                    <span className="job-time num">{Math.round(100 * (1 - job.remaining / job.duration))}%</span>
                    <div className="job-actions">
                      <button className="link-btn" onClick={() => dispatch({ type: "resumeJob", jobId: job.id })} aria-label={`Resume ${label}`}>Resume</button>
                      <button className="link-btn" onClick={() => dispatch({ type: "cancelJob", jobId: job.id })} aria-label={`Discard ${label}`}>Discard</button>
                    </div>
                  </div>
                  <JobProgress job={job} label={label} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {game.run.revealed.includes("queue") && (
        <div className="queue">
          <h3 className="label">
            Queue <span className="num muted">{game.run.queue.length}/3</span>
          </h3>
          {game.run.queue.length === 0 ? (
            <p className="hint">Queued jobs start as soon as you, or a bench, are free. Benches: {benches}.</p>
          ) : (
            <ol>
              {game.run.queue.map((spec, i) => (
                <li key={i}>
                  <span>
                    {jobLabel(game, spec)}
                    {spec.kind === "race" && nextEventInMs(game, spec.venueId, spec.event) > 0 && (
                      <span className="muted num"> · next run in {duration(nextEventInMs(game, spec.venueId, spec.event))}</span>
                    )}
                  </span>
                  {i > 0 && spec.kind !== "race" && game.run.queue[i - 1].kind !== "race" && (
                    <button className="link-btn" onClick={() => dispatch({ type: "prioritizeQueued", index: i })} aria-label={`Move ${jobLabel(game, spec)} up`}>Move up</button>
                  )}
                  <button className="link-btn" onClick={() => dispatch({ type: "cancelQueued", index: i })}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      <Lately />
      <HabitSlots game={game} />
      {game.run.revealed.includes("habits") && nextHabits.length > 0 && (
        <div className="habit-progress">
          <h3 className="label">Becoming habits</h3>
          {nextHabits.map(({ t, n, need }) => (
            <div key={t} className="mini-progress">
              <span>{habitLabel(game, templateBase(t))}</span>
              <span className="num muted">
                {Math.min(n, need)}/{need}
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
