import { z } from "zod";

const kcal = z.number().nonnegative().nullable().optional().transform((v) => v ?? null);

// Subset of Garmin's daily user summary. Fields missing from a response stay
// null rather than being guessed.
export const garminDailySummary = z.object({
  calendarDate: z.string(),
  totalKilocalories: kcal,
  activeKilocalories: kcal,
  bmrKilocalories: kcal,
  lastSyncTimestampGMT: z.string().nullable().optional(),
});

export type GarminDailySummary = z.infer<typeof garminDailySummary>;

export const garminActivity = z.object({
  activityId: z.union([z.number(), z.string()]).transform(String),
  activityName: z.string().nullable().optional(),
  activityType: z.object({ typeKey: z.string() }).optional(),
  startTimeLocal: z.string(),
  startTimeGMT: z.string(),
  duration: z.number().nullable().optional(),
  distance: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
});

export type GarminActivity = z.infer<typeof garminActivity>;

export type NormalizedEnergy = {
  localDate: string;
  totalBurnedKcal: number | null;
  activeKcal: number | null;
  restingKcal: number | null;
  calculationMethod: string;
  sourceUpdatedAt: Date | null;
};

// Garmin timestamps without a zone are UTC ("2026-10-16 23:00:00" / ISO).
function parseGmt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeDailySummary(raw: unknown, localDate: string): NormalizedEnergy {
  const s = garminDailySummary.parse(raw);
  return {
    localDate,
    // Garmin's total already includes active and resting (BMR) calories, so
    // it is used as-is and never summed with them.
    totalBurnedKcal: s.totalKilocalories,
    activeKcal: s.activeKilocalories,
    restingKcal: s.bmrKilocalories,
    calculationMethod: "Garmin totalKilocalories (provider-supplied total)",
    sourceUpdatedAt: parseGmt(s.lastSyncTimestampGMT),
  };
}

export type NormalizedActivity = {
  sourceActivityId: string;
  localDate: string;
  name: string | null;
  activityType: string;
  startedAt: Date;
  durationSeconds: number | null;
  distanceMeters: number | null;
  activityKcal: number | null;
};

export function normalizeActivity(raw: unknown): NormalizedActivity | null {
  const parsed = garminActivity.safeParse(raw);
  if (!parsed.success) return null;
  const a = parsed.data;
  const startedAt = parseGmt(a.startTimeGMT);
  if (!startedAt) return null;
  return {
    sourceActivityId: a.activityId,
    // Garmin's local start time is in the watch's timezone at the time.
    localDate: a.startTimeLocal.slice(0, 10),
    name: a.activityName ?? null,
    activityType: a.activityType?.typeKey ?? "unknown",
    startedAt,
    durationSeconds: a.duration ?? null,
    distanceMeters: a.distance || null,
    activityKcal: a.calories ?? null,
  };
}
