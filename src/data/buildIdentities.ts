export type BuildAxis = "pace" | "handling" | "reliability";

export type BuildIdentityId =
  | "redline_special"
  | "cornering_rig"
  | "finish_first";

export interface BuildIdentityDefinition {
  id: BuildIdentityId;
  label: string;
  axis: BuildAxis;
  summary: string;
}

export const BUILD_IDENTITIES: Record<BuildIdentityId, BuildIdentityDefinition> = {
  redline_special: {
    id: "redline_special",
    label: "Redline Special",
    axis: "pace",
    summary: "Pace leads this blueprint's Good-parts reference.",
  },
  cornering_rig: {
    id: "cornering_rig",
    label: "Cornering Rig",
    axis: "handling",
    summary: "Handling leads this blueprint's Good-parts reference.",
  },
  finish_first: {
    id: "finish_first",
    label: "Finish-First Build",
    axis: "reliability",
    summary: "Reliability leads this blueprint's Good-parts reference.",
  },
};
