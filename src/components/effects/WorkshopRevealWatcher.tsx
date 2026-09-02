"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "@/state/store";
import { getAvailableWorkshopTabs, WORKSHOP_REVEAL_PREFIX, WORKSHOP_TABS } from "@/data/workshopTabs";

/**
 * Announces a Workshop section the first time it becomes available in this
 * session, whichever action revealed it. Sections already available when the
 * save loads are not announced.
 */
export default function WorkshopRevealWatcher() {
  const availableIds = useGameStore(useShallow((s) => getAvailableWorkshopTabs(s).map((tab) => tab.id)));
  const announceUnlock = useGameStore((s) => s.announceUnlock);
  const previousRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = new Set(availableIds);
    if (!previous) return;
    for (const id of availableIds) {
      if (previous.has(id)) continue;
      const tab = WORKSHOP_TABS.find((candidate) => candidate.id === id);
      if (tab) announceUnlock(`${WORKSHOP_REVEAL_PREFIX}${tab.label}`);
    }
  }, [availableIds, announceUnlock]);

  return null;
}
