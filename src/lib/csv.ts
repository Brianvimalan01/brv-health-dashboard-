import { resolveIntake } from "@/lib/calorie-balance";
import type { GarminData } from "@/lib/garmin/data";
import type { StoreData } from "@/lib/store";

function cell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(store: StoreData, garmin: GarminData | null): string {
  const dates = [
    ...new Set([
      ...Object.keys(store.nutrition),
      ...Object.keys(store.manualEnergy),
      ...Object.keys(garmin?.days ?? {}),
      ...Object.keys(store.weights),
    ]),
  ].sort();
  const header = [
    "date", "carbs_g", "fat_g", "protein_g", "fibre_g", "healthifyme_kcal", "derived_kcal",
    "garmin_total_kcal", "garmin_active_kcal", "garmin_resting_kcal", "manual_total_kcal", "weight_kg", "weight_notes", "notes",
  ];
  const rows = dates.map((d) => {
    const n = store.nutrition[d];
    const g = garmin?.days[d];
    const m = store.manualEnergy[d];
    const w = store.weights[d];
    return [
      d, n?.carbsG, n?.fatG, n?.proteinG, n?.fibreG, n?.healthifymeKcal,
      n ? Math.round(resolveIntake(n, null).derivedKcal) : null,
      g?.totalBurnedKcal, g?.activeKcal, g?.restingKcal, m?.totalBurnedKcal, w?.kg, w?.notes, n?.notes,
    ];
  });
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
