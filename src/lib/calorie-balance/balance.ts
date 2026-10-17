export type BalanceStatus = "deficit" | "maintenance" | "surplus" | "incomplete";

export type EnergySource = "garmin" | "manual";

export type EnergyReading = {
  source: EnergySource;
  totalBurnedKcal: number | null;
  activeKcal: number | null;
  restingKcal: number | null;
};

export type DailyBalance = {
  intakeKcal: number | null;
  totalBurnedKcal: number | null;
  balanceKcal: number | null;
  status: BalanceStatus;
  isPartialDay: boolean;
  method: string;
};

export const DEFAULT_TOLERANCE_KCAL = 150;

// A manual entry is an explicit correction, so it wins over Garmin's value.
// Active or resting calories alone are never treated as total expenditure.
export function pickEnergy(readings: EnergyReading[]): EnergyReading | null {
  const usable = readings.filter((r) => r.totalBurnedKcal != null);
  return (
    usable.find((r) => r.source === "manual") ??
    usable.find((r) => r.source === "garmin") ??
    null
  );
}

export function calculateDailyBalance(
  intakeKcal: number | null,
  totalBurnedKcal: number | null,
  isPartialDay: boolean,
  toleranceKcal = DEFAULT_TOLERANCE_KCAL,
): DailyBalance {
  if (intakeKcal == null || totalBurnedKcal == null) {
    return {
      intakeKcal,
      totalBurnedKcal,
      balanceKcal: null,
      status: "incomplete",
      isPartialDay,
      method: "insufficient data",
    };
  }

  const balanceKcal = intakeKcal - totalBurnedKcal;
  let status: BalanceStatus;
  if (balanceKcal < -toleranceKcal) {
    status = "deficit";
  } else if (balanceKcal > toleranceKcal) {
    status = "surplus";
  } else {
    status = "maintenance";
  }

  return {
    intakeKcal,
    totalBurnedKcal,
    balanceKcal,
    status,
    isPartialDay,
    method: "intake minus total daily expenditure",
  };
}
