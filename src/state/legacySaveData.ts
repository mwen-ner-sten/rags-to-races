/**
 * Frozen lookup tables for systems that no longer exist in the game but whose
 * progress old saves may still carry. The version-3 migration in
 * `persistence.ts` uses these to refund that progress; nothing else should.
 */

/** Talent tree node id -> tier, from the retired `src/data/talentNodes.ts`. */
export const LEGACY_TALENT_NODE_TIERS: Readonly<Record<string, number>> = {
  racer_t1_rev: 1,
  racer_t2_smooth: 2,
  racer_t2_throttle: 2,
  racer_t3_fatigue: 3,
  racer_t3_leadfoot: 3,
  racer_t4_iron: 4,
  racer_t4_nitro: 4,
  racer_t5_aura: 5,
  wrench_t1_grease: 1,
  wrench_t2_material: 2,
  wrench_t2_speed: 2,
  wrench_t3_forge: 3,
  wrench_t3_zero: 3,
  wrench_t4_forger: 4,
  wrench_t4_assembly: 4,
  wrench_t5_legendary: 5,
  hunter_t1_eyes: 1,
  hunter_t2_trade: 2,
  hunter_t2_dig: 2,
  hunter_t3_market: 3,
  hunter_t3_jackpot: 3,
  hunter_t4_smuggler: 4,
  hunter_t4_deep_vein: 4,
  hunter_t5_midas: 5,
};

/** Static outfit gear id -> tier, from the retired `src/data/gear.ts`. */
export const LEGACY_STATIC_GEAR_TIERS: Readonly<Record<string, number>> = {
  head_bare: 0,
  head_bandana: 1,
  head_goggles: 2,
  head_mechanic_helmet: 3,
  head_racing_helmet: 4,
  body_rags: 0,
  body_coveralls: 1,
  body_overalls: 2,
  body_jumpsuit: 3,
  body_race_suit: 4,
  hands_bare: 0,
  hands_garden: 1,
  hands_work: 2,
  hands_mechanic: 3,
  hands_racing: 4,
  feet_bare: 0,
  feet_sneakers: 1,
  feet_boots: 2,
  feet_mechanic_boots: 3,
  feet_racing_boots: 4,
  tool_stick: 0,
  tool_screwdriver: 1,
  tool_wrench: 2,
  tool_pro_toolbox: 3,
  tool_power_tools: 4,
  acc_empty: 0,
  acc_plastic_bag: 1,
  acc_satchel: 2,
  acc_belt: 3,
  acc_sponsor_bag: 4,
};

/** Tier-0 outfit pieces every save owned for free; they never earn a refund. */
export const LEGACY_DEFAULT_OWNED_GEAR: ReadonlySet<string> = new Set(
  Object.entries(LEGACY_STATIC_GEAR_TIERS).filter(([, tier]) => tier === 0).map(([id]) => id),
);
