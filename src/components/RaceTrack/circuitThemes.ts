export interface CircuitTheme {
  trackSurface: string;
  trackEdge: string;
  trackEdgePattern: "solid" | "alternating";
  infield: string;
  infieldOpacity: number;
  surroundType: "grass" | "dirt" | "stands" | "grandstands" | "lights";
  ambientParticles: "dust" | "leaves" | "sparks" | null;
  startFinishColor: string;
  label: string;
  curbColorA: string;
  curbColorB: string;
}

const CIRCUIT_THEMES: Record<string, CircuitTheme> = {
  backyard_derby: {
    trackSurface: "#7a6a4a",
    trackEdge: "#5a4a2a",
    trackEdgePattern: "solid",
    infield: "#2a4a1a",
    infieldOpacity: 0.35,
    surroundType: "grass",
    ambientParticles: "dust",
    startFinishColor: "#c88830",
    label: "BACKYARD",
    curbColorA: "#5a4a2a",
    curbColorB: "#5a4a2a",
  },
  dirt_track: {
    trackSurface: "#5a3a1a",
    trackEdge: "#3a2510",
    trackEdgePattern: "solid",
    infield: "#4a3018",
    infieldOpacity: 0.3,
    surroundType: "dirt",
    ambientParticles: "dust",
    startFinishColor: "#d89030",
    label: "DIRT TRACK",
    curbColorA: "#6a4a1a",
    curbColorB: "#3a2510",
  },
  regional_circuit: {
    trackSurface: "#4a4a4a",
    trackEdge: "#3a3a3a",
    trackEdgePattern: "alternating",
    infield: "#1a3a1a",
    infieldOpacity: 0.25,
    surroundType: "stands",
    ambientParticles: null,
    startFinishColor: "#ffffff",
    label: "REGIONAL",
    curbColorA: "#cc2222",
    curbColorB: "#eeeeee",
  },
  national_circuit: {
    trackSurface: "#3a3a3a",
    trackEdge: "#2a2a2a",
    trackEdgePattern: "alternating",
    infield: "#1a2a1a",
    infieldOpacity: 0.2,
    surroundType: "grandstands",
    ambientParticles: null,
    startFinishColor: "#ffffff",
    label: "NATIONAL",
    curbColorA: "#cc2222",
    curbColorB: "#ffffff",
  },
  world_championship: {
    trackSurface: "#2a2a2a",
    trackEdge: "#1a1a1a",
    trackEdgePattern: "alternating",
    infield: "#0a1a0a",
    infieldOpacity: 0.15,
    surroundType: "lights",
    ambientParticles: "sparks",
    startFinishColor: "#ffffff",
    label: "WORLD",
    curbColorA: "#cc2222",
    curbColorB: "#ffffff",
  },
  continental_grand_prix: {
    trackSurface: "#242936",
    trackEdge: "#151923",
    trackEdgePattern: "alternating",
    infield: "#101827",
    infieldOpacity: 0.18,
    surroundType: "lights",
    ambientParticles: "sparks",
    startFinishColor: "#f5d76e",
    label: "CONTINENTAL",
    curbColorA: "#2457d6",
    curbColorB: "#f4f4f4",
  },
  endurance_series: {
    trackSurface: "#252a2f",
    trackEdge: "#11161b",
    trackEdgePattern: "alternating",
    infield: "#0c1820",
    infieldOpacity: 0.22,
    surroundType: "lights",
    ambientParticles: null,
    startFinishColor: "#dcecff",
    label: "ENDURANCE",
    curbColorA: "#2f80b7",
    curbColorB: "#dcecff",
  },
};

/** Default theme used when circuitId is unknown */
const DEFAULT_THEME: CircuitTheme = CIRCUIT_THEMES.backyard_derby;

export function getCircuitTheme(circuitId: string): CircuitTheme {
  return CIRCUIT_THEMES[circuitId] ?? DEFAULT_THEME;
}
