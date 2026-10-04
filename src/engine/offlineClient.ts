import type { GameState } from "@/state/store";
import { getPersistedGameState } from "@/state/persistence";
import type { OfflineResult } from "./tick";

let progressListener: ((processed: number) => void) | undefined;
let job: { timestamp: number; promise: Promise<OfflineResult> } | null = null;

/** Strict Mode remounts share one job. No save is changed until settlement. */
export function calculateOfflineInWorker(state: GameState, ticks: number, elapsedMs?: number, onProgress?: (processed: number) => void): Promise<OfflineResult> {
  progressListener = onProgress;
  if (job?.timestamp === state.lastActiveTimestamp) return job.promise;
  const promise = new Promise<OfflineResult>((resolve, reject) => {
    const worker = new Worker(new URL("./offline.worker.ts", import.meta.url));
    worker.onmessage = (event) => {
      if (event.data.type === "progress") progressListener?.(event.data.processed);
      if (event.data.type === "complete") { worker.terminate(); resolve(event.data.result); }
      if (event.data.type === "error") { worker.terminate(); job = null; reject(new Error(event.data.message)); }
    };
    worker.onerror = (error) => { worker.terminate(); job = null; reject(new Error(error.message)); };
    worker.postMessage({ state: getPersistedGameState(state), ticks, elapsedMs });
  });
  job = { timestamp: state.lastActiveTimestamp, promise };
  return promise;
}
