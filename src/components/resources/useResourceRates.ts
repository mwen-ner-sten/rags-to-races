"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/state/store";
import { computeResourceRates, type ResourceRate } from "@/engine/rates";

export const RESOURCE_RATE_INTERVAL_MS = 1000;

/**
 * Resource amounts and per-second rates, recomputed from the store at most
 * once per `intervalMs`. Store writes schedule a trailing refresh instead of
 * re-rendering the rail on every 100ms tick.
 */
export function useResourceRates(intervalMs = RESOURCE_RATE_INTERVAL_MS): ResourceRate[] {
  // Seed from the store's initial (pre-persist) state so the first client
  // render matches the server HTML; the effect below swaps in live values.
  const [rates, setRates] = useState<ResourceRate[]>(() => computeResourceRates(useGameStore.getInitialState()));

  useEffect(() => {
    let lastRun = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      timer = null;
      lastRun = Date.now();
      setRates(computeResourceRates(useGameStore.getState()));
    };
    const schedule = () => {
      if (timer) return;
      const wait = Math.max(0, intervalMs - (Date.now() - lastRun));
      timer = setTimeout(run, wait);
    };

    run();
    const unsubscribe = useGameStore.subscribe(schedule);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);

  return rates;
}
