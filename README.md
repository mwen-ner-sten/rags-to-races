# Rags to Races

An incremental game where you garbage-pick your way from a busted lawnmower to a racing empire.

## Overview

Rags to Races is a browser-based idle/incremental game built with Next.js. Start by scavenging parts from curbside trash, assemble them into ramshackle vehicles, and race your way up through increasingly competitive circuits — from backyard derbies to the world championship.

**Core loop:** Scavenge → Build → Race → Upgrade → Prestige → Repeat

## Features

- **Progressive scavenging** — Unlock 6 locations from curbside trash to military scrapyards as your reputation grows
- **Vehicle building** — Assemble parts into vehicles ranging from push mowers to full racing machines
- **Racing simulation** — Compete across 5 circuit tiers with dynamic race events, DNF risks, and win streaks
- **Workshop upgrades** — 20+ upgrades across scavenging, building, racing, and maintenance categories
- **Vehicle wear & repair** — Parts degrade over races; manage condition or risk breakdowns
- **Prestige system** — Reset with permanent bonuses that scale with each prestige cycle
- **Auto-play mechanics** — Unlock auto-scavenge and auto-race as you progress
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

## License

[MIT](LICENSE)
