"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The one breakpoint the app uses (see CLAUDE.md): mobile is ≤640px. */
export const MOBILE_MEDIA_QUERY = "(max-width: 640px)";

/**
 * Hydration-safe media query. The server (and the first client render) report
 * `false`, so markup matches; the real value arrives on the post-hydration
 * render. Combine with CSS breakpoints so nothing flashes in between.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () => (typeof window === "undefined" ? false : window.matchMedia(query).matches);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}
