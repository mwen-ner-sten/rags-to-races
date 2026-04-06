"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import { THEMES } from "@/data/themes";

export default function FooterThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.id === theme);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: ".6rem",
          opacity: 0.5,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          letterSpacing: ".1em",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: current?.color ?? "#888",
          display: "inline-block",
          flexShrink: 0,
        }} />
        {current?.label?.toUpperCase() ?? "THEME"}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          right: 0,
          zIndex: 9999,
          minWidth: 160,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(20,20,24,.97)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.5)",
          padding: "4px 0",
          maxHeight: 240,
          overflowY: "auto",
        }}>
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  border: "none",
                  background: isActive ? "rgba(255,255,255,.08)" : "transparent",
                  cursor: "pointer",
                  color: isActive ? t.color : "rgba(255,255,255,.6)",
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: ".06em",
                  textAlign: "left",
                }}
              >
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: t.color,
                  display: "block",
                  flexShrink: 0,
                  boxShadow: isActive ? `0 0 6px ${t.color}` : "none",
                }} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
