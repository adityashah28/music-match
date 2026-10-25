import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { MatchActions } from "@/components/MatchActions";
import { MatchWhy } from "@/components/MatchWhy";
import type { MatchPerson } from "@/lib/client";
import { portraitFor } from "@/lib/portraits";

const FALLBACK_TONE = "#c8ced8";

function hexTone(value?: string | null): string {
  if (!value) return FALLBACK_TONE;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : FALLBACK_TONE;
}

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function frostWash(hex: string): string {
  return [
    `radial-gradient(120% 90% at 10% 15%, ${rgba(hex, 0.55)} 0%, transparent 58%)`,
    `radial-gradient(90% 70% at 92% 8%, rgba(255, 255, 255, 0.78) 0%, transparent 52%)`,
    `radial-gradient(70% 60% at 70% 88%, ${rgba(hex, 0.28)} 0%, transparent 55%)`,
    `linear-gradient(155deg, ${rgba(hex, 0.42)} 0%, ${rgba(hex, 0.68)} 46%, rgba(244, 245, 247, 0.92) 100%)`,
  ].join(", ");
}

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
  const tone = hexTone(lead?.color ?? portraitFor(lead?.name)?.color);

  return (
    <GlassCard className="p-0">
      <Link
        href={href}
        className="block cursor-pointer rounded-t-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foreground)]"
      >
        <div className="relative h-40 overflow-hidden bg-[var(--surface-soft)]">
          <div aria-hidden className="absolute inset-0" style={{ background: frostWash(tone) }} />
          <div aria-hidden className="absolute inset-0 bg-white/30" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-white/15"
          />
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
