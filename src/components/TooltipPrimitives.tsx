"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useThemeStore } from "@/hooks/useTheme";
import { THEME_VARS } from "@/components/ThemeShell";

/* ── Section ─────────────────────────────────────────────────────────────── */

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div
        style={{
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent, #c83e0c)",
          borderBottom: "1px solid var(--divider, rgba(255,255,255,.08))",
          paddingBottom: "0.2rem",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Row ──────────────────────────────────────────────────────────────────── */

export function Row({
  label,
  value,
  color,
  dim,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  dim?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span style={{ color: dim ? "var(--text-muted, #7a6040)" : "var(--text-secondary, #9a8570)" }}>
        {label}
      </span>
      <span
        style={{
          fontWeight: 600,
          fontFamily: "monospace",
          color: dim ? "var(--text-muted, #7a6040)" : color ?? "var(--text-primary, #d4b896)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── TooltipPanel ─────────────────────────────────────────────────────────── */

export function TooltipPanel({
  mousePos,
  children,
}: {
  mousePos: { x: number; y: number };
  children: React.ReactNode;
}) {
  const theme = useThemeStore((s) => s.theme);
  const left = Math.min(mousePos.x + 16, window.innerWidth - 328);
  const top = Math.min(mousePos.y + 12, window.innerHeight - 200);

  return createPortal(
    <div
      style={{
        ...THEME_VARS[theme] as React.CSSProperties,
        position: "fixed",
        top,
        left: Math.max(8, left),
        zIndex: 9999,
        pointerEvents: "none",
        background: "var(--panel-bg, #181008)",
        border: "1px solid var(--panel-border, #3a2510)",
        borderRadius: 6,
        padding: "0.75rem 1rem",
        minWidth: 240,
        maxWidth: 320,
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
        color: "var(--text-primary, #d4b896)",
        fontSize: "0.72rem",
        lineHeight: 1.6,
        fontFamily: "inherit",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ── HoverTooltipWrapper ──────────────────────────────────────────────────── */

export function HoverTooltipWrapper({
  children,
  renderTooltip,
}: {
  children: React.ReactNode;
  renderTooltip: (mousePos: { x: number; y: number }) => React.ReactNode;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseEnter={handleMove}
      onMouseLeave={() => setMousePos(null)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "help",
        position: "relative",
      }}
    >
      {children}
      {mousePos && renderTooltip(mousePos)}
    </div>
  );
}
