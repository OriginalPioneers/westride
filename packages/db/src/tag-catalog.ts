import { skillSlug } from "./skill-catalog";

/** Tags fold spelling variants onto one key the same way skills do. */
export function tagSlug(name: string): string {
  return skillSlug(name);
}

/** Starter list offered when tagging an idea. Anyone can add their own. */
export const tagCatalog = [
  "Education",
  "Healthcare",
  "Mental Health",
  "Climate & Environment",
  "Clean Energy",
  "Agriculture",
  "Food & Beverage",
  "Water & Sanitation",
  "Housing",
  "Transportation",
  "Community",
  "Youth",
  "Seniors",
  "Accessibility",
  "Faith",
  "Arts & Culture",
  "Sports & Recreation",
  "Travel & Hospitality",
  "Retail",
  "E-commerce",
  "Marketplace",
  "SaaS",
  "AI",
  "Fintech",
  "Local Services",
  "Manufacturing",
  "Media & Entertainment",
  "Social Impact",
  "Workforce Development",
] as const;
