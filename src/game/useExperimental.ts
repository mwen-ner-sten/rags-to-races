import { useSyncExternalStore } from "react";
import { experimentalCareers, subscribeExperimentalCareers } from "@/core/features";

/** Re-renders when Settings flips the experimental careers flag. */
export function useExperimentalCareers(): boolean {
  return useSyncExternalStore(subscribeExperimentalCareers, experimentalCareers, () => false);
}
