"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArtistChip } from "@/components/ArtistChip";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { fetchJson, getUserId, normalizeCrowd, type CrowdSnapshot } from "@/lib/client";

export default function CrowdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [crowd, setCrowd] = useState<CrowdSnapshot | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!getUserId()) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchJson("/api/crowd")
      .then((data) => {
        if (!cancelled) setCrowd(normalizeCrowd(data));
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

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-tight text-[var(--foreground)]">
          Crowd
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Live joiners plus seeded demo profiles (demos aren&apos;t real people).
        </p>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3" aria-busy="true">
            <span className="sr-only">Loading the crowd</span>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t load the room.</p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error && crowd ? (
          <div className="mt-6 flex flex-col gap-4">
            <GlassCard className="p-5">
              <p className="text-[44px] font-normal leading-none tracking-tight text-[var(--foreground)]">
                {crowd.joined ?? "—"}
              </p>
              <p className="mt-2 text-base text-[var(--muted)]">
                {crowd.joined === 1 ? "hacker has joined" : "hackers have joined"}
              </p>
              <p className="mt-3 text-sm leading-snug text-[var(--muted)]">
                {crowd.demoCount === undefined
                  ? "Joined count excludes demo profiles."
                  : `${crowd.demoCount} demo ${crowd.demoCount === 1 ? "profile" : "profiles"} — not counted above.`}
              </p>
            </GlassCard>

            <GlassCard className="p-5">
              <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">Top artists</h2>
              {crowd.topArtists.length === 0 ? (
                <p className="mt-3 text-base text-[var(--muted)]">No artist tallies yet.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {crowd.topArtists.map((artist) => (
                    <ArtistChip key={artist.name} name={artist.name} imageUrl={artist.imageUrl} />
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <h2 className="text-xl font-normal tracking-tight text-[var(--foreground)]">People going</h2>
              <p className="mt-3 text-base leading-snug text-[var(--muted)]">{goingCopy(crowd)}</p>
              {crowd.goingPeople.length > 0 ? (
                <ul className="mt-3 flex flex-col">
                  {crowd.goingPeople.map((person) => (
                    <li
                      key={person.label}
                      className="min-h-11 border-b border-[var(--border)] py-2 text-base text-[var(--foreground)] last:border-b-0"
                    >
                      {person.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4">
                <PrimaryButton href="/shows">See shows</PrimaryButton>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}

function goingCopy(crowd: CrowdSnapshot) {
  if (crowd.goingCount === undefined) return "Going counts aren't in yet.";
  if (crowd.goingCount === 0) return "Nobody has tapped going yet.";
  if (crowd.goingCount === 1) return "1 person is going to a show.";
  return `${crowd.goingCount} people are going to shows.`;
}
