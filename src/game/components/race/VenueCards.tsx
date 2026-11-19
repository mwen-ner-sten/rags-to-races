"use client";

import Image from "next/image";
import { DISCIPLINES, VENUES, getVenue, venueName } from "@/core/content/events";
import { canOpenPlace, placeRepCost } from "@/core/knowhowEngine";
import { venueLockReason } from "@/core/race";
import type { GameState } from "@/core/types";
import { venueSprite } from "../../sprites";
import { useGame } from "../../store";

/** The Dirt Track opens with Rep rather than a Feature win, so it gets a sign-up card once it's within reach. */
export function DirtSignup({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  if (game.run.venuesOpen.includes("dirt") || game.run.featureWins.backyard === undefined) return null;
  const venue = getVenue("dirt");
  const blocker = canOpenPlace(game, "place:dirt");
  return (
    <article className="card venue locked">
      <Image src={venueSprite(venue.id)} alt="" width={120} height={64} />
      <div className="card-body">
        <h3>{venue.name}</h3>
        <p className="blurb">
          {venue.blurb} Tier {venue.tiers[0]}–{venue.tiers[1]}.
        </p>
        <div className="actions">
          <button className="btn" disabled={!!blocker} title={blocker ?? undefined} onClick={() => dispatch({ type: "openPlace", knowhowId: "place:dirt" })}>
            Sign up · {placeRepCost(game, "place:dirt")} Rep
          </button>
          {blocker && <span className="why">{blocker}</span>}
        </div>
      </div>
    </article>
  );
}

/** The next venue that isn't open yet, other than the Dirt Track (which has its own sign-up card). */
function nextLocked(game: GameState): string | null {
  const next = VENUES.find((v) => !game.run.venuesOpen.includes(v.id));
  return next && next.id !== "dirt" ? next.id : null;
}

/** The next venue still out of reach, with why. */
export function LockedVenue({ game }: { game: GameState }) {
  const id = nextLocked(game);
  if (!id) return null;
  const venue = getVenue(id);
  const reason = venueLockReason(game, id);
  return (
    <article className="card venue locked">
      <Image src={venueSprite(venue.id)} alt="" width={120} height={64} />
      <div className="card-body">
        <h3>
          {venueName(id, DISCIPLINES[game.era?.discipline ?? "dirt"].id)} <span className="chip">Locked</span>
        </h3>
        <p className="blurb">
          {venue.blurb} Tier {venue.tiers[0]}–{venue.tiers[1]}.
        </p>
        {reason && <p className="why">{reason}</p>}
      </div>
    </article>
  );
}
