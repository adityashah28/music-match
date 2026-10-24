"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  { id: "phone", label: "Number" },
  { id: "verify", label: "Code" },
  { id: "about", label: "You" },
  { id: "age", label: "Age" },
  { id: "pick", label: "Artists" },
  { id: "socials", label: "Socials" },
] as const;

export type OnboardingStepId = (typeof STEPS)[number]["id"];

/** How long the finding screen holds before matches. Matches the bar animation. */
export const FINDING_MS = 1800;

export function OnboardingProgress({ step }: { step: OnboardingStepId }) {
  const index = STEPS.findIndex((item) => item.id === step);
  const position = index + 1;
  const next = STEPS[index + 1];

  return (
    <div className="mb-6">
      <p className="text-sm font-normal text-[var(--muted)]">
        Step {position} of {STEPS.length}
      </p>
      <div
        className="mt-2.5 flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={position}
        aria-valuetext={
          next
            ? `Step ${position} of ${STEPS.length}. Next, ${next.label}.`
            : `Step ${position} of ${STEPS.length}. Last step.`
        }
        aria-label="Account setup"
      >
        {STEPS.map((item, i) => {
          const filled = i <= index;
          const current = i === index;
          return (
            <span
              key={item.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]"
            >
              <span
                className={`block h-full rounded-full bg-[var(--foreground)] ${
                  filled ? "w-full" : "w-0"
                } ${current ? "onboarding-segment" : ""}`}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-sm font-normal text-[var(--muted)]">
        {next ? `Next · ${next.label}` : "Next · Matches"}
      </p>
    </div>
  );
}

export function FindingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      bar.setAttribute("aria-valuenow", "100");
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const value = Math.min(100, Math.round(((now - start) / FINDING_MS) * 100));
      bar.setAttribute("aria-valuenow", String(value));
      if (value < 100) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={barRef}
      className="mt-8 h-1 min-h-1 w-full max-w-xs shrink-0 overflow-hidden rounded-full bg-[var(--border)]"
      role="progressbar"
      aria-label="Finding matches"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-valuetext="Finding matches"
    >
      <div
        className="setup-fill h-1 min-h-1 w-full rounded-full bg-[var(--foreground)]"
        style={{ animationDuration: `${FINDING_MS}ms` }}
      />
    </div>
  );
}
