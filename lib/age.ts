export const AGE_MIN = 18;
export const AGE_MAX = 99;

export function clampAge(value: number): number {
  return Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(value)));
}

export function parseAge(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return clampAge(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return clampAge(n);
  }
  return null;
}

export function agesCompatible(
  selfAge: number | null,
  selfMin: number | null,
  selfMax: number | null,
  otherAge: number | null,
  otherMin: number | null,
  otherMax: number | null,
): boolean {
  // Incomplete profiles stay visible (demos / legacy rows).
  if (selfAge == null || otherAge == null) return true;
  const min = selfMin ?? AGE_MIN;
  const max = selfMax ?? AGE_MAX;
  const theirMin = otherMin ?? AGE_MIN;
  const theirMax = otherMax ?? AGE_MAX;
  return otherAge >= min && otherAge <= max && selfAge >= theirMin && selfAge <= theirMax;
}
