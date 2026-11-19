# Longitudinal career stress test

Eight independent accounts each completed 12 consecutive post-founding resets, six Scrap and six Team. Four accounts earned their initial team through ordinary races from empty garages. The other four began from the customer-career script’s distinct zero-race charters, each earned through invoices and two Shop Moves from an empty garage.

Each Team Reset changed both the racing discipline and organization. Every account played Dirt Oval, Drag, and Stage Rally, both organizations, and earned the Scouting and multi-source passport before using River and Quarry starts. The policy selected different legal objectives and hardships. It banked 16 completed objectives across the cohort. All eight qualified for Owner and won a normal Independent Tour before continuing the stress sequence.

| Founder | Seed | Simulated days | Founding save | Final mature save | Save after reset | Regional trips | Owner titles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Race | 0 | 63.33 | 21,459 B | 143,509 B | 76,162 B | 93 | 1 |
| Race | 1 | 57.33 | 22,251 B | 139,885 B | 75,389 B | 112 | 1 |
| Race | 2 | 58.75 | 21,885 B | 145,519 B | 78,074 B | 119 | 1 |
| Race | 3 | 55.76 | 21,813 B | 122,220 B | 73,739 B | 125 | 1 |
| Service | 0 | 52.33 | 8,299 B | 140,529 B | 73,201 B | 124 | 1 |
| Service | 1 | 47.76 | 8,482 B | 135,235 B | 68,284 B | 108 | 1 |
| Service | 2 | 47.76 | 8,309 B | 130,667 B | 72,825 B | 120 | 1 |
| Service | 3 | 45.92 | 8,329 B | 132,258 B | 70,555 B | 90 | 1 |

Post-founding play used the mixed visit schedule. The service prelude advances actual workshop job time in concentrated visits, so the absolute times do not compare how quickly a daily player would reach the two founding choices. Save sizes are raw JSON envelope bytes. The mature save comes from just before the last reset, including the still-active garage.

All 96 boundaries used the same Base64 envelope and decoder as the app. Each passed before and after the real reset action. There were no duplicate physical part or vehicle IDs, negative or non-finite balances, rejected intended choices, regressions in lifetime progression, or out-of-order Season entries. The policy also checked each successful action for negative or non-finite wallets and materials. The mature season checkpoint wallet ranged from 541 to 38,167 Scrap Bucks across accounts. From this cohort, the largest bankrolls represent ordinary season income that resets with the garage. No progression strain warranted flattening the hardest or most lucrative route.

On this Windows machine, across 21 samples per account, median idle-grown save serialization, import and validation took 1.86–2.67 ms after a reset and 3.92–6.56 ms just before it. The subsequent one-second engine action and Career opportunities calculation took 0.59–0.87 ms and 1.16–1.59 ms respectively. These are Node engine and save-path timings. Browser rendering was outside this test.

## Fixed Hand Tools Only automation

The same earned service charter formed a Workshop Collective under Hand Tools Only before and after the fix. Crew member Tina accumulated four automatically dispatched jobs even though the hardship disabled crew automation. After the fix she completed zero. Driver DeShawn still logged 69 manual race starts after the fix, compared with 66 before. The corrected long cohort crossed 16 Hand Tools Only seasons and recorded zero automated crew jobs in all of them. Crew members remain available for manual race support, and the Team panel explains why workshop assignments and incomplete apprenticeships are paused.

## Reproduce

```powershell
npx tsx scripts/customer-career.ts 4 test-results/longitudinal-service-founders checkpoints
npx tsx scripts/longitudinal-careers.ts race 4 test-results/longitudinal-race-verified
npx tsx scripts/longitudinal-careers.ts service 4 test-results/longitudinal-service-verified
```

Per-reset route, objective, balances, regional trip and save metrics are in each run’s `results.json`. The service prelude produces the source files used by the final command.
