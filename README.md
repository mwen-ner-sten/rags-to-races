# Rags to Races

An incremental game where you garbage-pick your way from a busted lawnmower to a racing empire.

## Overview

Rags to Races is a browser-based idle/incremental game built with Next.js. Start by scavenging parts from curbside trash, assemble them into ramshackle vehicles, and race your way up through increasingly competitive circuits — from backyard derbies to the world championship.

**Core loop:** Scavenge → Build → Race → Upgrade → Prestige → Repeat

## Features

- **Progressive scavenging** — Unlock 6 locations from curbside trash to military scrapyards as your reputation grows
- **Vehicle building** — Assemble parts into vehicles ranging from push mowers to full racing machines
- **Racing simulation** — Compete on 7 circuits spanning T0–T6. Each circuit weights pace, grip, and reliability differently, every race is a contest (never a lock), and the post-race debrief tells you which part to fix
- **Real build tradeoffs** — Parts carry power, grip, reliability, and weight; a heavy engine buys pace at the cost of cornering
- **Workshop upgrades** — 30 upgrades across scavenging, building, racing, and maintenance, with Workshop sections revealed as the campaign reaches them
- **Vehicle wear & repair** — A damaged car drives slower *and* breaks down more; repair or risk it
- **Prestige system** — Scrap Reset for Legacy Points and permanent upgrades; the first reset is earned over an engaged 1–2 hours
- **Idle from the first tick** — The garage scavenges and races on its own; manual play is the accelerator, and auto-race pauses below a condition floor you set
- **15+ themes** — Swap between visual skins like grease, neon, prestige, and more
- **Mobile-responsive** — Full bottom-nav mobile layout
- **Persistent saves** — Game state auto-saves to localStorage

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Tech Stack

- [Next.js](https://nextjs.org) 16 — React framework
- [React](https://react.dev) 19 — UI library
- [TypeScript](https://www.typescriptlang.org) — Type safety
- [Zustand](https://zustand.docs.pmnd.rs) — State management with localStorage persistence
- [Tailwind CSS](https://tailwindcss.com) 4 — Styling

## Project Structure

```
src/
├── app/            # Next.js App Router (main page + design showcase)
├── components/     # UI panels (Junkyard, Garage, Race, Workshop, Shop, Settings, Admin)
├── engine/         # Game logic (tick, scavenge, race, build, prestige)
├── data/           # Content definitions (vehicles, parts, locations, circuits, upgrades, themes)
├── state/          # Zustand store
├── hooks/          # Custom React hooks
└── utils/          # Formatting, RNG, save/load helpers
```

## Project Guides

- [Development and release workflow](docs/development-workflow.md)
- [Gameplay charter](docs/gameplay-charter.md)
- [Gameplay playtest plan](docs/playtest-plan.md)

## License

[MIT](LICENSE)
