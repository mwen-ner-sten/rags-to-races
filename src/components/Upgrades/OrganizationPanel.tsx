"use client";
import { useGameStore } from "@/state/store";
import { SPECIALTIES, type RacingSpecialty, type OperatingPolicy } from "@/engine/campaign";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";

export default function OrganizationPanel({ layer }: { layer: "team" | "owner" }) {
  const campaign = useGameStore((s) => s.campaign);
  const setPolicy = useGameStore((s) => s.setOperatingPolicy);
  const choose = useGameStore((s) => s.chooseSpecialty);
  const claim = useGameStore((s) => s.claimSponsor);
  if (layer === "team") return <Panel kicker="Crew chief" title="How should the fleet work?">
    <p className="mb-3 text-sm">Choose a policy for new assignments. Keep four entry fees in reserve and repair vehicles below your condition limit before assigning them.</p>
    <div className="flex flex-wrap gap-2">{(["balanced", "income", "development"] as OperatingPolicy[]).map((policy) => <Button key={policy} onClick={() => setPolicy(policy)} aria-pressed={campaign.policy === policy}>{policy}</Button>)}</div>
    <p className="mt-2 text-sm">Balanced: 60% base payout and 5 crew XP. Income: 80% payout and 3 XP. Development: 40% payout and 10 XP. Your current assignments keep their original policy. Assigned mechanics reduce wear to 3; scouts add one material; drivers add 10% income; traders add 20% income.</p>
  </Panel>;
  return <Panel kicker="Team owner" title="Give the organization a specialty">
    <p className="mb-3 text-sm">Choose once per Owner era. Sponsor goals have no deadline; win three Features in each family to earn 5 Owner Points.</p>
    <div className="grid gap-3 sm:grid-cols-3">{(Object.keys(SPECIALTIES) as RacingSpecialty[]).map((id) => <section key={id} className="rounded border p-3" style={{ borderColor: "var(--panel-border)" }}>
      <h3>{SPECIALTIES[id].name}</h3><p className="my-2 text-sm">{SPECIALTIES[id].description}</p>
      <Button disabled={campaign.specialty !== null} onClick={() => choose(id)}>{campaign.specialty === id ? "Your specialty" : "Choose specialty"}</Button>
      <p className="my-2 text-sm">{id === "grassroots" ? "Local or regional" : id === "technical" ? "High-corner" : "Endurance Series"} Feature wins: {campaign.sponsorWins[id]}/3</p>
      <Button disabled={campaign.sponsorWins[id] < 3 || campaign.sponsorClaims.includes(id)} onClick={() => claim(id)}>{campaign.sponsorClaims.includes(id) ? "Sponsor paid" : "Collect 5 OP"}</Button>
    </section>)}</div>
  </Panel>;
}
