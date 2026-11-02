"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const SEARCH_DEBOUNCE_MS = 300;
const SORT_WIDTH = 180;

export type SortOption = { value: string; label: string };

/**
 * The search box with sort beside it, shared by every studio page.
 * Searching looks across every item the viewer can see; the page owns the
 * URL contract and hands over `toHref` to build the next address.
 */
export function CollectionSearchBar({
  label,
  placeholder,
  query,
  sort,
  sortOptions,
  toHref,
}: {
  label: string;
  placeholder: string;
  /** The search as it stands in the URL. */
  query: string;
  /** The sort as it stands in the URL; the page resolves the default. */
  sort: string;
  sortOptions: SortOption[];
  toHref: (next: { q: string; sort: string }) => string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const latest = useRef({ query, sort, toHref });
  latest.current = { query, sort, toHref };

  function apply(next: { q: string; sort: string }) {
    startTransition(() => {
      router.replace(latest.current.toHref(next), { scroll: false });
    });
  }

  // Typing updates the URL after a pause, so each keystroke is not a
  // round trip. Enter applies immediately.
  useEffect(() => {
    if (search === latest.current.query) {
      return;
    }
    const timer = setTimeout(() => {
      apply({ q: search, sort: latest.current.sort });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // apply is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Keep the box in step when the URL changes from outside (back button,
  // a pill, a link).
  useEffect(() => {
    setSearch(query);
  }, [query]);

  return (
    <HStack gap={3} vAlign="end" wrap="wrap">
      <StackItem size="fill">
        <TextInput
          label={label}
          isLabelHidden
          placeholder={placeholder}
          value={search}
          onChange={setSearch}
          onEnter={() => apply({ q: search, sort })}
          startIcon={MagnifyingGlassIcon}
          hasClear
          isLoading={isPending}
        />
      </StackItem>
      <Selector
        label="Sort"
        isLabelHidden
        options={sortOptions}
        value={sort}
        onChange={(next) => apply({ q: query, sort: next ?? "" })}
        width={SORT_WIDTH}
      />
    </HStack>
  );
}

export type CollectionTab = { href: string; label: string };

/**
 * The pills under the search bar. Each pill is a link, so the page is
 * shareable and works before hydration. Pass an empty `selected` while a
 * search is open, since a search looks across every collection.
 */
export function CollectionTabs({
  selected,
  tabs,
}: {
  /** The `href` of the selected pill, or "" for none. */
  selected: string;
  tabs: CollectionTab[];
}) {
  const router = useRouter();

  return (
    <TabList value={selected} onChange={(href) => router.push(href)} overflow="scroll">
      {tabs.map((tab) => (
        <Tab key={tab.href} value={tab.href} href={tab.href} label={tab.label} />
      ))}
    </TabList>
  );
}
