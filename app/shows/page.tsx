"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArtistImage } from "@/components/ArtistImage";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RsvpControl } from "@/components/RsvpControl";
import { Skeleton } from "@/components/Skeleton";
import {
  fetchJson,
  formatWhen,
  getUserId,
  normalizeShows,
  type RsvpStatus,
  type ShowItem,
} from "@/lib/client";
import { photoFor, portraitFor } from "@/lib/portraits";

/** Shows on the page before searching; search reaches every show. */
const SHOWS_PER_PAGE = 10;

export default function ShowsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shows, setShows] = useState<ShowItem[]>([]);
  const [query, setQuery] = useState("");
  const [rsvpError, setRsvpError] = useState("");
  const [reload, setReload] = useState(0);

  // The server searches every show and sorts nearest first; ask again 250ms after typing stops
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);
  const filteredShows = shows;
  const [hasMore, setHasMore] = useState(false);
  const [genre, setGenre] = useState("");
  const [genreOptions, setGenreOptions] = useState<{ id: string; label: string; count: number }[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  // Sticky once true: a search with zero matches shouldn't hide the bar that let you fix the search.
  const [everHadShows, setEverHadShows] = useState(false);

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setError(false);

    const params = new URLSearchParams({ userId: id, limit: String(SHOWS_PER_PAGE) });
    if (search) params.set("q", search);
    if (genre) params.set("genre", genre);
    fetchJson(`/api/shows?${params}`)
      .then((data) => {
        if (cancelled) return;
        const next = normalizeShows(data);
        setShows(next);
        if (next.length > 0) setEverHadShows(true);
        setHasMore(Boolean(data && typeof data === "object" && "hasMore" in data && data.hasMore));
        setGenreOptions(genreOptionsFrom(data));
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
  }, [router, reload, search, genre]);

  /** Next page of the same search, added below the shows already on screen. */
  async function showMore() {
    const id = getUserId();
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ userId: id, limit: String(SHOWS_PER_PAGE), offset: String(shows.length) });
      if (search) params.set("q", search);
      if (genre) params.set("genre", genre);
      const data = await fetchJson(`/api/shows?${params}`);
      const next = normalizeShows(data);
      setShows((current) => [...current, ...next.filter((show) => !current.some((item) => item.id === show.id))]);
      setHasMore(Boolean(data && typeof data === "object" && "hasMore" in data && data.hasMore));
    } catch {
      setRsvpError("Couldn’t load more shows. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function setRsvp(show: ShowItem, next: RsvpStatus) {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    const previous = show.rsvp;
    setRsvpError("");
    setShows((current) => current.map((item) => (item.id === show.id ? { ...item, rsvp: next } : item)));
    try {
      await fetchJson(`/api/shows/${show.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, status: next, rsvp: next }),
      });
    } catch {
      setShows((current) =>
        current.map((item) => (item.id === show.id ? { ...item, rsvp: previous } : item)),
      );
      setRsvpError("Couldn't save that RSVP. Try again.");
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Shows
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Bay Area shows, nearest first.
        </p>

        {!loading && !error && everHadShows ? (
          <label className="field mt-6 flex min-h-12 items-center gap-2 px-4">
            <SearchIcon />
            <span className="sr-only">Search shows</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artist, venue, or city"
              autoComplete="off"
              autoCapitalize="none"
              enterKeyHint="search"
              className="w-full bg-transparent text-base font-normal text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>
        ) : null}

        {!loading && !error && genreOptions.length > 0 ? (
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by genre">
            {[{ id: "", label: "All", count: 0 }, ...genreOptions].map((option) => {
              const selected = genre === option.id;
              return (
                <button
                  key={option.id || "all"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGenre(selected ? "" : option.id)}
                  className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-normal transition ${
                    selected
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--on-foreground)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex flex-col gap-3" aria-busy="true">
            <span className="sr-only">Loading shows</span>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t load shows.</p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error && shows.length === 0 && !search && !genre ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">
              No shows lined up for your artists yet.
            </p>
            <div className="mt-5">
              <PrimaryButton href="/me">Add an artist</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error && (shows.length > 0 || search || genre) ? (
          <div className="mt-6 flex flex-col gap-4">
            {rsvpError ? <p className="text-sm text-[var(--muted)]">{rsvpError}</p> : null}
            {filteredShows.length === 0 ? (
              <p className="text-base leading-snug text-[var(--muted)]">
                {genre && !search ? "No upcoming shows in that genre." : "No shows match that search."}
              </p>
            ) : (
              filteredShows.map((show) => {
                const photo = photoFor(show.artistName, show.imageUrl);
                const tone = show.color ?? portraitFor(show.artistName)?.color ?? "var(--surface-soft)";
                return (
                  <article key={show.id} className="panel overflow-hidden">
                    <div className="relative min-h-[22rem] md:min-h-[26rem]">
                      {photo ? (
                        <ArtistImage
                          src={photo}
                          size={500}
                          fill
                          sizes="(max-width: 672px) 100vw, 672px"
                          alt=""
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0" style={{ background: tone }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                      <div className="relative flex min-h-[22rem] flex-col justify-end p-4 md:min-h-[26rem]">
                        <Link href={`/shows/${show.id}`} className="block min-h-11">
                          <h2 className="text-[36px] font-normal leading-[1.02] tracking-tight text-white">
                            {show.artistName}
                          </h2>
                          <p className="mt-1 text-sm font-normal text-white/80">
                            {[show.venue, show.city].filter(Boolean).join(" · ") || "Venue TBA"}
                          </p>
                          <p className="mt-1 text-sm font-normal text-white/65">{formatWhen(show.startsAt)}</p>
                        </Link>
                        {show.ticketUrl ? (
                          <a
                            href={show.ticketUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex min-h-11 items-center text-sm font-normal text-white"
                          >
                            Tickets
                          </a>
                        ) : null}
                        <div className="mt-3">
                          <RsvpControl value={show.rsvp} onChange={(next) => setRsvp(show, next)} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            {hasMore ? (
              <div className="pt-2">
                <PrimaryButton onClick={showMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Show more shows"}
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}

/** The genre filter's options from a /api/shows response. */
function genreOptionsFrom(data: unknown): { id: string; label: string; count: number }[] {
  const list = data && typeof data === "object" && "genres" in data && Array.isArray(data.genres) ? data.genres : [];
  return list.filter(
    (g): g is { id: string; label: string; count: number } =>
      Boolean(g) && typeof g.id === "string" && typeof g.label === "string" && typeof g.count === "number",
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
