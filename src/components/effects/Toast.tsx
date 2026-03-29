"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/state/store";

interface ToastItem {
  id: number;
  message: string;
  exiting: boolean;
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
        // Auto-dismiss after 4s
        setTimeout(() => removeToast(id), 4000);
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
    <div className="pointer-events-none fixed top-4 right-4 z-[9998] flex flex-col gap-2 sm:top-20">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border border-amber-500/30 bg-zinc-900/95 px-4 py-3 shadow-lg shadow-amber-500/10 backdrop-blur-sm ${
            toast.exiting ? "animate-slide-out" : "animate-slide-in"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{"🏆"}</span>
            <span className="text-sm font-semibold text-amber-300">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
