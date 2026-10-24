"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArtistChip, ArtistResult } from "@/components/ArtistChip";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import {
  artistKey,
  getDraft,
  searchArtists,
  setDraft,
  type DraftArtist,
} from "@/lib/client";
import { SUGGESTED_ARTISTS } from "@/lib/portraits";

export default function PickPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<DraftArtist[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DraftArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setArtists(getDraft().artists);
  }, []);

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

  function persist(next: DraftArtist[]) {
    const draft = getDraft();
    setDraft({ ...draft, artists: next });
    setArtists(next);
  }

  function add(artist: DraftArtist) {
    if (artists.some((picked) => artistKey(picked) === artistKey(artist))) return;
    if (artists.length >= 5) {
      setNotice("Five is the cap. Remove one to swap.");
      return;
    }
    setNotice("");
    persist([...artists, artist]);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* haptics are optional */
    }
  }

  function remove(artist: DraftArtist) {
    setNotice("");
    persist(artists.filter((picked) => artistKey(picked) !== artistKey(artist)));
  }

  function continueNext() {
    if (artists.length < 1) return;
    const draft = getDraft();
    setDraft({ ...draft, artists });
    router.push("/about");
  }

  const searchingQuery = Boolean(query.trim());

  return (
    <GradientBackground>
      <main className="screen screen-pick screen-end flex min-h-dvh flex-col pb-28 md:pb-10">
        <BackLink href="/" label="Resonate" />

        <div className="grid flex-1 grid-cols-1 gap-8 md:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)] md:items-start md:gap-10 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] lg:gap-14">
          <div className="min-w-0 md:sticky md:top-24 md:self-start">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
              <h1 className="font-display max-w-[12ch] text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)] md:text-5xl">
                Pick your artists
              </h1>
              <p className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--muted)]">
                {artists.length} of 5
              </p>
            </div>
            <p className="mt-3 max-w-[40ch] text-base font-normal leading-snug text-[var(--muted)]">
              {artists.length >= 5
                ? "That's five — remove one to swap."
                : "At least one. Up to five."}
            </p>

            {artists.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {artists.map((artist) => (
                  <ArtistChip
                    key={artistKey(artist)}
                    name={artist.name}
                    imageUrl={artist.imageUrl}
                    onRemove={() => remove(artist)}
                  />
                ))}
              </div>
            ) : null}

            <label className="field mt-6 flex min-h-12 items-center gap-2 px-4">
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

            {notice ? <p className="mt-3 text-sm font-normal text-[var(--muted)]">{notice}</p> : null}
            {searchError ? (
              <p className="mt-3 text-sm font-normal text-[var(--muted)]">{searchError}</p>
            ) : null}

            <div className="cta-hover mt-8 hidden w-full max-w-[17.5rem] md:block">
              <PrimaryButton onClick={continueNext} disabled={artists.length < 1}>
                Continue
              </PrimaryButton>
            </div>
          </div>

          <div className="min-w-0 pb-4">
            {searching ? (
              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                aria-busy="true"
              >
                <span className="sr-only">Searching</span>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : null}

            {!searching && searchingQuery && results.length === 0 && !searchError ? (
              <p className="py-3 text-sm font-normal text-[var(--muted)]">
                No artists under that name. Try another spelling.
              </p>
            ) : null}

            {!searchingQuery ? (
              <>
                <p className="pb-3 text-sm font-normal text-[var(--muted)]">Suggested</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED_ARTISTS.map((artist) => {
                    const draft: DraftArtist = {
                      name: artist.name,
                      imageUrl: artist.imageUrl,
                      color: artist.color,
                      genres: [],
                    };
                    const picked = artists.some(
                      (item) => artistKey(item) === artistKey(draft),
                    );
                    return (
                      <ArtistResult
                        key={artistKey(draft)}
                        name={draft.name}
                        imageUrl={draft.imageUrl}
                        picked={picked}
                        onPick={() => add(draft)}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {results.map((artist) => {
                  const picked = artists.some(
                    (item) => artistKey(item) === artistKey(artist),
                  );
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
            )}
          </div>
        </div>

        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="cta-hover mx-auto w-full max-w-md">
            <PrimaryButton onClick={continueNext} disabled={artists.length < 1}>
              Continue
            </PrimaryButton>
          </div>
        </div>
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
