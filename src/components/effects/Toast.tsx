"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/state/store";

interface ToastItem {
  id: number;
  message: string;
  exiting: boolean;
}

function getAnnouncementPresentation(message: string): { eyebrow: string; icon: string } {
  if (/unlocked|new location|enabled/i.test(message)) {
    return { eyebrow: "New Unlock", icon: "\u{1F513}" };
  }
  if (/achievement/i.test(message)) {
    return { eyebrow: "Achievement", icon: "\u{1F3C6}" };
  }
  if (/milestone|legacy points/i.test(message)) {
    return { eyebrow: "Milestone", icon: "\u{2B50}" };
  }
  if (/rival defeated/i.test(message)) {
    return { eyebrow: "Rival Defeated", icon: "\u{1F3C1}" };
  }
  return { eyebrow: "Progress Update", icon: "\u{1F389}" };
}

let nextId = 0;

export default function ToastContainer() {
  const unlockEvents = useGameStore((s) => s.unlockEvents);
  const clearUnlockEvents = useGameStore((s) => s.clearUnlockEvents);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const processedRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    if (unlockEvents.length === 0) return;
    // Only process new events
    const newEvents = unlockEvents.slice(processedRef.current);
    if (newEvents.length === 0) return;
    processedRef.current = unlockEvents.length;

    // Stagger toast display
    newEvents.forEach((message, i) => {
      setTimeout(() => {
        const id = nextId++;
        setToasts((prev) => [...prev, { id, message, exiting: false }]);
        // Give players enough time to understand what changed.
        setTimeout(() => removeToast(id), 7000);
      }, i * 600);
    });

    // Clear events from store after processing
    const clearTimeout_ = setTimeout(() => {
      clearUnlockEvents();
      processedRef.current = 0;
    }, newEvents.length * 600 + 100);

    return () => clearTimeout(clearTimeout_);
  }, [unlockEvents, clearUnlockEvents, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-20 left-1/2 z-[9998] flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 flex-col gap-3 sm:top-24">
      {toasts.map((toast) => {
        const presentation = getAnnouncementPresentation(toast.message);
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto overflow-hidden rounded-xl border p-4 backdrop-blur-sm ${
              toast.exiting ? "animate-slide-out" : "animate-slide-in"
            }`}
            style={{
              borderColor: "var(--accent-border)",
              background: "linear-gradient(145deg, color-mix(in srgb, var(--panel-bg) 96%, black), color-mix(in srgb, var(--panel-bg) 88%, var(--accent) 12%))",
              boxShadow: "0 0 36px color-mix(in srgb, var(--accent) 24%, transparent), 0 18px 40px rgba(0,0,0,.55)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl"
                style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}
              >
                {presentation.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[.65rem] font-bold uppercase tracking-[.2em]" style={{ color: "var(--accent)" }}>
                  {presentation.eyebrow}
                </div>
                <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss announcement"
                className="shrink-0 cursor-pointer rounded-md border px-2 py-1 text-xs font-bold"
                style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-bg)" }}
              >
                Got it
              </button>
            </div>
            <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full" style={{ background: "var(--divider)" }}>
              <div className="unlock-announcement-timer h-full w-full" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
