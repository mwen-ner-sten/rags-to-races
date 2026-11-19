# Manufacturer careers

A podium in a standard County Fair Feature, using a Go-Kart or Beater with at least two matching family parts, earns the relevant manufacturer’s invitation. No Team founding, Owner title, or Circuit certificate is required. The Manufacturer tab appears after an invitation. Go-Karts are the proof articles because both firms test at the Dirt Track as well as the Fair.

| Family | Inspection | Trial budget and proof | Season payout |
| --- | --- | --- | --- |
| Redwheel Works | 15 Scrap Bucks | 50 in entry fees. Push to the podium at the Dirt Heat and County Fair Sprint. | 35 Scrap Bucks and a durable Redwheel drawing |
| Longhaul Engineering | 20 Scrap Bucks | 60 in entry fees. Nurse to a Dirt Feature finish, then finish the County Fair Sprint with at most one condition step lost. | 45 Scrap Bucks and a durable Longhaul drawing |

Sign a named Go-Kart with three fitted family parts. Keep that physical engine and three family parts for both trials. The deal allows at most three starts across its two benchmarks. Inspection is charged once at signing. Normal event fees come from the garage when a trial starts, and are also counted against the deal’s spend limit. A queued entry can be withdrawn before payment. Normal races and other careers can run between trials. Standard Rally timecards still record eligible timed finishes, and an official works trial cannot also be a regularity entry.

File the result or start a new Season to archive the deal. Homologated drawings and invitations survive ordinary and Team resets. A Scrap plan can select one earned drawing alongside a Club loan or a physical donor. Recasting uses one uninstalled workshop part and keeps its UID, condition and source provenance. Inherited donors and Club loan stock remain separate. The conversion adds no new inventory slot, and selling or stripping the result does not restore the Season’s drawing use.

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
