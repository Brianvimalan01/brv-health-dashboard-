import { describe, expect, it } from "vitest";
import { dateRange } from "./calorie-balance";
import type { GarminData } from "./garmin/data";
import {
  buildProgress,
  calibrate,
  dayTarget,
  estimateTdee,
  KCAL_PER_KG,
  mondayOf,
  overallProgress,
  summarizeWeek,
  typicalBurn,
  weighIns,
  weightSlope,
} from "./progress";
import { summarizeDay } from "./day";
import { DEFAULT_SETTINGS, withDefaults, type StoreData } from "./store";

// 100 g protein, 200 g carbs, 0 fibre, 100 g fat = 400 + 800 + 900 = 2100 kcal
const food = { carbsG: 200, fatG: 100, proteinG: 100, fibreG: 0, healthifymeKcal: null, notes: null, updatedAt: "" };
const w = (kg: number) => ({ kg, time: null, notes: null, updatedAt: "" });

function store(dates: string[], weights: Record<string, number>, extra: Partial<StoreData> = {}): StoreData {
  return withDefaults({
    nutrition: Object.fromEntries(dates.map((d) => [d, food])),
    weights: Object.fromEntries(Object.entries(weights).map(([d, kg]) => [d, w(kg)])),
    ...extra,
  });
}

function garmin(dates: string[], total: number): GarminData {
  return {
    version: 1,
    syncedAt: "",
    days: Object.fromEntries(dates.map((d) => [d, { totalBurnedKcal: total, activeKcal: 500, restingKcal: total - 500, sourceUpdatedAt: null }])),
    activities: [],
  };
}

describe("weight trend", () => {
  it("fits a least-squares slope in kg per day", () => {
    const pts = weighIns({ "2026-10-12": w(90), "2026-10-15": w(89.7), "2026-10-19": w(89.3) });
    expect(weightSlope(pts)).toBeCloseTo(-0.1, 5);
  });

  it("needs two weigh-ins on different days", () => {
    expect(weightSlope(weighIns({ "2026-10-12": w(90) }))).toBeNull();
  });
});

describe("estimateTdee", () => {
  const dates = dateRange("2026-10-12", "2026-10-26");

  it("is intake minus the energy that went into weight change", () => {
    // Losing 0.1 kg a day while eating 2,100 means a burn of 2,100 + 770.
    const s = store(dates, { "2026-10-12": 90, "2026-10-19": 89.3, "2026-10-26": 88.6 });
    const days = dates.map((d) => summarizeDay(d, s, null, "2026-10-27"));
    const est = estimateTdee(days, weighIns(s.weights), "2026-10-12", "2026-10-27");
    expect(est.ok && est.tdee).toBeCloseTo(2100 + 0.1 * KCAL_PER_KG, 5);
    expect(est.ok && est.kgPerWeek).toBeCloseTo(-0.7, 5);
  });

  it("refuses with too few weigh-ins or too short a span", () => {
    const s = store(dates, { "2026-10-12": 90, "2026-10-14": 89.8, "2026-10-15": 89.9 });
    const days = dates.map((d) => summarizeDay(d, s, null, "2026-10-27"));
    expect(estimateTdee(days, weighIns(s.weights), "2026-10-12", "2026-10-27").ok).toBe(false);
    expect(estimateTdee(days, weighIns({ "2026-10-12": w(90) }), "2026-10-12", "2026-10-27").ok).toBe(false);
  });

  it("refuses when most days have no food logged, rather than guessing", () => {
    const s = store(dates.slice(0, 3), { "2026-10-12": 90, "2026-10-19": 89.3, "2026-10-26": 88.6 });
    const days = dates.map((d) => summarizeDay(d, s, null, "2026-10-27"));
    expect(estimateTdee(days, weighIns(s.weights), "2026-10-12", "2026-10-27").ok).toBe(false);
  });

  it("calibrates Garmin to the weight-based burn, within limits", () => {
    const s = store(dates, { "2026-10-12": 90, "2026-10-19": 89.3, "2026-10-26": 88.6 });
    const g = garmin(dates, 3080);
    const days = dates.map((d) => summarizeDay(d, s, g, "2026-10-27"));
    const est = estimateTdee(days, weighIns(s.weights), "2026-10-12", "2026-10-27");
    const cal = calibrate(days, est)!;
    expect(cal.garminAvg).toBe(3080);
    expect(cal.factor).toBeCloseTo(2870 / 3080, 5);
    expect(dayTarget(3080, cal, DEFAULT_SETTINGS)).toBeCloseTo(2870 - 550, 5);
    expect(dayTarget(null, cal, DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("weekly and overall progress", () => {
  const dates = dateRange("2026-10-12", "2026-10-18");
  const s = store(dates.slice(0, 5), { "2026-10-11": 88.9, "2026-10-16": 89.9 });
  const g = garmin(dates, 2000);
  const days = dates.map((d) => summarizeDay(d, s, g, "2026-10-18"));

  it("starts weeks on Monday", () => {
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
  });

  it("totals only complete finished days and turns the surplus into fat", () => {
    const week = summarizeWeek(days, weighIns(s.weights), "2026-10-12");
    expect(week.completeDays).toBe(5);
    expect(week.netKcal).toBe(500);
    expect(week.estFatKg).toBeCloseTo(500 / KCAL_PER_KG, 5);
    expect(week.weightEnd).toBe(89.9);
  });

  it("measures weight change from the last weigh-in before the start", () => {
    const o = overallProgress(days, weighIns(s.weights), "2026-10-12");
    expect(o.baseline?.date).toBe("2026-10-11");
    expect(o.weightChange).toBeCloseTo(1, 5);
  });

  it("takes a normal day's burn from finished days, not today's partial one", () => {
    const tdee = estimateTdee(days, weighIns(s.weights), "2026-10-12", "2026-10-18");
    expect(tdee.ok).toBe(false);
    const withToday = [...days.slice(0, 6), { ...days[6], balance: { ...days[6].balance, totalBurnedKcal: 900 } }];
    expect(typicalBurn(withToday, tdee)).toBe(2000);
  });

  it("ignores days before the tracking start", () => {
    const early = { ...s, nutrition: { ...s.nutrition, "2026-10-05": food } };
    const p = buildProgress(early, garmin(["2026-10-05", ...dates], 2000), "2026-10-18");
    expect(p.days[0].date).toBe("2026-10-12");
    expect(p.overall.netKcal).toBe(500);
    expect(p.weeks.map((x) => x.monday)).toEqual(["2026-10-12"]);
    expect(p.tips.length).toBeGreaterThan(0);
  });
});

describe("withDefaults", () => {
  it("upgrades older saved data", () => {
    const old = withDefaults({ version: 1, nutrition: {}, manualEnergy: {}, settings: { toleranceKcal: 200 } as never });
    expect(old.weights).toEqual({});
    expect(old.settings).toMatchObject({ toleranceKcal: 200, trackingStart: "2026-10-12", goalKgPerWeek: -0.5, heightCm: null });
  });
});
