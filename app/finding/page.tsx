"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArtistChip } from "@/components/ArtistChip";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { artistKey, getDraft, getUserId, type DraftArtist } from "@/lib/client";

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

    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      router.push("/matches");
      return;
    }

    const done = setTimeout(() => router.push("/matches"), 1500);
    return () => {
      clearTimeout(done);
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
          <h1 className="text-[40px] font-semibold leading-[1.02] tracking-tight text-[var(--foreground)]">
            Finding matches
          </h1>
          <p className="mt-3 max-w-xs text-base font-normal leading-snug text-[var(--muted)]">
            {ready ? "Looking for shared artists." : "One sec."}
          </p>
        </div>
      </main>
    </GradientBackground>
  );
}
