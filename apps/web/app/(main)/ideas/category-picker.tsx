"use client";

import { useMemo } from "react";
import { Tokenizer } from "@astryxdesign/core/Tokenizer";
import type { SearchableItem, SearchSource } from "@astryxdesign/core/Typeahead";
import { tagSlug } from "@westride/db/categories";
import type { CategoryOption } from "@westride/db/ideas";
import { MAX_IDEA_CATEGORIES } from "@/lib/ideas/create-schema";

const SUGGESTIONS_ON_FOCUS = 8;

type CategoryItem = SearchableItem;

function toItem(name: string): CategoryItem {
  return { id: tagSlug(name) || name, label: name };
}

/**
 * Picks one or more categories for an idea from the known list, or adds a
 * new one by typing it. Values are category names; the slug dedupes
 * spellings, so "fintech" and "Fintech" are one pick.
 */
export function CategoryPicker({
  options,
  value,
  onChange,
  status,
  description = "Where people will find this idea. Pick from the list or type a new one.",
}: {
  options: CategoryOption[];
  value: string[];
  onChange: (names: string[]) => void;
  status?: { type: "error"; message: string };
  description?: string;
}) {
  const items = useMemo(() => value.map(toItem), [value]);

  const source = useMemo<SearchSource<CategoryItem>>(() => {
    const known = options.map((option) => ({
      id: option.slug,
      label: option.name,
    }));
    const taken = new Set(items.map((item) => item.id));
    const available = known.filter((item) => !taken.has(item.id));
    return {
      search(query: string) {
        const needle = query.trim().toLowerCase();
        if (!needle) {
          return available.slice(0, SUGGESTIONS_ON_FOCUS);
        }
        return available.filter((item) =>
          item.label.toLowerCase().includes(needle),
        );
      },
      bootstrap() {
        return available.slice(0, SUGGESTIONS_ON_FOCUS);
      },
    };
  }, [options, items]);

  return (
    <Tokenizer
      label="Categories"
      description={description}
      placeholder={items.length === 0 ? "Education, Legal, Crypto..." : undefined}
      searchSource={source}
      value={items}
      onChange={(next) => onChange(next.map((item) => item.label))}
      hasCreate
      hasEntriesOnFocus
      maxEntries={MAX_IDEA_CATEGORIES}
      debounceMs={0}
      isRequired
      emptySearchText="No category matches. Keep typing to add it."
      status={status}
    />
  );
}
