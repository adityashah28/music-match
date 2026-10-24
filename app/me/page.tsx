"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArtistChip, ArtistResult } from "@/components/ArtistChip";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { CityAutocomplete, type CityValue } from "@/components/CityAutocomplete";
import { AGE_MAX, AGE_MIN, clampAge } from "@/lib/age";
import {
  artistKey,
  fetchJson,
  getUserId,
  normalizeProfile,
  searchArtists,
  setUserId,
  type DraftArtist,
} from "@/lib/client";

export default function MePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [profileId, setProfileId] = useState("");

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [city, setCity] = useState<CityValue>({
    city: "",
    label: "",
    lat: null,
    lng: null,
    placeId: null,
  });
  const [age, setAge] = useState(24);
  const [ageMin, setAgeMin] = useState(AGE_MIN);
  const [ageMax, setAgeMax] = useState(AGE_MAX);
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [artists, setArtists] = useState<DraftArtist[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DraftArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notice, setNotice] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    setUserId(id);
    setProfileId(id);

    let cancelled = false;
    setLoading(true);
    setError(false);
    setSaved(false);

    fetchJson(`/api/users/${encodeURIComponent(id)}`)
      .then((data) => {
        if (cancelled) return;
        const profile = normalizeProfile(data, id);
        if (!profile) {
          setError(true);
          return;
        }
        setName(profile.name);
        setHandle(profile.handle);
        setCity({
          city: profile.city,
          label: profile.city,
          lat: profile.cityLat,
          lng: profile.cityLng,
          placeId: profile.cityPlaceId,
        });
        if (profile.age != null) setAge(profile.age);
        if (profile.ageMin != null) setAgeMin(profile.ageMin);
        if (profile.ageMax != null) setAgeMax(profile.ageMax);
        setInstagram(profile.socials.instagram);
        setTiktok(profile.socials.tiktok);
        setSnapchat(profile.socials.snapchat);
        setArtists(profile.artists);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, reload]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchArtists(q)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setSearchError("");
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setSearchError("Search isn't responding. Try another spelling.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setSaved(false);
      setter(value);
    };
  }

  function add(artist: DraftArtist) {
    if (artists.some((picked) => artistKey(picked) === artistKey(artist))) return;
    if (artists.length >= 5) {
      setNotice("Five is the cap. Remove one to swap.");
      return;
    }
    setNotice("");
    setSaved(false);
    setArtists([...artists, artist]);
  }

  function remove(artist: DraftArtist) {
    setNotice("");
    setSaved(false);
    setArtists(artists.filter((picked) => artistKey(picked) !== artistKey(artist)));
  }

  async function save() {
    const id = profileId || getUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    const nextName = name.trim();
    const nextHandle = handle.trim().replace(/^@+/, "");
    if (!nextName) {
      setSaveError("Add your name.");
      setSaved(false);
      return;
    }
    if (!nextHandle) {
      setSaveError("Add a handle so people know who you are.");
      setSaved(false);
      return;
    }
    if (!city.city.trim()) {
      setSaveError("Add your city.");
      setSaved(false);
      return;
    }
    if (ageMin > ageMax) {
      setSaveError("Age range is backwards.");
      setSaved(false);
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaved(false);

    const next = {
      name: nextName,
      handle: nextHandle,
      city: city.city.trim(),
      cityLat: city.lat,
      cityLng: city.lng,
      cityPlaceId: city.placeId,
      age: clampAge(age),
      ageMin: clampAge(ageMin),
      ageMax: clampAge(ageMax),
      instagram: instagram.trim(),
      tiktok: tiktok.trim(),
      snapchat: snapchat.trim(),
      artists,
    };

    try {
      const data = await fetchJson(`/api/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const profile = normalizeProfile(data, id);
      if (profile) {
        setName(profile.name);
        setHandle(profile.handle);
        setCity({
          city: profile.city,
          label: profile.city,
          lat: profile.cityLat,
          lng: profile.cityLng,
          placeId: profile.cityPlaceId,
        });
        if (profile.age != null) setAge(profile.age);
        if (profile.ageMin != null) setAgeMin(profile.ageMin);
        if (profile.ageMax != null) setAgeMax(profile.ageMax);
        setInstagram(profile.socials.instagram);
        setTiktok(profile.socials.tiktok);
        setSnapchat(profile.socials.snapchat);
        setArtists(profile.artists);
      }
      setSaved(true);
    } catch {
      setSaveError("Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[var(--muted)]">
          {handle || "Your profile"}
        </p>
        <h1 className="mt-2 font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Profile
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Name, handle, city, age, socials, and artists.
        </p>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3" aria-busy="true">
            <span className="sr-only">Loading your profile</span>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t load your profile.</p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error ? (
          <div className="mt-6 flex flex-col gap-4">
            <GlassCard className="flex flex-col gap-5 p-5">
              <Field
                id="name"
                label="Name"
                value={name}
                onChange={edit(setName)}
                placeholder="Maya"
                autoComplete="name"
                capitalize
              />
              <Field
                id="handle"
                label="Handle"
                value={handle}
                onChange={edit(setHandle)}
                placeholder="maya"
                autoComplete="nickname"
              />
              <CityAutocomplete
                value={city}
                onChange={(next) => {
                  setSaved(false);
                  setCity(next);
                }}
              />
              <div>
                <label className="block text-sm font-normal text-[var(--muted)]" htmlFor="age">
                  Your age
                </label>
                <div className="field mt-2 flex min-h-12 w-full items-center px-4">
                  <input
                    id="age"
                    type="number"
                    min={AGE_MIN}
                    max={AGE_MAX}
                    value={age}
                    onChange={(event) => {
                      setSaved(false);
                      setAge(clampAge(Number(event.target.value) || AGE_MIN));
                    }}
                    className="text-base font-normal"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-normal text-[var(--muted)]">
                  Show me ages {ageMin}–{ageMax}
                </p>
                <label className="mt-3 block text-sm font-normal text-[var(--muted)]" htmlFor="age-min">
                  Youngest
                </label>
                <input
                  id="age-min"
                  type="range"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={ageMin}
                  onChange={(event) => {
                    setSaved(false);
                    const next = clampAge(Number(event.target.value));
                    setAgeMin(next);
                    if (next > ageMax) setAgeMax(next);
                  }}
                  className="mt-2 w-full accent-[var(--foreground)]"
                />
                <label className="mt-3 block text-sm font-normal text-[var(--muted)]" htmlFor="age-max">
                  Oldest
                </label>
                <input
                  id="age-max"
                  type="range"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={ageMax}
                  onChange={(event) => {
                    setSaved(false);
                    const next = clampAge(Number(event.target.value));
                    setAgeMax(next);
                    if (next < ageMin) setAgeMin(next);
                  }}
                  className="mt-2 w-full accent-[var(--foreground)]"
                />
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col gap-5 p-5">
              <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">Socials</h2>
              <Field
                id="instagram"
                label="Instagram"
                value={instagram}
                onChange={edit(setInstagram)}
                placeholder="@you"
                autoComplete="off"
              />
              <Field
                id="tiktok"
                label="TikTok"
                value={tiktok}
                onChange={edit(setTiktok)}
                placeholder="@you"
                autoComplete="off"
              />
              <Field
                id="snapchat"
                label="Snapchat"
                value={snapchat}
                onChange={edit(setSnapchat)}
                placeholder="@you"
                autoComplete="off"
              />
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">Artists</h2>
                <p className="text-sm font-normal text-[var(--muted)]">{artists.length} of 5</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {artists.length === 0 ? (
                  <p className="text-base text-[var(--muted)]">No artists yet. Search below to add one.</p>
                ) : (
                  artists.map((artist) => (
                    <ArtistChip
                      key={artistKey(artist)}
                      name={artist.name}
                      imageUrl={artist.imageUrl}
                      onRemove={() => remove(artist)}
                    />
                  ))
                )}
              </div>

              <label className="field mt-5 flex min-h-12 items-center gap-2 px-4">
                <SearchIcon />
                <span className="sr-only">Search artists</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search an artist"
                  autoComplete="off"
                  autoCapitalize="none"
                  enterKeyHint="search"
                  className="w-full bg-transparent text-base font-normal text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
              </label>

              {notice ? <p className="mt-3 text-sm text-[var(--muted)]">{notice}</p> : null}
              {searchError ? <p className="mt-3 text-sm text-[var(--muted)]">{searchError}</p> : null}

              <div className="mt-3 flex flex-col gap-2">
                {searching ? (
                  <div className="flex flex-col gap-2" aria-busy="true">
                    <span className="sr-only">Searching</span>
                    <Skeleton className="h-11 w-full rounded-full" />
                    <Skeleton className="h-11 w-full rounded-full" />
                  </div>
                ) : null}
                {!searching && query.trim() && results.length === 0 && !searchError ? (
                  <p className="py-3 text-sm text-[var(--muted)]">
                    No artists under that name. Try another spelling.
                  </p>
                ) : null}
                {results.map((artist) => {
                  const picked = artists.some((item) => artistKey(item) === artistKey(artist));
                  return (
                    <ArtistResult
                      key={artistKey(artist)}
                      name={artist.name}
                      imageUrl={artist.imageUrl}
                      picked={picked}
                      onPick={() => add(artist)}
                    />
                  );
                })}
              </div>
            </GlassCard>

            {saved ? (
              <GlassCard className="p-4">
                <p role="status" className="text-base font-semibold text-[var(--foreground)]">
                  Saved.
                </p>
              </GlassCard>
            ) : null}
            {saveError ? <p className="text-sm text-[var(--muted)]">{saveError}</p> : null}

            <PrimaryButton onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </PrimaryButton>
            <a
              href="/logout"
              className="font-sans inline-flex min-h-11 w-full items-center justify-center text-center text-base font-normal leading-none text-[var(--muted)]"
            >
              <span className="btn-label">Sign out</span>
            </a>
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-[var(--muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  capitalize,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-normal text-[var(--muted)]" htmlFor={id}>
        {label}
      </label>
      <div className="field mt-2 flex min-h-12 w-full items-center px-4">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={capitalize ? "words" : "none"}
          autoCorrect="off"
          className="text-base font-normal placeholder:text-[var(--muted)]"
        />
      </div>
    </div>
  );
}
