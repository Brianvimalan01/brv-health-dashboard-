// Whole kcal and one decimal for grams: the inputs are estimates, so more
// precision would be false precision.
export function kcal(n: number | null | undefined): string {
  return n == null ? "—" : Math.round(n).toLocaleString("en-US");
}

export function signedKcal(n: number | null | undefined): string {
  if (n == null) return "—";
  const r = Math.round(n);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toLocaleString("en-US")}`;
}

export function grams(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n * 10) / 10} g`;
}

export function duration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function distance(meters: number | null): string {
  return meters == null ? "" : `${(meters / 1000).toFixed(2)} km`;
}

export function dateTime(value: Date | string | null, timeZone: string): string {
  if (!value) return "never";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function time(value: Date | string, timeZone: string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function longDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export const STATUS_LABEL = {
  deficit: "Estimated deficit",
  maintenance: "Around maintenance",
  surplus: "Estimated surplus",
  incomplete: "Incomplete data",
} as const;

export const STATUS_COLOR = {
  deficit: "text-deficit",
  maintenance: "text-maintenance",
  surplus: "text-surplus",
  incomplete: "text-muted",
} as const;

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function weekdayInitial(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .slice(0, 2);
}

export function signedKg(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(digits)} kg`;
}
