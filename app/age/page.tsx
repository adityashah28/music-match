"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AgeNumberInput } from "@/components/AgeNumberInput";
import { MatchOffsetControl } from "@/components/MatchOffsetControl";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  AGE_MAX,
  AGE_MIN,
  clampAge,
  clampOlderOffset,
  clampYoungerOffset,
  defaultMatchOffsets,
  matchRangeFromOffsets,
  offsetsFromMatchRange,
} from "@/lib/age";
import { getDraft, getUserId, isVerified, setDraft } from "@/lib/client";

export default function AgePage() {
  const router = useRouter();
  const initial = defaultMatchOffsets(24);
  const [age, setAge] = useState(24);
  const [younger, setYounger] = useState(initial.younger);
  const [older, setOlder] = useState(initial.older);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getUserId()) {
      router.replace("/matches");
      return;
    }
    const draft = getDraft();
    if (!isVerified(draft)) {
      router.replace("/");
      return;
    }
    if (!draft.name.trim() || !draft.handle.trim() || !draft.city.trim()) {
      router.replace("/about");
      return;
    }
    const nextAge = draft.age != null ? clampAge(draft.age) : 24;
    const offsets = offsetsFromMatchRange(nextAge, draft.ageMin, draft.ageMax);
    setAge(nextAge);
    setYounger(offsets.younger);
    setOlder(offsets.older);
  }, [router]);

  function onAgeChange(value: number) {
    const next = clampAge(value);
    setAge(next);
    setYounger((y) => clampYoungerOffset(next, y));
    setOlder((o) => clampOlderOffset(next, o));
  }

  function continueNext() {
    if (age < AGE_MIN || age > AGE_MAX) {
      setError("Age must be between 18 and 99.");
      return;
    }
    const { min, max } = matchRangeFromOffsets(age, younger, older);
    if (min > max) {
      setError("Age range is backwards.");
      return;
    }
    const draft = getDraft();
    setDraft({ ...draft, age, ageMin: min, ageMax: max });
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

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            continueNext();
          }}
        >
          <section className="mt-8">
            <label className="block text-sm font-normal text-[var(--muted)]" htmlFor="age">
              Your age
            </label>
            <div className="mt-3 flex justify-center">
              <AgeNumberInput id="age" value={age} onChange={onAgeChange} />
            </div>
          </section>

          <section className="mt-8">
            <p className="text-sm font-normal text-[var(--muted)]">Match me with</p>
            <MatchOffsetControl
              className="mt-3"
              age={age}
              younger={younger}
              older={older}
              onChange={({ younger: y, older: o }) => {
                setYounger(y);
                setOlder(o);
              }}
            />
          </section>

          {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

          <div className="sticky bottom-0 z-20 mt-auto pt-8">
            <PrimaryButton type="submit">Continue</PrimaryButton>
          </div>
        </form>
      </main>
    </GradientBackground>
  );
}
