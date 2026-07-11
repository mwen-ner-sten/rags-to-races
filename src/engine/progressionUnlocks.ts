import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { LOCATION_DEFINITIONS } from "@/data/locations";

export function getCircuitsUnlockedByReputation(
  reputation: number,
  unlockedFeatures: readonly string[],
) {
  return CIRCUIT_DEFINITIONS.filter((circuit) =>
    circuit.unlockRepCost <= reputation
      && (!circuit.requiredFeature || unlockedFeatures.includes(circuit.requiredFeature)),
  );
}

export function getLocationsUnlockedByReputation(reputation: number) {
  return LOCATION_DEFINITIONS.filter((location) => location.unlockCost <= reputation);
}
