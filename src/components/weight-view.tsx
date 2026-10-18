"use client";

import { useState } from "react";
import { dateRange } from "@/lib/calorie-balance";
import { KCAL_PER_KG, TDEE_MIN_SPAN_DAYS, TDEE_MIN_WEIGH_INS, trendWeight } from "@/lib/progress";
import { useHydrated } from "@/lib/store";
import { WeightChart } from "./charts";
import { WeightForm } from "./forms";
import { Card, Section } from "./ui";
import { useProgress } from "./use-progress";
import * as f from "./format";

export function WeightView() {
  const hydrated = useHydrated();
  const { store, progress } = useProgress();
  const { points, tdee, calibration, overall, todayDate } = progress;
  const [date, setDate] = useState(todayDate);

  const first = points[0]?.date;
  const trend = first
    ? dateRange(first, points[points.length - 1].date)
        .map((d) => ({ date: d, kg: trendWeight(points, d) }))
        .filter((p): p is { date: string; kg: number } => p.kg != null)
    : [];
  const latest = overall.latest;
  const heightCm = store.settings.heightCm;
  const bmi = latest && heightCm ? latest.kg / (heightCm / 100) ** 2 : null;
  const predicted = overall.estFatKg;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted">Weight</p>
        <h1 className="text-2xl font-semibold">Weight &amp; real burn</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Latest" value={latest ? latest.kg.toFixed(1) : "—"} unit="kg" sub={latest ? f.shortDate(latest.date) : "No weigh-ins yet"} />
        <Card
          label="Change"
          value={overall.weightChange != null ? f.signedKg(overall.weightChange) : "—"}
          tone={overall.weightChange == null ? "" : overall.weightChange > 0 ? "text-surplus" : "text-deficit"}
          sub={overall.baseline ? `since ${f.shortDate(overall.baseline.date)}` : "needs two weigh-ins"}
        />
        <Card
          label="Trend"
          value={tdee.ok ? f.signedKg(tdee.kgPerWeek, 2) : "—"}
          sub={tdee.ok ? "per week" : "needs more weigh-ins"}
          tone={tdee.ok ? (tdee.kgPerWeek > 0 ? "text-surplus" : "text-deficit") : ""}
        />
        <Card label="BMI" value={bmi != null ? bmi.toFixed(1) : "—"} sub={heightCm ? `${heightCm} cm` : "Add height on Backup"} />
      </div>

      <Section title="Log a weigh-in" subtitle="Best done most mornings, after the toilet and before eating or drinking.">
        {hydrated && <WeightForm key={date} date={date} defaults={store.weights[date] ?? null} onDate={setDate} />}
      </Section>

      {points.length > 0 && (
        <Section title="Weight over time" subtitle="Dots are weigh-ins; the line is the average of the last 7 days, which smooths out water swings.">
          <WeightChart points={points} trend={trend} from={first!} to={todayDate} />
        </Section>
      )}

      <Section title="TDEE from your weight" subtitle="Your real daily burn, worked out from what you ate and what the scale did.">
        {tdee.ok ? (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-xs text-muted">Weight-based TDEE</dt><dd className="text-xl font-semibold tabular-nums">{f.kcal(tdee.tdee)}</dd></div>
              <div><dt className="text-xs text-muted">Garmin average</dt><dd className="text-xl font-semibold tabular-nums">{f.kcal(calibration?.garminAvg)}</dd></div>
              <div><dt className="text-xs text-muted">Avg eaten</dt><dd className="text-xl font-semibold tabular-nums">{f.kcal(tdee.avgIntake)}</dd></div>
              <div><dt className="text-xs text-muted">Garmin scale factor</dt><dd className="text-xl font-semibold tabular-nums">{calibration ? `× ${calibration.factor.toFixed(2)}` : "—"}</dd></div>
            </dl>
            <p className="text-muted">
              Over {f.shortDate(tdee.from)} – {f.shortDate(tdee.to)} you ate {f.kcal(tdee.avgIntake)} kcal a day on {tdee.loggedDays} logged days and your
              weight trended {f.signedKg(tdee.kgPerWeek, 2)} a week. Each kg is about {KCAL_PER_KG.toLocaleString("en-US")} kcal, so your body burned about{" "}
              {f.kcal(tdee.tdee)} kcal a day. Daily targets use Garmin&apos;s burn for that day times the scale factor, so active days still get more.
            </p>
            <p className="text-xs text-muted">Early numbers move a lot with water weight; it settles after two to three weeks of steady logging.</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted">
            <p>{tdee.reason}</p>
            <p>
              It needs at least {TDEE_MIN_WEIGH_INS} weigh-ins spread over {TDEE_MIN_SPAN_DAYS}+ days, with food logged on most of those days. Until then the
              dashboard uses Garmin&apos;s burn on its own.
            </p>
          </div>
        )}
        {overall.weightChange != null && overall.completeDays > 0 && (
          <p className="text-sm">
            <span className="text-muted">Scale vs calories since {f.shortDate(progress.start)}: </span>
            scale {f.signedKg(overall.weightChange)}, calories predict {f.signedKg(predicted, 2)} of fat.
          </p>
        )}
      </Section>

      {points.length > 0 && (
        <Section title="All weigh-ins">
          <ul className="divide-y divide-border text-sm">
            {[...points].reverse().map((p) => (
              <li key={p.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <button className="text-left hover:text-accent" onClick={() => setDate(p.date)}>
                  {f.shortDate(p.date)}
                  {store.weights[p.date]?.time && <span className="text-muted"> · {store.weights[p.date].time}</span>}
                </button>
                {p.notes && <span className="text-muted">{p.notes}</span>}
                <span className="ml-auto tabular-nums">{p.kg.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
