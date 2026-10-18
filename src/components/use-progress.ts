"use client";

import { today } from "@/lib/day";
import { buildProgress } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { useGarminContext } from "./garmin-provider";

export function useProgress() {
  const store = useStore();
  const { state } = useGarminContext();
  const garmin = state.status === "unlocked" ? state.data : null;
  return { store, garminState: state, progress: buildProgress(store, garmin, today()) };
}
