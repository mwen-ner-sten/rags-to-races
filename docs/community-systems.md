# Community Systems Plan (Solo Dev Friendly)

A practical roadmap for adding community competition features without overbuilding.

## Ground Rules

- Ship small, fun things first.
- Prefer simple systems that are hard to exploit.
- Keep rules clear and visible so players trust the board.
- Do not add rewards that create gameplay power gaps.

## Phase 1 (Quick Wins)

### 1) Daily/Weekly Race Modifiers (same seed for everyone)

**What ships**
- One daily event and one weekly event.
- Everyone gets the same seed for that event window.
- 1–3 lightweight modifiers per event (weather, economy pressure, tire wear, etc.).

**Keep it simple**
- Use deterministic IDs like `daily-YYYY-MM-DD` and `weekly-YYYY-WW`.
- Store `event_id`, `seed`, and `game_version` with each submitted run.

### 2) Build export/import strings

**What ships**
- “Copy build string” button.
- “Import build string” input.

**Keep it simple**
- Start with a versioned text format (example: `B1:...`).
- Include only what matters: car/chassis, parts, tires, tuning.
- Reject invalid strings with friendly errors.

### 3) Leaderboards by archetype (not just raw score)

**What ships**
- Keep global leaderboard.
- Add a few archetype boards (example: grip, drift, budget).

**Keep it simple**
- Use a basic rules-based classifier at submission time.
- Freeze category when run is submitted.

## Phase 2 (After Phase 1 feels good)

### 1) Seasonal resets + cosmetic legacy rewards

**What ships**
- Seasons reset rankings on a fixed cadence.
- Rewards are cosmetic only (badge/title/livery).

### 2) Community challenges

**What ships**
- Limited-time constraints (example: “win using budget tires only”).
- Separate challenge leaderboard.

**Keep it simple**
- Validate constraints on submit.
- Publish clear challenge rules on the event page.

### 3) Replay snapshots for key races

**What ships**
- Save snapshots for notable runs (top placements / challenge winners).
- Lightweight replay view for learning and verification.

**Keep it simple**
- Prioritize determinism and low storage cost over cinematic replay quality.

## Anti-Cheese Principles (pragmatic)

1. **Server decides official results**
   - Treat client as untrusted.
2. **Versioned competition buckets**
   - Don’t compare runs across major balance patches.
3. **Deterministic event context**
   - Event seed + rules + version must be stored with the run.
4. **Fast exploit response**
   - If something is broken, freeze affected board/challenge and post a note.
5. **Clear invalidation reasons**
   - Tell players why a run was rejected.
6. **No pay-to-win rewards**
   - Community rewards stay cosmetic.

## Public Data Policy (fair but safe)

### Public now
- Player name (or chosen public handle).
- Event/challenge ID.
- Final score/time and rank.
- Archetype category.
- Game version.

### Public later (after event/challenge ends)
- Top build summaries.
- Featured replay snapshots.
- Aggregate stats (pick rates, clear rates).

### Not public
- Full anti-cheat signals.
- Device/network fingerprinting.
- Raw internal validation details.

## Suggested Build Order

1. Shared-seed daily/weekly events.
2. Archetype leaderboards.
3. Build export/import.
4. Seasonal reset + cosmetic rewards.
5. Community challenges.
6. Replay snapshots.

## “Vibe Coding” Scope Check

If a feature can’t be implemented in 1–3 focused sessions, split it.
Prioritize features players can feel immediately over back-office complexity.
