export type Macros = {
  carbsG: number;
  fatG: number;
  proteinG: number;
  fibreG: number;
};

// Atwater factors. Carbs are assumed to include fibre (as HealthifyMe reports
// them), so fibre is taken out of carbs and counted at 2 kcal/g instead of 4.
export const KCAL_PER_G = { protein: 4, netCarbs: 4, fibre: 2, fat: 9 } as const;

export const MACRO_METHOD =
  "4 × protein + 4 × (carbs − fibre) + 2 × fibre + 9 × fat";

const MACRO_KEYS = ["carbsG", "fatG", "proteinG", "fibreG"] as const;

export function validateMacros(m: Macros): string[] {
  const errors: string[] = [];
  for (const key of MACRO_KEYS) {
    const value = m[key];
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`${key} must be zero or more`);
    }
  }
  if (m.fibreG > m.carbsG) {
    errors.push("fibre cannot be more than total carbs");
  }
  return errors;
}

export function kcalFromMacros(m: Macros): number {
  const errors = validateMacros(m);
  if (errors.length > 0) {
    throw new Error(`Invalid macros: ${errors.join(", ")}`);
  }
  const netCarbs = m.carbsG - m.fibreG;
  return (
    KCAL_PER_G.protein * m.proteinG +
    KCAL_PER_G.netCarbs * netCarbs +
    KCAL_PER_G.fibre * m.fibreG +
    KCAL_PER_G.fat * m.fatG
  );
}

export type IntakeSource = "healthifyme_total" | "derived_from_macros";

export type Intake = {
  kcal: number;
  source: IntakeSource;
  derivedKcal: number;
};

// The HealthifyMe total, when entered, overrides the derived value so the
// dashboard matches what the user sees in HealthifyMe.
export function resolveIntake(
  macros: Macros,
  healthifymeKcal: number | null,
): Intake {
  const derivedKcal = kcalFromMacros(macros);
  if (healthifymeKcal != null) {
    return { kcal: healthifymeKcal, source: "healthifyme_total", derivedKcal };
  }
  return { kcal: derivedKcal, source: "derived_from_macros", derivedKcal };
}
