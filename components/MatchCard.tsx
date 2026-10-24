import Link from "next/link";
import { ArtistImage } from "@/components/ArtistImage";
import { GlassCard } from "@/components/GlassCard";
import { MatchActions } from "@/components/MatchActions";
import { MatchWhy } from "@/components/MatchWhy";
import type { MatchPerson } from "@/lib/client";
import { photoFor } from "@/lib/portraits";

export function MatchCard({
  match,
  href,
  busy,
  onInterested,
  onSkip,
}: {
  match: MatchPerson;
  href: string;
  busy?: boolean;
  onInterested: () => void;
  onSkip: () => void;
}) {
  const lead = match.sharedArtists[0];
  const cover = photoFor(lead?.name, lead?.imageUrl);

  return (
    <GlassCard className="p-0">
      <Link
        href={href}
        className="block rounded-t-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foreground)]"
      >
        <div className="relative h-40 bg-[var(--surface-soft)]">
          {cover ? (
            <ArtistImage
              src={cover}
              size={500}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              alt=""
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {match.isDemo ? (
            <span className="pill absolute right-3 top-3 border border-white/40 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              <span className="chip-label">demo</span>
            </span>
          ) : null}
          <div className="absolute inset-x-4 bottom-3">
            <p className="truncate text-[2rem] font-semibold leading-none tracking-tight text-white">
              {match.name || match.handle}
            </p>
            <p className="mt-1 truncate text-sm font-normal text-white/80">
              {[match.handle !== match.name ? `@${match.handle}` : null, match.age != null ? String(match.age) : null, match.city]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="px-4 pt-4">
          <MatchWhy
            label={match.label}
            why={match.why}
            sharedArtists={match.sharedArtists}
            show={match.show}
          />
        </div>
      </Link>
      <div className="px-4 pb-4 pt-4">
        <MatchActions
          interested={match.interested}
          mutual={match.mutual}
          busy={busy}
          onInterested={onInterested}
          onSkip={onSkip}
          mutualHref={href}
        />
      </div>
    </GlassCard>
  );
}
