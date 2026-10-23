"use client";

import { useSyncExternalStore } from "react";

// Everything typed into the app lives in this browser's localStorage. Each
// device keeps its own copy; Export / Import moves it between devices.

export type NutritionEntry = {
  carbsG: number;
  fatG: number;
  proteinG: number;
  fibreG: number;
  healthifymeKcal: number | null;
  notes: string | null;
  updatedAt: string;
};

export type ManualEnergyEntry = {
  totalBurnedKcal: number;
  activeKcal: number | null;
  updatedAt: string;
};

// One weigh-in per date; a second one on the same day replaces the first.
export type WeightEntry = {
  kg: number;
  time: string | null;
  notes: string | null;
  updatedAt: string;
};

export type Settings = {
  toleranceKcal: number;
  // Days before this date are left out of the dashboard, history and maths.
  // Empty means "from the first logged day" (see trackingStartOf).
  trackingStart: string;
  // Weekly weight change aimed for; negative means losing.
  goalKgPerWeek: number;
  heightCm: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  toleranceKcal: 150,
  trackingStart: "",
  goalKgPerWeek: -0.5,
  heightCm: null,
};

export type StoreData = {
  version: 1;
  nutrition: Record<string, NutritionEntry>;
  manualEnergy: Record<string, ManualEnergyEntry>;
  weights: Record<string, WeightEntry>;
  settings: Settings;
};

const KEY = "brv-health:v1";
const EMPTY: StoreData = {
  version: 1,
  nutrition: {},
  manualEnergy: {},
  weights: {},
  settings: DEFAULT_SETTINGS,
};

// Fills in what older saved data and backups don't have yet.
export function withDefaults(data: Partial<StoreData>): StoreData {
  return {
    version: 1,
    nutrition: data.nutrition ?? {},
    manualEnergy: data.manualEnergy ?? {},
    weights: data.weights ?? {},
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
}

// The tracking start date: the one set on the Backup page, else the first day
// with food or burn logged, else today. Weigh-ins don't count, so one taken
// before the first logged day can still be the baseline.
export function trackingStartOf(store: StoreData, todayDate: string): string {
  if (store.settings.trackingStart) return store.settings.trackingStart;
  const logged = [...Object.keys(store.nutrition), ...Object.keys(store.manualEnergy)].sort();
  return logged[0] && logged[0] < todayDate ? logged[0] : todayDate;
}

let cache: StoreData | null = null;
const listeners = new Set<() => void>();

function read(): StoreData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? withDefaults(JSON.parse(raw) as Partial<StoreData>) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: StoreData) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveNutrition(date: string, entry: Omit<NutritionEntry, "updatedAt">) {
  const s = read();
  write({ ...s, nutrition: { ...s.nutrition, [date]: { ...entry, updatedAt: new Date().toISOString() } } });
}

export function saveManualEnergy(date: string, entry: Omit<ManualEnergyEntry, "updatedAt"> | null) {
  const s = read();
  const manualEnergy = { ...s.manualEnergy };
  if (entry) manualEnergy[date] = { ...entry, updatedAt: new Date().toISOString() };
  else delete manualEnergy[date];
  write({ ...s, manualEnergy });
}

export function saveWeight(date: string, entry: Omit<WeightEntry, "updatedAt"> | null) {
  const s = read();
  const weights = { ...s.weights };
  if (entry) weights[date] = { ...entry, updatedAt: new Date().toISOString() };
  else delete weights[date];
  write({ ...s, weights });
}

export function saveSettings(settings: Settings) {
  write({ ...read(), settings });
}

export function exportJson(): string {
  return JSON.stringify(read(), null, 2);
}

// Import merges by date; for a date present in both, the newer entry wins.
export function importJson(text: string): { days: number; weights: number } {
  const incoming = JSON.parse(text) as Partial<StoreData>;
  if (incoming.version !== 1 || (typeof incoming.nutrition !== "object" && typeof incoming.weights !== "object")) {
    throw new Error("This isn't a BRV Health backup file");
  }
  const s = read();
  const newer = <T extends { updatedAt: string }>(a: Record<string, T>, b: Record<string, T> | undefined) => {
    const out = { ...a };
    for (const [d, v] of Object.entries(b ?? {})) if (!out[d] || out[d].updatedAt < v.updatedAt) out[d] = v;
    return out;
  };
  const next: StoreData = {
    ...s,
    nutrition: newer(s.nutrition, incoming.nutrition),
    manualEnergy: newer(s.manualEnergy, incoming.manualEnergy),
    weights: newer(s.weights, incoming.weights),
    // Height is the one setting a backup fills in, and only when it's unset here.
    settings: { ...s.settings, heightCm: s.settings.heightCm ?? incoming.settings?.heightCm ?? null },
  };
  write(next);
  return { days: Object.keys(incoming.nutrition ?? {}).length, weights: Object.keys(incoming.weights ?? {}).length };
}

const noopSubscribe = () => () => {};

// False during the static prerender and hydration, true once running in the
// browser, so forms are first rendered with the saved values.
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
