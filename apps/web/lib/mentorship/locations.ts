import type {
  MentorLocationFilter,
  MentorLocationInput,
} from "@westride/db/mentorship";
import { countryName, isCountryCode } from "./countries";

export const GLOBAL_LOCATION = "global";

/** Separates the parts of a location filter value in the URL. */
const SEPARATOR = "|";

export function formatLocation(location: MentorLocationInput): string {
  return [location.city, location.region, countryName(location.countryCode)]
    .filter(Boolean)
    .join(", ");
}

/** Short mentor-card line: "Austin, Texas, United States +2 more". */
export function summarizeLocations(
  locations: MentorLocationInput[],
  isGlobal: boolean,
): string {
  const [first, ...rest] = locations;
  if (!first) {
    return isGlobal ? "Mentors globally" : "";
  }
  const extra = rest.length > 0 ? ` +${rest.length} more` : "";
  const global = isGlobal ? " · Mentors globally" : "";
  return `${formatLocation(first)}${extra}${global}`;
}

export function encodeLocationFilter(filter: MentorLocationFilter): string {
  switch (filter.kind) {
    case "global":
      return GLOBAL_LOCATION;
    case "country":
      return filter.countryCode;
    case "region":
      return [filter.countryCode, filter.region].join(SEPARATOR);
    case "city":
      return [filter.countryCode, filter.region ?? "", filter.city].join(
        SEPARATOR,
      );
  }
}

export function decodeLocationFilter(
  value: string | undefined,
): MentorLocationFilter | undefined {
  if (!value) {
    return undefined;
  }
  if (value === GLOBAL_LOCATION) {
    return { kind: "global" };
  }

  const [countryCode = "", region = "", city = ""] = value.split(SEPARATOR);
  if (!isCountryCode(countryCode)) {
    return undefined;
  }
  if (city) {
    return { kind: "city", countryCode, region: region || null, city };
  }
  if (region) {
    return { kind: "region", countryCode, region };
  }
  return { kind: "country", countryCode };
}

type LocationOption = { value: string; label: string };

export type LocationFilterOptions = {
  countries: LocationOption[];
  regions: LocationOption[];
  cities: LocationOption[];
};

/**
 * Groups every listed location into the countries, regions, and cities a
 * mentee can filter by. Spellings that differ only in case collapse into
 * the first one seen.
 */
export function buildLocationFilterOptions(
  locations: MentorLocationInput[],
): LocationFilterOptions {
  const countries = new Map<string, LocationOption>();
  const regions = new Map<string, LocationOption>();
  const cities = new Map<string, LocationOption>();

  for (const location of locations) {
    const country = countryName(location.countryCode);
    countries.set(location.countryCode, {
      value: encodeLocationFilter({
        kind: "country",
        countryCode: location.countryCode,
      }),
      label: country,
    });

    if (location.region) {
      const value = encodeLocationFilter({
        kind: "region",
        countryCode: location.countryCode,
        region: location.region,
      });
      const key = value.toLowerCase();
      if (!regions.has(key)) {
        regions.set(key, { value, label: `${location.region}, ${country}` });
      }
    }

    if (location.city) {
      const value = encodeLocationFilter({
        kind: "city",
        countryCode: location.countryCode,
        region: location.region,
        city: location.city,
      });
      const key = value.toLowerCase();
      if (!cities.has(key)) {
        cities.set(key, { value, label: formatLocation(location) });
      }
    }
  }

  const byLabel = (a: LocationOption, b: LocationOption) =>
    a.label.localeCompare(b.label, "en");

  return {
    countries: [...countries.values()].sort(byLabel),
    regions: [...regions.values()].sort(byLabel),
    cities: [...cities.values()].sort(byLabel),
  };
}
