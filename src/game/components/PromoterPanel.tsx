"use client";

import { useState } from "react";
import { getVenue } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import {
  CLOSE_FINISH_GAP, PROMOTER_CHARTERS, PROMOTER_ROUTES, PROMOTER_VISITORS, STEWARDSHIP, adaptiveClerkEarned, promoterBallast,
  promoterBookingReason, promoterCharterLock, promoterEligible, promoterGate, promoterMastery, promoterPolicyLock, promoterRaceOdds,
  promoterReport, promoterRouteLock, promoterSchedule, promoterStandings, promoterTargets, promoterVisitorWear, promoterWorkshopEarned,
  type PromoterCharter, type PromoterClerkCall, type PromoterEntrant, type PromoterMeet, type PromoterRoute, type PromoterVisitor, type Stewardship,
} from "@/core/promoter";
import type { GameState, TuneSetting } from "@/core/types";
import { useGame } from "../store";
import { ChoiceList, type ChoiceItem } from "./ChoiceList";
import { Segmented } from "./Segmented";

const charterIds = Object.keys(PROMOTER_CHARTERS) as PromoterCharter[];
const stewardshipIds = Object.keys(STEWARDSHIP) as Stewardship[];
const routes = Object.keys(PROMOTER_ROUTES) as PromoterRoute[];
const visitors = Object.keys(PROMOTER_VISITORS) as PromoterVisitor[];
const setupOptions: { id: TuneSetting; name: string }[] = [
  { id: "balanced", name: "Balanced" }, { id: "power", name: "Power" }, { id: "reliable", name: "Reliability" },
];

function CharterCard({ game, id }: { game: GameState; id: PromoterCharter }) {
  const dispatch = useGame((state) => state.dispatch);
  const [selected, setSelected] = useState("");
  const [stewardship, setStewardship] = useState<Stewardship>("paddock");
  const [route, setRoute] = useState<PromoterRoute>("classic");
  const [workshopBid, setWorkshopBid] = useState(false);
  const charter = PROMOTER_CHARTERS[id];
  const vehicles = game.run.vehicles.filter((vehicle) => promoterEligible(game, id, vehicle));
  const returning = game.promoter?.reserveGuest?.vehicleId === charter.vehicleId ? game.promoter.reserveGuest : undefined;
  const useReturning = !!returning && (selected === "returning" || !vehicles.length);
  const current = useReturning ? returning : vehicles.find((vehicle) => vehicle.uid === selected) ?? vehicles[0];
  const lock = promoterCharterLock(game, id);
  const targets = promoterTargets(id, stewardship, route);
  return (
    <article className="card">
      <div className="card-body">
        <h3>{charter.name} {game.promoter?.certified.includes(id) && <span className="chip">Certified</span>}</h3>
        <p>{charter.brief}</p>
        <p className="muted">{promoterSchedule(id, route).map(({ venueId, event }) => `${getVenue(venueId).name} ${event}`).join(" · ")}</p>
        <p>{targets.points} points · {targets.finishes} finishes · {targets.podiums} podium{targets.podiums === 1 ? "" : "s"}</p>
        {lock ? <p className="why">{lock}</p> : current ? (
          <>
            <ChoiceList compact id={`promoter-guest-${id}`} label="Guest build" value={useReturning ? "returning" : current.uid} onChange={setSelected}
              items={[
                ...vehicles.map((vehicle): ChoiceItem => ({ id: vehicle.uid, title: vehicle.name, meta: getVehicle(vehicle.vehicleId).name })),
                ...(returning ? [{ id: "returning", title: returning.name, meta: `${getVehicle(returning.vehicleId).name} · returning entry` }] : []),
              ]} />
            {useReturning && <p className="muted">The returning entry keeps its wear. Its crew brings one extra workshop pass.</p>}
            <Segmented<Stewardship>
              id={`promoter-rules-${id}`}
              label="Stewardship"
              value={stewardship}
              onChange={setStewardship}
              hint={STEWARDSHIP[stewardship].brief}
              options={stewardshipIds.map((rules) => {
                const reason = promoterPolicyLock(game, rules);
                return { value: rules, label: STEWARDSHIP[rules].name, disabled: !!reason, reason: reason ?? undefined };
              })}
            />
            <p>{targets.fieldFinishes} field finishes{targets.closeFinishes > 0 && ` · ${targets.closeFinishes} winning gaps within 8%`}{targets.winners > 0 && ` · ${targets.winners} different winners`}</p>
            <Segmented<PromoterRoute>
              id={`promoter-route-${id}`}
              label="Route"
              value={route}
              onChange={setRoute}
              hint={PROMOTER_ROUTES[route].detail}
              options={routes.map((value) => {
                const reason = promoterRouteLock(game, id, value);
                return { value, label: PROMOTER_ROUTES[value].name, disabled: !!reason, reason: reason ?? undefined };
              })}
            />
            {(game.promoter?.certified.length ?? 0) > 0 && !game.promoter?.workshopLicensed && (
              <label><input type="checkbox" checked={workshopBid} onChange={(event) => setWorkshopBid(event.target.checked)} /> Bid for a workshop license. Certify with a roadworthy guest and one unused pass.</label>
            )}
            <button type="button" onClick={() => dispatch({ type: "promoter", move: { type: "publish", charter: id, stewardship, route, returning: useReturning, workshopBid, vehicleUid: current.uid } })}>Publish {charter.name}</button>
          </>
        ) : <p className="why">A race-ready {getVehicle(charter.vehicleId).name} is required.</p>}
      </div>
    </article>
  );
}

function entrantName(entrant: PromoterEntrant, guest: string): string {
  return entrant === "guest" ? guest : PROMOTER_VISITORS[entrant].name;
}

function Calendar({ game, meet }: { game: GameState; meet: PromoterMeet }) {
  const dispatch = useGame((state) => state.dispatch);
  const [confirmClose, setConfirmClose] = useState(false);
  const charter = PROMOTER_CHARTERS[meet.charter];
  const stewardship = STEWARDSHIP[meet.stewardship];
  const targets = promoterTargets(meet.charter, meet.stewardship, meet.route);
  const report = promoterReport(meet);
  const reason = promoterBookingReason(meet);
  const schedule = promoterSchedule(meet.charter, meet.route);
  const current = schedule[meet.results.length];
  const ballast = promoterBallast(meet);
  return (
    <>
      <section className="section" aria-labelledby="promoter-calendar-heading">
        <h2 id="promoter-calendar-heading">{charter.name}</h2>
        <p>Guest entry <strong>{meet.guest.name}</strong> · {stewardship.name}</p>
        <p>{PROMOTER_ROUTES[meet.route ?? "classic"].name} · {report.points}/{targets.points} points · {report.finishes}/{targets.finishes} finishes · {report.podiums}/{targets.podiums} podiums</p>
        <p>Field report · {report.fieldFinishes}/{targets.fieldFinishes} finishers{targets.closeFinishes > 0 && ` · ${report.closeFinishes}/${targets.closeFinishes} close finishes`}{targets.winners > 0 && ` · ${report.winners}/${targets.winners} different winners`}</p>
        {meet.workshopBid && <p>Workshop bid · {report.complete ? (promoterWorkshopEarned(meet) ? "Met the terms. Close the calendar to claim the license." : "The calendar did not meet the workshop terms.") : "Keep the guest roadworthy with one unused pass."}</p>}
        <ol className="plain">
          {schedule.map(({ venueId, event }, index) => {
            const result = meet.results[index];
            return (
              <li key={`${index}-${venueId}-${event}`}>
                <strong>{getVenue(venueId).name} · {event}</strong>
                {result && <>
                  <p className="blurb">
                    {result.dnf ? "Did not finish" : `Finished ${result.position} of ${result.fieldSize}`} with {result.call === "push" ? "Push" : "Nurse"}.
                    {result.wear.length > 0 && ` Wear on ${result.wear.map(({ slot }) => slot).join(", ")}.`}
                    {result.aidedVisitor && ` ${PROMOTER_VISITORS[result.aidedVisitor].name} used a workshop pass.`}
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
      {meet.results.length > 0 && <section className="section" aria-labelledby="circuit-standings-heading">
        <h2 id="circuit-standings-heading">Grid standings</h2>
        <ol>{promoterStandings(meet).map((entry) => (
          <li key={entry.id}>{entrantName(entry.id, meet.guest.name)} · {entry.points} points · {entry.finishes.length}/{entry.starts} finishes</li>
        ))}</ol>
        <p className="muted">Points ties are decided by the most wins, then the most second places, and so on.</p>
      </section>}
      {!report.complete && current && (
        <section className="section" aria-labelledby="promoter-meeting-heading">
          <h2 id="promoter-meeting-heading">Next meeting</h2>
          <p>{getVenue(current.venueId).character}</p>
          {ballast && <p>{entrantName(ballast, meet.guest.name)} carries the leader’s ballast.</p>}
          {meet.booking ? <p role="status">Booked with {meet.booking.result.call === "push" ? "Push" : "Nurse"} · {Math.ceil((meet.booking.due - (game.promoter?.clock ?? 0)) / 60_000)} min to the flag</p> : (
            <>
              <Segmented<TuneSetting>
                id="promoter-setup"
                label="Guest setup"
                value={meet.guest.tune}
                onChange={(tune) => dispatch({ type: "promoter", move: { type: "tune", tune } })}
                options={setupOptions.map(({ id, name }) => ({ value: id, label: name }))}
              />
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
              <ChoiceList id="promoter-clerk" label="Calendar clerk" value={meet.clerkCall ?? "manual"}
                onChange={(call) => dispatch({ type: "promoter", move: { type: "clerk", call: call === "manual" ? null : call as PromoterClerkCall } })}
                items={[
                  { id: "manual", title: "Book meetings myself" },
                  { id: "nurse", title: "Keep booking with Nurse" },
                  { id: "push", title: "Keep booking with Push" },
                  { id: "adaptive", title: "Choose pace by risk", disabled: !adaptiveClerkEarned(game), reason: "Certify calendars under two policies to earn this." },
                ]} />
              <p className="muted">The clerk works while you are away and pauses for failed inspections.</p>
              {!adaptiveClerkEarned(game) && <p className="muted">Certify calendars under two policies to earn adaptive booking.</p>}
              {game.promoter.workshopLicensed && <label><input type="checkbox" checked={!!meet.autoService} onChange={(event) => dispatch({ type: "promoter", move: { type: "clerk-service", enabled: event.target.checked } })} /> Let the clerk spend passes on parts that fail inspection</label>}
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
          {visitors.some((id) => promoterVisitorWear(meet, id) > 0) && <div>
            <h3>Visitor paddock</h3>
            <p>Breakdowns slow visitors and make a second failure more likely. Spend a pass to restore a visitor before the next start.</p>
            <ul className="plain">{visitors.filter((id) => promoterVisitorWear(meet, id) > 0).map((id) => (
              <li key={id}>{PROMOTER_VISITORS[id].name} {meet.pendingAid === id ? "· Workshop booked" : <button type="button" disabled={!meet.passes || !!meet.pendingAid} onClick={() => dispatch({ type: "promoter", move: { type: "aid", visitor: id } })}>Use pass on {PROMOTER_VISITORS[id].name}</button>}</li>
            ))}</ul>
          </div>}
        </section>
      )}
      {!!meet.clerkServices?.length && <p role="status">Clerk serviced {meet.clerkServices.join(", ")}.</p>}
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
  const mastery = promoterMastery(game);
  return (
    <div className="panel" aria-labelledby="promoter-heading">
      <header className="section">
        <h2 id="promoter-heading">Circuit Office</h2>
        <p>Publish a calendar and enter a build from your garage. Your guest runs the whole calendar on the parts you sign in, and wear carries from one meeting to the next.</p>
      </header>
      {promoter?.certified.length ? <section className="section" aria-labelledby="circuit-logbook-heading">
        <h2 id="circuit-logbook-heading">Circuit licenses</h2>
        <ul className="plain">{stewardshipIds.filter((id) => !!mastery[id]?.length).map((id) => <li key={id}>{STEWARDSHIP[id].name} · {mastery[id]?.map((charter) => PROMOTER_CHARTERS[charter].name).join(", ")}</li>)}</ul>
        {promoter.workshopLicensed && <p>Workshop licensed for delegated safety inspections.</p>}
      </section> : null}
      {!!Object.keys(promoter?.visitorForm ?? {}).length && <section className="section" aria-labelledby="circuit-visitors-heading">
        <h2 id="circuit-visitors-heading">Returning visitors</h2>
        <ul className="plain">{visitors.filter((id) => !!promoter?.visitorForm?.[id]).map((id) => <li key={id}>{PROMOTER_VISITORS[id].name} · {Math.round((promoter?.visitorForm?.[id] ?? 0) * 2.5 * 10) / 10}% faster from previous titles</li>)}</ul>
      </section>}
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
              <li key={entry.season}>{PROMOTER_CHARTERS[entry.charter].name} · {STEWARDSHIP[entry.stewardship].name} · {PROMOTER_ROUTES[entry.route ?? "classic"].name} · {entry.guest} · {entry.points} pts{entry.certified ? " · Certified" : ""}{entry.winner && ` · Winner ${entrantName(entry.winner, entry.guest)}`}{entry.workshopEarned && " · Workshop license"}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default PromoterPanel;
