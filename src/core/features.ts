/**
 * Experimental side careers (Manufacturer works deals, the service counter and Shop Move,
 * County Motor Pool, Heritage and County Baton / freight). They are unbalanced and have not been
 * playtested, so they are off unless the player opts in. The flag is a UI preference: it is never
 * part of the game save, and saves that already hold progress in these systems keep that data
 * untouched while the systems stay hidden and inert.
 */
let experimental = false;
const listeners = new Set<() => void>();

export function experimentalCareers(): boolean {
  return experimental;
}

export function setExperimentalCareers(on: boolean): void {
  if (experimental === on) return;
  experimental = on;
  for (const listener of listeners) listener();
}

export function subscribeExperimentalCareers(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shown when an action for a hidden experimental career is attempted anyway. */
export const EXPERIMENTAL_OFF = "Turn on Experimental careers in Settings to use this.";

/** A County Baton safeguard only protects a part while the experimental careers are on. */
export function batonGuarded(part: { batonGuard?: true }): boolean {
  return experimentalCareers() && !!part.batonGuard;
}
