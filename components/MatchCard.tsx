import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { MatchActions } from "@/components/MatchActions";
import { MatchWhy } from "@/components/MatchWhy";
import { PrimaryButton } from "@/components/PrimaryButton";
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

/** Soft art-print wash: a touch of the artist's tone fading into the card's own neutral fill. */
function lightWash(hex: string): string {
  return `linear-gradient(155deg, ${rgba(hex, 0.26)} 0%, ${rgba(hex, 0.08)} 45%, transparent 100%)`;
}

/** Darkens a tone for text use, scaling every channel equally so hue and saturation hold steady. */
function textTone(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const toHex = (channel: number) => Math.round(channel * 0.42).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Lightens a tone toward white for text on dark mode's dark card, keeping the hue. */
function lightTextTone(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lift = (channel: number) => Math.round(channel + (255 - channel) * 0.4).toString(16).padStart(2, "0");
  return `#${lift((n >> 16) & 255)}${lift((n >> 8) & 255)}${lift(n & 255)}`;
}

export function MatchCard({
  match,
  href,
  busy,
  onInterested,
  onSkip,
  onWithdraw,
}: {
  match: MatchPerson;
  href: string;
  busy?: boolean;
  onInterested: () => void;
  onSkip: () => void;
  /** Takes back your interest while it's still one-sided. */
  onWithdraw?: () => void;
}) {
  const lead = match.sharedArtists[0];
  const tone = hexTone(lead?.color ?? portraitFor(lead?.name)?.color);
  // Percentage labels read as "not quite a match" — keep those neutral; only color-code a real label.
  const strengthColor = match.label.endsWith("%") ? null : "var(--tone-label)";
  // Both versions of the tone; globals.css .tone-scope picks the one for the current theme
  const toneVars = { "--tone-on-light": textTone(tone), "--tone-on-dark": lightTextTone(tone) } as CSSProperties;

  return (
    <GlassCard className="p-0">
      <Link
        href={href}
        className="block cursor-pointer rounded-t-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foreground)]"
      >
        <div className="relative h-40 overflow-hidden bg-[var(--surface-soft)]">
          <div aria-hidden className="absolute inset-0" style={{ background: lightWash(tone) }} />
          {match.isDemo ? (
            <span className="pill absolute right-3 top-3 border border-white/40 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              <span className="chip-label">demo</span>
            </span>
          ) : null}
          <div className="absolute inset-x-4 bottom-3 flex items-center gap-2.5">
            {/* Google profile picture; initials for phone-only and demo profiles.
                Same circular-avatar-chip styling as SharedFaces in MatchWhy.tsx. */}
            {match.avatarUrl ? (
              <Image
                src={match.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border-2 border-[var(--surface)] bg-[var(--surface-soft)] object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--foreground)]"
              >
                {(match.name || match.handle || "?").trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display truncate text-[2rem] font-normal leading-[1.15] pb-[0.1em] tracking-tight text-[var(--foreground)]">
                {match.name || match.handle}
              </p>
              <p className="mt-0 truncate text-sm font-normal text-[var(--muted)]">
                {[match.handle !== match.name ? `@${match.handle}` : null, match.age != null ? String(match.age) : null, match.city]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </div>
        <div className="tone-scope px-4 pt-4" style={toneVars}>
          <MatchWhy
            label={match.label}
            labelColor={strengthColor}
            why={match.why}
            sharedArtists={match.sharedArtists}
            show={match.show}
          />
        </div>
      </Link>
      <div className="px-4 pb-4 pt-4">
        {match.mutual ? (
          <MatchedFooter match={match} href={href} />
        ) : match.interested ? (
          <PendingFooter busy={busy} onWithdraw={onWithdraw} />
        ) : (
          <MatchActions
            interested={match.interested}
            mutual={match.mutual}
            busy={busy}
            onInterested={onInterested}
            onSkip={onSkip}
          />
        )}
      </div>
    </GlassCard>
  );
}

const secondaryCompactClass =
  "font-sans inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 text-center text-sm font-normal leading-none text-[var(--foreground)] transition duration-200 ease-out hover:border-[var(--foreground)] hover:bg-[var(--surface-soft)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

function StatusLine({ filled, title, detail }: { filled: boolean; title: string; detail: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-base font-semibold leading-snug text-[var(--foreground)]">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${
            filled ? "bg-[var(--foreground)]" : "border border-[var(--muted)]"
          }`}
        />
        {title}
      </p>
      <p className="mt-0.5 text-sm font-normal leading-snug text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function PendingFooter({ busy, onWithdraw }: { busy?: boolean; onWithdraw?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <StatusLine filled={false} title="Waiting on them" detail="You'll match if they tap interested too." />
      {onWithdraw ? (
        <button type="button" onClick={onWithdraw} disabled={busy} className={secondaryCompactClass}>
          <span className="btn-label">{busy ? "Undoing…" : "Undo"}</span>
        </button>
      ) : null}
    </div>
  );
}

function MatchedFooter({ match, href }: { match: MatchPerson; href: string }) {
  const rounds = match.icebreaker?.rounds ?? [];
  const latest = rounds[rounds.length - 1];
  const waitingOnYou = Boolean(latest && !latest.reply && !latest.promptFromMe);
  const detail = match.socialsUnlocked
    ? "Socials are unlocked."
    : match.youShared
      ? "You shared your socials. Theirs open when they share back."
      : "Share your socials or send an icebreaker.";

  return (
    <div>
      <StatusLine filled title="It's mutual" detail={detail} />
      <div className="mt-3 flex flex-wrap gap-2">
        <PrimaryButton size="compact" href={`${href}/icebreaker`}>
          {waitingOnYou ? "Reply" : rounds.length > 0 ? "Open chat" : "Start chatting"}
        </PrimaryButton>
        <Link href={href} className={secondaryCompactClass}>
          <span className="btn-label">{match.socialsUnlocked ? "See socials" : "Share socials"}</span>
        </Link>
      </div>
    </div>
  );
}
