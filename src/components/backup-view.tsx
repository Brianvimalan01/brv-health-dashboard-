"use client";

import { useState } from "react";
import { toCsv } from "@/lib/csv";
import { exportJson, importJson, saveSettings, useStore } from "@/lib/store";
import { useGarminContext } from "./garmin-provider";
import { Section } from "./ui";

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupView() {
  const store = useStore();
  const { state, lock } = useGarminContext();
  const [message, setMessage] = useState<string | null>(null);
  const stamp = new Date().toISOString().slice(0, 10);
  const loggedDays = Object.keys(store.nutrition).length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Backup &amp; settings</h1>

      <Section title="Backup">
        <p className="text-sm text-muted">
          Your food entries are saved only in this browser ({loggedDays} days logged). Download a backup regularly, and
          use it to copy your entries to another device.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950"
            onClick={() => download(`brv-health-backup-${stamp}.json`, exportJson(), "application/json")}
          >
            Download backup
          </button>
          <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const { days } = importJson(await file.text());
                  setMessage(`Imported ${days} days. Where both had the same day, the newer entry was kept.`);
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Import failed");
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="rounded-lg border border-border px-4 py-2 text-sm"
            onClick={() =>
              download(`brv-health-${stamp}.csv`, toCsv(store, state.status === "unlocked" ? state.data : null), "text/csv")
            }
          >
            Export CSV
          </button>
        </div>
        {message && <p role="status" className="text-sm">{message}</p>}
      </Section>

      <Section title="Settings">
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="text-muted">Counts as maintenance within ± (kcal)</span>
          <input
            type="number"
            min={0}
            step={10}
            defaultValue={store.settings.toleranceKcal}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 0) saveSettings({ ...store.settings, toleranceKcal: v });
            }}
          />
        </label>
        {state.status === "unlocked" && (
          <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={lock}>
            Lock Garmin data and forget the passphrase on this device
          </button>
        )}
      </Section>
    </div>
  );
}
