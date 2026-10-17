import type { Envelope } from "@/lib/crypto";

// The decrypted contents of public/data/garmin.enc.json, written by
// scripts/garmin-sync.ts. Dates are ISO strings so it survives JSON.
export type GarminDay = {
  totalBurnedKcal: number | null;
  activeKcal: number | null;
  restingKcal: number | null;
  sourceUpdatedAt: string | null;
};

export type GarminActivityRecord = {
  sourceActivityId: string;
  localDate: string;
  name: string | null;
  activityType: string;
  startedAt: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  activityKcal: number | null;
};

export type GarminData = {
  version: 1;
  syncedAt: string;
  days: Record<string, GarminDay>;
  activities: GarminActivityRecord[];
};

export const GARMIN_DATA_PATH = "data/garmin.enc.json";

export type { Envelope };
