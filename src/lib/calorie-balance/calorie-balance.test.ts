import { describe, expect, it } from "vitest";
import {
  addDays,
  calculateDailyBalance,
  dateRange,
  isLocalDate,
  kcalFromMacros,
  localDate,
  pickEnergy,
  resolveIntake,
  validateMacros,
} from "./index";

describe("kcalFromMacros", () => {
  it("counts fibre at 2 kcal/g and takes it out of carbs", () => {
    // 4*150 + 4*(250-30) + 2*30 + 9*70 = 600 + 880 + 60 + 630
    expect(
      kcalFromMacros({ proteinG: 150, carbsG: 250, fibreG: 30, fatG: 70 }),
    ).toBe(2170);
  });

  it("is zero for an empty day", () => {
    expect(kcalFromMacros({ proteinG: 0, carbsG: 0, fibreG: 0, fatG: 0 })).toBe(0);
  });

  it("ignores extra fields on a stored row", () => {
    const row = { proteinG: 0, carbsG: 0, fibreG: 0, fatG: 0, notes: "x", localDate: "2026-10-17" };
    expect(validateMacros(row)).toEqual([]);
  });

  it("rejects fibre above carbs and negative values", () => {
    expect(validateMacros({ proteinG: 1, carbsG: 10, fibreG: 11, fatG: 1 })).toContain(
      "fibre cannot be more than total carbs",
    );
    expect(() =>
      kcalFromMacros({ proteinG: -1, carbsG: 0, fibreG: 0, fatG: 0 }),
    ).toThrow();
  });
});

describe("resolveIntake", () => {
  const macros = { proteinG: 100, carbsG: 200, fibreG: 20, fatG: 50 };

  it("uses the derived value when no HealthifyMe total is given", () => {
    const intake = resolveIntake(macros, null);
    expect(intake.source).toBe("derived_from_macros");
    expect(intake.kcal).toBe(intake.derivedKcal);
  });

  it("lets the HealthifyMe total override the derived value", () => {
    const intake = resolveIntake(macros, 1900);
    expect(intake).toMatchObject({ kcal: 1900, source: "healthifyme_total" });
    expect(intake.derivedKcal).toBe(400 + 720 + 40 + 450);
  });
});

describe("calculateDailyBalance", () => {
  it("classifies a deficit", () => {
    const r = calculateDailyBalance(2100, 2650, false);
    expect(r.balanceKcal).toBe(-550);
    expect(r.status).toBe("deficit");
  });

  it("classifies a surplus", () => {
    expect(calculateDailyBalance(3000, 2500, false).status).toBe("surplus");
  });

  it("treats the tolerance edges as maintenance", () => {
    expect(calculateDailyBalance(2350, 2500, false).status).toBe("maintenance");
    expect(calculateDailyBalance(2650, 2500, false).status).toBe("maintenance");
    expect(calculateDailyBalance(2349, 2500, false).status).toBe("deficit");
  });

  it("honours a custom tolerance", () => {
    expect(calculateDailyBalance(2300, 2500, false, 250).status).toBe("maintenance");
  });

  it("is incomplete when either side is missing, and never invents a value", () => {
    expect(calculateDailyBalance(null, 2500, false)).toMatchObject({
      status: "incomplete",
      balanceKcal: null,
    });
    expect(calculateDailyBalance(2000, null, false).status).toBe("incomplete");
  });

  it("carries the partial-day flag through", () => {
    expect(calculateDailyBalance(1000, 1500, true).isPartialDay).toBe(true);
  });
});

describe("pickEnergy", () => {
  it("prefers a manual total over Garmin", () => {
    const picked = pickEnergy([
      { source: "garmin", totalBurnedKcal: 2400, activeKcal: 600, restingKcal: 1800 },
      { source: "manual", totalBurnedKcal: 2500, activeKcal: null, restingKcal: null },
    ]);
    expect(picked?.source).toBe("manual");
  });

  it("does not treat active calories as total expenditure", () => {
    const picked = pickEnergy([
      { source: "garmin", totalBurnedKcal: null, activeKcal: 600, restingKcal: null },
    ]);
    expect(picked).toBeNull();
  });

  it("never adds workout or active calories on top of the total", () => {
    const picked = pickEnergy([
      { source: "garmin", totalBurnedKcal: 2400, activeKcal: 600, restingKcal: 1800 },
    ]);
    expect(calculateDailyBalance(2000, picked!.totalBurnedKcal, false).balanceKcal).toBe(-400);
  });
});

describe("dates", () => {
  it("derives the Malaysian local date across the UTC boundary", () => {
    // 16:30 UTC is 00:30 the next day in Kuala Lumpur (UTC+8)
    expect(localDate(new Date("2026-10-16T16:30:00Z"), "Asia/Kuala_Lumpur")).toBe(
      "2026-10-17",
    );
    expect(localDate(new Date("2026-10-16T15:59:00Z"), "Asia/Kuala_Lumpur")).toBe(
      "2026-10-16",
    );
  });

  it("validates and steps dates", () => {
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("2026-10-17")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(dateRange("2026-10-15", "2026-10-17")).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
  });
});
