import { z } from "zod";
import { countyForSource, HOME_COUNTY_IDS } from "@/core/counties";
import { PLACE_BY_ID } from "@/core/content/places";

export const homeCountySchema = z.enum(HOME_COUNTY_IDS);
export const partProvenanceSchema = z.object({
  county: homeCountySchema,
  placeId: z.string().refine((value) => Object.hasOwn(PLACE_BY_ID, value)),
  season: z.number().int().positive(),
}).refine((value) => value.placeId === "curb" || value.county === countyForSource(value.placeId), "Source does not belong to this county");
