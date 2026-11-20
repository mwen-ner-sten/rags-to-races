/**
 * Idle chatter for the header ticker: what the neighbourhood, the scanner and the
 * pit lane say when nothing is happening. Flavour only; no line hints at a mechanic
 * the player hasn't met. `curb` lines run before a team exists, `team` lines after,
 * and `any` lines in both.
 */
export interface RadioLines {
  curb: readonly string[];
  team: readonly string[];
  any: readonly string[];
}

export const RADIO_LINES: RadioLines = {
  curb: [
    "Neighbour reports a lawn mower 'doing donuts' on Elm. Neighbour is not wrong.",
    "Local man insists the rust is load-bearing.",
    "Weather: clear skies, light breeze, 40% chance of finding a carburettor.",
    "Mrs. Kowalski would like her wheelbarrow back. Mrs. Kowalski knows it was you.",
    "Trash night forecast: two couches, one exercise bike, unknown treasures.",
    "Reminder: duct tape is a structural material if you believe hard enough.",
    "The HOA has formed a subcommittee about your driveway.",
    "Dog on Maple Street has seen things. Dog will not elaborate.",
    "Scanner chatter: 'Is that a go-kart or a shopping cart?' 'Yes.'",
    "Garage radio is stuck on the polka station. Nobody is touching it.",
    "Somebody's grandpa says they don't make engines like this anymore. He's right. It's on fire.",
    "Today's lucky part: anything with all its bolts.",
    "A raccoon has been spotted wearing what may be your spark plug.",
    "Local kid asks if your mower is fast. You lie.",
    "Garage thermometer reads 'too hot'. Garage thermometer has never read anything else.",
    "Fun fact: a wrench is just a hammer you haven't met yet.",
    "Breaking: man finds the 10mm socket. Experts urge calm.",
    "Your mother called. She wants to know when the garage will be 'a garage again'.",
    "The junk pile has achieved a stable form. Do not disturb it.",
    "Weekend plans: same as last weekend, but with a louder engine.",
    "Curbside etiquette: if it's on the curb, it's a gift. If it's in the garage, it's a misunderstanding.",
    "Sound of a pull-start, repeated forty times, now heard two blocks over.",
    "Neighbourhood watch would like to know what 'Season 1' means.",
    "Mailman takes the long way round. The long way avoids your driveway.",
    "Grease under the fingernails: officially a lifestyle now.",
    "Someone left a 'FREE' sign on a fridge. The fridge has been claimed by destiny.",
    "Backyard Derby committee reminds racers: the tomato plants are not a chicane.",
    "Scanner: 'Ten-four, mower is loose again.'",
  ],
  team: [
    "Sponsor asks if the logo can be 'less on fire'.",
    "Crew chief reports morale is high and the coffee is low.",
    "Pit lane rumour: somebody's spotter just bought binoculars. Upgrades everywhere.",
    "Team meeting moved to the snack table. Attendance up 300%.",
    "Rival team claims their car is 'basically new'. Our scrapyard sources disagree.",
    "Reminder: the team van is not a storage unit. The team van is a storage unit.",
    "Spotter says 'clear' with the confidence of a man who has not looked.",
    "New team shirts arrived. Size: one, for everybody.",
    "The trophy shelf has been reinforced. Optimism is heavy.",
    "Driver requests 'more power'. Mechanic requests 'fewer requests'.",
    "Engine builder swears this one's the one. Engine builder said that last time.",
    "Press asks about the secret to our success. We say 'tape'. They think we're joking.",
  ],
  any: [
    "Track announcer is warming up the voice. It's going about as well as the engines.",
    "Rumour has it the grandstand hot dogs are from last season. Respect.",
    "Tyre pressure check: kick it. Seems fine.",
    "Forecast for tonight: neon, gravel, poor decisions.",
    "The pit board just says 'GO FASTER'. Strategically sound.",
    "Somewhere a carburettor is waiting for you. It is very dirty.",
    "Radio check, radio check. Is this thing on? It is now.",
    "Nobody knows who owns the bench grinder. Everyone uses it.",
    "Pro tip: if it rattles, it's still attached. Probably.",
    "The parts counter guy asked how it's going. He regrets asking.",
    "Spilled coffee on the engine. Engine runs smoother now. Science can't explain it.",
    "Tonight's soundtrack: two-stroke whine and distant applause.",
    "If you can read this, slow down. You're idling.",
    "Today's motivational quote: 'It'll buff out.'",
  ],
};

/** The lines that fit right now. */
export function radioPool(teamFounded: boolean): string[] {
  return [...(teamFounded ? RADIO_LINES.team : RADIO_LINES.curb), ...RADIO_LINES.any];
}
