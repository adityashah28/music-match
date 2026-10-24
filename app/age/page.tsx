"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AGE_MAX, AGE_MIN, clampAge } from "@/lib/age";
import { getDraft, getUserId, setDraft } from "@/lib/client";

export default function AgePage() {
  const router = useRouter();
  const [age, setAge] = useState(24);
  const [ageMin, setAgeMin] = useState(AGE_MIN);
  const [ageMax, setAgeMax] = useState(AGE_MAX);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getUserId()) {
      router.replace("/matches");
      return;
    }
    const draft = getDraft();
    if (!draft.phoneVerified) {
      router.replace("/phone");
      return;
    }
    if (!draft.name.trim() || !draft.handle.trim() || !draft.city.trim()) {
      router.replace("/about");
      return;
    }
    if (draft.age != null) setAge(draft.age);
    setAgeMin(draft.ageMin);
    setAgeMax(draft.ageMax);
  }, [router]);

  function onAgeChange(value: number) {
    const next = clampAge(value);
    setAge(next);
  }

  function onMinChange(value: number) {
    const next = clampAge(value);
    setAgeMin(next);
    if (next > ageMax) setAgeMax(next);
  }

  function onMaxChange(value: number) {
    const next = clampAge(value);
    setAgeMax(next);
    if (next < ageMin) setAgeMin(next);
  }

  function continueNext() {
    if (age < AGE_MIN || age > AGE_MAX) {
      setError("Age must be between 18 and 99.");
      return;
    }
    if (ageMin > ageMax) {
      setError("Age range is backwards.");
      return;
    }
    const draft = getDraft();
    setDraft({ ...draft, age, ageMin, ageMax });
    router.push("/pick");
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/about" />
        <OnboardingProgress step="age" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Age
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Your age, then who you want to meet.
        </p>

        <label className="mt-8 block text-sm font-normal text-[var(--muted)]" htmlFor="age">
          Your age
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="age"
            type="range"
            min={AGE_MIN}
            max={AGE_MAX}
            value={age}
            onChange={(event) => onAgeChange(Number(event.target.value))}
            className="w-full accent-[var(--foreground)]"
          />
          <span className="w-10 shrink-0 text-right text-base font-normal tabular-nums text-[var(--foreground)]">
            {age}
          </span>
        </div>
        <div className="field mt-3 flex min-h-12 w-full items-center px-4">
          <input
            type="number"
            min={AGE_MIN}
            max={AGE_MAX}
            value={age}
            onChange={(event) => onAgeChange(Number(event.target.value) || AGE_MIN)}
            className="text-base font-normal"
            aria-label="Exact age"
          />
        </div>

        <p className="mt-8 text-sm font-normal text-[var(--muted)]">Show me people ages</p>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="font-display text-3xl font-normal tabular-nums text-[var(--foreground)]">
            {ageMin}
            <span className="mx-2 text-[var(--muted)]">–</span>
            {ageMax}
          </p>
        </div>

        <label className="mt-6 block text-sm font-normal text-[var(--muted)]" htmlFor="age-min">
          Youngest
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="age-min"
            type="range"
            min={AGE_MIN}
            max={AGE_MAX}
            value={ageMin}
            onChange={(event) => onMinChange(Number(event.target.value))}
            className="w-full accent-[var(--foreground)]"
          />
          <span className="w-10 shrink-0 text-right text-base font-normal tabular-nums">{ageMin}</span>
        </div>

        <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor="age-max">
          Oldest
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="age-max"
            type="range"
            min={AGE_MIN}
            max={AGE_MAX}
            value={ageMax}
            onChange={(event) => onMaxChange(Number(event.target.value))}
            className="w-full accent-[var(--foreground)]"
          />
          <span className="w-10 shrink-0 text-right text-base font-normal tabular-nums">{ageMax}</span>
        </div>

        {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

        <div className="sticky bottom-0 z-20 mt-auto pt-8">
          <PrimaryButton onClick={continueNext}>Continue</PrimaryButton>
        </div>
      </main>
    </GradientBackground>
  );
}
