const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const integer = new Intl.NumberFormat("en-US");

/** USD in millionths to a dollar string, e.g. 2500000 → "$2.50". */
export function formatMicros(micros: number): string {
  return usd.format(micros / 1_000_000);
}

/** Signed, for ledger rows: "+$5.00" or "−$0.42". */
export function formatSignedMicros(micros: number): string {
  const text = formatMicros(Math.abs(micros));
  return micros < 0 ? `−${text}` : `+${text}`;
}

export function dollarsToMicros(dollars: number): number {
  return Math.round(dollars * 1_000_000);
}

export function formatCount(value: number): string {
  return integer.format(value);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}

/** Shortens a Clerk id for tables: user_2abc…xyz. */
export function shortId(id: string, keep = 6): string {
  if (id.length <= keep * 2 + 1) {
    return id;
  }
  return `${id.slice(0, keep)}…${id.slice(-keep)}`;
}

export function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
