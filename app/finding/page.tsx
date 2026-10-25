"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArtistChip } from "@/components/ArtistChip";
import { BackLink } from "@/components/BackLink";
import { FindingProgress, FINDING_MS } from "@/components/OnboardingProgress";
import { GradientBackground } from "@/components/GradientBackground";
import { artistKey, clearDraft, getDraft, getUserId, type DraftArtist } from "@/lib/client";

export default function FindingPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<DraftArtist[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getUserId()) {
      router.replace("/");
      return;
    }

    const draft = getDraft();
    setArtists(draft.artists);
    setReady(true);

    // Clear only when this screen actually leaves. A sync clear runs twice in
    // Strict Mode, and the second pass would read an empty draft before chips paint.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = window.setTimeout(() => {
      clearDraft();
      router.push("/matches");
    }, reduce ? 0 : FINDING_MS);

    return () => {
      window.clearTimeout(done);
    };
  }, [router]);

  return (
    <GradientBackground>
      <main className="screen flex min-h-dvh flex-col pb-16">
        <div className="self-start text-left">
          <BackLink href="/socials" />
        </div>
        <div className="mt-auto flex flex-col items-center text-center">
          <ul className="mb-8 flex max-w-full flex-wrap justify-center gap-3">
            {artists.map((artist, index) => (
              <li
                key={artistKey(artist)}
                className="finding-chip"
                style={
                  {
                    "--slide-x": index % 2 === 0 ? "-72px" : "72px",
                  } as CSSProperties
                }
              >
                <ArtistChip name={artist.name} imageUrl={artist.imageUrl} />
              </li>
            ))}
          </ul>
          <p className="text-sm font-normal text-[var(--muted)]">Profile saved</p>
          <h1 className="mt-2 font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
            Finding matches
          </h1>
          <p className="mt-3 max-w-xs text-base font-normal leading-snug text-[var(--muted)]">
            {ready ? "Looking for shared artists." : "One sec."}
          </p>
          <FindingProgress />
        </div>
      </main>
    </GradientBackground>
  );
}
