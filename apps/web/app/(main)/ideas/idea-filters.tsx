"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  DEFAULT_IDEA_SORT,
  EMPTY_IDEA_FILTERS,
  hasIdeaFilters,
  IDEA_SORT_OPTIONS,
  ideaFiltersQuery,
  type IdeaFilterValues,
} from "@/lib/ideas/filters";

type Option = { value: string; label: string };

type IdeaFiltersProps = {
  values: IdeaFilterValues;
  typeOptions: Option[];
  countryOptions: Option[];
  tagOptions: Option[];
};

const ALL_TYPES = "all";
const FILTER_WIDTH = 220;
const SEARCH_DEBOUNCE_MS = 300;

export function IdeaFilters({
  values,
  typeOptions,
  countryOptions,
  tagOptions,
}: IdeaFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(values.q);
  const latestValues = useRef(values);
  latestValues.current = values;

  function apply(next: IdeaFilterValues) {
    const query = ideaFiltersQuery(next);
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  // Typing updates the URL after a pause, so each keystroke is not a
  // round trip. Enter applies immediately.
  useEffect(() => {
    if (search === latestValues.current.q) {
      return;
    }
    const timer = setTimeout(() => {
      apply({ ...latestValues.current, q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // apply is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Keep the box in step when the URL changes from outside (back button,
  // a tag link, Clear filters).
  useEffect(() => {
    setSearch(values.q);
  }, [values.q]);

  const hasFilters = hasIdeaFilters(values);

  return (
    <HStack gap={3} vAlign="end" wrap="wrap">
      <StackItem size="fill">
        <TextInput
          label="Search ideas"
          isLabelHidden
          placeholder="Search ideas..."
          value={search}
          onChange={setSearch}
          onEnter={() => apply({ ...values, q: search })}
          startIcon={MagnifyingGlassIcon}
          hasClear
          isLoading={isPending}
        />
      </StackItem>
      {typeOptions.length > 1 ? (
        <ToggleButtonGroup
          label="Idea type"
          value={values.type || ALL_TYPES}
          onChange={(type) =>
            apply({ ...values, type: !type || type === ALL_TYPES ? "" : type })
          }
        >
          <ToggleButton label="All" value={ALL_TYPES} />
          {typeOptions.map((option) => (
            <ToggleButton
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </ToggleButtonGroup>
      ) : null}
      {countryOptions.length > 0 ? (
        <Selector
          label="Geography"
          isLabelHidden
          placeholder="Any geography"
          options={countryOptions}
          value={values.country || null}
          onChange={(country) => apply({ ...values, country: country ?? "" })}
          hasClear
          hasSearch
          searchPlaceholder="Search countries..."
          emptyText="No ideas list that country"
          width={FILTER_WIDTH}
        />
      ) : null}
      {tagOptions.length > 0 ? (
        <Selector
          label="Tag"
          isLabelHidden
          placeholder="Any tag"
          options={tagOptions}
          value={values.tag || null}
          onChange={(tag) => apply({ ...values, tag: tag ?? "" })}
          hasClear
          hasSearch
          searchPlaceholder="Search tags..."
          emptyText="No ideas carry that tag"
          width={FILTER_WIDTH}
        />
      ) : null}
      <Selector
        label="Sort"
        isLabelHidden
        options={IDEA_SORT_OPTIONS}
        value={values.sort || DEFAULT_IDEA_SORT}
        onChange={(sort) => apply({ ...values, sort: sort ?? "" })}
        width={180}
      />
      {hasFilters ? (
        <Button
          label="Clear filters"
          variant="ghost"
          onClick={() => apply({ ...EMPTY_IDEA_FILTERS, sort: values.sort })}
        />
      ) : null}
    </HStack>
  );
}
