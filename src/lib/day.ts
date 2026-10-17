import {
  calculateDailyBalance,
  DEFAULT_TIMEZONE,
  localDate,
  pickEnergy,
  resolveIntake,
  type DailyBalance,
  type EnergyReading,
  type Intake,
} from "@/lib/calorie-balance";
import type { GarminActivityRecord, GarminData, GarminDay } from "@/lib/garmin/data";
import type { ManualEnergyEntry, NutritionEntry, StoreData } from "@/lib/store";

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || DEFAULT_TIMEZONE;

export function today(): string {
  return localDate(new Date(), APP_TIMEZONE);
}

export type DaySummary = {
  date: string;
  isToday: boolean;
  nutrition: NutritionEntry | null;
  intake: Intake | null;
  garmin: GarminDay | null;
  manual: ManualEnergyEntry | null;
  energyUsed: "garmin" | "manual" | null;
  activities: GarminActivityRecord[];
  balance: DailyBalance;
};

export function summarizeDay(
  date: string,
  store: StoreData,
  garminData: GarminData | null,
  todayDate = today(),
): DaySummary {
  const nutrition = store.nutrition[date] ?? null;
  const intake = nutrition ? resolveIntake(nutrition, nutrition.healthifymeKcal) : null;
  const garmin = garminData?.days[date] ?? null;
  const manual = store.manualEnergy[date] ?? null;

  const readings: EnergyReading[] = [];
  if (garmin) readings.push({ source: "garmin", ...garmin });
  if (manual) readings.push({ source: "manual", restingKcal: null, ...manual });
  const picked = pickEnergy(readings);
  const isToday = date === todayDate;

  return {
    date,
    isToday,
    nutrition,
    intake,
    garmin,
    manual,
    energyUsed: picked?.source ?? null,
    activities: (garminData?.activities ?? []).filter((a) => a.localDate === date),
    balance: calculateDailyBalance(
      intake?.kcal ?? null,
      picked?.totalBurnedKcal ?? null,
      isToday,
      store.settings.toleranceKcal,
    ),
  };
}
