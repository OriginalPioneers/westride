"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack } from "@astryxdesign/core/Stack";
import type { LocationFilterOptions } from "@/lib/mentorship/locations";
import { GLOBAL_LOCATION } from "@/lib/mentorship/locations";

type Option = { value: string; label: string };

export type MentorFilterValues = {
  skill: string;
  location: string;
  language: string;
};

type MentorFiltersProps = {
  values: MentorFilterValues;
  skillOptions: Option[];
  languageOptions: Option[];
  locationOptions: LocationFilterOptions;
  hasGlobal: boolean;
};

const FILTER_WIDTH = 240;

export function MentorFilters({
  values,
  skillOptions,
  languageOptions,
  locationOptions,
  hasGlobal,
}: MentorFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function apply(next: MentorFilterValues) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      }
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  const locationSelectOptions = [
    ...(hasGlobal
      ? [{ value: GLOBAL_LOCATION, label: "Mentors globally" }]
      : []),
    ...(
      [
        ["Countries", locationOptions.countries],
        ["States and provinces", locationOptions.regions],
        ["Cities", locationOptions.cities],
      ] as const
    )
      .filter(([, options]) => options.length > 0)
      .map(([title, options]) => ({
        type: "section" as const,
        title,
        options: [...options],
      })),
  ];

  const hasFilters = Boolean(values.skill || values.location || values.language);

  return (
    <HStack gap={3} vAlign="end" wrap="wrap">
      <Selector
        label="Skill"
        placeholder="Any skill"
        options={skillOptions}
        value={values.skill || null}
        onChange={(skill) => apply({ ...values, skill: skill ?? "" })}
        hasClear
        hasSearch
        searchPlaceholder="Search skills..."
        emptyText="No mentors have listed skills yet"
        width={FILTER_WIDTH}
      />
      <Selector
        label="Location"
        placeholder="Anywhere"
        options={locationSelectOptions}
        value={values.location || null}
        onChange={(location) => apply({ ...values, location: location ?? "" })}
        hasClear
        hasSearch
        searchPlaceholder="Search locations..."
        emptyText="No mentors have listed locations yet"
        width={FILTER_WIDTH}
      />
      <Selector
        label="Language"
        placeholder="Any language"
        options={languageOptions}
        value={values.language || null}
        onChange={(language) => apply({ ...values, language: language ?? "" })}
        hasClear
        hasSearch
        searchPlaceholder="Search languages..."
        emptyText="No mentors have listed languages yet"
        width={FILTER_WIDTH}
      />
      {hasFilters ? (
        <Button
          label="Clear filters"
          variant="ghost"
          isLoading={isPending}
          onClick={() => apply({ skill: "", location: "", language: "" })}
        />
      ) : null}
    </HStack>
  );
}
