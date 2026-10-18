"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, isLocalDate, MACRO_METHOD } from "@/lib/calorie-balance";
import { APP_TIMEZONE, summarizeDay, today } from "@/lib/day";
import { dayTarget, KCAL_PER_KG, typicalBurn } from "@/lib/progress";
import { useHydrated } from "@/lib/store";
import { useProgress } from "./use-progress";
import { useGarminContext } from "./garmin-provider";
import { ManualEnergyForm, NutritionForm, UnlockForm } from "./forms";
import { Card, Section } from "./ui";
import * as f from "./format";

export function DayView() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const { store, progress } = useProgress();
  const { state: garminState, unlock } = useGarminContext();

  const todayDate = today();
  const param = params.get("date");
  const date = param && isLocalDate(param) && param <= todayDate ? param : todayDate;
  const garminData = garminState.status === "unlocked" ? garminState.data : null;
  const day = summarizeDay(date, store, garminData, todayDate);
  const { balance, intake, nutrition, garmin, manual } = day;
  const partial = day.isToday ? " so far" : "";
  const tz = APP_TIMEZONE;
  const burned = day.energyUsed === "manual" ? manual?.totalBurnedKcal : garmin?.totalBurnedKcal;
  const start = store.settings.trackingStart;
  // Today's burn is still rising, so today's target comes from a normal day.
  const typical = typicalBurn(progress.days, progress.tdee);
  const target = day.isToday
    ? typical == null
      ? null
      : typical + (store.settings.goalKgPerWeek * KCAL_PER_KG) / 7
    : dayTarget(balance.totalBurnedKcal, progress.calibration, store.settings);
  const weighIn = store.weights[date];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {date > start && (
          <Link href={`/day?date=${addDays(date, -1)}`} className="rounded-lg border border-border px-3 py-1.5 text-sm" aria-label="Previous day">←</Link>
        )}
        <div>
          <h1 className="text-lg font-semibold">{day.isToday ? "Today" : f.longDate(date)}</h1>
          <p className="text-xs text-muted">{day.isToday ? f.longDate(date) + " · " : ""}{tz}</p>
        </div>
        {!day.isToday && (
          <Link href={`/day?date=${addDays(date, 1)}`} className="rounded-lg border border-border px-3 py-1.5 text-sm" aria-label="Next day">→</Link>
        )}
        <input
          type="date"
          value={date}
          min={start}
          max={todayDate}
          onChange={(e) => e.target.value && router.push(`/day?date=${e.target.value}`)}
          className="ml-auto !w-auto"
          aria-label="Pick a date"
        />
      </div>

      {date < start && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
          This day is before tracking started ({f.longDate(start)}), so it isn&apos;t counted on the dashboard.
        </p>
      )}

      {day.isToday && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
          Provisional: today isn&apos;t over, so calories burned keep rising until midnight. Compare once you&apos;ve logged the whole day.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          label="Eaten"
          value={`${f.kcal(intake?.kcal)} kcal`}
          sub={intake ? (intake.source === "healthifyme_total" ? "HealthifyMe total" : "Calculated from macros") : "Not logged yet"}
        />
        <Card
          label={`Burned${partial}`}
          value={`${f.kcal(burned)} kcal`}
          sub={day.energyUsed === "garmin" ? "Garmin total" : day.energyUsed === "manual" ? "Entered by hand" : "No Garmin total yet"}
        />
        <Card label="Balance" value={`${f.signedKcal(balance.balanceKcal)} kcal`} tone={f.STATUS_COLOR[balance.status]} sub="eaten − burned" />
        <Card
          label="Status"
          value={f.STATUS_LABEL[balance.status]}
          tone={f.STATUS_COLOR[balance.status]}
          sub={balance.status === "incomplete" ? "Needs both eaten and burned" : `±${store.settings.toleranceKcal} kcal counts as maintenance`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-surface/90 px-4 py-3 text-sm">
        <div>
          <span className="text-muted">Target: </span>
          <strong className="tabular-nums">{target == null ? "—" : `${f.kcal(target)} kcal`}</strong>
          <span className="text-xs text-muted">
            {" "}
            {target == null
              ? "(needs the day's burn)"
              : day.isToday
                ? `(a normal day's burn${progress.tdee.ok ? " from your weight trend" : ""}, ${store.settings.goalKgPerWeek} kg/week; firms up once the day's burn is in)`
                : progress.calibration
                ? `(burn × ${progress.calibration.factor.toFixed(2)} from your weight trend, ${store.settings.goalKgPerWeek} kg/week)`
                : `(burn, ${store.settings.goalKgPerWeek} kg/week)`}
          </span>
          {target != null && intake && (
            <span className={`ml-2 tabular-nums ${intake.kcal > target ? "text-surplus" : "text-deficit"}`}>
              {intake.kcal > target ? `${f.kcal(intake.kcal - target)} over` : `${f.kcal(target - intake.kcal)} left`}
            </span>
          )}
        </div>
        <Link href="/weight" className="ml-auto text-muted hover:text-foreground">
          Weight: <span className="tabular-nums text-foreground">{weighIn ? `${weighIn.kg.toFixed(1)} kg` : "add"}</span>
        </Link>
      </div>

      <Section title="Food (end-of-day totals)">
        {intake?.source === "healthifyme_total" && (
          <p className="text-xs text-muted">
            Using your HealthifyMe total. Calculated from macros would be {f.kcal(intake.derivedKcal)} kcal.
          </p>
        )}
        {hydrated && <NutritionForm key={date} date={date} defaults={nutrition} />}
        <p className="text-xs text-muted">Calories from macros: {MACRO_METHOD}.</p>
      </Section>

      <Section title="Activity (Garmin)">
        {garminState.status === "locked" && <UnlockForm onUnlock={unlock} error={garminState.error} />}
        {garminState.status === "no_data" && (
          <p className="text-sm text-muted">No Garmin data has been synced yet. The nightly GitHub job publishes it once it&apos;s set up.</p>
        )}
        {garminState.status === "unlocked" &&
          (garmin ? (
            <>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-muted">Total{partial}</dt><dd>{f.kcal(garmin.totalBurnedKcal)} kcal</dd></div>
                <div><dt className="text-muted">Active</dt><dd>{f.kcal(garmin.activeKcal)} kcal</dd></div>
                <div><dt className="text-muted">Resting</dt><dd>{f.kcal(garmin.restingKcal)} kcal</dd></div>
              </dl>
              <p className="text-xs text-muted">
                Garmin&apos;s total already includes active and resting calories. Workout calories below are part of it, not extra.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No Garmin data for this day yet.</p>
          ))}
        {day.activities.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {day.activities.map((a) => (
              <li key={a.sourceActivityId} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{a.name ?? a.activityType}</span>{" "}
                  <span className="text-muted">· {f.time(a.startedAt, tz)} · {f.duration(a.durationSeconds)} {f.distance(a.distanceMeters)}</span>
                </span>
                <span className="tabular-nums">{f.kcal(a.activityKcal)} kcal</span>
              </li>
            ))}
          </ul>
        )}
        <details className="text-sm" open={!!manual}>
          <summary className="cursor-pointer text-muted">
            {manual ? "Burned calories entered by hand (replacing Garmin)" : "Enter burned calories by hand instead"}
          </summary>
          <div className="mt-3">
            {hydrated && <ManualEnergyForm key={date} date={date} defaults={manual} />}
          </div>
        </details>
      </Section>

      <Section title="Data sources">
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap justify-between gap-2">
            <span>Food</span>
            <span className="text-muted">
              Entered by hand on this device{nutrition ? ` · updated ${f.dateTime(nutrition.updatedAt, tz)}` : " · nothing logged for this day"}
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-2">
            <span>Garmin Connect</span>
            <span className="text-muted">
              {garminState.status === "unlocked"
                ? `Last nightly sync ${f.dateTime(garminState.data.syncedAt, tz)}`
                : garminState.status === "locked"
                  ? "Locked"
                  : garminState.status === "no_data"
                    ? "Not synced yet"
                    : "Loading…"}
            </span>
          </li>
          {garmin?.sourceUpdatedAt && (
            <li className="text-xs text-muted">Your watch last synced to Garmin at {f.dateTime(garmin.sourceUpdatedAt, tz)}.</li>
          )}
        </ul>
      </Section>
    </div>
  );
}
