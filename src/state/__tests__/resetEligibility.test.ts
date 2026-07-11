import { afterEach, describe, expect, it } from "vitest";
import { RESPONSIBILITY_RESET_REQUIREMENTS } from "@/config/progression";
import { createInitialState, useGameStore } from "../store";

afterEach(() => useGameStore.setState(createInitialState()));

describe("responsibility reset action guards", () => {
  it("blocks Team Reset below the boundary and permits it exactly at the boundary", () => {
    const requirement = RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints;
    useGameStore.setState({ ...createInitialState(), lifetimeLPAllTime: requirement - 1, lifetimeLPThisTeamEra: 100 });
    useGameStore.getState().teamReset();
    expect(useGameStore.getState().teamEraCount).toBe(0);

    useGameStore.setState({ ...createInitialState(), lifetimeLPAllTime: requirement, lifetimeLPThisTeamEra: 100 });
    useGameStore.getState().teamReset();
    expect(useGameStore.getState().teamEraCount).toBe(1);

    const afterFirstReset = useGameStore.getState();
    useGameStore.getState().teamReset();
    expect(useGameStore.getState().teamEraCount).toBe(1);
    expect(useGameStore.getState().teamPoints).toBe(afterFirstReset.teamPoints);
  });

  it("blocks Owner Reset until both lifetime TP and Team-era boundaries are met", () => {
    const requirement = RESPONSIBILITY_RESET_REQUIREMENTS.owner;
    useGameStore.setState({ ...createInitialState(), lifetimeTeamPoints: requirement.lifetimeTeamPoints - 1, teamEraCount: requirement.teamEras, lifetimeTPThisOwnerEra: 100 });
    useGameStore.getState().ownerReset();
    expect(useGameStore.getState().ownerEraCount).toBe(0);

    useGameStore.setState({ ...createInitialState(), lifetimeTeamPoints: requirement.lifetimeTeamPoints, teamEraCount: requirement.teamEras - 1, lifetimeTPThisOwnerEra: 100 });
    useGameStore.getState().ownerReset();
    expect(useGameStore.getState().ownerEraCount).toBe(0);

    useGameStore.setState({ ...createInitialState(), lifetimeTeamPoints: requirement.lifetimeTeamPoints, teamEraCount: requirement.teamEras, lifetimeTPThisOwnerEra: 100 });
    useGameStore.getState().ownerReset();
    expect(useGameStore.getState().ownerEraCount).toBe(1);

    const afterFirstReset = useGameStore.getState();
    useGameStore.setState({
      lifetimeTeamPoints: requirement.lifetimeTeamPoints,
      teamEraCount: requirement.teamEras,
    });
    useGameStore.getState().ownerReset();
    expect(useGameStore.getState().ownerEraCount).toBe(1);
    expect(useGameStore.getState().ownerPoints).toBe(afterFirstReset.ownerPoints);
  });

  it("blocks Track Reset until both lifetime OP and Owner-era boundaries are met", () => {
    const requirement = RESPONSIBILITY_RESET_REQUIREMENTS.track;
    useGameStore.setState({ ...createInitialState(), lifetimeOwnerPoints: requirement.lifetimeOwnerPoints - 1, ownerEraCount: requirement.ownerEras, lifetimeOPThisTrackEra: 100 });
    useGameStore.getState().trackReset();
    expect(useGameStore.getState().trackEraCount).toBe(0);

    useGameStore.setState({ ...createInitialState(), lifetimeOwnerPoints: requirement.lifetimeOwnerPoints, ownerEraCount: requirement.ownerEras - 1, lifetimeOPThisTrackEra: 100 });
    useGameStore.getState().trackReset();
    expect(useGameStore.getState().trackEraCount).toBe(0);

    useGameStore.setState({ ...createInitialState(), lifetimeOwnerPoints: requirement.lifetimeOwnerPoints, ownerEraCount: requirement.ownerEras, lifetimeOPThisTrackEra: 100 });
    useGameStore.getState().trackReset();
    expect(useGameStore.getState().trackEraCount).toBe(1);

    const afterFirstReset = useGameStore.getState();
    useGameStore.setState({
      lifetimeOwnerPoints: requirement.lifetimeOwnerPoints,
      ownerEraCount: requirement.ownerEras,
    });
    useGameStore.getState().trackReset();
    expect(useGameStore.getState().trackEraCount).toBe(1);
    expect(useGameStore.getState().trackPrestigeTokens).toBe(afterFirstReset.trackPrestigeTokens);
  });
});
