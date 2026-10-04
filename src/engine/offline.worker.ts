import { SeededRandomSource, setRandomSource } from "@/utils/random";
import { offlineTickBatches } from "./tick";
import { createInitialState } from "@/state/store";
import type { GameState } from "@/state/store";

self.onmessage = async (event: MessageEvent<{ state: GameState; ticks: number; elapsedMs?: number }>) => {
  try {
    setRandomSource(new SeededRandomSource(`offline:${event.data.state.lastActiveTimestamp}`));
    const batches = offlineTickBatches({ ...createInitialState(), ...event.data.state }, event.data.ticks, event.data.elapsedMs);
    let step = batches.next();
    while (!step.done) {
      self.postMessage({ type: "progress", processed: step.value });
      await new Promise((resolve) => setTimeout(resolve, 0));
      step = batches.next();
    }
    self.postMessage({ type: "complete", result: step.value });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Offline simulation failed" });
  }
};
