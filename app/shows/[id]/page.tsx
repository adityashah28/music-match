"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RsvpControl } from "@/components/RsvpControl";
import { Skeleton } from "@/components/Skeleton";
import {
  fetchJson,
  formatWhen,
  getUserId,
  normalizeShow,
  normalizeShows,
  type RsvpStatus,
  type ShowItem,
} from "@/lib/client";

export default function ShowDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const showId = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [show, setShow] = useState<ShowItem | null>(null);
  const [rsvpError, setRsvpError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      router.replace("/");
      return;
    }
    if (!showId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    const query = `userId=${encodeURIComponent(userId)}`;
    fetchJson(`/api/shows/${showId}?${query}`)
      .then((data) => normalizeShow(data))
      .catch(async () => {
        const list = await fetchJson(`/api/shows?${query}`);
        return normalizeShows(list).find((item) => item.id === showId) ?? null;
      })
      .then((found) => {
        if (!cancelled) setShow(found);
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
  }, [router, showId, reload]);

  async function setRsvp(next: RsvpStatus) {
    const userId = getUserId();
    if (!userId || !show) return;
    const previous = show.rsvp;
    setRsvpError("");
    setShow({ ...show, rsvp: next });
    try {
      await fetchJson(`/api/shows/${show.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: next, rsvp: next }),
      });
    } catch {
      setShow({ ...show, rsvp: previous });
      setRsvpError("Couldn't save that RSVP. Try again.");
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        <Link
          href="/shows"
          className="inline-flex min-h-11 items-center text-sm font-normal text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← All shows
        </Link>

        {loading ? (
          <div className="mt-4" aria-busy="true">
            <span className="sr-only">Loading show</span>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="mt-4 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t load this show.</p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error && !show ? (
          <GlassCard className="mt-4 p-5">
            <h1 className="text-[36px] font-semibold leading-[1.02] tracking-tight text-[var(--foreground)]">
              Show missing
            </h1>
            <p className="mt-3 text-base leading-snug text-[var(--muted)]">
              That night isn&apos;t in the list anymore.
            </p>
            <div className="mt-5">
              <PrimaryButton href="/shows">Back to shows</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {show ? (
          <div className="mt-8">
            <h1 className="text-[44px] font-semibold leading-[0.98] tracking-tight text-[var(--foreground)]">
              {show.artistName}
            </h1>
            <p className="mt-3 text-base font-normal text-[var(--muted)]">
              {[show.venue, show.city].filter(Boolean).join(" · ") || "Venue TBA"}
            </p>
            <p className="mt-1 text-base font-normal text-[var(--muted)]">{formatWhen(show.startsAt)}</p>
            {show.ticketUrl ? (
              <a
                href={show.ticketUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-base font-normal text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4"
              >
                Tickets
              </a>
            ) : null}
            {rsvpError ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{rsvpError}</p> : null}
            <div className="mt-4">
              <RsvpControl value={show.rsvp} onChange={setRsvp} />
            </div>
            <GlassCard className="mt-4 p-5">
              <p className="text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
                {goingLine(show.goingCount)}
              </p>
              <p className="mt-2 text-base font-normal leading-snug text-[var(--muted)]">
                {show.tasteSummary || "A crowd taste summary isn't in yet."}
              </p>
            </GlassCard>
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}

function goingLine(count: number | undefined) {
  if (count === undefined) return "We're still counting who with your taste is going.";
  if (count === 0) return "Nobody with your taste has tapped going yet.";
  if (count === 1) return "1 person with your taste is going.";
  return `${count} people with your taste are going.`;
}
