# Gameplay Playtest Plan

## Purpose

Playtests determine the roadmap. They are not only bug hunts: they test whether the
game creates the decisions and feelings described in the gameplay charter.

Record the environment URL, visible build SHA, viewport, save origin, and date for
every deliberate playtest.

## Development Exploration

Use `dev` for short, focused experiments.

- Cheats and developer controls are allowed.
- Test one design question at a time.
- Broken or incomplete systems may remain visible when clearly labeled experimental.
- Record observations before changing the implementation again.

Example question: "After a loss, can I explain which vehicle weakness I want to fix?"

## UAT Acceptance Pass

UAT represents a coherent release candidate. Run both a fresh-save path and an
existing-save path.

### Fresh Save

1. Start with cleared storage.
2. Complete the tutorial without developer tools.
3. Record time to first useful part, first vehicle, first race, first targeted upgrade,
   automation unlock, and first Scrap Reset.
4. After each race, record whether the next desired action is obvious and why.
5. Note every system introduced before it creates a meaningful decision.
6. Export the save before the reset and import it in a clean session.

### Existing Save

1. Load or import a save from the previous production version.
2. Confirm currencies, vehicles, inventory, upgrades, gear, achievements, tutorial
   state, and reset-layer progress survive.
3. Exercise the changed feature.
4. Reload the page and confirm persistence.
5. Simulate an offline interval and inspect the result.

### Presentation

- Check one desktop viewport above 640px.
- Check one mobile viewport at or below 640px.
- Confirm fixed navigation does not cover the last interactive element.
- Confirm the visible build SHA matches the intended deployment.
- Confirm help text and labels match actual behavior.

## First Charter Playtest

The first full playtest should answer these questions before new feature work:

1. What is the first genuinely satisfying moment?
2. Where does the player first wait without making a decision?
3. Does selecting parts feel like engineering or collecting ingredients?
4. Does a race teach anything about the build?
5. Which upgrade is the first interesting tradeoff?
6. Does automation unlock at the moment repetition becomes understood?
7. Is the first Scrap Reset exciting, relieving, or merely mathematically correct?
8. Which visible system could disappear without hurting the experience?

## Promotion Record

Copy this into a promotion PR:

```text
Environment:
Build SHA:
Stable URL:
Fresh-save duration:
Existing-save source version:
Desktop result:
Mobile result:
Save round-trip result:
Primary gameplay observation:
Known issues accepted:
Promotion recommendation: yes / no
```

## Roadmap Rule

After the first charter playtest, create roadmap items only for:

- A broken player promise
- A missing decision in the core loop
- Friction that automation should remove
- A supporting system that clearly strengthens a core pillar
- Deployment or save-safety work needed to test the game reliably

Do not prioritize a system solely because its data definitions or partial engine code
already exist.
