# Circuit Office iterations 26–37

These checks use deterministic race seeds and accelerated clocks. The tests named in the table run through the Circuit reducer unless a precise score or damage fixture is needed to isolate a rule.

| Iteration | Player change | Verification |
| --- | --- | --- |
| 26 | All six entrants earn points. Standings break points ties by wins, then seconds and subsequent places. | The guest and Dale each score eight. The guest ranks higher because their eight came from a win. |
| 27 | Calendar winners are archived. A visiting winner comes back faster, gaining 2.5% pace per title up to three levels. | Dale wins the calendar, appears in the archive and is 2.5% faster in the following calendar. The new state passes the save schema. |
| 28 | Visitor breakdowns carry forward within the calendar as slower pace and higher failure risk. | A single breakdown reduces Dale’s pace by 3% and adds six percentage points to their next DNF chance. |
| 29 | A workshop pass can repair a named visitor, trading away a guest repair. | Invalid aid is rejected. An eligible pass restores Dale’s odds and stays attached to the sealed result. In the seeded Close Grid regression, helping Big Ron and Jo takes the final winning gap from 8.3% to 2.5%, enough to certify. |
| 30 | Success Handicap unlocks after a certification. The points leader carries ballast and the charter requires two different winners. | The gate rejects a first-time promoter. The grid uses the 17% ballast for a guest or visiting leader, and a clean sweep fails where two distinct winners qualify. |
| 31 | Certifying a charter opens its reverse calendar, allowing the previous finale to run on a fresh build. | Homecoming’s first booked stop becomes the Backyard Feature, with its real race duration. The reversed booking survives schema validation. |
| 32 | Certifying two charters opens a longer calendar with a fourth meeting, higher targets and another workshop pass. | An automated Homecoming runs four settled meetings, qualifies against the raised targets, and round-trips through validation. |
| 33 | A voluntary workshop bid requires the guest to remain roadworthy and preserve a workshop pass while qualifying. | A consumed budget or a scrap engine fails the bid. The successful report records the license. |
| 34 | A policy license records distinct certified charter and stewardship pairings. Repetition under one policy leaves adaptive booking locked. | Two policies unlock the clerk upgrade. Removing the recent archive leaves both masteries intact. |
| 35 | An adaptive clerk chooses pace from estimated win and breakdown odds, favoring Nurse in Close Grid. | A Close Grid mower receives Nurse. A worn stock build with 71.6% Push win odds, 18.9% Nurse win odds and 1.6% Push DNF risk receives Push. |
| 36 | A licensed clerk may spend passes to fix parts that fail inspection and continue scheduling while the player is away. | Unauthorized repair is rejected. One pass for two failed parts leaves the car parked and the budget untouched. Two passes restore both parts and book the round. |
| 37 | A certified guest can return as a separate entry with its exact wear and an extra workshop pass. | A Rusted engine remains Rusted after the garage is cleared and the returning car is entered. The stored copy is consumed, the new calendar gets four passes, and the resulting save validates. |

Verified with the Circuit reducer and store tests, TypeScript, scoped ESLint and `git diff --check`.
