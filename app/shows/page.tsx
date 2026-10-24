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

export default function ShowsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shows, setShows] = useState<ShowItem[]>([]);
  const [rsvpError, setRsvpError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchJson(`/api/shows?userId=${encodeURIComponent(id)}`)
      .then((data) => {
        if (!cancelled) setShows(normalizeShows(data));
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
          Shows for your artists and matches.
        </p>

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

        {!loading && !error && shows.length === 0 ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">
              No shows lined up for your artists yet.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <PrimaryButton href="/me">Add an artist</PrimaryButton>
              <Link
                href="/crowd"
                className="inline-flex min-h-11 items-center justify-center text-base font-semibold text-[var(--foreground)]"
              >
                See the crowd
              </Link>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error && shows.length > 0 ? (
          <div className="mt-6 flex flex-col gap-4">
            {rsvpError ? <p className="text-sm text-[var(--muted)]">{rsvpError}</p> : null}
            {shows.map((show) => {
              const photo = photoFor(show.artistName);
              const tone = portraitFor(show.artistName)?.color ?? "#eceef2";
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
            })}
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}
