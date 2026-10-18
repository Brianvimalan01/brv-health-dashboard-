import { addDays, dateRange } from "@/lib/calorie-balance";
import { summarizeDay, type DaySummary } from "@/lib/day";
import type { GarminData } from "@/lib/garmin/data";
import type { Settings, StoreData, WeightEntry } from "@/lib/store";

// About 7,700 kcal of surplus or deficit per kilogram of body fat. Real
// weight swings more than this from day to day (water, salt, food in the gut),
// so fat figures are estimates from calories, not measurements.
export const KCAL_PER_KG = 7700;

export type WeighIn = { date: string; kg: number; notes: string | null };

export function weighIns(weights: Record<string, WeightEntry>): WeighIn[] {
  return Object.entries(weights)
    .map(([date, w]) => ({ date, kg: w.kg, notes: w.notes }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function average(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length ? sum(present) / present.length : null;
}

// Least-squares slope through the weigh-ins, in kg per day. One weigh-in says
// nothing about a trend, so fewer than two gives null.
export function weightSlope(points: WeighIn[]): number | null {
  if (points.length < 2) return null;
  const x = points.map((p) => daysBetween(points[0].date, p.date));
  const mx = sum(x) / x.length;
  const my = sum(points.map((p) => p.kg)) / points.length;
  const sxx = sum(x.map((v) => (v - mx) ** 2));
  if (sxx === 0) return null;
  return sum(x.map((v, i) => (v - mx) * (points[i].kg - my))) / sxx;
}

// Trend weight on each date: the average of weigh-ins in the 7 days up to it.
export function trendWeight(points: WeighIn[], date: string): number | null {
  const from = addDays(date, -6);
  return average(points.filter((p) => p.date >= from && p.date <= date).map((p) => p.kg));
}

export const TDEE_MIN_SPAN_DAYS = 7;
export const TDEE_MIN_WEIGH_INS = 3;
export const TDEE_MIN_LOGGED_SHARE = 0.7;

export type TdeeEstimate =
  | {
      ok: true;
      tdee: number;
      avgIntake: number;
      kgPerWeek: number;
      from: string;
      to: string;
      loggedDays: number;
    }
  | { ok: false; reason: string };

// TDEE from what actually happened to the scale: average intake minus the
// energy that went into (or came out of) body weight. This captures how
// active each day really was, unlike a fixed formula, and corrects Garmin
// if its burn estimate runs high or low.
export function estimateTdee(days: DaySummary[], points: WeighIn[], from: string, to: string): TdeeEstimate {
  const inWindow = points.filter((p) => p.date >= from && p.date <= to);
  if (inWindow.length < TDEE_MIN_WEIGH_INS) {
    return { ok: false, reason: `Needs at least ${TDEE_MIN_WEIGH_INS} weigh-ins since ${from} (have ${inWindow.length}).` };
  }
  const first = inWindow[0].date;
  const last = inWindow[inWindow.length - 1].date;
  const span = daysBetween(first, last);
  if (span < TDEE_MIN_SPAN_DAYS) {
    return { ok: false, reason: `Needs weigh-ins at least ${TDEE_MIN_SPAN_DAYS} days apart (now ${span}).` };
  }
  const window = days.filter((d) => d.date >= first && d.date < last && !d.isToday);
  const logged = window.filter((d) => d.balance.intakeKcal != null);
  if (window.length === 0 || logged.length / window.length < TDEE_MIN_LOGGED_SHARE) {
    return { ok: false, reason: `Needs food logged on most days between ${first} and ${last} (${logged.length} of ${window.length}).` };
  }
  const slope = weightSlope(inWindow)!;
  const avgIntake = average(logged.map((d) => d.balance.intakeKcal))!;
  return {
    ok: true,
    tdee: avgIntake - slope * KCAL_PER_KG,
    avgIntake,
    kgPerWeek: slope * 7,
    from: first,
    to: last,
    loggedDays: logged.length,
  };
}

export type WeekSummary = {
  monday: string;
  sunday: string;
  days: DaySummary[];
  loggedDays: number;
  completeDays: number;
  eatenTotal: number;
  burnedTotal: number;
  netKcal: number;
  avgEaten: number | null;
  avgBurned: number | null;
  avgActive: number | null;
  avgProtein: number | null;
  estFatKg: number;
  weightStart: number | null;
  weightEnd: number | null;
};

export function mondayOf(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

// Totals use only finished days with both eaten and burned, so a missing
// day never counts as zero.
export function summarizeWeek(days: DaySummary[], points: WeighIn[], monday: string): WeekSummary {
  const sunday = addDays(monday, 6);
  const week = days.filter((d) => d.date >= monday && d.date <= sunday);
  const complete = week.filter((d) => !d.isToday && d.balance.balanceKcal != null);
  const inWeek = points.filter((p) => p.date >= monday && p.date <= sunday);
  const netKcal = sum(complete.map((d) => d.balance.balanceKcal!));
  return {
    monday,
    sunday,
    days: week,
    loggedDays: week.filter((d) => d.nutrition).length,
    completeDays: complete.length,
    eatenTotal: sum(complete.map((d) => d.balance.intakeKcal!)),
    burnedTotal: sum(complete.map((d) => d.balance.totalBurnedKcal!)),
    netKcal,
    avgEaten: average(complete.map((d) => d.balance.intakeKcal)),
    avgBurned: average(complete.map((d) => d.balance.totalBurnedKcal)),
    avgActive: average(week.filter((d) => !d.isToday).map((d) => d.garmin?.activeKcal)),
    avgProtein: average(week.map((d) => d.nutrition?.proteinG)),
    estFatKg: netKcal / KCAL_PER_KG,
    weightStart: inWeek[0]?.kg ?? null,
    weightEnd: inWeek.length ? inWeek[inWeek.length - 1].kg : null,
  };
}

export function weeksSince(start: string, to: string): string[] {
  const mondays: string[] = [];
  for (let m = mondayOf(start); m <= to; m = addDays(m, 7)) mondays.push(m);
  return mondays;
}

export type Overall = {
  completeDays: number;
  netKcal: number;
  estFatKg: number;
  baseline: WeighIn | null;
  latest: WeighIn | null;
  weightChange: number | null;
};

// The baseline is the last weigh-in on or before the start date, or the first
// one after it when there's none before.
export function overallProgress(days: DaySummary[], points: WeighIn[], start: string): Overall {
  const complete = days.filter((d) => d.date >= start && !d.isToday && d.balance.balanceKcal != null);
  const netKcal = sum(complete.map((d) => d.balance.balanceKcal!));
  const before = points.filter((p) => p.date <= start);
  const baseline = before[before.length - 1] ?? points.find((p) => p.date > start) ?? null;
  const latest = points[points.length - 1] ?? null;
  return {
    completeDays: complete.length,
    netKcal,
    estFatKg: netKcal / KCAL_PER_KG,
    baseline,
    latest,
    weightChange: baseline && latest && latest.date > baseline.date ? latest.kg - baseline.kg : null,
  };
}

export type Calibration = { factor: number; garminAvg: number };

// How Garmin's burn compares with the weight-based TDEE over the same days.
// Scaling each day's Garmin total by this keeps the day-to-day activity
// swings while matching the long-run level the scale shows. Clamped, because
// two weeks of scale noise can't justify a bigger correction than ±25%.
export function calibrate(days: DaySummary[], tdee: TdeeEstimate): Calibration | null {
  if (!tdee.ok) return null;
  const garminAvg = average(
    days.filter((d) => d.date >= tdee.from && d.date < tdee.to && !d.isToday).map((d) => d.balance.totalBurnedKcal),
  );
  if (!garminAvg) return null;
  return { factor: Math.min(1.25, Math.max(0.75, tdee.tdee / garminAvg)), garminAvg };
}

export type Tip = { tone: "good" | "warn" | "info"; title: string; text: string };

export type CoachInput = {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary | null;
  tdee: TdeeEstimate;
  calibration: Calibration | null;
  latestKg: number | null;
  settings: Settings;
  todayDate: string;
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const kg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)} kg`;

// Plain rules over the numbers above; each tip says what it's based on.
export function coach(input: CoachInput): Tip[] {
  const { thisWeek, lastWeek, tdee, calibration, latestKg, settings, todayDate } = input;
  const tips: Tip[] = [];
  const finished = thisWeek.days.filter((d) => d.date < todayDate && d.date >= settings.trackingStart).length;

  if (finished > 0) {
    const missing = finished - thisWeek.loggedDays;
    tips.push(
      missing > 0
        ? { tone: "warn", title: "Logging", text: `Food is missing for ${missing} of ${finished} finished days this week. Unlogged days are left out, so totals only cover what's logged.` }
        : { tone: "good", title: "Logging", text: `Every finished day this week is logged (${finished} of ${finished}).` },
    );
  }

  if (thisWeek.completeDays > 0) {
    const net = thisWeek.netKcal;
    tips.push({
      tone: net > 0 ? "warn" : "good",
      title: net > 0 ? "Surplus this week" : "Deficit this week",
      text: `${net > 0 ? "+" : "−"}${fmt(Math.abs(net))} kcal over ${thisWeek.completeDays} complete days, about ${kg(thisWeek.estFatKg)} of fat by Garmin's burn.`,
    });
  }

  if (tdee.ok && calibration) {
    const gap = calibration.garminAvg - tdee.tdee;
    tips.push({
      tone: "info",
      title: "Your real burn",
      text:
        Math.abs(gap) < 150
          ? `Your weight trend agrees with Garmin: about ${fmt(tdee.tdee)} kcal a day.`
          : `Your weight trend says you burn about ${fmt(tdee.tdee)} kcal a day, ${fmt(Math.abs(gap))} ${gap > 0 ? "less" : "more"} than Garmin's ${fmt(calibration.garminAvg)}. Daily burns are scaled by ${calibration.factor.toFixed(2)} for targets.`,
    });
  } else if (!tdee.ok) {
    tips.push({ tone: "info", title: "Weight-based TDEE", text: `${tdee.reason} Weigh in most mornings, after the toilet and before eating, so it can check Garmin's burn.` });
  }

  const baseTdee = tdee.ok ? tdee.tdee : thisWeek.avgBurned ?? lastWeek?.avgBurned ?? null;
  if (baseTdee != null) {
    const target = baseTdee + (settings.goalKgPerWeek * KCAL_PER_KG) / 7;
    const eaten = thisWeek.avgEaten ?? lastWeek?.avgEaten ?? null;
    const goal = `${settings.goalKgPerWeek > 0 ? "+" : ""}${settings.goalKgPerWeek} kg a week`;
    if (eaten != null) {
      const over = eaten - target;
      tips.push({
        tone: over > 150 ? "warn" : "good",
        title: "Calorie target",
        text: `For ${goal}, aim for about ${fmt(target)} kcal a day on an average day. You're averaging ${fmt(eaten)}${over > 150 ? `, ${fmt(over)} over` : over < -150 ? `, ${fmt(-over)} under` : ", on target"}. On active days you can eat more; follow the day's target on the Log page.`,
      });
    } else {
      tips.push({ tone: "info", title: "Calorie target", text: `For ${goal}, aim for about ${fmt(target)} kcal a day.` });
    }
  }

  if (latestKg != null && thisWeek.avgProtein != null) {
    const target = Math.round(latestKg * 1.6);
    tips.push({
      tone: thisWeek.avgProtein >= target ? "good" : "warn",
      title: "Protein",
      text: `Averaging ${Math.round(thisWeek.avgProtein)} g a day; about ${target} g (1.6 g per kg) helps keep muscle while losing fat.`,
    });
  }

  if (thisWeek.avgActive != null && lastWeek?.avgActive != null) {
    const diff = thisWeek.avgActive - lastWeek.avgActive;
    if (Math.abs(diff) >= 100) {
      tips.push({
        tone: diff > 0 ? "good" : "info",
        title: "Activity",
        text: `Active calories are ${diff > 0 ? "up" : "down"} ${fmt(Math.abs(diff))} kcal a day on last week (${fmt(thisWeek.avgActive)} vs ${fmt(lastWeek.avgActive)}).`,
      });
    }
  }

  return tips;
}

// The day's suggested intake: that day's burn (Garmin, scaled to the weight
// trend when there's enough data) plus the daily share of the weekly goal.
export function dayTarget(burnedKcal: number | null, calibration: Calibration | null, settings: Settings): number | null {
  if (burnedKcal == null) return null;
  return burnedKcal * (calibration?.factor ?? 1) + (settings.goalKgPerWeek * KCAL_PER_KG) / 7;
}

// A normal day's burn: the weight-based TDEE when there's enough data,
// otherwise the average of the last 7 finished days with a burn total.
export function typicalBurn(days: DaySummary[], tdee: TdeeEstimate): number | null {
  if (tdee.ok) return tdee.tdee;
  const finished = days.filter((d) => !d.isToday && d.balance.totalBurnedKcal != null).slice(-7);
  return average(finished.map((d) => d.balance.totalBurnedKcal));
}

export function trackedDates(start: string, to: string): string[] {
  return start > to ? [] : dateRange(start, to);
}

export type Progress = {
  start: string;
  todayDate: string;
  days: DaySummary[];
  points: WeighIn[];
  weeks: WeekSummary[];
  overall: Overall;
  tdee: TdeeEstimate;
  calibration: Calibration | null;
  tips: Tip[];
};

export const TDEE_WINDOW_DAYS = 28;

// Everything the dashboard needs, from the tracking start date to today.
export function buildProgress(store: StoreData, garmin: GarminData | null, todayDate: string): Progress {
  const start = store.settings.trackingStart;
  const points = weighIns(store.weights);
  const overallBase = overallProgress([], points, start).baseline;
  // The weight trend may begin with the last weigh-in before tracking started.
  const tdeeFrom = [overallBase?.date ?? start, addDays(todayDate, -TDEE_WINDOW_DAYS)].sort()[1];
  const firstDay = [start, tdeeFrom].sort()[0];
  const all = trackedDates(firstDay, todayDate).map((d) => summarizeDay(d, store, garmin, todayDate));
  const days = all.filter((d) => d.date >= start);
  const weeks = weeksSince(start, todayDate).map((m) => summarizeWeek(days, points, m));
  const tdee = estimateTdee(all, points, tdeeFrom, todayDate);
  const calibration = calibrate(all, tdee);
  const latestKg = points[points.length - 1]?.kg ?? null;
  return {
    start,
    todayDate,
    days,
    points,
    weeks,
    overall: overallProgress(days, points, start),
    tdee,
    calibration,
    tips: weeks.length
      ? coach({
          thisWeek: weeks[weeks.length - 1],
          lastWeek: weeks[weeks.length - 2] ?? null,
          tdee,
          calibration,
          latestKg,
          settings: store.settings,
          todayDate,
        })
      : [],
  };
}
