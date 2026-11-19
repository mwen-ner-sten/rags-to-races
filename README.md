# Rags to Races

A browser incremental game about turning curbside junk into racing machines.

## The game

You start as a kid with a wagon, a borrowed socket set and the family garage.
Haul junk from the curb, clean and repair it, build a push mower, and race the
neighbourhood. Wins pay **Scrap Bucks** and **Rep**; Rep opens better places to
haul from and bigger venues to race at.

- **Seasons and the Scrap Reset.** Win the County Fair Feature and you can end
  the Season: the garage is scrapped, and you keep what you learned plus
  Legacy Points for perks. Pick a short Sprint Season, a long Push, or a Dare.
- **The Team layer.** Win the State Invitational and you found a team: hire
  crew, choose a discipline (Dirt Oval, Drag or Stage Rally) and re-found the
  team with a Team Reset.
- **Owner, Circuit and Club** campaigns sit on top of the Team layer.
- Jobs run in real time (the longest is 8 hours) and keep running while you
  are away. Repeated jobs become Habits, so automation is earned.

Design references: [Era 1 and Team spec](docs/design/era-1-and-team.md),
[Era 2 concept](docs/design/era-2-concept.md),
[gameplay charter](docs/gameplay-charter.md).

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright browser tests |
| `npm run sim` | Headless simulator |
| `npx tsx scripts/pacing-check.ts 8` | Pacing goals across 8 seeds |

## Project structure

```
src/
├── app/    Next.js App Router entry
├── core/   Pure game engine: state, jobs, races, resets (layers.ts), bonus channels
│   ├── content/  Authored data: parts, places, venues, vehicles, perks, team
│   └── sim/      The pacing bot
└── game/   React UI, Zustand store, save codec (save.ts) and components/
scripts/    Simulators and art tooling
tests/      Playwright specs and fixtures
```

Saves live in browser `localStorage` and can be exported and imported from
Settings.

## Tech

Next.js 16, React 19, TypeScript, Zustand, Tailwind CSS 4, Vitest, Playwright.

## License

[MIT](LICENSE)
