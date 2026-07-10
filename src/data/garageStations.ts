export const GARAGE_STATION_IDS = [
  "workbench",
  "lift",
  "diagnostics",
  "fabrication",
  "pit_equipment",
  "logistics",
] as const;

export type GarageStationSlot = (typeof GARAGE_STATION_IDS)[number];

export interface GarageStationDefinition {
  id: GarageStationSlot;
  name: string;
  description: string;
}

export const GARAGE_STATIONS: GarageStationDefinition[] = [
  { id: "workbench", name: "Workbench", description: "Assembly, tuning, and careful hands-on engineering." },
  { id: "lift", name: "Lift", description: "Heavy repair, chassis work, and vehicle access." },
  { id: "diagnostics", name: "Diagnostics", description: "Measurement, forecasting, and fault finding." },
  { id: "fabrication", name: "Fabrication", description: "Crafting, enhancement, and custom components." },
  { id: "pit_equipment", name: "Pit Equipment", description: "Race turnaround, tire work, and pit reliability." },
  { id: "logistics", name: "Logistics", description: "Sourcing, storage, hauling, and fleet efficiency." },
];
