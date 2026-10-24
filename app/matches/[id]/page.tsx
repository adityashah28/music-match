"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArtistChip } from "@/components/ArtistChip";
import { BackLink } from "@/components/BackLink";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { MatchActions } from "@/components/MatchActions";
import { MatchShowRow, sharedCount } from "@/components/MatchWhy";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import {
  artistKey,
  fetchJson,
  formatWhen,
  getUserId,
  goingNote,
  hasSocial,
  normalizeMatches,
  sendInterest,
  sendSkip,
  socialLinks,
  type MatchPerson,
} from "@/lib/client";

function socialsPlaceholder(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as { placeholder?: unknown; socials?: unknown };
  if (row.placeholder === true) return true;
  const nested = row.socials;
  return Boolean(
    nested && typeof nested === "object" && (nested as { placeholder?: unknown }).placeholder === true,
  );
}

function rawMatches(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { matches?: unknown }).matches)) {
    return (value as { matches: unknown[] }).matches;
  }
  return [];
}

function rawUserId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const row = value as { userId?: unknown; user_id?: unknown; id?: unknown };
  if (typeof row.userId === "string") return row.userId;
  if (typeof row.user_id === "string") return row.user_id;
  if (typeof row.id === "string") return row.id;
  return "";
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [missing, setMissing] = useState(false);
  const [match, setMatch] = useState<MatchPerson | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [demoSocials, setDemoSocials] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }
    if (!matchId) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setMissing(false);

    fetchJson(`/api/users/${id}/matches`)
      .then((data) => {
        if (cancelled) return;
        const decoded = decodeURIComponent(matchId);
        const found = normalizeMatches(data).matches.find(
          (person) => person.userId === matchId || person.userId === decoded,
        );
        if (!found) {
          setMissing(true);
          return;
        }
        const raw = rawMatches(data).find((person) => {
          const userId = rawUserId(person);
          return userId === matchId || userId === decoded;
        });
        setDemoSocials(found.isDemo || socialsPlaceholder(raw));
        setMatch(found);
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
  }, [matchId, router, reload]);

  function buzz() {
    try {
      navigator.vibrate?.(12);
    } catch {
      /* haptics are optional */
    }
  }

  async function markInterested() {
    const me = getUserId();
    if (!me || !match || posting) return;
    setPosting(true);
    setPostError("");
    buzz();
    try {
      const result = await sendInterest(me, match.userId);
      if (match.isDemo) setDemoSocials(true);
      setMatch(
        result.match ?? {
          ...match,
          interested: true,
          mutual: result.mutual,
          socials: hasSocial(result.socials) ? result.socials : match.socials,
        },
      );
    } catch {
      setPostError("Couldn't save that. Try again.");
    } finally {
      setPosting(false);
    }
  }

  async function skip() {
    const me = getUserId();
    if (!me || !match || posting) return;
    setPosting(true);
    setPostError("");
    try {
      await sendSkip(me, match.userId);
      router.push("/matches");
    } catch {
      setPostError("Couldn't skip. Try again.");
      setPosting(false);
    }
  }

  const demoProfile = Boolean(match?.isDemo || demoSocials);
  const links = match && !demoProfile ? socialLinks(match.socials) : [];
  const suggested = match?.mutual ? match.suggestedShow : null;

  return (
    <GradientBackground>
      <main className="screen screen-nav flex min-h-dvh flex-col">
        <div>
          <BackLink href="/matches" label="Back to matches" />
        </div>

        {loading ? (
          <div aria-busy="true">
            <span className="sr-only">Loading match</span>
            <Skeleton className="h-56 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="p-5">
            <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t open this match.</p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && missing ? (
          <GlassCard className="p-5">
            <h1 className="font-display text-[36px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
              Not on your list
            </h1>
            <p className="mt-3 text-base leading-snug text-[var(--muted)]">
              That person isn&apos;t in your matches right now.
            </p>
            <div className="mt-5">
              <PrimaryButton href="/matches">Back to matches</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {match ? (
          <>
            <div className="mt-2">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-display min-w-0 text-[44px] font-normal leading-[0.98] tracking-tight text-[var(--foreground)]">
                  {match.name || match.handle}
                </h1>
                {match.isDemo ? (
                  <span className="pill mt-2 shrink-0 border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <span className="chip-label">demo</span>
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-normal text-[var(--muted)]">
                {[match.handle ? `@${match.handle}` : null, match.age != null ? String(match.age) : null, match.city]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <GlassCard className="mt-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold leading-snug text-[var(--foreground)]">
                  {sharedCount(match.sharedArtists.length)}
                </p>
                <span className="pill shrink-0 bg-[var(--foreground)] px-2.5 py-1 text-xs font-normal text-white">
                  <span className="chip-label">{match.label}</span>
                </span>
              </div>
              {match.sharedArtists.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {match.sharedArtists.map((artist) => (
                    <ArtistChip key={artistKey(artist)} name={artist.name} imageUrl={artist.imageUrl} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">{match.why}</p>
              )}
              {match.show ? (
                <Link
                  href={`/shows/${match.show.id}`}
                  className="mt-4 block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--foreground)]"
                >
                  <MatchShowRow show={match.show} />
                </Link>
              ) : null}
            </GlassCard>

            <Link
              href="/shows"
              className="mt-5 inline-flex min-h-11 items-center self-start text-base font-semibold text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4"
            >
              Shared shows
            </Link>

            {match.mutual ? (
              <GlassCard className="mt-5 p-5">
                <h2 className="text-[28px] font-normal leading-[1.05] tracking-tight text-[var(--foreground)]">
                  It&apos;s mutual
                </h2>
                {demoProfile ? (
                  <>
                    <p className="mt-2 text-base leading-snug text-[var(--muted)]">
                      Demo profile, so these are placeholders. A real match&apos;s socials open here.
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {["Instagram", "TikTok", "Snapchat"].map((label) => (
                        <li
                          key={label}
                          className="pill border border-dashed border-[var(--border)] px-3.5 py-2 text-sm font-normal text-[var(--muted)]"
                        >
                          <span className="chip-label">{label} · demo</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : links.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <PrimaryButton href={links[0].href}>Open {links[0].label}</PrimaryButton>
                    {links.slice(1).map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center text-base font-semibold text-[var(--foreground)]"
                      >
                        Open {link.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-base leading-snug text-[var(--muted)]">
                    They haven&apos;t added a social yet.
                  </p>
                )}
              </GlassCard>
            ) : null}

            {suggested ? (
              <GlassCard className="mt-4 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Go together
                </p>
                <h2 className="mt-2 text-[28px] font-normal leading-[1.05] tracking-tight text-[var(--foreground)]">
                  {suggested.artistName}
                </h2>
                <p className="mt-2 text-base font-normal text-[var(--muted)]">
                  {[suggested.venue, suggested.city].filter(Boolean).join(" · ") || "Venue TBA"}
                </p>
                <p className="mt-1 text-base font-normal text-[var(--muted)]">
                  {formatWhen(suggested.startsAt)}
                </p>
                {goingNote(suggested.going) ? (
                  <p className="mt-1 text-sm font-normal text-[var(--muted)]">
                    {goingNote(suggested.going)}
                  </p>
                ) : null}
                <div className="mt-4">
                  <PrimaryButton href={`/shows/${suggested.id}`}>See the show</PrimaryButton>
                </div>
              </GlassCard>
            ) : null}

            {demoProfile && !match.mutual ? (
              <p className="mt-4 text-base leading-snug text-[var(--muted)]">
                Demo profile. It taps interested back right away, and its socials are placeholders.
              </p>
            ) : null}

            <div className="mt-auto pt-8">
              {postError ? <p className="mb-3 text-sm text-[var(--muted)]">{postError}</p> : null}
              {!match.mutual && match.interested && !demoProfile ? (
                <p className="mb-3 text-base leading-snug text-[var(--muted)]">
                  You&apos;re interested. Their social unlocks when they tap too.
                </p>
              ) : null}
              <MatchActions
                interested={match.interested}
                mutual={match.mutual}
                busy={posting}
                onInterested={markInterested}
                onSkip={skip}
              />
            </div>
          </>
        ) : null}
      </main>
    </GradientBackground>
  );
}
