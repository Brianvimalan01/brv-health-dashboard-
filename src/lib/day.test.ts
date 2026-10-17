import { describe, expect, it } from "vitest";
import { summarizeDay } from "./day";
import type { GarminData } from "./garmin/data";
import type { StoreData } from "./store";

const store: StoreData = {
  version: 1,
  nutrition: {
    "2026-10-16": { carbsG: 250, fatG: 70, proteinG: 150, fibreG: 30, healthifymeKcal: null, notes: null, updatedAt: "" },
  },
  manualEnergy: {},
  settings: { toleranceKcal: 150 },
};

const garmin: GarminData = {
  version: 1,
  syncedAt: "2026-10-16T16:30:00Z",
  days: { "2026-10-16": { totalBurnedKcal: 2650, activeKcal: 800, restingKcal: 1850, sourceUpdatedAt: null } },
  activities: [],
};

describe("summarizeDay", () => {
  it("balances macros-derived intake against Garmin's total", () => {
    const d = summarizeDay("2026-10-16", store, garmin, "2026-10-17");
    expect(d.balance).toMatchObject({ intakeKcal: 2170, totalBurnedKcal: 2650, balanceKcal: -480, status: "deficit", isPartialDay: false });
    expect(d.energyUsed).toBe("garmin");
  });

  it("uses a manual total over Garmin", () => {
    const withManual = { ...store, manualEnergy: { "2026-10-16": { totalBurnedKcal: 2200, activeKcal: null, updatedAt: "" } } };
    const d = summarizeDay("2026-10-16", withManual, garmin, "2026-10-17");
    expect(d.energyUsed).toBe("manual");
    expect(d.balance.status).toBe("maintenance");
  });

  it("is incomplete and provisional for today with no Garmin data", () => {
    const d = summarizeDay("2026-10-17", store, null, "2026-10-17");
    expect(d.balance.status).toBe("incomplete");
    expect(d.isToday).toBe(true);
  });
});
