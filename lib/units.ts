export type UnitSystem = "imperial" | "metric";

export const kgToLbs = (kg: number): number =>
  Math.round(kg * 2.20462 * 10) / 10;

export const lbsToKg = (lbs: number): number =>
  Math.round((lbs / 2.20462) * 10) / 10;

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10;
}

export function formatHeight(cm: number, system: UnitSystem): string {
  if (system === "imperial") {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}'${inches}"`;
  }
  return `${cm} cm`;
}

export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === "imperial") return `${kgToLbs(kg)} lbs`;
  return `${kg} kg`;
}
