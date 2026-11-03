"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { formatCount } from "@/lib/format";

const SEARCH_DEBOUNCE_MS = 300;
const FILTER_WIDTH = 200;

export type FilterOption = { value: string; label: string };

/**
 * Every list page keeps its state in the URL: `q` for the search, `page`,
 * and one optional filter key. The controls below edit those keys and let
 * the server component re-render with the new slice.
 */
function useListUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const search = next.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

  return { searchParams, update, isPending };
}

export function ListSearch({
  placeholder,
  filter,
}: {
  placeholder: string;
  /** One extra narrowing control beside the search, stored under `filter.key`. */
  filter?: { key: string; label: string; options: FilterOption[] };
}) {
  const { searchParams, update, isPending } = useListUrl();
  const query = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(query);
  const latest = useRef(query);
  latest.current = query;

  // Typing updates the URL after a pause, so each keystroke is not a round
  // trip. Enter applies immediately. A new search starts at page 1.
  useEffect(() => {
    if (search === latest.current) {
      return;
    }
    const timer = setTimeout(() => update({ q: search, page: null }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // update is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  return (
    <HStack gap={3} vAlign="end" wrap="wrap">
      <StackItem size="fill">
        <TextInput
          label="Search"
          isLabelHidden
          placeholder={placeholder}
          value={search}
          onChange={setSearch}
          onEnter={() => update({ q: search, page: null })}
          startIcon={MagnifyingGlassIcon}
          hasClear
          isLoading={isPending}
        />
      </StackItem>
      {filter ? (
        <Selector
          label={filter.label}
          isLabelHidden
          options={filter.options}
          value={searchParams.get(filter.key) ?? filter.options[0]?.value}
          onChange={(value) => update({ [filter.key]: value, page: null })}
          width={FILTER_WIDTH}
        />
      ) : null}
    </HStack>
  );
}

export function ListPagination({
  page,
  pageSize,
  total,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** What a row is, for the count: "ideas", "users". */
  noun: string;
}) {
  const { update } = useListUrl();
  if (total <= pageSize) {
    return (
      <Text type="supporting">
        {formatCount(total)} {noun}
      </Text>
    );
  }
  return (
    <Pagination
      page={page}
      onChange={(next) => update({ page: next <= 1 ? null : String(next) })}
      totalItems={total}
      pageSize={pageSize}
      variant="count"
    />
  );
}
