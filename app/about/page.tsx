"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getDraft, setDraft } from "@/lib/client";

export default function AboutPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [city, setCity] = useState("Berkeley");
  const [error, setError] = useState("");

  useEffect(() => {
    const draft = getDraft();
    setHandle(draft.handle);
    setCity(draft.city || "Berkeley");
  }, []);

  function continueNext() {
    const nextHandle = handle.trim();
    const nextCity = city.trim() || "Berkeley";
    if (!nextHandle) {
      setError("Add a handle so people know who you are.");
      return;
    }
    const draft = getDraft();
    if (draft.artists.length < 1) {
      setError("Pick at least one artist first.");
      router.push("/pick");
      return;
    }
    setDraft({ ...draft, handle: nextHandle, city: nextCity });
    router.push("/socials");
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/pick" />
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-tight text-[var(--foreground)]">
          About you
        </h1>
        <p className="mt-3 max-w-[28ch] text-base font-normal leading-snug text-[var(--muted)]">
          Handle and city.
        </p>

        <label className="mt-8 block text-sm font-normal text-[var(--muted)]" htmlFor="handle">
          Handle
        </label>
        <input
          id="handle"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="maya"
          autoCapitalize="none"
          autoComplete="nickname"
          className="field mt-2 min-h-12 w-full px-4 text-base font-normal outline-none placeholder:text-[var(--muted)]"
        />

        <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor="city">
          City
        </label>
        <input
          id="city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Berkeley"
          autoComplete="address-level2"
          className="field mt-2 min-h-12 w-full px-4 text-base font-normal outline-none placeholder:text-[var(--muted)]"
        />

        {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

        <div className="sticky bottom-0 z-20 mt-auto pt-8">
          <PrimaryButton onClick={continueNext}>Continue</PrimaryButton>
        </div>
      </main>
    </GradientBackground>
  );
}
