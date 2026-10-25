"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { CityAutocomplete, type CityValue } from "@/components/CityAutocomplete";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import { fetchJson, getDraft, getUserId, isVerified, setDraft } from "@/lib/client";

function normalizeUsername(raw: string) {
  return raw.replace(/^@+/, "").replace(/\s+/g, "");
}

export default function AboutPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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
    if (!isVerified(draft)) {
      router.replace("/");
      return;
    }
    setName(draft.name);
    setUsername(normalizeUsername(draft.handle));
    setCity({
      city: draft.city,
      label: draft.city,
      lat: draft.cityLat,
      lng: draft.cityLng,
      placeId: draft.cityPlaceId,
    });
  }, [router]);

  async function continueNext() {
    const nextName = name.trim();
    const nextUsername = normalizeUsername(username).trim();
    const nextCity = city.city.trim();
    if (!nextName) {
      setError("Add your name.");
      return;
    }
    if (!nextUsername) {
      setError("Add a username so people know who you are.");
      return;
    }
    if (!nextCity || !city.placeId) {
      setError("Pick a city from the suggestions.");
      return;
    }
    // Catch a taken username here, not at the end of onboarding
    try {
      const data = await fetchJson(`/api/users/handle?handle=${encodeURIComponent(nextUsername)}`);
      if (data && typeof data === "object" && "available" in data && data.available === false) {
        setError("That username is taken. Try another.");
        return;
      }
    } catch {
      // If the check itself fails, carry on: signup still refuses a taken username
    }
    const draft = getDraft();
    setDraft({
      ...draft,
      name: nextName,
      handle: nextUsername,
      city: nextCity,
      cityLat: city.lat,
      cityLng: city.lng,
      cityPlaceId: city.placeId,
    });
    router.push("/age");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    continueNext();
  }

  function onFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    continueNext();
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/" />
        <OnboardingProgress step="about" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          About you
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Name, username, and city.
        </p>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <label className="mt-8 block text-sm font-normal text-[var(--muted)]" htmlFor="name">
            Name
          </label>
          <div className="field mt-2 flex min-h-12 w-full items-center px-4">
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={onFieldKeyDown}
              placeholder="Maya"
              autoComplete="name"
              className="text-base font-normal placeholder:text-[var(--muted)]"
            />
          </div>

          <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor="username">
            Username
          </label>
          <div className="field mt-2 flex min-h-12 w-full items-center pl-5 pr-4">
            <span className="field-prefix text-base font-normal text-[var(--muted)]" aria-hidden="true">
              {"@"}
            </span>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(normalizeUsername(event.target.value))}
              onKeyDown={onFieldKeyDown}
              placeholder="maya"
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              className="min-w-0 flex-1 w-auto text-base font-normal placeholder:text-[var(--muted)]"
            />
          </div>

          <CityAutocomplete value={city} onChange={setCity} />

          {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

          <div className="sticky bottom-0 z-20 mt-auto pt-8">
            <PrimaryButton type="submit">Continue</PrimaryButton>
          </div>
        </form>
      </main>
    </GradientBackground>
  );
}
