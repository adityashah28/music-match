"use client";

import { useEffect, useState } from "react";
import { AGE_MAX, AGE_MIN, clampAge } from "@/lib/age";

/** Shared display size for Your age + Match me with numbers. */
export const AGE_DISPLAY =
  "font-display text-[2.75rem] font-normal leading-none tabular-nums tracking-tight sm:text-[3rem]";

type AgeNumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  "aria-label"?: string;
};

export function AgeNumberInput({
  value,
  onChange,
  id,
  "aria-label": ariaLabel = "Your age",
}: AgeNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setDraft(String(value));
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const next = clampAge(n);
    onChange(next);
    setDraft(String(next));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        setDraft(String(value));
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/\D/g, "").slice(0, 2);
        setDraft(next);
        if (next === "") return;
        const n = Number(next);
        if (n >= AGE_MIN && n <= AGE_MAX) onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        commit(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className={`w-[4.75rem] border-0 border-b-2 bg-transparent pb-0.5 text-center text-[var(--foreground)] outline-none transition-[border-color] ${AGE_DISPLAY} ${
        focused ? "border-[var(--foreground)]" : "border-[var(--border)]"
      }`}
    />
  );
}
