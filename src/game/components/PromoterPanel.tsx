"use client";

import { useState } from "react";
import { getVenue } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import {
  CLOSE_FINISH_GAP, PROMOTER_CHARTERS, PROMOTER_VISITORS, STEWARDSHIP, promoterBookingReason, promoterCharterLock, promoterEligible,
  promoterGate, promoterRaceOdds, promoterReport, type PromoterCharter, type PromoterMeet, type Stewardship,
} from "@/core/promoter";
import type { GameState, TuneSetting } from "@/core/types";
import { useGame } from "../store";

const charterIds = Object.keys(PROMOTER_CHARTERS) as PromoterCharter[];
const stewardshipIds = Object.keys(STEWARDSHIP) as Stewardship[];
const setupOptions: { id: TuneSetting; name: string }[] = [
  { id: "balanced", name: "Balanced" }, { id: "power", name: "Power" }, { id: "reliable", name: "Reliability" },
];

function CharterCard({ game, id }: { game: GameState; id: PromoterCharter }) {
  const dispatch = useGame((state) => state.dispatch);
  const [selected, setSelected] = useState("");
  const [stewardship, setStewardship] = useState<Stewardship>("paddock");
  const charter = PROMOTER_CHARTERS[id];
  const vehicles = game.run.vehicles.filter((vehicle) => promoterEligible(game, id, vehicle));
  const current = vehicles.find((vehicle) => vehicle.uid === selected) ?? vehicles[0];
  const lock = promoterCharterLock(game, id);
  return (
    <article className="card">
      <div className="card-body">
        <h3>{charter.name} {game.promoter?.certified.includes(id) && <span className="chip">Certified</span>}</h3>
        <p>{charter.brief}</p>
        <p className="muted">{charter.rounds.map(({ venueId }) => getVenue(venueId).name).join(" · ")}</p>
        <p>{charter.minimumPoints} points · {charter.minimumFinishes} finishes · {charter.minimumPodiums} podium{charter.minimumPodiums === 1 ? "" : "s"}</p>
        {lock ? <p className="why">{lock}</p> : current ? (
          <>
            <label className="inline" htmlFor={`promoter-guest-${id}`}>Guest build
              <select id={`promoter-guest-${id}`} value={current.uid} onChange={(event) => setSelected(event.target.value)}>
                {vehicles.map((vehicle) => <option key={vehicle.uid} value={vehicle.uid}>{vehicle.name}</option>)}
              </select>
            </label>
            <label className="inline" htmlFor={`promoter-rules-${id}`}>Stewardship
              <select id={`promoter-rules-${id}`} value={stewardship} onChange={(event) => setStewardship(event.target.value as Stewardship)}>
                {stewardshipIds.map((rules) => <option key={rules} value={rules}>{STEWARDSHIP[rules].name}</option>)}
              </select>
            </label>
            <p className="muted">{STEWARDSHIP[stewardship].brief}</p>
            <button type="button" onClick={() => dispatch({ type: "promoter", move: { type: "publish", charter: id, stewardship, vehicleUid: current.uid } })}>Publish {charter.name}</button>
          </>
        ) : <p className="why">A race-ready {getVehicle(charter.vehicleId).name} is required.</p>}
      </div>
    </article>
  );
}

function Calendar({ game, meet }: { game: GameState; meet: PromoterMeet }) {
  const dispatch = useGame((state) => state.dispatch);
  const [confirmClose, setConfirmClose] = useState(false);
  const charter = PROMOTER_CHARTERS[meet.charter];
  const stewardship = STEWARDSHIP[meet.stewardship];
  const report = promoterReport(meet);
  const reason = promoterBookingReason(meet);
  const current = charter.rounds[meet.results.length];
  return (
    <>
      <section className="section" aria-labelledby="promoter-calendar-heading">
        <h2 id="promoter-calendar-heading">{charter.name}</h2>
        <p>Guest entry <strong>{meet.guest.name}</strong> · {stewardship.name}</p>
        <p>{report.points}/{charter.minimumPoints} points · {report.finishes}/{charter.minimumFinishes} finishes · {report.podiums}/{charter.minimumPodiums} podiums</p>
        <p>Field report · {report.fieldFinishes}/{stewardship.finishes} finishers{stewardship.closeFinishes > 0 && ` · ${report.closeFinishes}/${stewardship.closeFinishes} close finishes`}</p>
        <ol className="plain">
          {charter.rounds.map(({ venueId, event }, index) => {
            const result = meet.results[index];
            return (
              <li key={`${venueId}-${event}`}>
                <strong>{getVenue(venueId).name} · {event}</strong>
                {result && <>
                  <p className="blurb">
                    {result.dnf ? "Did not finish" : `Finished ${result.position} of ${result.fieldSize}`} with {result.call === "push" ? "Push" : "Nurse"}.
                    {result.wear.length > 0 && ` Wear on ${result.wear.map(({ slot }) => slot).join(", ")}.`}
                  </p>
                  <details>
                    <summary>Visiting field{result.winningGap !== null && ` · ${(result.winningGap * 100).toFixed(1)}% winning gap${result.winningGap <= CLOSE_FINISH_GAP ? " · Close finish" : ""}`}</summary>
                    <ol className="plain">
                      {[...result.visitors].sort((a, b) => Number(a.dnf) - Number(b.dnf) || a.position - b.position).map((entry) => (
                        <li key={entry.id}>{PROMOTER_VISITORS[entry.id].name} · {entry.dnf ? "DNF" : `P${entry.position}`}</li>
                      ))}
                    </ol>
                  </details>
                </>}
              </li>
            );
          })}
        </ol>
      </section>
      {!report.complete && current && (
        <section className="section" aria-labelledby="promoter-meeting-heading">
          <h2 id="promoter-meeting-heading">Next meeting</h2>
          <p>{getVenue(current.venueId).character}</p>
          {meet.booking ? <p role="status">Booked with {meet.booking.result.call === "push" ? "Push" : "Nurse"} · {Math.ceil((meet.booking.due - (game.promoter?.clock ?? 0)) / 60_000)} min to the flag</p> : (
            <>
              <label className="inline" htmlFor="promoter-setup">Guest setup
                <select id="promoter-setup" value={meet.guest.tune} onChange={(event) => dispatch({ type: "promoter", move: { type: "tune", tune: event.target.value as TuneSetting } })}>
                  {setupOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              {reason && <p className="why">{reason}</p>}
              <div className="actions">
                {(["push", "nurse"] as const).map((call) => {
                  const odds = reason ? null : promoterRaceOdds(game, meet, call);
                  const label = call === "push" ? "Push" : "Nurse";
                  return (
                    <div key={call}>
                      <button type="button" disabled={!!reason} onClick={() => dispatch({ type: "promoter", move: { type: "book", call } })}>Book with {label}</button>
                      {odds && <p className="muted">{Math.round(100 * odds.win)}% win · {Math.round(100 * odds.dnf)}% DNF</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {game.promoter && game.promoter.certified.length > 0 && (
            <>
              <label className="inline" htmlFor="promoter-clerk">Calendar clerk
                <select id="promoter-clerk" value={meet.clerkCall ?? "manual"} onChange={(event) => {
                  const call = event.target.value;
                  dispatch({ type: "promoter", move: { type: "clerk", call: call === "push" || call === "nurse" ? call : null } });
                }}>
                  <option value="manual">Book meetings myself</option>
                  <option value="nurse">Keep booking with Nurse</option>
                  <option value="push">Keep booking with Push</option>
                </select>
              </label>
              <p className="muted">The clerk works while you are away and pauses for failed inspections.</p>
            </>
          )}
        </section>
      )}
      {!report.complete && !meet.booking && (
        <section className="section" aria-labelledby="promoter-service-heading">
          <h2 id="promoter-service-heading">Workshop passes</h2>
          <p>{meet.passes} left. Each pass restores one part to Good condition.</p>
          <ul className="plain">
            {Object.entries(meet.guest.parts).map(([slot, part]) => part && (
              <li key={slot}>
                {slot} · {["Scrap", "Rusted", "Worn", "Good", "Restored"][part.condition]}{" "}
                {part.condition < 3 && <button type="button" disabled={!meet.passes} onClick={() => dispatch({ type: "promoter", move: { type: "service", slot } })}>Service {slot}</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {report.complete && <p role="status">{report.qualified ? "The stewards approved this charter. Publish your report to certify it." : "This calendar missed its certification targets. Review the results before starting another."}</p>}
      {(!meet.booking && (report.complete || confirmClose)) ? (
        <button type="button" onClick={() => dispatch({ type: "promoter", move: { type: "close" } })}>{report.complete ? "Publish report and close calendar" : "Retire guest and close calendar"}</button>
      ) : (
        <button type="button" disabled={!!meet.booking} onClick={() => setConfirmClose(true)}>Retire from this calendar</button>
      )}
    </>
  );
}

export function PromoterPanel() {
  const game = useGame((state) => state.game);
  if (!game || !promoterGate(game)) return null;
  const promoter = game.promoter;
  return (
    <div className="panel" aria-labelledby="promoter-heading">
      <header className="section">
        <h2 id="promoter-heading">Circuit Office</h2>
        <p>Publish a calendar and enter a build from your garage. Your guest runs the whole calendar on the parts you sign in, and wear carries from one meeting to the next.</p>
      </header>
      {promoter?.meet ? <Calendar game={game} meet={promoter.meet} key={promoter.season} /> : (
        <section className="section" aria-labelledby="promoter-charters-heading">
          <h2 id="promoter-charters-heading">Charters</h2>
          <div className="cards">{charterIds.map((id) => <CharterCard game={game} id={id} key={id} />)}</div>
        </section>
      )}
      {!!promoter?.archive.length && (
        <section className="section" aria-labelledby="promoter-archive-heading">
          <h2 id="promoter-archive-heading">Past calendars</h2>
          <ul className="plain">
            {promoter.archive.map((entry) => (
              <li key={entry.season}>{PROMOTER_CHARTERS[entry.charter].name} · {STEWARDSHIP[entry.stewardship].name} · {entry.guest} · {entry.points} pts{entry.certified ? " · Certified" : ""}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default PromoterPanel;
