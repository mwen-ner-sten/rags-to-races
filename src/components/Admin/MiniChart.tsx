"use client";

import { useState, useCallback, useRef } from "react";

export interface DataPoint {
  x: number;
  y: number;
}

export interface Dataset {
  label: string;
  color: string;
  points: DataPoint[];
  dashed?: boolean;
}

export interface Threshold {
  value: number;
  axis: "x" | "y";
  color: string;
  label: string;
}

export interface MiniChartProps {
  datasets: Dataset[];
  xLabel: string;
  yLabel: string;
  thresholds?: Threshold[];
  width?: number;
  height?: number;
  logScaleY?: boolean;
  /** Optional: shade net-negative area below 0 on y-axis */
  shadeNegative?: boolean;
}

const PAD = { top: 20, right: 20, bottom: 40, left: 60 };

export default function MiniChart({
  datasets,
  xLabel,
  yLabel,
  thresholds = [],
  width = 600,
  height = 320,
  logScaleY = false,
  shadeNegative = false,
}: MiniChartProps) {
  const [hover, setHover] = useState<{ x: number; y: number; svgX: number; svgY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  // Compute axis ranges from all datasets
  const allPoints = datasets.flatMap((d) => d.points);
  if (allPoints.length === 0) return <div style={{ color: "var(--text-muted)" }} className="text-xs">No data</div>;

  const xMin = Math.min(...allPoints.map((p) => p.x));
  const xMax = Math.max(...allPoints.map((p) => p.x));
  let yMin = Math.min(...allPoints.map((p) => p.y), 0);
  let yMax = Math.max(...allPoints.map((p) => p.y));

  // Include threshold values in range
  for (const t of thresholds) {
    if (t.axis === "y") {
      yMin = Math.min(yMin, t.value);
      yMax = Math.max(yMax, t.value);
    }
  }

  // Add 5% padding to y range
  const yRange = yMax - yMin || 1;
  yMax += yRange * 0.05;
  if (yMin < 0) yMin -= yRange * 0.05;

  const xRange = xMax - xMin || 1;

  function toSvgX(val: number) {
    return PAD.left + ((val - xMin) / xRange) * plotW;
  }

  function toSvgY(val: number) {
    if (logScaleY && val > 0) {
      const logMin = Math.log10(Math.max(1, yMin));
      const logMax = Math.log10(yMax);
      const logRange = logMax - logMin || 1;
      return PAD.top + plotH - ((Math.log10(val) - logMin) / logRange) * plotH;
    }
    return PAD.top + plotH - ((val - yMin) / (yMax - yMin || 1)) * plotH;
  }

  function fromSvgX(sx: number) {
    return xMin + ((sx - PAD.left) / plotW) * xRange;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      const svgY = e.clientY - rect.top;
      const dataX = fromSvgX(svgX);
      if (dataX < xMin || dataX > xMax) {
        setHover(null);
        return;
      }
      setHover({ x: dataX, y: 0, svgX, svgY });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xMin, xMax, xRange],
  );

  // Generate grid lines
  const xTicks = niceSteps(xMin, xMax, 6);
  const yTicks = logScaleY ? logSteps(Math.max(1, yMin), yMax) : niceSteps(yMin, yMax, 5);

  // Find nearest data value at hover x
  function nearestY(ds: Dataset, targetX: number): number | null {
    if (ds.points.length === 0) return null;
    let best = ds.points[0];
    for (const p of ds.points) {
      if (Math.abs(p.x - targetX) < Math.abs(best.x - targetX)) best = p;
    }
    return best.y;
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={`yg-${i}`}>
            <line
              x1={PAD.left} x2={width - PAD.right}
              y1={toSvgY(v)} y2={toSvgY(v)}
              stroke="var(--panel-border)" strokeOpacity={0.4}
            />
            <text
              x={PAD.left - 6} y={toSvgY(v) + 4}
              textAnchor="end" fill="var(--text-muted)" fontSize={10}
            >
              {formatTick(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v, i) => (
          <g key={`xg-${i}`}>
            <line
              x1={toSvgX(v)} x2={toSvgX(v)}
              y1={PAD.top} y2={height - PAD.bottom}
              stroke="var(--panel-border)" strokeOpacity={0.3}
            />
            <text
              x={toSvgX(v)} y={height - PAD.bottom + 16}
              textAnchor="middle" fill="var(--text-muted)" fontSize={10}
            >
              {formatTick(v)}
            </text>
          </g>
        ))}

        {/* Shade negative region */}
        {shadeNegative && yMin < 0 && (
          <rect
            x={PAD.left}
            y={toSvgY(0)}
            width={plotW}
            height={toSvgY(yMin) - toSvgY(0)}
            fill="var(--danger)"
            fillOpacity={0.08}
          />
        )}

        {/* Axes */}
        <line
          x1={PAD.left} x2={PAD.left}
          y1={PAD.top} y2={height - PAD.bottom}
          stroke="var(--text-muted)" strokeOpacity={0.6}
        />
        <line
          x1={PAD.left} x2={width - PAD.right}
          y1={height - PAD.bottom} y2={height - PAD.bottom}
          stroke="var(--text-muted)" strokeOpacity={0.6}
        />

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PAD.left} x2={width - PAD.right}
            y1={toSvgY(0)} y2={toSvgY(0)}
            stroke="var(--text-muted)" strokeOpacity={0.5}
            strokeDasharray="4,3"
          />
        )}

        {/* Axis labels */}
        <text
          x={PAD.left + plotW / 2}
          y={height - 4}
          textAnchor="middle" fill="var(--text-muted)" fontSize={11}
        >
          {xLabel}
        </text>
        <text
          x={14} y={PAD.top + plotH / 2}
          textAnchor="middle" fill="var(--text-muted)" fontSize={11}
          transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
        >
          {yLabel}
        </text>

        {/* Threshold lines */}
        {thresholds.map((t, i) =>
          t.axis === "y" ? (
            <g key={`th-${i}`}>
              <line
                x1={PAD.left} x2={width - PAD.right}
                y1={toSvgY(t.value)} y2={toSvgY(t.value)}
                stroke={t.color} strokeDasharray="6,3" strokeOpacity={0.7}
              />
              <text
                x={width - PAD.right - 4}
                y={toSvgY(t.value) - 4}
                textAnchor="end" fill={t.color} fontSize={9}
              >
                {t.label}
              </text>
            </g>
          ) : (
            <g key={`th-${i}`}>
              <line
                x1={toSvgX(t.value)} x2={toSvgX(t.value)}
                y1={PAD.top} y2={height - PAD.bottom}
                stroke={t.color} strokeDasharray="6,3" strokeOpacity={0.7}
              />
              <text
                x={toSvgX(t.value) + 4}
                y={PAD.top + 10}
                textAnchor="start" fill={t.color} fontSize={9}
              >
                {t.label}
              </text>
            </g>
          ),
        )}

        {/* Data lines */}
        {datasets.map((ds, i) => {
          const pathD = ds.points
            .map((p, j) => `${j === 0 ? "M" : "L"}${toSvgX(p.x)},${toSvgY(p.y)}`)
            .join(" ");
          return (
            <path
              key={`ds-${i}`}
              d={pathD}
              fill="none"
              stroke={ds.color}
              strokeWidth={2}
              strokeDasharray={ds.dashed ? "6,4" : undefined}
              strokeOpacity={0.9}
            />
          );
        })}

        {/* Hover crosshair */}
        {hover && hover.svgX >= PAD.left && hover.svgX <= width - PAD.right && (
          <line
            x1={hover.svgX} x2={hover.svgX}
            y1={PAD.top} y2={height - PAD.bottom}
            stroke="var(--text-muted)" strokeOpacity={0.5} strokeDasharray="3,3"
          />
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 px-2">
        {datasets.map((ds, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5" style={{ background: ds.color, height: 2 }} />
            <span style={{ color: "var(--text-muted)" }} className="text-xs">{ds.label}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hover && hover.svgX >= PAD.left && hover.svgX <= width - PAD.right && (
        <div
          className="absolute rounded border px-2 py-1.5 text-xs pointer-events-none z-10"
          style={{
            background: "var(--panel-bg)",
            borderColor: "var(--panel-border)",
            color: "var(--text-secondary)",
            left: Math.min(hover.svgX + 12, width - 160),
            top: Math.max(hover.svgY - 10, 0),
          }}
        >
          <div style={{ color: "var(--text-muted)" }} className="font-semibold mb-0.5">
            {xLabel}: {Math.round(hover.x)}
          </div>
          {datasets.map((ds, i) => {
            const val = nearestY(ds, hover.x);
            return val !== null ? (
              <div key={i}>
                <span style={{ color: ds.color }}>{ds.label}:</span>{" "}
                {val.toFixed(val < 10 ? 2 : 0)}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function niceSteps(min: number, max: number, approxCount: number): number[] {
  const range = max - min || 1;
  const rough = range / approxCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const nice = rough / mag >= 5 ? 5 * mag : rough / mag >= 2 ? 2 * mag : mag;
  const start = Math.ceil(min / nice) * nice;
  const ticks: number[] = [];
  for (let v = start; v <= max + nice * 0.01; v += nice) ticks.push(v);
  return ticks;
}

function logSteps(min: number, max: number): number[] {
  const ticks: number[] = [];
  const startPow = Math.floor(Math.log10(Math.max(1, min)));
  const endPow = Math.ceil(Math.log10(max));
  for (let p = startPow; p <= endPow; p++) {
    ticks.push(Math.pow(10, p));
  }
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}
