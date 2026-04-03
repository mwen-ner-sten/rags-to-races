"use client";

import { useState, useCallback, useRef, useId, useMemo } from "react";

export interface DataPoint {
  x: number;
  y: number;
}

export interface Dataset {
  label: string;
  color: string;
  points: DataPoint[];
  dashed?: boolean;
  fill?: boolean;
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
  height?: number;
  logScaleY?: boolean;
  shadeNegative?: boolean;
}

const PAD = { top: 24, right: 24, bottom: 44, left: 64 };
const INTERNAL_W = 720;

export default function MiniChart({
  datasets,
  xLabel,
  yLabel,
  thresholds = [],
  height = 340,
  logScaleY = false,
  shadeNegative = false,
}: MiniChartProps) {
  const [hover, setHover] = useState<{ dataX: number; svgX: number; svgY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const gradientId = useId();

  const width = INTERNAL_W;
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const bottomY = PAD.top + plotH;

  // ── Memoize all domain math, ticks, and SVG paths ──
  const chart = useMemo(() => {
    const allPoints = datasets.flatMap((d) => d.points);
    if (allPoints.length === 0) return null;

    const xMin = Math.min(...allPoints.map((p) => p.x));
    const xMax = Math.max(...allPoints.map((p) => p.x));
    let yMin = Math.min(...allPoints.map((p) => p.y), 0);
    let yMax = Math.max(...allPoints.map((p) => p.y));

    for (const t of thresholds) {
      if (t.axis === "y") {
        yMin = Math.min(yMin, t.value);
        yMax = Math.max(yMax, t.value);
      }
    }

    const yRange = yMax - yMin || 1;
    yMax += yRange * 0.06;
    if (yMin < 0) yMin -= yRange * 0.06;
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

    const xTicks = niceSteps(xMin, xMax, 7);
    const yTicks = logScaleY ? logSteps(Math.max(1, yMin), yMax) : niceSteps(yMin, yMax, 5);

    // Pre-build SVG path strings
    const paths = datasets.map((ds) =>
      ds.points.map((p, j) => `${j === 0 ? "M" : "L"}${toSvgX(p.x)},${toSvgY(p.y)}`).join(" "),
    );

    // Pre-build area fill paths
    const areaBaseY = toSvgY(Math.max(0, yMin));
    const areas = datasets.map((ds) => {
      if (!ds.fill || ds.points.length < 2) return null;
      return (
        `M${toSvgX(ds.points[0].x)},${areaBaseY} ` +
        ds.points.map((p) => `L${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ") +
        ` L${toSvgX(ds.points[ds.points.length - 1].x)},${areaBaseY} Z`
      );
    });

    return { xMin, xMax, yMin, yMax, xRange, toSvgX, toSvgY, xTicks, yTicks, paths, areas };
  }, [datasets, thresholds, logScaleY, plotW, plotH]);

  // ── Hover: nearest point lookup (binary search since points are sorted by x) ──
  const findNearest = useCallback(
    (ds: Dataset, targetX: number): DataPoint | null => {
      const pts = ds.points;
      if (pts.length === 0) return null;
      let lo = 0, hi = pts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].x < targetX) lo = mid + 1; else hi = mid;
      }
      // Check neighbors for closest
      if (lo > 0 && Math.abs(pts[lo - 1].x - targetX) < Math.abs(pts[lo].x - targetX)) lo--;
      return pts[lo];
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart) return;
      // Cache rect on first move, invalidate on mouseenter
      if (!rectRef.current && svgRef.current) {
        rectRef.current = svgRef.current.getBoundingClientRect();
      }
      const rect = rectRef.current;
      if (!rect) return;

      const scale = width / rect.width;
      const svgX = (e.clientX - rect.left) * scale;
      const svgY = (e.clientY - rect.top) * scale;
      const dataX = chart.xMin + ((svgX - PAD.left) / plotW) * chart.xRange;
      if (dataX < chart.xMin || dataX > chart.xMax) { setHover(null); return; }
      setHover({ dataX, svgX, svgY });
    },
    [chart, plotW, width],
  );

  const handleMouseEnter = useCallback(() => {
    // Refresh cached rect on enter
    if (svgRef.current) rectRef.current = svgRef.current.getBoundingClientRect();
  }, []);

  if (!chart) {
    return (
      <div style={{ color: "var(--text-muted)" }} className="text-xs p-8 text-center">
        No data to display
      </div>
    );
  }

  const { xMin, xMax, yMin, toSvgX, toSvgY, xTicks, yTicks, paths, areas } = chart;

  return (
    <div className="flex flex-col gap-0">
      <div className="w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          onMouseEnter={handleMouseEnter}
          style={{ overflow: "visible" }}
        >
          <defs>
            {datasets.map((ds, i) => (
              <linearGradient key={`grad-${i}`} id={`${gradientId}-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ds.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={ds.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
            <clipPath id={`${gradientId}-clip`}>
              <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Background */}
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="var(--panel-bg)" fillOpacity={0.5} rx={4} />

          {/* Grid */}
          {yTicks.map((v, i) => (
            <g key={`yg-${i}`}>
              <line x1={PAD.left} x2={width - PAD.right} y1={toSvgY(v)} y2={toSvgY(v)} stroke="var(--divider)" strokeOpacity={0.5} />
              <text x={PAD.left - 8} y={toSvgY(v) + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10} fontFamily="var(--font-geist-mono), monospace">
                {formatTick(v)}
              </text>
            </g>
          ))}
          {xTicks.map((v, i) => (
            <g key={`xg-${i}`}>
              <line x1={toSvgX(v)} x2={toSvgX(v)} y1={PAD.top} y2={bottomY} stroke="var(--divider)" strokeOpacity={0.3} />
              <text x={toSvgX(v)} y={bottomY + 16} textAnchor="middle" fill="var(--text-muted)" fontSize={10} fontFamily="var(--font-geist-mono), monospace">
                {formatTick(v)}
              </text>
            </g>
          ))}

          {/* Shade negative region */}
          {shadeNegative && yMin < 0 && (
            <rect
              x={PAD.left} y={toSvgY(0)} width={plotW}
              height={Math.max(0, toSvgY(yMin) - toSvgY(0))}
              fill="var(--danger)" fillOpacity={0.06}
              clipPath={`url(#${gradientId}-clip)`}
            />
          )}

          {/* Axes */}
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={bottomY} stroke="var(--divider)" strokeOpacity={0.8} />
          <line x1={PAD.left} x2={width - PAD.right} y1={bottomY} y2={bottomY} stroke="var(--divider)" strokeOpacity={0.8} />

          {/* Zero line */}
          {yMin < 0 && (
            <line x1={PAD.left} x2={width - PAD.right} y1={toSvgY(0)} y2={toSvgY(0)} stroke="var(--text-muted)" strokeOpacity={0.6} strokeDasharray="4,3" />
          )}

          {/* Axis labels */}
          <text x={PAD.left + plotW / 2} y={height - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{xLabel}</text>
          <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={11} transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>{yLabel}</text>

          {/* Threshold lines */}
          <g clipPath={`url(#${gradientId}-clip)`}>
            {thresholds.map((t, i) =>
              t.axis === "y" ? (
                <g key={`th-${i}`}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={toSvgY(t.value)} y2={toSvgY(t.value)} stroke={t.color} strokeDasharray="8,4" strokeOpacity={0.6} strokeWidth={1.5} />
                  <rect x={width - PAD.right - measureLabel(t.label) - 12} y={toSvgY(t.value) - 12} width={measureLabel(t.label) + 10} height={16} rx={3} fill={t.color} fillOpacity={0.15} />
                  <text x={width - PAD.right - 6} y={toSvgY(t.value) - 2} textAnchor="end" fill={t.color} fontSize={9} fontWeight={600}>{t.label}</text>
                </g>
              ) : (
                <g key={`th-${i}`}>
                  <line x1={toSvgX(t.value)} x2={toSvgX(t.value)} y1={PAD.top} y2={bottomY} stroke={t.color} strokeDasharray="8,4" strokeOpacity={0.6} strokeWidth={1.5} />
                  <rect x={toSvgX(t.value) + 3} y={PAD.top + 2} width={measureLabel(t.label) + 10} height={16} rx={3} fill={t.color} fillOpacity={0.15} />
                  <text x={toSvgX(t.value) + 8} y={PAD.top + 14} textAnchor="start" fill={t.color} fontSize={9} fontWeight={600}>{t.label}</text>
                </g>
              ),
            )}
          </g>

          {/* Area fills (pre-computed) */}
          <g clipPath={`url(#${gradientId}-clip)`}>
            {areas.map((d, i) => d ? <path key={`area-${i}`} d={d} fill={`url(#${gradientId}-fill-${i})`} /> : null)}
          </g>

          {/* Data lines (pre-computed) */}
          <g clipPath={`url(#${gradientId}-clip)`}>
            {datasets.map((ds, i) => (
              <path
                key={`ds-${i}`}
                d={paths[i]}
                fill="none"
                stroke={ds.color}
                strokeWidth={2.5}
                strokeDasharray={ds.dashed ? "8,5" : undefined}
                strokeOpacity={0.9}
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Hover interaction */}
          {hover && hover.svgX >= PAD.left && hover.svgX <= width - PAD.right && (
            <>
              <line x1={hover.svgX} x2={hover.svgX} y1={PAD.top} y2={bottomY} stroke="var(--accent)" strokeOpacity={0.4} strokeDasharray="3,3" />
              {datasets.map((ds, i) => {
                const pt = findNearest(ds, hover.dataX);
                if (!pt) return null;
                return <circle key={`dot-${i}`} cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={4} fill={ds.color} stroke="var(--panel-bg)" strokeWidth={2} />;
              })}
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 px-1">
        {datasets.map((ds, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-4 rounded-sm"
              style={{
                background: ds.color, height: 3, opacity: ds.dashed ? 0.6 : 0.9,
                ...(ds.dashed ? { background: `repeating-linear-gradient(90deg, ${ds.color} 0 4px, transparent 4px 7px)` } : {}),
              }}
            />
            <span style={{ color: "var(--text-secondary)" }} className="text-xs">{ds.label}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hover && hover.svgX >= PAD.left && hover.svgX <= width - PAD.right && (
        <div
          className="absolute rounded-lg border px-3 py-2 text-xs pointer-events-none z-20 shadow-lg backdrop-blur-sm"
          style={{
            background: "color-mix(in srgb, var(--panel-bg) 92%, transparent)",
            borderColor: "var(--panel-border)",
            color: "var(--text-secondary)",
            left: `calc(${((hover.svgX / width) * 100).toFixed(1)}% + ${hover.svgX > width * 0.65 ? -160 : 16}px)`,
            top: 16,
            minWidth: 130,
          }}
        >
          <div style={{ color: "var(--text-heading)" }} className="font-semibold mb-1 pb-1 border-b">
            {xLabel}: {Math.round(hover.dataX)}
          </div>
          {datasets.map((ds, i) => {
            const pt = findNearest(ds, hover.dataX);
            if (!pt) return null;
            return (
              <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: ds.color }} />
                  <span style={{ color: "var(--text-muted)" }}>{ds.label}</span>
                </span>
                <span className="font-mono font-semibold" style={{ color: ds.color }}>
                  {formatTooltipVal(pt.y)}
                </span>
              </div>
            );
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
  for (let p = startPow; p <= endPow; p++) ticks.push(Math.pow(10, p));
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function formatTooltipVal(v: number): string {
  if (Math.abs(v) >= 10_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(3);
}

function measureLabel(text: string): number {
  return text.length * 5.5;
}
