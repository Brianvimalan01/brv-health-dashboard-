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

export type Settings = {
  toleranceKcal: number;
};

export type StoreData = {
  version: 1;
  nutrition: Record<string, NutritionEntry>;
  manualEnergy: Record<string, ManualEnergyEntry>;
  settings: Settings;
};

const KEY = "brv-health:v1";
const EMPTY: StoreData = {
  version: 1,
  nutrition: {},
  manualEnergy: {},
  settings: { toleranceKcal: 150 },
};

let cache: StoreData | null = null;
const listeners = new Set<() => void>();

function read(): StoreData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as StoreData) } : EMPTY;
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

export function saveSettings(settings: Settings) {
  write({ ...read(), settings });
}

export function exportJson(): string {
  return JSON.stringify(read(), null, 2);
}

// Import merges by date; for a date present in both, the newer entry wins.
export function importJson(text: string): { days: number } {
  const incoming = JSON.parse(text) as Partial<StoreData>;
  if (incoming.version !== 1 || typeof incoming.nutrition !== "object") {
    throw new Error("This isn't a BRV Health backup file");
  }
  const s = read();
  const newer = <T extends { updatedAt: string }>(a: Record<string, T>, b: Record<string, T> = {}) => {
    const out = { ...a };
    for (const [d, v] of Object.entries(b)) if (!out[d] || out[d].updatedAt < v.updatedAt) out[d] = v;
    return out;
  };
  const next: StoreData = {
    ...s,
    nutrition: newer(s.nutrition, incoming.nutrition),
    manualEnergy: newer(s.manualEnergy, incoming.manualEnergy),
  };
  write(next);
  return { days: Object.keys(incoming.nutrition ?? {}).length };
}

const noopSubscribe = () => () => {};

// False during the static prerender and hydration, true once running in the
// browser, so forms are first rendered with the saved values.
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
