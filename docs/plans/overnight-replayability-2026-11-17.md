# Overnight playtest · November 17–18

## What makes a replay worth starting?

A season should let the player pursue a different result with familiar machinery. The initial build tests three scales of that idea.

| Role | Decision to try | What carries forward |
| --- | --- | --- |
| Builder | At Scrap Reset, choose Homebuilt Relay. Win Dirt and the Fair with the same kart and frame, changing tyres between them. Or choose Parts With a Past and plan the build around three haul sites. | Completion count, personal best, winning vehicle name and capped mastery. |
| Owner | After a State Feature win with a founded team, choose a championship charter. Race an existing car, enter the kart cup or field a two-car works team. The best four of five results count. | Titles and championship history. A Scrap or Team reset retires an unfinished tour. |
| Circuit promoter | After an Owner title, publish a three-meeting calendar. Choose a guest car, a field policy and when to use scarce workshop passes. Certify a calendar to earn a clerk. | Calendar archive, certified charters and the clerk. Closing the calendar frees you to publish another one. |

## First earned playtest

A fresh mixed-schedule push simulation with seed `overnight-owner-trial` earned the touring licence by day 31. The day-35 save has a mower, kart and Beater, and enough money to try the Homegrown Cup. Its kart placed first, first, first, second and first through ordinary queued race jobs. The best four scored 48 points.

With the earned garage, the same mower won all three Homecoming meetings under both stewardship policies. Open Paddock certified with 18 of 18 starters classified. Close Grid missed its two close finishes on three consecutive calendars. Try a weaker setup or a different guest under Close Grid. Measure how clearly the game explains that choice, how often it works, and whether it gives you a reason to keep a second mower.

The importable snapshots in this worktree are under `test-results/overnight/`. Use Settings → Save text → Import save in a separate browser profile if you want to keep playing your current garage.

## Three consecutive development rounds

The advisor reviews the current build with Sol, selects a change, and has Sol implement it. Each round ends with a focused gameplay check and a commit. That commit starts the following round immediately. The final round also runs the full suite and production build.

1. Give experienced builders another reason to play a mastered challenge.
2. Follow the first round’s choices into an Owner campaign. Find and fix a strategy that makes a different build or charter pointless.
3. Play through returning to a late-career save. Improve the highest-impact unresolved decision and verify desktop, mobile, offline settlement and the campaign handoff.

Product preferences still open for human playtesting include how many months a career ought to last, how frequently players want to revisit their first machinery, and how severe optional challenge restrictions should become. The first overnight build uses reversible balance values.
