"use client";

import { useState } from "react";
import { kcalFromMacros, validateMacros } from "@/lib/calorie-balance/macros";
import {
  saveManualEnergy,
  saveNutrition,
  type ManualEnergyEntry,
  type NutritionEntry,
} from "@/lib/store";

type Feedback = { ok: boolean; message: string } | null;

function FeedbackText({ state }: { state: Feedback }) {
  if (!state) return null;
  return (
    <span role="status" className={`text-sm ${state.ok ? "text-deficit" : "text-surplus"}`}>
      {state.message}
    </span>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">{children}</button>;
}

function NumberField(props: {
  name: string;
  label: string;
  unit: string;
  defaultValue?: number | null;
  required?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted">
        {props.label} <span className="text-xs">({props.unit})</span>
      </span>
      <input
        type="number"
        name={props.name}
        min={0}
        step="any"
        inputMode="decimal"
        required={props.required}
        defaultValue={props.defaultValue ?? ""}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    </label>
  );
}

function num(form: FormData, key: string): number | null {
  const raw = String(form.get(key) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

export function NutritionForm({ date, defaults }: { date: string; defaults: NutritionEntry | null }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [m, setM] = useState({
    carbsG: String(defaults?.carbsG ?? ""),
    fatG: String(defaults?.fatG ?? ""),
    proteinG: String(defaults?.proteinG ?? ""),
    fibreG: String(defaults?.fibreG ?? ""),
  });
  const preview = {
    carbsG: Number(m.carbsG || 0),
    fatG: Number(m.fatG || 0),
    proteinG: Number(m.proteinG || 0),
    fibreG: Number(m.fibreG || 0),
  };
  const previewKcal = validateMacros(preview).length === 0 ? Math.round(kcalFromMacros(preview)) : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const macros = {
      carbsG: num(form, "carbsG") ?? NaN,
      fatG: num(form, "fatG") ?? NaN,
      proteinG: num(form, "proteinG") ?? NaN,
      fibreG: num(form, "fibreG") ?? 0,
    };
    const errors = validateMacros(macros);
    const healthifymeKcal = num(form, "healthifymeKcal");
    if (healthifymeKcal != null && !(healthifymeKcal >= 0)) errors.push("HealthifyMe calories must be zero or more");
    if (errors.length > 0) {
      setFeedback({ ok: false, message: errors.join("; ") });
      return;
    }
    const notes = String(form.get("notes") ?? "").trim() || null;
    saveNutrition(date, { ...macros, healthifymeKcal, notes });
    setFeedback({ ok: true, message: "Saved" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField name="carbsG" label="Carbs" unit="g" required defaultValue={defaults?.carbsG} onChange={(v) => setM({ ...m, carbsG: v })} />
        <NumberField name="fatG" label="Fat" unit="g" required defaultValue={defaults?.fatG} onChange={(v) => setM({ ...m, fatG: v })} />
        <NumberField name="proteinG" label="Protein" unit="g" required defaultValue={defaults?.proteinG} onChange={(v) => setM({ ...m, proteinG: v })} />
        <NumberField name="fibreG" label="Fibre" unit="g" defaultValue={defaults?.fibreG} onChange={(v) => setM({ ...m, fibreG: v })} />
      </div>
      <p className="text-sm text-muted">
        Calculated from macros: <strong className="text-foreground">{previewKcal ?? "—"} kcal</strong>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          name="healthifymeKcal"
          label="HealthifyMe calorie total, optional (replaces the calculated number)"
          unit="kcal"
          defaultValue={defaults?.healthifymeKcal}
        />
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Notes</span>
          <textarea name="notes" rows={1} defaultValue={defaults?.notes ?? ""} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>Save day</SubmitButton>
        <FeedbackText state={feedback} />
      </div>
    </form>
  );
}

export function ManualEnergyForm({ date, defaults }: { date: string; defaults: ManualEnergyEntry | null }) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const total = num(form, "totalBurnedKcal");
    const active = num(form, "activeKcal");
    if (total == null) {
      saveManualEnergy(date, null);
      setFeedback({ ok: true, message: "Manual value removed" });
      return;
    }
    if (!(total >= 0) || (active != null && !(active >= 0))) {
      setFeedback({ ok: false, message: "Calories must be zero or more" });
      return;
    }
    saveManualEnergy(date, { totalBurnedKcal: total, activeKcal: active });
    setFeedback({ ok: true, message: "Saved" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField name="totalBurnedKcal" label="Total burned" unit="kcal" defaultValue={defaults?.totalBurnedKcal} />
        <NumberField name="activeKcal" label="Active" unit="kcal" defaultValue={defaults?.activeKcal} />
      </div>
      <p className="text-xs text-muted">
        A value here replaces Garmin&apos;s total for this day. Clear it and save to go back to Garmin.
      </p>
      <div className="flex items-center gap-3">
        <SubmitButton>Save</SubmitButton>
        <FeedbackText state={feedback} />
      </div>
    </form>
  );
}

export function UnlockForm({
  onUnlock,
  error,
}: {
  onUnlock: (passphrase: string, remember: boolean) => void;
  error?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onUnlock(String(form.get("passphrase") ?? ""), form.get("remember") === "on");
      }}
      className="space-y-2"
    >
      <p className="text-sm text-muted">Your Garmin data is encrypted. Enter your passphrase to see it.</p>
      <div className="flex gap-2">
        <input type="password" name="passphrase" autoComplete="current-password" required placeholder="Passphrase" />
        <SubmitButton>Unlock</SubmitButton>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="remember" defaultChecked /> Remember on this device
      </label>
      {error && <p className="text-sm text-surplus">{error}</p>}
    </form>
  );
}
