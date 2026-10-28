import {
  countryCatalog,
  countryCodes,
  countryName,
  isCountryCode,
  type CountryCode,
} from "@westride/db/countries";

export type { CountryCode };
export { countryName, isCountryCode };

export const COUNTRY_CODES = countryCodes;

/** Sorted by name, for pickers. */
export const COUNTRY_OPTIONS = COUNTRY_CODES.map((code) => ({
  value: code,
  label: countryCatalog[code],
})).sort((a, b) => a.label.localeCompare(b.label, "en"));
