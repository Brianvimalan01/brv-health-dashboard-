"use client";

import { useCallback, useEffect, useState } from "react";
import { decryptJson, WrongPassphraseError, type Envelope } from "@/lib/crypto";
import { GARMIN_DATA_PATH, type GarminData } from "./data";

const PASSPHRASE_KEY = "brv-health:garmin-passphrase";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type GarminState =
  | { status: "loading" }
  | { status: "no_data" }
  | { status: "locked"; error?: string }
  | { status: "unlocked"; data: GarminData };

function storedPassphrase(): string | null {
  try {
    return localStorage.getItem(PASSPHRASE_KEY);
  } catch {
    return null;
  }
}

// Loads the encrypted Garmin file published with the site and decrypts it
// in the browser. The passphrase never leaves this device.
export function useGarmin() {
  const [envelope, setEnvelope] = useState<Envelope | null | undefined>(undefined);
  const [state, setState] = useState<GarminState>({ status: "loading" });

  useEffect(() => {
    fetch(`${BASE_PATH}/${GARMIN_DATA_PATH}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Envelope>) : null))
      .catch(() => null)
      .then(setEnvelope);
  }, []);

  const unlock = useCallback(
    async (passphrase: string, remember: boolean) => {
      if (!envelope) return;
      try {
        const data = await decryptJson<GarminData>(envelope, passphrase);
        if (remember) localStorage.setItem(PASSPHRASE_KEY, passphrase);
        setState({ status: "unlocked", data });
      } catch (err) {
        if (err instanceof WrongPassphraseError) {
          localStorage.removeItem(PASSPHRASE_KEY);
          setState({ status: "locked", error: "That passphrase didn't work." });
        } else {
          setState({ status: "locked", error: "Couldn't read the Garmin data file." });
        }
      }
    },
    [envelope],
  );

  useEffect(() => {
    if (envelope === undefined) return;
    if (envelope === null) {
      setState({ status: "no_data" });
      return;
    }
    const saved = storedPassphrase();
    if (saved) void unlock(saved, true);
    else setState({ status: "locked" });
  }, [envelope, unlock]);

  const lock = useCallback(() => {
    localStorage.removeItem(PASSPHRASE_KEY);
    setState({ status: "locked" });
  }, []);

  return { state, unlock, lock };
}
