# Manufacturer careers

A podium in a standard County Fair Feature, using a Go-Kart or Beater with at least two matching family parts, earns the relevant manufacturer’s invitation. No Team founding, Owner title, or Circuit certificate is required. The Suppliers section appears in the Garage after an invitation. Go-Karts are the proof articles because both firms test at the Dirt Track as well as the Fair.

| Family | Inspection | Trial budget and proof | One-time payout |
| --- | --- | --- | --- |
| Redwheel Works | 15 Scrap Bucks | 50 in entry fees. Reach the podium at the Dirt Heat and County Fair Sprint. | 35 Scrap Bucks and a durable Redwheel drawing |
| Longhaul Engineering | 20 Scrap Bucks | 60 in entry fees. Finish a Dirt Feature, then finish the County Fair Sprint with at most one condition step lost. | 45 Scrap Bucks and a durable Longhaul drawing |

Compare the two recipes before committing an inspection fee. Sign a named Go-Kart with three fitted family parts. Keep that physical engine and three family parts for both trials. The deal allows at most three starts across its two benchmarks. Choose Push or Nurse at each start. Redwheel defaults to Push and Longhaul to Nurse. Inspection is charged once at signing. Normal event fees come from the garage when a trial starts, and are also counted against the deal’s spend limit. A queued entry can be withdrawn before payment. Normal races and other careers can run between trials. Standard Rally timecards still record eligible timed finishes, and an official works trial cannot also be a regularity entry.

File the result or start a new Season to archive the deal. Failure or retirement leaves the offer open. Earning the drawing closes that offer for good. An already-signed repeat contract in an older save can still finish. Homologated drawings and invitations survive ordinary and Team resets. A Scrap plan can select one earned drawing alongside a Club loan or a physical donor. Recasting uses one uninstalled workshop part and keeps its UID, condition and source provenance. Inherited donors and Club loan stock remain separate. The conversion adds no new inventory slot, and selling or stripping the result does not restore the Season’s drawing use.

| Drawing | Physical inputs | Output and tradeoff |
| --- | --- | --- |
| Redwheel | Small Engine, two metal, 8 Scrap Bucks | Lawn Mower Engine with the same condition. Catalogue power 10→16 and reliability 8→10, with weight 15→20. Fits the Push Mower and Riding Mower and can also power a Go-Kart. |
| Longhaul | Turf Tire, one rubber, 5 Scrap Bucks | Knobby Tire with the same condition. Catalogue reliability 8→12, with power 2→1, handling 5→3 and weight 6→7. Fits both mowers and the Go-Kart. |

## Playtest evidence

`npx tsx scripts/manufacturer-route.ts` starts a blank save with seed `manufacturer-natural-0` and plays ordinary reducer actions on a mixed schedule. An actual County Fair Feature win earned both invitations at Day 6.34. From that earned garage, the script runs the two contracts on separate copies of the save. It sets no parts, budgets, invitations, results, or milestones directly. Each trial reloads through the public save codec.

| Family | Named article | Trial results | Drawing used in the following Season |
| --- | --- | --- | --- |
| Redwheel | Copper Comet | P1/P1, 30 Scrap Bucks in entry fees | Day 0.76, naturally hauled Rusted Small Engine → Rusted Lawn Mower Engine |
| Longhaul | Quarry Mule | P1/P1, 40 Scrap Bucks in entry fees | Day 0.76, naturally hauled Good Turf Tire → Good Knobby Tire |

The unit and browser regressions use seeded garages for shorter checks. They cover official admission, proof and fees, save metadata, signed-engine substitution, and one-spend conversion with a donor and Club loan present.

The four-seed pacing check produced identical before/after medians for the first Scrap Reset. Daily took 20.4 days, mixed 6.4 and active 5.3. Five of seven targets passed in both runs. Two daily seeds took 21.4 days against a 21-day ceiling, and the mixed median fell below the 6.5-day floor. The natural supplier route also reproduced both drawing uses with the experiment enabled.

## Admission decision

**Keep hidden for human playtesting.** Both suppliers accepted the same earned garage on the same day. All four starts finished first with zero wear. That establishes reachability, but gives little evidence that either supplier made the player build differently.

| Charter question | Before | Redesigned |
| --- | --- | --- |
| 1. What decision? | Sign a three-part kart to two prescribed races. The value of the drawing becomes clear after signing. | Compare an engine recipe with a tire recipe before spending. Commit a kart and engine, then choose pace against a podium or wear target. |
| 2. Why repeat? | Re-signing an earned family repeated the same proof for another grant. | Each family needs proof once. The recurring choice is which opening build to support at Scrap Reset and which physical part to convert. A player who always builds the same mower may always pick the same recipe. |
| 3. Which pillar? | A real article and retained drawing connect parts to resets. | Racing can inform the next pace or part swap. The drawing puts the previous kart’s work back into the next mower. |
| 4. What does it cost? | A main tab, contract bookkeeping, inspection and race fees, then recipe inputs. | One Garage section for offers, trials and recasting. Fees, starts and material costs remain visible. There is still a learning cost to understanding family membership. |
| 5. When? | Late in the first Season after a matching Fair podium, possibly in a Beater that cannot sign. | Same invitation, still optional. The player can inspect the required kart and return later. |
| 6. What runs unattended? | Queued trials settle through normal race jobs, including while away. | Same. Signing, pace, retry and recast stay deliberate. |
| 7. What resets? | Scrap Reset and Team Reset archive the deal and clear the article. Invitations, drawings and filed records survive. Only Scrap Reset selects the next drawing. | Same persistence. An earned drawing also retires that supplier’s offer across Seasons. Owner and Circuit campaigns add no reset here. |
| 8. What would demonstrate improvement? | The scripted route demonstrated access and save integrity. It did not measure enjoyment or influence on builds. | Give players the same near-Fair save with the experiment on and off. Observe whether they change a part or pace for a reason, then watch which stock they keep and actually fit next Season. Record skipped offers and unused drawings too. |
| 9. Which labor is compressed? | One specific part hunt per subsequent Season, if the garage has stock. | Same hunt, and no incentive to re-certify a proven design. |
| 10. Which responsibility? | Managing an extra race contract alongside the normal ladder. | Choosing a supplier for a future build. This is a modest garage responsibility, insufficient on its own to support a manufacturing era. |
| 11. Casual default and expert depth? | Ignoring offers was safe. Experienced players could plan inventory and fits. | Ignoring offers is still safe. The suggested pace fits the supplier’s brief. Experienced players can trade finish position against wear and choose higher-condition stock for recasting. |

### Alternatives and questions for the owner

A passive loyalty bonus would reward keeping a third branded part even when its stats are wrong for the venue. The drawing already rewards the build with a tangible component and consumes stock. This experiment adds zero channel sources. A Team supplier contract is worth testing if first-Season players consistently ignore the offers until founding. Era 2 Option B would need a factory-level decision about production for other cars. Two personal drawings provide too little evidence to select it over The Circuit or Midnight.

Does a player with both offers choose the engine or tire because of the next build they want? Does anyone deliberately nurse a Redwheel kart or push a Longhaul kart after inspecting the car? If players simply accept the default and never fit the output, try moving the offer to Team founding or cut the trials before adding another family.
