"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { CityAutocomplete, type CityValue } from "@/components/CityAutocomplete";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getDraft, getUserId, setDraft } from "@/lib/client";

export default function AboutPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [city, setCity] = useState<CityValue>({
    city: "",
    label: "",
    lat: null,
    lng: null,
    placeId: null,
  });
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
    setName(draft.name);
    setHandle(draft.handle);
    setCity({
      city: draft.city,
      label: draft.city,
      lat: draft.cityLat,
      lng: draft.cityLng,
      placeId: draft.cityPlaceId,
    });
  }, [router]);

  function continueNext() {
    const nextName = name.trim();
    const nextHandle = handle.trim().replace(/^@+/, "");
    const nextCity = city.city.trim();
    if (!nextName) {
      setError("Add your name.");
      return;
    }
    if (!nextHandle) {
      setError("Add a handle so people know who you are.");
      return;
    }
    if (!nextCity || !city.placeId) {
      setError("Pick a city from the suggestions.");
      return;
    }
    const draft = getDraft();
    setDraft({
      ...draft,
      name: nextName,
      handle: nextHandle,
      city: nextCity,
      cityLat: city.lat,
      cityLng: city.lng,
      cityPlaceId: city.placeId,
    });
    router.push("/age");
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/verify" />
        <OnboardingProgress step="about" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          About you
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Name, handle, and city.
        </p>

        <label className="mt-8 block text-sm font-normal text-[var(--muted)]" htmlFor="name">
          Name
        </label>
        <div className="field mt-2 flex min-h-12 w-full items-center px-4">
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maya"
            autoComplete="name"
            className="text-base font-normal placeholder:text-[var(--muted)]"
          />
        </div>

        <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor="handle">
          Handle
        </label>
        <div className="field mt-2 flex min-h-12 w-full items-center px-4">
          <input
            id="handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="maya"
            autoCapitalize="none"
            autoComplete="nickname"
            className="text-base font-normal placeholder:text-[var(--muted)]"
          />
        </div>

        <CityAutocomplete value={city} onChange={setCity} />

        {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

        <div className="sticky bottom-0 z-20 mt-auto pt-8">
          <PrimaryButton onClick={continueNext}>Continue</PrimaryButton>
        </div>
      </main>
    </GradientBackground>
  );
}
