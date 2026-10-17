// Nightly Garmin sync, run by .github/workflows/deploy.yml (or by hand with
// `npm run garmin-sync`). Signs in to Garmin Connect with the owner's account
// (unofficial access, see docs/garmin.md), merges the last few days into the
// existing data file and writes it back encrypted with GARMIN_DATA_PASSPHRASE.
//
// It prints counts only, never the data itself: GitHub Actions logs of a
// public repository are public.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GarminConnect } from "garmin-connect";
import { addDays, dateRange, DEFAULT_TIMEZONE, localDate } from "@/lib/calorie-balance";
import { decryptJson, encryptJson, type Envelope } from "@/lib/crypto";
import type { GarminData } from "@/lib/garmin/data";
import { normalizeActivity, normalizeDailySummary } from "@/lib/garmin/normalize";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main() {
  const username = requireEnv("GARMIN_EMAIL");
  const password = requireEnv("GARMIN_PASSWORD");
  const passphrase = requireEnv("GARMIN_DATA_PASSPHRASE");
  const file = process.env.DATA_FILE ?? "public/data/garmin.enc.json";
  const timeZone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;

  let data: GarminData = { version: 1, syncedAt: "", days: {}, activities: [] };
  if (existsSync(file)) {
    const envelope = JSON.parse(readFileSync(file, "utf8")) as Envelope;
    // Throws on a wrong passphrase, so existing history is never overwritten.
    data = await decryptJson<GarminData>(envelope, passphrase);
  }

  // First run backfills a month; later runs refresh the last few days so late
  // watch syncs finalize them.
  const days = Number(process.env.SYNC_DAYS) || (Object.keys(data.days).length ? 3 : 30);
  const today = localDate(new Date(), timeZone);
  const dates = dateRange(addDays(today, -(days - 1)), today);

  const client = new GarminConnect({ username, password });
  await client.login();
  const { displayName } = await client.getUserProfile();

  for (const date of dates) {
    const url =
      `https://connectapi.garmin.com/usersummary-service/usersummary/daily/` +
      `${encodeURIComponent(displayName)}?calendarDate=${date}`;
    const e = normalizeDailySummary(await client.get<unknown>(url), date);
    data.days[date] = {
      totalBurnedKcal: e.totalBurnedKcal,
      activeKcal: e.activeKcal,
      restingKcal: e.restingKcal,
      sourceUpdatedAt: e.sourceUpdatedAt?.toISOString() ?? null,
    };
  }

  const byId = new Map(data.activities.map((a) => [a.sourceActivityId, a]));
  let activityCount = 0;
  for (const raw of (await client.getActivities(0, days > 3 ? 100 : 30)) as unknown[]) {
    const a = normalizeActivity(raw);
    if (!a || a.localDate < dates[0]) continue;
    byId.set(a.sourceActivityId, { ...a, startedAt: a.startedAt.toISOString() });
    activityCount++;
  }
  data.activities = [...byId.values()].sort((x, y) => x.startedAt.localeCompare(y.startedAt));
  data.syncedAt = new Date().toISOString();

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(await encryptJson(data, passphrase)) + "\n");
  console.log(`Garmin sync done: ${dates.length} days, ${activityCount} recent activities.`);
}

main().catch((err) => {
  // Message only: an error object from the HTTP client can include request details.
  console.error(`Garmin sync failed: ${err instanceof Error ? err.message : "unknown error"}`);
  process.exit(1);
});
