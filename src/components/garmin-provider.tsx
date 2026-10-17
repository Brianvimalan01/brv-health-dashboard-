"use client";

import { createContext, useContext } from "react";
import { useGarmin } from "@/lib/garmin/use-garmin";

type GarminContext = ReturnType<typeof useGarmin>;

const Ctx = createContext<GarminContext | null>(null);

export function GarminProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={useGarmin()}>{children}</Ctx.Provider>;
}

export function useGarminContext(): GarminContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGarminContext must be used inside GarminProvider");
  return ctx;
}
