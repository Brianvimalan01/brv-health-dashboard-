"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { KCAL_PER_KG, mondayOf, type Tip } from "@/lib/progress";
import { BalanceBars } from "./charts";
import { ButtonLink, Card, Meter, Section } from "./ui";
import { useProgress } from "./use-progress";
import * as f from "./format";

const TIP_STYLE: Record<Tip["tone"], { dot: string; label: string }> = {
  good: { dot: "bg-deficit", label: "On track" },
  warn: { dot: "bg-surplus", label: "Watch" },
  info: { dot: "bg-accent", label: "Note" },
};

function balanceTone(n: number | null | undefined) {
  if (n == null || n === 0) return "";
  return n > 0 ? "text-surplus" : "text-deficit";
}

export function DashboardView() {
  const params = useSearchParams();
  const router = useRouter();
  const { store, garminState, progress } = useProgress();
  const { weeks, overall, tdee, calibration, tips, todayDate, start } = progress;

  // Old links to the day page were /?date=…; send them to /day.
  const legacyDate = params.get("date");
  useEffect(() => {
    if (legacyDate) router.replace(`/day?date=${legacyDate}`);
  }, [legacyDate, router]);

  const asked = params.get("week");
  const week = weeks.find((w) => w.monday === asked) ?? weeks[weeks.length - 1];
  if (!week) {
    return <p className="text-sm text-muted">Tracking starts on {f.longDate(start)}. Change it on the Backup page.</p>;
  }
  const idx = weeks.indexOf(week);
  const isCurrent = week.monday === mondayOf(todayDate);
  const finished = week.days.filter((d) => !d.isToday).length;
  const latest = overall.latest;
  const bmi = latest && store.settings.heightCm ? latest.kg / (store.settings.heightCm / 100) ** 2 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="text-xs uppercase tracking-wider text-muted">Dashboard</p>
          <h1 className="text-2xl font-semibold">
            {isCurrent ? "This week" : `Week of ${f.shortDate(week.monday)}`}
          </h1>
          <p className="text-xs text-muted">
            {f.shortDate(week.monday)} – {f.shortDate(week.sunday)} · tracking since {f.shortDate(start)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {idx > 0 && <ButtonLink href={`/?week=${weeks[idx - 1].monday}`}>← Prev</ButtonLink>}
          {idx < weeks.length - 1 && <ButtonLink href={`/?week=${weeks[idx + 1].monday}`}>Next →</ButtonLink>}
          <ButtonLink href="/day" primary>Log today</ButtonLink>
        </div>
      </div>

      {garminState.status === "locked" && (
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          Garmin data is locked, so burned calories are missing. <Link href="/day" className="text-accent">Unlock it on the Log page</Link>.
        </p>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#221f3d] via-surface to-[#13233a] p-5">
        <p className="text-xs uppercase tracking-wider text-muted">Overall since {f.shortDate(start)}</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted">Net calories</div>
            <div className={`text-2xl font-semibold tabular-nums ${balanceTone(overall.netKcal)}`}>{f.signedKcal(overall.netKcal)}</div>
            <div className="text-xs text-muted">{overall.completeDays} complete days</div>
          </div>
          <div>
            <div className="text-xs text-muted">Fat, from calories</div>
            <div className={`text-2xl font-semibold tabular-nums ${balanceTone(overall.estFatKg)}`}>{f.signedKg(overall.estFatKg, 2)}</div>
            <div className="text-xs text-muted">{KCAL_PER_KG.toLocaleString("en-US")} kcal ≈ 1 kg</div>
          </div>
          <div>
            <div className="text-xs text-muted">Scale weight</div>
            <div className={`text-2xl font-semibold tabular-nums ${balanceTone(overall.weightChange)}`}>
              {latest ? `${latest.kg.toFixed(1)} kg` : "—"}
            </div>
            <div className="text-xs text-muted">
              {overall.weightChange != null && overall.baseline
                ? `${f.signedKg(overall.weightChange)} since ${f.shortDate(overall.baseline.date)}`
                : <Link href="/weight" className="text-accent">Add a weigh-in</Link>}
              {bmi != null && ` · BMI ${bmi.toFixed(1)}`}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Real burn (TDEE)</div>
            <div className="text-2xl font-semibold tabular-nums">{tdee.ok ? f.kcal(tdee.tdee) : "—"}</div>
            <div className="text-xs text-muted">
              {tdee.ok
                ? `from weight trend${calibration ? ` · Garmin ${f.kcal(calibration.garminAvg)}` : ""}`
                : "needs more weigh-ins"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          label="Net this week"
          value={f.signedKcal(week.completeDays ? week.netKcal : null)}
          unit="kcal"
          tone={balanceTone(week.netKcal)}
          sub={week.completeDays ? `≈ ${f.signedKg(week.estFatKg, 2)} of fat` : "No complete days yet"}
        />
        <Card label="Avg eaten" value={f.kcal(week.avgEaten)} unit="kcal" sub="per complete day" />
        <Card label="Avg burned" value={f.kcal(week.avgBurned)} unit="kcal" sub={week.avgActive != null ? `${f.kcal(week.avgActive)} active` : "Garmin total"} />
        <Card
          label="Weight"
          value={week.weightEnd != null ? week.weightEnd.toFixed(1) : "—"}
          unit="kg"
          sub={
            week.weightStart != null && week.weightEnd != null && week.weightStart !== week.weightEnd
              ? `${f.signedKg(week.weightEnd - week.weightStart)} this week`
              : "Last weigh-in this week"
          }
        />
      </div>

      <Section
        title="Daily balance"
        subtitle="Eaten − burned. Blue bars are a deficit, red a surplus; dashed means a number is missing."
        action={
          <span className="text-xs text-muted">
            Logged {week.loggedDays}/{Math.max(finished, week.loggedDays)} days
          </span>
        }
      >
        <BalanceBars
          bars={week.days.map((d) => ({
            date: d.date,
            balance: d.balance.balanceKcal,
            eaten: d.balance.intakeKcal,
            burned: d.balance.totalBurnedKcal,
            provisional: d.isToday,
          }))}
        />
        {week.avgProtein != null && latest && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>Protein, avg {Math.round(week.avgProtein)} g</span>
              <span>goal {Math.round(latest.kg * 1.6)} g</span>
            </div>
            <Meter value={week.avgProtein} max={latest.kg * 1.6} />
          </div>
        )}
      </Section>

      {tips.length > 0 && isCurrent && (
        <Section title="Coach" subtitle="Feedback from your numbers this week. Each note says what it's based on.">
          <ul className="space-y-3">
            {tips.map((t) => (
              <li key={t.title} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TIP_STYLE[t.tone].dot}`} aria-hidden />
                <div className="text-sm">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-muted"> · {TIP_STYLE[t.tone].label}</span>
                  <p className="text-muted">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface/90">
        <div className="px-4 pt-4">
          <h2 className="font-semibold">Weekly progress</h2>
          <p className="text-xs text-muted">Totals over finished days with both eaten and burned. Fat is estimated from calories.</p>
        </div>
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-normal">Week of</th>
              <th className="px-2 py-2 text-right font-normal">Days</th>
              <th className="px-2 py-2 text-right font-normal">Avg eaten</th>
              <th className="px-2 py-2 text-right font-normal">Avg burned</th>
              <th className="px-2 py-2 text-right font-normal">Net</th>
              <th className="px-2 py-2 text-right font-normal">Fat est.</th>
              <th className="px-4 py-2 text-right font-normal">Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...weeks].reverse().map((w) => (
              <tr key={w.monday} className={w.monday === week.monday ? "bg-surface-2/60" : ""}>
                <td className="px-4 py-2">
                  <Link href={`/?week=${w.monday}`} className="hover:text-accent">{f.shortDate(w.monday)}</Link>
                </td>
                <td className="px-2 py-2 text-right">{w.completeDays}</td>
                <td className="px-2 py-2 text-right">{f.kcal(w.avgEaten)}</td>
                <td className="px-2 py-2 text-right">{f.kcal(w.avgBurned)}</td>
                <td className={`px-2 py-2 text-right ${balanceTone(w.netKcal)}`}>{w.completeDays ? f.signedKcal(w.netKcal) : "—"}</td>
                <td className="px-2 py-2 text-right">{w.completeDays ? f.signedKg(w.estFatKg, 2) : "—"}</td>
                <td className="px-4 py-2 text-right">{w.weightEnd != null ? `${w.weightEnd.toFixed(1)} kg` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
