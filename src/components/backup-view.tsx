"use client";

import { useState } from "react";
import { toCsv } from "@/lib/csv";
import { exportJson, importJson, saveSettings, useHydrated, useStore } from "@/lib/store";
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

function SettingField(props: {
  label: string;
  value: number | null;
  step: number;
  min?: number;
  onSave: (v: number | null) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted">{props.label}</span>
      <input
        type="number"
        min={props.min ?? 0}
        step={props.step}
        defaultValue={props.value ?? ""}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          const v = raw === "" ? null : Number(raw);
          if (v == null || Number.isFinite(v)) props.onSave(v);
        }}
      />
    </label>
  );
}

export function BackupView() {
  const store = useStore();
  const hydrated = useHydrated();
  const { state, lock } = useGarminContext();
  const [message, setMessage] = useState<string | null>(null);
  const stamp = new Date().toISOString().slice(0, 10);
  const loggedDays = Object.keys(store.nutrition).length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Backup &amp; settings</h1>

      <Section title="Backup">
        <p className="text-sm text-muted">
          Your food entries and weigh-ins are saved only in this browser ({loggedDays} days logged,{" "}
          {Object.keys(store.weights).length} weigh-ins). Download a backup regularly, and
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
                  const { days, weights } = importJson(await file.text());
                  setMessage(`Imported ${days} food days and ${weights} weigh-ins. Where both had the same day, the newer entry was kept.`);
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
        {hydrated && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingField
            label="Counts as maintenance within ± (kcal)"
            value={store.settings.toleranceKcal}
            step={10}
            onSave={(v) => v != null && v >= 0 && saveSettings({ ...store.settings, toleranceKcal: v })}
          />
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Track from (earlier days are left out; blank = your first logged day)</span>
            <input
              type="date"
              defaultValue={store.settings.trackingStart}
              onBlur={(e) => e.target.value !== store.settings.trackingStart && saveSettings({ ...store.settings, trackingStart: e.target.value })}
            />
          </label>
          <SettingField
            label="Goal, kg per week (−0.5 = lose half a kilo)"
            value={store.settings.goalKgPerWeek}
            step={0.1}
            min={-1.5}
            onSave={(v) => v != null && v >= -1.5 && v <= 1 && saveSettings({ ...store.settings, goalKgPerWeek: v })}
          />
          <SettingField
            label="Height (cm), for BMI"
            value={store.settings.heightCm}
            step={1}
            onSave={(v) => (v == null || (v > 100 && v < 250)) && saveSettings({ ...store.settings, heightCm: v })}
          />
        </div>
        )}
        {state.status === "unlocked" && (
          <button className="rounded-lg border border-border px-4 py-2 text-sm" onClick={lock}>
            Lock Garmin data and forget the passphrase on this device
          </button>
        )}
      </Section>
    </div>
  );
}
