import { getCircuitTheme } from "./circuitThemes";

interface TrackSurfaceProps {
  circuitId: string;
  trackPath: string;
  finishLine: { x: number; y1: number; y2: number };
}

/**
 * Renders the circuit-specific track visuals:
 * infield, surface, curbs, decorations, start/finish line.
 */
export default function TrackSurface({
  circuitId,
  trackPath,
  finishLine,
}: TrackSurfaceProps) {
  const theme = getCircuitTheme(circuitId);

  return (
    <>
      {/* Infield fill */}
      <path d={trackPath} fill={theme.infield} opacity={theme.infieldOpacity} />

      {/* Track surface */}
      <path
        d={trackPath}
        fill="none"
        stroke={theme.trackSurface}
        strokeWidth={38}
        strokeLinejoin="round"
      />

      {/* Outer curb */}
      <path
        d={trackPath}
        fill="none"
        stroke={theme.curbColorA}
        strokeWidth={42}
        strokeLinejoin="round"
        opacity={0.3}
      />

      {/* Inner curb accent for alternating circuits */}
      {theme.trackEdgePattern === "alternating" && (
        <path
          d={trackPath}
          fill="none"
          stroke={theme.curbColorA}
          strokeWidth={40}
          strokeLinejoin="round"
          strokeDasharray="6 6"
          opacity={0.5}
        />
      )}

      {/* Track inner edge highlight */}
      <path
        d={trackPath}
        fill="none"
        stroke={theme.trackEdge}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Dashed center line */}
      <path
        d={trackPath}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1}
        strokeDasharray="8 6"
        opacity={0.2}
      />

      {/* Circuit decorations */}
      <CircuitDecorations circuitId={circuitId} />

      {/* Start / finish line */}
      <line
        x1={finishLine.x}
        y1={finishLine.y1}
        x2={finishLine.x}
        y2={finishLine.y2}
        stroke={theme.startFinishColor}
        strokeWidth={3}
        opacity={0.7}
      />
      {/* Checkerboard ticks on finish line */}
      <line
        x1={finishLine.x}
        y1={finishLine.y1}
        x2={finishLine.x}
        y2={finishLine.y2}
        stroke={theme.trackSurface}
        strokeWidth={3}
        strokeDasharray="3 3"
        opacity={0.5}
      />

      {/* Infield label */}
      <text
        x={200}
        y={105}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fontFamily="var(--font-mono)"
        fill="var(--text-muted)"
        opacity={0.15}
        letterSpacing="4"
      >
        {theme.label}
      </text>
    </>
  );
}

// ── Circuit-specific decorations ────────────────────────────────────────

function CircuitDecorations({ circuitId }: { circuitId: string }) {
  switch (circuitId) {
    case "backyard_derby":
      return <BackyardDecorations />;
    case "dirt_track":
      return <DirtTrackDecorations />;
    case "regional_circuit":
      return <RegionalDecorations />;
    case "national_circuit":
      return <NationalDecorations />;
    case "world_championship":
      return <WorldChampDecorations />;
    default:
      return null;
  }
}

/** Backyard: grass dots scattered inside oval, tiny shed */
function BackyardDecorations() {
  return (
    <g opacity={0.25}>
      {/* Grass texture dots */}
      {[
        [160, 80], [180, 110], [220, 90], [200, 120], [240, 105],
        [170, 130], [210, 75], [250, 115], [150, 105], [230, 130],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.5} fill="#4a8a2a" />
      ))}
      {/* Tiny shed */}
      <rect x={185} y={85} width={12} height={10} rx={1} fill="#6a4a2a" stroke="#4a3018" strokeWidth={0.5} />
      <polygon points="184,85 191,80 198,85" fill="#8a5a2a" />
    </g>
  );
}

/** Dirt: tire barriers along outer edge, crude fencing */
function DirtTrackDecorations() {
  return (
    <g opacity={0.3}>
      {/* Tire barriers at the turns */}
      {[
        [300, 40], [310, 55], [315, 75], [310, 95], [300, 110],
        [310, 130], [315, 145], [300, 160],
        [100, 40], [90, 55], [85, 75], [90, 95], [100, 110],
        [90, 130], [85, 145], [100, 160],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill="none" stroke="#3a2510" strokeWidth={1} />
      ))}
    </g>
  );
}

/** Regional: small grandstands at the turns */
function RegionalDecorations() {
  return (
    <g opacity={0.25}>
      {/* Grandstand — turn 1 */}
      <rect x={305} y={70} width={25} height={60} rx={2} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      {/* Crowd dots */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle key={`t1-${row}-${col}`} cx={310 + col * 5} cy={75 + row * 11} r={1} fill="var(--text-muted)" />
        ))
      )}
      {/* Grandstand — turn 2 */}
      <rect x={70} y={70} width={20} height={60} rx={2} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      {/* Pit lane indicator */}
      <line x1={160} y1={160} x2={240} y2={160} stroke="var(--text-muted)" strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
      <text x={200} y={175} textAnchor="middle" fontSize="5" fill="var(--text-muted)" opacity={0.3} fontFamily="var(--font-mono)">PIT</text>
    </g>
  );
}

/** National: filled grandstands, sponsor banners */
function NationalDecorations() {
  return (
    <g opacity={0.3}>
      {/* Main grandstand */}
      <rect x={300} y={55} width={35} height={90} rx={2} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      {/* Crowd dots */}
      {[0, 1, 2, 3, 4, 5, 6].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <circle key={`n1-${row}-${col}`} cx={306 + col * 5} cy={62 + row * 11} r={1.2} fill="var(--text-muted)" opacity={0.6} />
        ))
      )}
      {/* Second grandstand */}
      <rect x={65} y={65} width={25} height={70} rx={2} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      {/* Sponsor banners along top straight */}
      <rect x={160} y={18} width={80} height={4} rx={1} fill="var(--accent)" opacity={0.15} />
      <rect x={160} y={178} width={80} height={4} rx={1} fill="var(--accent)" opacity={0.1} />
      {/* Pit lane */}
      <line x1={140} y1={163} x2={260} y2={163} stroke="var(--text-muted)" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.3} />
    </g>
  );
}

/** World Championship: large grandstands, floodlights, timing tower */
function WorldChampDecorations() {
  return (
    <g opacity={0.35}>
      {/* Main grandstand — right turn */}
      <rect x={300} y={45} width={40} height={110} rx={3} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      {/* Crowd */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <circle key={`w1-${row}-${col}`} cx={306 + col * 5} cy={52 + row * 12} r={1.3} fill="var(--text-muted)" opacity={0.5} />
        ))
      )}
      {/* Left grandstand */}
      <rect x={55} y={55} width={30} height={90} rx={3} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />

      {/* Floodlights */}
      {[[310, 38], [330, 38], [310, 162], [330, 162], [70, 48], [70, 152]].map(([cx, cy], i) => (
        <g key={`fl-${i}`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - 8} stroke="var(--text-muted)" strokeWidth={0.5} />
          <circle cx={cx} cy={cy - 10} r={2} fill="var(--warning)" opacity={0.5} />
          <circle cx={cx} cy={cy - 10} r={5} fill="var(--warning)" opacity={0.08} />
        </g>
      ))}

      {/* Timing tower in infield */}
      <rect x={193} y={75} width={14} height={30} rx={1} fill="var(--panel-bg)" stroke="var(--panel-border)" strokeWidth={0.5} />
      <text x={200} y={93} textAnchor="middle" fontSize="4" fill="var(--accent)" opacity={0.4} fontFamily="var(--font-mono)">T1</text>

      {/* Run-off areas (lighter zones outside curves) */}
      <path d="M 280,30 A 70,70 0 0 1 280,170" fill="none" stroke="var(--text-muted)" strokeWidth={8} opacity={0.05} />
      <path d="M 120,30 A 70,70 0 0 0 120,170" fill="none" stroke="var(--text-muted)" strokeWidth={8} opacity={0.05} />

      {/* Sponsor banners */}
      <rect x={140} y={16} width={120} height={5} rx={1} fill="var(--accent)" opacity={0.12} />
    </g>
  );
}
