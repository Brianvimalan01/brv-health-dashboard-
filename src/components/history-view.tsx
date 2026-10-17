"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, dateRange } from "@/lib/calorie-balance";
import { summarizeDay, today, type DaySummary } from "@/lib/day";
import { useStore } from "@/lib/store";
import { useGarminContext } from "./garmin-provider";
import * as f from "./format";

const RANGES = [7, 30, 90] as const;

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

// Monday-start weeks, averaging only finished days that have both numbers.
function weeklyAverages(days: DaySummary[]) {
  const weeks = new Map<string, DaySummary[]>();
  for (const d of days) {
    const dow = (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    const monday = addDays(d.date, -dow);
    weeks.set(monday, [...(weeks.get(monday) ?? []), d]);
  }
  return [...weeks.entries()].map(([monday, ds]) => {
    const complete = ds.filter((d) => !d.isToday && d.balance.status !== "incomplete");
    return {
      monday,
      completeDays: complete.length,
      eaten: average(complete.map((d) => d.balance.intakeKcal)),
      burned: average(complete.map((d) => d.balance.totalBurnedKcal)),
      balance: average(complete.map((d) => d.balance.balanceKcal)),
      protein: average(ds.map((d) => d.nutrition?.proteinG ?? null)),
    };
  });
}

export function HistoryView() {
  const params = useSearchParams();
  const store = useStore();
  const { state } = useGarminContext();
  const days = RANGES.find((r) => String(r) === params.get("days")) ?? 30;
  const to = today();
  const garmin = state.status === "unlocked" ? state.data : null;
  const history = dateRange(addDays(to, -(days - 1)), to)
    .reverse()
    .map((d) => summarizeDay(d, store, garmin, to));
  const weeks = weeklyAverages(history);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">History</h1>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/history?days=${r}`}
            className={`rounded-lg border px-3 py-1 text-sm ${r === days ? "border-accent text-accent" : "border-border text-muted"}`}
          >
            {r} days
          </Link>
        ))}
      </div>
      {state.status === "locked" && (
        <p className="text-sm text-muted">
          Garmin data is locked. <Link href="/" className="text-accent">Unlock it on the Today page</Link> to see burned calories here.
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-border bg-surface">
        <h2 className="px-4 pt-4 font-semibold">Weekly averages</h2>
        <p className="px-4 text-xs text-muted">Only finished days with both eaten and burned are counted.</p>
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-normal">Week of</th>
              <th className="px-2 py-2 text-right font-normal">Days</th>
              <th className="px-2 py-2 text-right font-normal">Eaten</th>
              <th className="px-2 py-2 text-right font-normal">Burned</th>
              <th className="px-2 py-2 text-right font-normal">Balance</th>
              <th className="px-4 py-2 text-right font-normal">Protein</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {weeks.map((w) => (
              <tr key={w.monday}>
                <td className="px-4 py-2">{w.monday}</td>
                <td className="px-2 py-2 text-right">{w.completeDays}</td>
                <td className="px-2 py-2 text-right">{f.kcal(w.eaten)}</td>
                <td className="px-2 py-2 text-right">{f.kcal(w.burned)}</td>
                <td className="px-2 py-2 text-right">{f.signedKcal(w.balance)}</td>
                <td className="px-4 py-2 text-right">{f.grams(w.protein)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-border bg-surface">
        <h2 className="px-4 pt-4 font-semibold">Daily</h2>
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-normal">Date</th>
              <th className="px-2 py-2 text-right font-normal">Eaten</th>
              <th className="px-2 py-2 text-right font-normal">Burned</th>
              <th className="px-2 py-2 text-right font-normal">Balance</th>
              <th className="px-4 py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((d) => (
              <tr key={d.date}>
                <td className="px-4 py-2">
                  <Link href={`/?date=${d.date}`} className="hover:text-accent">{d.date}</Link>
                </td>
                <td className="px-2 py-2 text-right">{f.kcal(d.balance.intakeKcal)}</td>
                <td className="px-2 py-2 text-right">{f.kcal(d.balance.totalBurnedKcal)}</td>
                <td className="px-2 py-2 text-right">{f.signedKcal(d.balance.balanceKcal)}</td>
                <td className={`px-4 py-2 ${f.STATUS_COLOR[d.balance.status]}`}>
                  {f.STATUS_LABEL[d.balance.status]}
                  {d.isToday && <span className="text-muted"> (provisional)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
