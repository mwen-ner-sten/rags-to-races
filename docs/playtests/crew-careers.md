# Natural crew and sponsor cohort

Each of eight named seeds started with an empty garage on each visit schedule. The normal action-driven bot reached an earned first founding offer, and the script recorded that common checkpoint before forking the two strategies. The script issued ordinary actions for building, race settlement, crew experience, Team Reset purchases, qualifying for Owner, championship scoring, and signing the sponsor. It did not grant resources, crew service, ranks, race results, or titles.

The workshop strategy founded a Workshop Collective and prioritized a mechanic. It paid for an apprenticeship, trained one successor, used the learned Habit, and signed Reliable Parts. The racing strategy founded an Independent Garage, put crew into driving and spotting roles, paid for Dirt Track Notes, entered the Heat first after reopening Dirt, and signed Front Row Fuel. Each branch used the Team Reset path to found the team and then start a successor team. A first unsponsored Independent Tour title opened the sponsored tour.

All times below are simulated calendar days. Times by phase show medians with the observed range.

| Schedule and route | Empty → first team | First team → handover | Handover → first effect | First team → first title | First title → sponsor settlement | Empty → sponsor settlement | Sponsors paid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mixed, workshop | 17.75 (14.93–20.75) | 3.89 (2.59–5.00) | 0.19 (0.00–0.24) | 14.29 (13.00–17.77) | 2.50 (2.19–2.81) | 34.93 (32.52–38.33) | 8/8 |
| Mixed, racing | 17.75 (14.93–20.75) | 4.21 (3.17–5.00) | 0.50 (0.39–0.61) | 14.41 (13.58–18.42) | 2.58 (2.40–2.58) | 35.33 (32.33–40.33) | 8/8 |
| Daily, workshop | 126.88 (97.38–158.38) | 15.50 (12.00–16.00) | 3.00 (3.00–5.00) | 41.00 (38.00–46.00) | 4.00 | 172.38 (143.38–202.38) | 7/8 |
| Daily, racing | 126.88 (97.38–158.38) | 13.00 (11.00–15.00) | 6.00 (6.00–7.00) | 39.00 (35.00–45.00) | 4.00 | 169.88 (146.38–197.38) | 8/8 |

Mixed means four 15-minute visits per day. Daily means one five-minute visit. Work beyond each visit used normal away advancement. The first-team comparison is paired by seed and schedule. These are whole strategies, so a difference does not isolate the organization, handover, or sponsor alone.

All 16 apprenticeships graduated and their workshop Habit ran a crew job. All 16 Track Notes routes reopened Dirt through normal play and ran the Heat before entering a Sprint there. Each handover cost 8 Team Points. Across both profiles all 32 earned the first title and completed a sponsored tour. In the one unpaid contract, daily `crew-career-0` won four rounds and the championship but DNFed in the State finale. Reliable Parts correctly withheld payment because it requires a score in all five rounds. The risk is intentional.

## Changes from the rehearsal

In the first mixed and daily trial, the departing mentor Rosa was immediately available for rehire. She took the workshop slot but could not apprentice under herself. The two workshop rehearsals ran 95 and 190 days after founding without training a single apprentice. The active training program now leaves the mentor off that Season's recruitment sheet, the Collective prefers an available mechanic who can train, and eligible applicants are labeled. The driver or spotter already claimed by one concurrent race now contributes and logs service to that race only. A filed second call waits for a free driver. Saves with an older in-flight race keep the staff assigned when that race was originally rolled.

The two strategies finished at nearly the same time once they reached Team. Daily founding itself was substantially slower than mixed. This pass keeps the crew and sponsor requirements intact and records the earlier Builder leg separately rather than attributing its time to handovers.

## Championship entry plans

The same five race sign-ups recurred after players had already qualified the venues, chosen a lineup, and won the Independent Tour. The earned entry plan keeps that first tour manual. On a later tour of the same charter and discipline, players can name a lead and reserve car, select a pace, and keep a minimum balance. The plan files one legal entry at a time. It uses the normal queue and checks the minimum balance again before charging the fee. Class restrictions, wear, repairs, finite budgets, and race results still matter.

An entry plan stays with its current tour. Either withdrawal control pauses it. The pause button can leave a race already on track to finish. The final report summarizes rounds completed while away and the sponsor outcome.

The first two seeds were rerun from empty garages on both schedules and both strategies with the sponsored tour plan enabled. All eight sponsored tours settled five plan-marked races with zero manual round entries, and all eight sponsorships paid. Their first championships remained manual. Mixed scheduling produced the same settlement day as the manual branches. The four daily variants settled one day after their first title, compared with four days for the manual variants. The automatic path has its own timing and random race outcomes, so the sponsor success difference on daily seed 0 is an observation from those paths.

Focused tests cover title gating, reserve-car selection, concurrent spending after a sign-up, pausing on withdrawal, older saves, and browser-store catch-up after 48 hours away. The store test settles five rounds, reports the title and sponsor once, persists the finish, and checks that loading again cannot pay twice.

## Reproduce

```powershell
npx tsx scripts/crew-careers.ts 8 mixed test-results/crew-careers-verified-mixed
npx tsx scripts/crew-careers.ts 8 daily test-results/crew-careers-verified-daily
npx tsx scripts/crew-careers.ts 2 mixed test-results/crew-careers-entry-plan-mixed 0 entry-plan
npx tsx scripts/crew-careers.ts 2 daily test-results/crew-careers-entry-plan-daily 0 entry-plan
```

Each run writes the earned founding checkpoint and per-seed results under the requested output folder. Add a fourth argument to start at a particular seed index. The focused crew regression covers two simultaneous races, an explicitly called driver, and the old save format.
