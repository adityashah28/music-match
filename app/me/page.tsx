"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AgeNumberInput } from "@/components/AgeNumberInput";
import { MatchOffsetControl } from "@/components/MatchOffsetControl";
import { ArtistChip, ArtistResult } from "@/components/ArtistChip";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { CityAutocomplete, type CityValue } from "@/components/CityAutocomplete";
import {
  clampAge,
  clampOlderOffset,
  clampYoungerOffset,
  defaultMatchOffsets,
  matchRangeFromOffsets,
  offsetsFromMatchRange,
} from "@/lib/age";
import {
  artistKey,
  fetchJson,
  getUserId,
  normalizeProfile,
  normalizeSocialHandle,
  searchArtists,
  setUserId,
  type DraftArtist,
} from "@/lib/client";
import { PROFILE_ARTISTS } from "@/lib/limits";

export default function MePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [profileId, setProfileId] = useState("");

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [city, setCity] = useState<CityValue>({
    city: "",
    label: "",
    lat: null,
    lng: null,
    placeId: null,
  });
  const initialOffsets = defaultMatchOffsets(24);
  const [age, setAge] = useState(24);
  const [younger, setYounger] = useState(initialOffsets.younger);
  const [older, setOlder] = useState(initialOffsets.older);
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

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

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
        setAvatarUrl(profile.avatarUrl ?? "");
        setCity({
          city: profile.city,
          label: profile.city,
          lat: profile.cityLat,
          lng: profile.cityLng,
          placeId: profile.cityPlaceId,
        });
        const nextAge = profile.age != null ? clampAge(profile.age) : 24;
        const offsets = offsetsFromMatchRange(nextAge, profile.ageMin, profile.ageMax);
        setAge(nextAge);
        setYounger(offsets.younger);
        setOlder(offsets.older);
        setInstagram(normalizeSocialHandle(profile.socials.instagram));
        setTiktok(normalizeSocialHandle(profile.socials.tiktok));
        setSnapchat(normalizeSocialHandle(profile.socials.snapchat));
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
    // Onboarding asks for 5; here people can keep adding, up to the profile limit
    if (artists.length >= PROFILE_ARTISTS) {
      setNotice(`${PROFILE_ARTISTS} artists is the most a profile can hold. Remove one to add another.`);
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
      setSaveError("Add a username so people know who you are.");
      setSaved(false);
      return;
    }
    if (!city.city.trim()) {
      setSaveError("Add your city.");
      setSaved(false);
      return;
    }
    const range = matchRangeFromOffsets(age, younger, older);
    if (range.min > range.max) {
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
      ageMin: range.min,
      ageMax: range.max,
      instagram: normalizeSocialHandle(instagram),
      tiktok: normalizeSocialHandle(tiktok),
      snapchat: normalizeSocialHandle(snapchat),
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
        setAvatarUrl(profile.avatarUrl ?? "");
        setCity({
          city: profile.city,
          label: profile.city,
          lat: profile.cityLat,
          lng: profile.cityLng,
          placeId: profile.cityPlaceId,
        });
        if (profile.age != null) {
          const nextAge = clampAge(profile.age);
          const offsets = offsetsFromMatchRange(nextAge, profile.ageMin, profile.ageMax);
          setAge(nextAge);
          setYounger(offsets.younger);
          setOlder(offsets.older);
        }
        setInstagram(normalizeSocialHandle(profile.socials.instagram));
        setTiktok(normalizeSocialHandle(profile.socials.tiktok));
        setSnapchat(normalizeSocialHandle(profile.socials.snapchat));
        setArtists(profile.artists);
      }
      setSaved(true);
    } catch (err) {
      const taken = err instanceof Error && /username is taken/i.test(err.message);
      setSaveError(taken ? "That username is taken. Try another." : "Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setAvatarError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setAvatarError("That photo is too large. Max 8MB.");
      return;
    }

    const id = profileId || getUserId();
    if (!id) return;

    setAvatarError("");
    setAvatarUploading(true);
    const previousAvatarUrl = avatarUrl;
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);

    try {
      const form = new FormData();
      form.append("photo", file);
      const data = await fetchJson(`/api/users/${encodeURIComponent(id)}/avatar`, {
        method: "POST",
        body: form,
      });
      const profile = normalizeProfile(data, id);
      setAvatarUrl(profile?.avatarUrl ?? previousAvatarUrl);
    } catch {
      setAvatarError("Couldn't upload that photo. Try again.");
      setAvatarUrl(previousAvatarUrl);
    } finally {
      URL.revokeObjectURL(localPreview);
      setAvatarUploading(false);
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        {/* Title left, photo right; initials when there's no Google/uploaded image */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
              Profile
            </h1>
            <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
              Name, username, city, age, socials, and artists.
            </p>
          </div>
          <div className="relative h-[72px] w-[72px] shrink-0">
            {avatarUrl ? (
              // A freshly chosen file previews as a blob: URL before the upload finishes;
              // next/image doesn't optimize those, so fall back to a plain <img> for it.
              avatarUrl.startsWith("blob:") || avatarUrl.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-[72px] w-[72px] rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-full border border-[var(--border)] object-cover"
                />
              )
            ) : !loading ? (
              <div
                aria-hidden
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] text-2xl font-semibold text-[var(--muted)]"
              >
                {(name || handle || "?").trim().charAt(0).toUpperCase()}
              </div>
            ) : null}
            {!loading ? (
              <label
                className={`absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] ${avatarUploading ? "pointer-events-none opacity-60" : ""}`}
                title="Change photo"
              >
                <span className="sr-only">Change profile photo</span>
                <EditPhotoIcon />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={avatarUploading}
                  onChange={handlePhotoChange}
                />
              </label>
            ) : null}
          </div>
        </div>
        {avatarError ? <p className="mt-3 text-sm text-[var(--muted)]">{avatarError}</p> : null}

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
              <div>
                <label className="block text-sm font-normal text-[var(--muted)]" htmlFor="handle">
                  Username
                </label>
                <div className="field mt-2 flex min-h-12 w-full items-center pl-5 pr-4">
                  <span className="field-prefix text-base font-normal text-[var(--muted)]" aria-hidden="true">
                    {"@"}
                  </span>
                  <input
                    id="handle"
                    value={handle}
                    onChange={(event) => {
                      setSaved(false);
                      setHandle(event.target.value.replace(/^@+/, "").replace(/\s+/g, ""));
                    }}
                    placeholder="maya"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="min-w-0 flex-1 w-auto text-base font-normal placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>
              <CityAutocomplete
                className="mt-0"
                value={city}
                onChange={(next) => {
                  setSaved(false);
                  setCity(next);
                }}
              />
              <section>
                <label className="block text-sm font-normal text-[var(--muted)]" htmlFor="age">
                  Your age
                </label>
                <div className="mt-3 flex justify-center">
                  <AgeNumberInput
                    id="age"
                    value={age}
                    onChange={(next) => {
                      setSaved(false);
                      setAge(next);
                      setYounger((y) => clampYoungerOffset(next, y));
                      setOlder((o) => clampOlderOffset(next, o));
                    }}
                  />
                </div>
              </section>
              <section>
                <p className="text-sm font-normal text-[var(--muted)]">Match me with</p>
                <MatchOffsetControl
                  className="mt-3"
                  age={age}
                  younger={younger}
                  older={older}
                  onChange={({ younger: y, older: o }) => {
                    setSaved(false);
                    setYounger(y);
                    setOlder(o);
                  }}
                />
              </section>
            </GlassCard>

            <GlassCard className="flex flex-col gap-5 p-5">
              <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">Socials</h2>
              <SocialHandleField
                id="instagram"
                label="Instagram"
                value={instagram}
                onChange={edit(setInstagram)}
              />
              <SocialHandleField
                id="tiktok"
                label="TikTok"
                value={tiktok}
                onChange={edit(setTiktok)}
              />
              <SocialHandleField
                id="snapchat"
                label="Snapchat"
                value={snapchat}
                onChange={edit(setSnapchat)}
              />
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">Artists</h2>
                <p className="text-sm font-normal text-[var(--muted)]">
                  {artists.length} {artists.length === 1 ? "artist" : "artists"}
                </p>
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

              <div
                className={`mt-3 flex flex-col gap-2 ${searching && results.length > 0 ? "opacity-70" : ""}`}
                aria-busy={searching || undefined}
              >
                {/* Keep prior hits visible while fetching — never stack skeletons on top. */}
                {searching && results.length === 0 ? (
                  <>
                    <span className="sr-only">Searching</span>
                    <Skeleton className="h-11 w-full rounded-full" />
                    <Skeleton className="h-11 w-full rounded-full" />
                  </>
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
              className="font-sans inline-flex min-h-11 w-full cursor-pointer items-center justify-center text-center text-base font-normal leading-none text-[#d64545] transition duration-200 ease-out hover:text-[#c23030] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
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

function SocialHandleField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-normal text-[var(--muted)]" htmlFor={id}>
        {label}
      </label>
      <div className="field mt-2 flex min-h-12 w-full items-center pl-5 pr-4">
        <span className="field-prefix text-base font-normal text-[var(--muted)]" aria-hidden="true">
          {"@"}
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(normalizeSocialHandle(event.target.value))}
          onBlur={() => onChange(normalizeSocialHandle(value))}
          placeholder="you"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 w-auto text-base font-normal placeholder:text-[var(--muted)]"
        />
      </div>
    </div>
  );
}

function EditPhotoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
