"use client";

import { useState } from "react";
import { AGE_DISPLAY } from "@/components/AgeNumberInput";
import {
  clampOlderOffset,
  clampYoungerOffset,
  matchRangeFromOffsets,
  maxOlderOffset,
  maxYoungerOffset,
} from "@/lib/age";

type End = "min" | "max";

type MatchOffsetControlProps = {
  age: number;
  younger: number;
  older: number;
  onChange: (next: { younger: number; older: number }) => void;
  className?: string;
};

export function MatchOffsetControl({
  age,
  younger,
  older,
  onChange,
  className = "",
}: MatchOffsetControlProps) {
  const [active, setActive] = useState<End>("min");
  const range = matchRangeFromOffsets(age, younger, older);
  const maxY = maxYoungerOffset(age);
  const maxO = maxOlderOffset(age);

  function nudge(delta: number) {
    if (active === "min") {
      onChange({
        younger: clampYoungerOffset(age, younger - delta),
        older,
      });
      return;
    }
    onChange({
      younger,
      older: clampOlderOffset(age, older + delta),
    });
  }

  const canMinus = active === "min" ? younger < maxY : older > 0;
  const canPlus = active === "min" ? younger > 0 : older < maxO;

  return (
    <div className={className}>
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        <EndValue
          caption="Youngest"
          value={range.min}
          selected={active === "min"}
          onSelect={() => setActive("min")}
        />
        <span
          className={`mb-1 select-none text-[var(--muted)] ${AGE_DISPLAY}`}
          aria-hidden="true"
        >
          –
        </span>
        <EndValue
          caption="Oldest"
          value={range.max}
          selected={active === "max"}
          onSelect={() => setActive("max")}
        />
      </div>

      <div className="mt-5 flex items-center justify-center gap-8">
        <button
          type="button"
          aria-label={
            active === "min" ? "Make youngest younger" : "Make oldest younger"
          }
          disabled={!canMinus}
          onClick={() => nudge(-1)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xl leading-none text-[var(--foreground)] transition enabled:hover:border-[var(--foreground)] enabled:active:scale-95 disabled:opacity-35"
        >
          <span className="chip-label">−</span>
        </button>
        <button
          type="button"
          aria-label={
            active === "min" ? "Make youngest older" : "Make oldest older"
          }
          disabled={!canPlus}
          onClick={() => nudge(1)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xl leading-none text-[var(--foreground)] transition enabled:hover:border-[var(--foreground)] enabled:active:scale-95 disabled:opacity-35"
        >
          <span className="chip-label">+</span>
        </button>
      </div>
    </div>
  );
}

function EndValue({
  caption,
  value,
  selected,
  onSelect,
}: {
  caption: string;
  value: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex min-w-[4.75rem] flex-col items-center">
      <p
        className={`text-[11px] font-normal uppercase tracking-[0.14em] ${
          selected ? "text-[var(--foreground)]" : "text-[var(--muted)]"
        }`}
      >
        {caption}
      </p>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${caption} ${value}${selected ? ", selected" : ". Tap to adjust."}`}
        onClick={onSelect}
        className={`mt-1 min-w-[4.75rem] border-b-2 pb-0.5 text-center transition ${AGE_DISPLAY} ${
          selected
            ? "border-[var(--foreground)] text-[var(--foreground)]"
            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        {value}
      </button>
    </div>
  );
}
