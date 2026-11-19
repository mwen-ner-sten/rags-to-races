"use client";

import { useEffect } from "react";
import { useGame, type Toast } from "../store";

const TOAST_MS = 5000;

interface FeedToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function FeedToast({ toast, onDismiss }: FeedToastProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div className="feed-toast" data-kind={toast.kind} role="status">
      <span>{toast.text}</span>
      <button className="link-btn" onClick={() => onDismiss(toast.id)} aria-label="Dismiss message">
        ×
      </button>
    </div>
  );
}

/** Passing notes about what just happened while you were here. Stacks at most three. */
export function FeedToasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="feed-toasts">
      {toasts.map((t) => (
        <FeedToast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
