import { setExperimentalCareers } from "@/core/features";

const PREF_KEY = "rags-to-races:experimental-careers";

/** The saved preference; false when storage is missing or blocked. */
export function readExperimentalPref(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

/** Remembers the choice in this browser (never in the game save) and applies it to the engine. */
export function applyExperimentalPref(on: boolean, persist: boolean): void {
  setExperimentalCareers(on);
  if (!persist) return;
  try {
    if (on) window.localStorage.setItem(PREF_KEY, "on");
    else window.localStorage.removeItem(PREF_KEY);
  } catch {
    // The choice still applies for this visit.
  }
}
