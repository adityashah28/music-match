export const AGE_MIN = 18;
export const AGE_MAX = 99;

/** Default “years younger / older” openness. */
export const MATCH_OFFSET_DEFAULT = 5;

export function clampAge(value: number): number {
  return Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(value)));
}

export function maxYoungerOffset(age: number): number {
  return Math.max(0, clampAge(age) - AGE_MIN);
}

export function maxOlderOffset(age: number): number {
  return Math.max(0, AGE_MAX - clampAge(age));
}

export function clampYoungerOffset(age: number, offset: number): number {
  const n = Number.isFinite(offset) ? Math.round(offset) : 0;
  return Math.min(maxYoungerOffset(age), Math.max(0, n));
}

export function clampOlderOffset(age: number, offset: number): number {
  const n = Number.isFinite(offset) ? Math.round(offset) : 0;
  return Math.min(maxOlderOffset(age), Math.max(0, n));
}

export function defaultMatchOffsets(age: number): { younger: number; older: number } {
  return {
    younger: clampYoungerOffset(age, MATCH_OFFSET_DEFAULT),
    older: clampOlderOffset(age, MATCH_OFFSET_DEFAULT),
  };
}

/** Absolute match window from personal age + relative offsets. */
export function matchRangeFromOffsets(
  age: number,
  younger: number,
  older: number,
): { min: number; max: number } {
  const center = clampAge(age);
  const y = clampYoungerOffset(center, younger);
  const o = clampOlderOffset(center, older);
  return { min: center - y, max: center + o };
}

/** Recover offsets from stored ageMin/ageMax relative to age. */
export function offsetsFromMatchRange(
  age: number,
  min: number | null | undefined,
  max: number | null | undefined,
): { younger: number; older: number } {
  const center = clampAge(age);
  if (min == null && max == null) return defaultMatchOffsets(center);
  const nextMin = min != null ? clampAge(min) : AGE_MIN;
  const nextMax = max != null ? clampAge(max) : AGE_MAX;
  // Full-spectrum draft default → treat as unset and use ±5.
  if (nextMin === AGE_MIN && nextMax === AGE_MAX) return defaultMatchOffsets(center);
  return {
    younger: clampYoungerOffset(center, center - nextMin),
    older: clampOlderOffset(center, nextMax - center),
  };
}

/** @deprecated Prefer matchRangeFromOffsets — kept for any legacy callers. */
export function defaultMatchAgeRange(age: number): { min: number; max: number } {
  const { younger, older } = defaultMatchOffsets(age);
  return matchRangeFromOffsets(age, younger, older);
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
