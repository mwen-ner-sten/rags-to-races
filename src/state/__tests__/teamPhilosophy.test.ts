import { afterEach, describe, expect, it } from "vitest";
import { RESPONSIBILITY_RESET_REQUIREMENTS, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { createInitialState, useGameStore } from "../store";

const eligible = () => ({
  ...createInitialState(),
  lifetimeLPAllTime: RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints,
  lifetimeLPThisTeamEra: 100,
});

afterEach(() => useGameStore.setState(createInitialState()));

describe("Team Operating Philosophy settlement", () => {
  it("requires an explicit valid philosophy before Team Reset", () => {
    useGameStore.setState(eligible());
    (useGameStore.getState().teamReset as unknown as (philosophy?: never) => void)();
    expect(useGameStore.getState().teamEraCount).toBe(0);

    useGameStore.getState().teamReset("not-a-philosophy" as never);
    expect(useGameStore.getState().teamEraCount).toBe(0);

    useGameStore.getState().teamReset("junkyard_works" as never);
    expect(useGameStore.getState().teamEraCount).toBe(1);
    expect((useGameStore.getState() as unknown as { teamOperatingPhilosophy: string | null }).teamOperatingPhilosophy).toBe("junkyard_works");
  });

  it.each([
    ["junkyard_works", "scout"],
    ["engineering_works", "mechanic"],
    ["driver_led", "driver"],
  ] as const)("%s creates a standard %s department head", (philosophy, role) => {
    useGameStore.setState(eligible());

    useGameStore.getState().teamReset(philosophy);

    expect(useGameStore.getState().crewRoster).toEqual([
      expect.objectContaining({ role, level: 1, xp: 0, specialization: null }),
    ]);
  });

  it("retains the highest-XP matching member intact and clears all other crew", () => {
    const retained = { id: "best", name: "Jess Prime", role: "scout" as const, level: 6, xp: 900, specialization: "treasure_hunter" as const };
    useGameStore.setState({
      ...eligible(),
      crewRoster: [
        { id: "lower", name: "Jess", role: "scout", level: 4, xp: 300, specialization: null },
        retained,
        { id: "driver", name: "Rico", role: "driver", level: 8, xp: 2_000, specialization: "speed_demon" },
      ],
    });

    useGameStore.getState().teamReset("junkyard_works");

    expect(useGameStore.getState().crewRoster).toEqual([retained]);
  });

  it("preserves mastered auto-scavenge and auto-race labor through Team Reset", () => {
    useGameStore.setState({ ...eligible(), autoScavengeUnlocked: true, autoRaceUnlocked: true });

    useGameStore.getState().teamReset("engineering_works");

    expect(useGameStore.getState()).toMatchObject({
      autoScavengeUnlocked: true,
      autoRaceUnlocked: true,
    });
  });

  it("preserves the selected philosophy through Scrap Reset", () => {
    useGameStore.setState({
      ...createInitialState(),
      teamOperatingPhilosophy: "engineering_works",
      garage: ["one", "two", "three"].map((id) => ({
        id,
        definitionId: "push_mower",
        parts: {},
        stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 },
        builtAt: 1,
        condition: 100,
        totalRaces: 0,
      })),
      repPoints: SCRAP_RESET_REQUIREMENTS.reputation,
      lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    });

    useGameStore.getState().prestige();

    expect(useGameStore.getState().teamOperatingPhilosophy).toBe("engineering_works");
  });

  it("composes Owner starting level with Talent Academy without replacing the lead", () => {
    const retained = { id: "lead", name: "Dave Prime", role: "mechanic" as const, level: 8, xp: 2_500, specialization: "tuner" as const };
    useGameStore.setState({
      ...eligible(),
      crewRoster: [retained],
      ownerUpgradeLevels: { owner_crew_legends: 1 },
      trackPerkLevels: { track_academy: 1 },
    });

    useGameStore.getState().teamReset("engineering_works");

    const roster = useGameStore.getState().crewRoster;
    expect(roster).toHaveLength(4);
    expect(roster[0]).toEqual(retained);
    expect(roster.filter((member) => member.role === "mechanic")).toEqual([retained]);
    expect(roster.slice(1).every((member) => member.level === 3)).toBe(true);
    expect(useGameStore.getState().crewSlots).toBe(4);
  });

  it.each(["ownerReset", "trackReset"] as const)("clears the philosophy on %s", (action) => {
    const requirements = action === "ownerReset"
      ? {
          lifetimeTeamPoints: RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints,
          teamEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras,
          lifetimeTPThisOwnerEra: 100,
        }
      : {
          lifetimeOwnerPoints: RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints,
          ownerEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras,
          lifetimeOPThisTrackEra: 100,
        };
    useGameStore.setState({
      ...createInitialState(),
      ...requirements,
      teamOperatingPhilosophy: "driver_led",
    });

    useGameStore.getState()[action]();

    expect(useGameStore.getState().teamOperatingPhilosophy).toBeNull();
  });
});
