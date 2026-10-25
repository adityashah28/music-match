/** Common dial codes for the phone entry select. Default is US +1. */
export const DIAL_CODES = [
  { code: "+1", label: "+1" },
  { code: "+44", label: "+44" },
  { code: "+91", label: "+91" },
  { code: "+61", label: "+61" },
  { code: "+52", label: "+52" },
  { code: "+33", label: "+33" },
  { code: "+49", label: "+49" },
  { code: "+81", label: "+81" },
  { code: "+55", label: "+55" },
  { code: "+34", label: "+34" },
  { code: "+39", label: "+39" },
  { code: "+86", label: "+86" },
  { code: "+82", label: "+82" },
  { code: "+31", label: "+31" },
  { code: "+353", label: "+353" },
  { code: "+64", label: "+64" },
  { code: "+65", label: "+65" },
] as const;

export type DialCode = (typeof DIAL_CODES)[number]["code"];

export const DEFAULT_DIAL_CODE: DialCode = "+1";

/** Normalize US-friendly input into E.164. Defaults to +1 when 10 digits. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * Build E.164 from a dial code select + national number.
 * Strips a leading trunk 0 (e.g. UK 07… → +447…).
 */
export function composeE164(dialCode: string, national: string): string | null {
  let digits = national.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits) return null;
  const code = dialCode.startsWith("+") ? dialCode : `+${dialCode.replace(/\D/g, "")}`;
  return normalizePhone(`${code}${digits}`);
}

/** Split a stored E.164 into dial code + national digits for the phone form. */
export function splitE164(e164: string): { dialCode: DialCode; national: string } {
  const digits = e164.replace(/\D/g, "");
  const sorted = [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    const codeDigits = code.slice(1);
    if (digits.startsWith(codeDigits) && digits.length > codeDigits.length) {
      return { dialCode: code, national: digits.slice(codeDigits.length) };
    }
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return { dialCode: "+1", national: digits.slice(1) };
  }
  if (digits.length === 10) {
    return { dialCode: "+1", national: digits };
  }
  return { dialCode: DEFAULT_DIAL_CODE, national: digits };
}

export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7);
    return `+1 (${area}) ${mid}-${last}`;
  }
  return e164.startsWith("+") ? e164 : `+${digits}`;
}
