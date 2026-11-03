/** The URL contract shared by every list page. */
export type ListSearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function readListParams(searchParams: ListSearchParams, filterKey?: string) {
  const params = await searchParams;
  const page = Number.parseInt(first(params.page), 10);
  return {
    query: first(params.q).trim(),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    filter: filterKey ? first(params[filterKey]) : "",
  };
}
