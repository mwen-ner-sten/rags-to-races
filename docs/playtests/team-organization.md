# Team organization playtest

Founding and later Team Resets offer Independent Garage or Workshop Collective. The organization stays in effect through Scrap Resets, alongside the chosen racing discipline. Saves written before this choice use Independent Garage.

| Same-start comparison | Independent Garage | Workshop Collective |
| --- | --- | --- |
| First Team founding candidates | Hauler, driver, spotter | Hauler, driver, mechanic |
| Three cleaning jobs after hiring Rosa and Benny in Season 2 | One starts, then two wait | Two start, then one waits |
| Parts cleaned in the same offline time window | 1 | 2 |
| Two queued curb trips from an idle garage | Both start | One starts, then one waits |
| Backyard Sprint requested while your trip is running | The crew starts the race | Your entry waits for the hands lane |

Both branches use the same seed, racing discipline, garage, tools, crew, and timing. The comparison exercises normal founding, Scrap Reset, hiring, enqueue, and offline advance. The Collective keeps dedicated driving and spotting assignments; its travel restriction applies to jobs taken from the queue and from crew Habits. A subsequent Team Reset can switch either direction without changing discipline.

Verified with `npx vitest run src/core/__tests__/team-organization.test.ts`.
