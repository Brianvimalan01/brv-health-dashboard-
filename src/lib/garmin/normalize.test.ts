import { describe, expect, it } from "vitest";
import { normalizeActivity, normalizeDailySummary } from "./normalize";

describe("normalizeDailySummary", () => {
  it("keeps Garmin's total as-is and records active and resting separately", () => {
    const e = normalizeDailySummary(
      {
        calendarDate: "2026-10-16",
        totalKilocalories: 2650,
        activeKilocalories: 820,
        bmrKilocalories: 1830,
        lastSyncTimestampGMT: "2026-10-16T14:05:00.0",
      },
      "2026-10-16",
    );
    expect(e).toMatchObject({ totalBurnedKcal: 2650, activeKcal: 820, restingKcal: 1830 });
    expect(e.sourceUpdatedAt?.toISOString()).toBe("2026-10-16T14:05:00.000Z");
  });

  it("leaves missing values null", () => {
    const e = normalizeDailySummary({ calendarDate: "2026-10-16" }, "2026-10-16");
    expect(e.totalBurnedKcal).toBeNull();
    expect(e.sourceUpdatedAt).toBeNull();
  });
});

describe("normalizeActivity", () => {
  it("maps the fields the dashboard shows", () => {
    const a = normalizeActivity({
      activityId: 123,
      activityName: "Morning Run",
      activityType: { typeKey: "running" },
      startTimeLocal: "2026-10-17 06:30:00",
      startTimeGMT: "2026-10-16 22:30:00",
      duration: 1800.5,
      distance: 5000,
      calories: 350,
    });
    expect(a).toMatchObject({
      sourceActivityId: "123",
      localDate: "2026-10-17",
      activityType: "running",
      activityKcal: 350,
    });
    expect(a?.startedAt.toISOString()).toBe("2026-10-16T22:30:00.000Z");
  });

  it("skips records it can't read", () => {
    expect(normalizeActivity({ activityId: 1 })).toBeNull();
  });
});
