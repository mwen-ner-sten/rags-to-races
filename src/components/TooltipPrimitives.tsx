"use client";

import { useState, useRef } from "react";
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
  anchorRect,
  children,
}: {
  anchorRect: DOMRect;
  children: React.ReactNode;
}) {
  const theme = useThemeStore((s) => s.theme);
  const top = anchorRect.bottom + 8;
  const right = window.innerWidth - anchorRect.right;

  return createPortal(
    <div
      style={{
        ...THEME_VARS[theme] as React.CSSProperties,
        position: "fixed",
        top,
        right: Math.max(8, right),
        zIndex: 9999,
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
      onMouseDown={(e) => e.stopPropagation()}
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
  renderTooltip: (anchorRect: DOMRect) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleEnter = () => {
    if (wrapperRef.current) {
      setAnchorRect(wrapperRef.current.getBoundingClientRect());
    }
    setHovered(true);
  };

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "help",
        position: "relative",
      }}
    >
      {children}
      {hovered && anchorRect && renderTooltip(anchorRect)}
    </div>
  );
}
