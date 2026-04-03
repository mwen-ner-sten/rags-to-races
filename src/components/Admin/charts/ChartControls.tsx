"use client";

/** Styled range slider with label and value badge */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  badge,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  badge?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span style={{ color: "var(--text-muted)" }} className="text-xs font-medium">
          {label}
        </span>
        <span
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
          className="text-xs font-mono font-semibold rounded px-1.5 py-0.5 min-w-[40px] text-center"
        >
          {badge ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="chart-slider"
      />
    </div>
  );
}

/** Styled checkbox toggle */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none group"
    >
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className="relative inline-flex items-center justify-center w-8 h-[18px] rounded-full transition-colors"
        style={{
          background: checked ? "var(--accent)" : "var(--input-bg)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--input-border)"}`,
        }}
      >
        <span
          className="absolute w-3.5 h-3.5 rounded-full transition-transform"
          style={{
            background: checked ? "var(--btn-primary-text)" : "var(--text-muted)",
            transform: checked ? "translateX(5px)" : "translateX(-5px)",
          }}
        />
      </span>
      <span style={{ color: "var(--text-secondary)" }} className="text-xs group-hover:opacity-80 transition-opacity">
        {label}
      </span>
    </label>
  );
}

/** Control panel wrapper for chart parameters */
export function ControlPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ borderColor: "var(--divider)" }}
      className="rounded-lg border p-3 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3"
    >
      {children}
    </div>
  );
}

/** Callout box for insights */
export function Insight({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  const colors = {
    info: { bg: "var(--accent)", text: "var(--accent)" },
    warning: { bg: "var(--warning)", text: "var(--warning)" },
    danger: { bg: "var(--danger)", text: "var(--danger)" },
    success: { bg: "var(--success)", text: "var(--success)" },
  };
  const c = colors[variant];
  return (
    <div
      className="rounded-lg border px-4 py-2.5 text-xs leading-relaxed"
      style={{
        background: `color-mix(in srgb, ${c.bg} 8%, transparent)`,
        borderColor: `color-mix(in srgb, ${c.bg} 25%, transparent)`,
        color: c.text,
      }}
    >
      {children}
    </div>
  );
}

/** Formula display */
export function Formula({ children }: { children: string }) {
  return (
    <code
      className="text-xs font-mono px-2 py-1 rounded"
      style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}
    >
      {children}
    </code>
  );
}
