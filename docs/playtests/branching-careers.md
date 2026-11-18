# Branching careers

Development started at 00:35 Central on November 18 from local commit `01a43c4`. The three-hour session is organized around playable routes and paired trials.

## Opening measurements

The original first-season bot ran 12 seeds each on the daily, mixed and active schedules. The median first reset took 21.4, 6.5 and 5.3 simulated days respectively. Seven of the first 12 daily seeds exceeded the 21-day target, with the longest taking 24.4 days. All mixed seeds finished between 5.5 and 7.8 days. On a separate four-seed push test, team founding took 17.3–19.3 simulated days. These runs establish a comparison point for opening changes.

## Same starting save, different decisions

- **Salvage carryover.** An earned donor slot preserves one physical part with its condition and origin. Over eight paired seeds, the standard Tow Hitch opening took a median 1.5 trips and 80.5 seconds to build the mower, while carrying a chosen Worn Tiller Engine took 2.5 trips and 94 seconds and delivered that engine on every seed. [Builder trial](salvage-carryover.md)
- **Team organization.** An Independent Garage dispatched a race while the player was hauling. The Workshop Collective reserved its crew for workshop work and finished two parts in the same window the Independent Garage finished one. [Organization trial](team-organization.md)
- **Stage Rally.** An experienced team can switch at founding. A first-time founder can qualify through Hand-Me-Down Horsepower or Parts With a Past. Gravel, broken roads, switchbacks and fast lanes reward different equipment. The sum of separate stage times determines the winner. A 600-seed comparison for each driver call checks a close six-car field against the garage forecast.
- **Season comparisons.** The Notebook records the ending loadout and actual first Feature times. A player can put two seasons side by side after a Scrap or Team Reset. Older saves start recording at their next reset.

## Careers from an earned checkpoint

`scripts/career-forks.ts` started fresh garages, played through State and first team founding, and returned to a second Team Reset before forking on the same save. All 168 careers reached the County Fair Feature and decoded successfully. Each schedule/discipline figure below is the median time to the next Fair win pooled across Independent and Collective choices.

| Visits | Career forks | Dirt Oval | Drag | Stage Rally |
| --- | ---: | ---: | ---: | ---: |
| Daily | 48 | 13.9 days | 8.4 days | 17.4 days |
| Mixed | 72 | 2.8 days | 2.6 days | 3.3 days |
| Active | 48 | 1.6 days | 1.6 days | 2.1 days |

Those policies chase an outright win. A separate Rally trial entered the same Go-Kart on its class timecard at County Forest. It finished outside the podium, matched all four splits within 8%, earned six Legacy Points, and took a Scrap Reset. Its class best survived the reset. The Ridgeway certificate must be repeated in a later Season for a State Forest regularity invitation.

The first production browser pass exposed an old-save edge: an accepted legacy garage can have a Fair time beyond the saved Season clock. Rejecting that time only after retirement made the next reload lose the reset. The archive now preserves the historical values the live save loader already accepts.
## Careers tested without a racing win

The service counter buys a trailer wheel, a serviced engine and a fuel tank, each registered before its bench work. Two invoices bring the Riding Mower plans to the study bench. Three paid invoices and working transport qualify for a Shop Move. Moving with owned equipment or with one customer's salvage leads changes what the next garage can do. A later shop with a reference from each kind of move can found a Workshop Collective without entering a race.

Twelve blank garages completed their first move in 6.7–6.8 simulated hours of continuous decision-making. Each followed both transfer orders to founding, for 24 founding careers. A returning customer signed only for a real part found with their lead. The benchmark plays continuously and does not model daily check-ins. Run `npx tsx scripts/customer-career.ts 12` to reproduce it and export a charter-ready garage.

Eight other blank garages reached their first racing reset and each rebuilt the same archived mower twice. All sixteen heritage projects earned a museum or period-special register entry, then reached the next Scrap Reset. A museum delivery permanently removes the full car. The period special keeps the car and requires a class Feature podium with a different installed build.

On the initial twelve-seed Rally comparison, two regularity seasons timed out at sixty simulated days. Players can now declare either the all-time class record or the most recent classified pace. A slower setup can post its own reference without erasing the record. Replaying those seeds made all 24 County Forest certificates in 2.4–9.8 simulated days. Eighteen certificates were earned in fourth place or lower.

Production build `e4cf93e` passed 70 Playwright checks across desktop and mobile, including a browser-driven rebuild, museum donation, reload and register lookup.
