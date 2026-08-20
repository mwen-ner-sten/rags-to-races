import { runConnectedCampaignOracle, type OracleStopAfter } from "../src/testing/connectedCampaignOracle";

const VALID_STOPS = new Set<OracleStopAfter>(["scrap", "team", "owner", "track"]);
const seed = process.argv[2] ?? "connected-campaign-oracle-v1";
const requestedStop = (process.argv[3] ?? "track") as OracleStopAfter;
const requestedIterations = Number(process.argv[4] ?? 20);

if (!VALID_STOPS.has(requestedStop)) {
  throw new Error(`Invalid stop layer "${requestedStop}"; expected scrap, team, owner, or track`);
}
if (!Number.isSafeInteger(requestedIterations) || requestedIterations <= 0) {
  throw new Error(`Iteration limit must be a positive safe integer; received "${process.argv[4]}"`);
}

const ledger = runConnectedCampaignOracle({
  seed,
  stopAfter: requestedStop,
  limits: { totalIterations: requestedIterations },
});

console.log(JSON.stringify(ledger, null, 2));
