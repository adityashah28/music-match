"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArtistChip } from "@/components/ArtistChip";
import { GlassCard } from "@/components/GlassCard";
import { GradientBackground } from "@/components/GradientBackground";
import { MatchCard } from "@/components/MatchCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import {
  fetchJson,
  getDraft,
  getUserId,
  hasSocial,
  normalizeCrowd,
  normalizeMatches,
  normalizeProfile,
  sendInterest,
  sendSkip,
  type CrowdSnapshot,
  type MatchPerson,
} from "@/lib/client";

type Tab = "new" | "pending" | "matched";

const TABS: { id: Tab; label: string }[] = [
  { id: "new", label: "New" },
  { id: "pending", label: "Pending" },
  { id: "matched", label: "Matched" },
];

function tabOf(match: MatchPerson): Tab {
  if (match.mutual) return "matched";
  return match.interested ? "pending" : "new";
}

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [early, setEarly] = useState(false);
  const [matches, setMatches] = useState<MatchPerson[]>([]);
  const [crowd, setCrowd] = useState<CrowdSnapshot | null>(null);
  const [needsSocial, setNeedsSocial] = useState(false);
  const [reload, setReload] = useState(0);
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");
  const [skipped, setSkipped] = useState<{ match: MatchPerson; index: number } | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  // Where the last Interested / Undo sent someone, so the card vanishing from this tab isn't a mystery.
  const [moved, setMoved] = useState<{ name: string; to: Tab } | null>(null);

  const counts = { new: 0, pending: 0, matched: 0 };
  for (const match of matches) counts[tabOf(match)] += 1;
  const shown = matches.filter((match) => tabOf(match) === tab);

  function showTab(next: Tab) {
    setTab(next);
    setMoved(null);
    setSkipped(null);
    setActionError("");
  }

  async function toggleInterest(match: MatchPerson) {
    const me = getUserId();
    if (!me || busyId) return;
    const withdrawing = match.interested;
    setBusyId(match.userId);
    setActionError("");
    setSkipped(null);
    try {
      const result = await sendInterest(me, match.userId);
      const next =
        result.match ??
        (withdrawing
          ? { ...match, interested: false, mutual: false }
          : { ...match, interested: true, mutual: result.mutual });
      setMatches((current) => current.map((item) => (item.userId === match.userId ? next : item)));
      setMoved({ name: match.name || match.handle, to: tabOf(next) });
    } catch {
      setActionError(withdrawing ? "Couldn't undo. Try again." : "Couldn't save that. Try again.");
    } finally {
      setBusyId("");
    }
  }

  async function skip(match: MatchPerson) {
    const me = getUserId();
    if (!me || busyId) return;
    const index = matches.findIndex((item) => item.userId === match.userId);
    setBusyId(match.userId);
    setActionError("");
    setMoved(null);
    setMatches((current) => current.filter((item) => item.userId !== match.userId));
    setSkipped({ match: { ...match, interested: false, mutual: false }, index });
    try {
      await sendSkip(me, match.userId);
    } catch {
      setMatches((current) => {
        const next = [...current];
        next.splice(Math.max(0, index), 0, match);
        return next;
      });
      setSkipped(null);
      setActionError("Couldn't skip. Try again.");
    } finally {
      setBusyId("");
    }
  }

  async function undoSkip() {
    const me = getUserId();
    if (!me || !skipped || busyId) return;
    const { match, index } = skipped;
    setBusyId(match.userId);
    setActionError("");
    try {
      await sendSkip(me, match.userId, false);
      setMatches((current) => {
        const next = [...current];
        next.splice(Math.max(0, Math.min(index, next.length)), 0, match);
        return next;
      });
      setSkipped(null);
    } catch {
      setActionError("Couldn't undo. Try again.");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      fetchJson(`/api/users/${id}/matches`),
      fetchJson(`/api/users/${id}`).catch(() => null),
      fetchJson("/api/crowd").catch(() => null),
    ])
      .then(([matchesData, userData, crowdData]) => {
        if (cancelled) return;
        const parsed = normalizeMatches(matchesData);
        setEarly(parsed.early);
        setMatches(parsed.matches);
        setCrowd(crowdData ? normalizeCrowd(crowdData) : null);
        if (userData) {
          const profile = normalizeProfile(userData, id);
          setNeedsSocial(profile ? !hasSocial(profile.socials) : false);
        } else {
          setNeedsSocial(!hasSocial(getDraft()));
        }
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
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Matches
        </h1>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3" aria-busy="true">
            <span className="sr-only">Loading matches</span>
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : null}

        {!loading && error ? (
          <GlassCard className="mt-6 p-5">
            <p className="text-base leading-snug text-[var(--muted)]">
              We couldn&apos;t load matches.
            </p>
            <div className="mt-5">
              <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {!loading && !error ? (
          <div className="mt-6 flex flex-col gap-4">
            <div
              role="group"
              aria-label="Filter matches by status"
              className="grid grid-cols-3 gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
            >
              {TABS.map((option) => {
                const selected = tab === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => showTab(option.id)}
                    className={`font-sans inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-normal leading-none transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
                      selected
                        ? "bg-[var(--foreground)] text-[var(--on-foreground)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                    }`}
                  >
                    <span className="btn-label">
                      {option.label}
                      <span className={`ml-1.5 tabular-nums ${selected ? "opacity-70" : "text-[var(--muted)]"}`}>
                        {counts[option.id]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {needsSocial ? (
              <GlassCard className="p-4">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  Add a social so matches can contact you after mutual interest.
                </p>
                <Link
                  href="/me"
                  className="mt-2 inline-flex min-h-11 items-center text-base font-semibold text-[var(--foreground)]"
                >
                  Add on Profile
                </Link>
              </GlassCard>
            ) : null}

            {tab === "new" && early && counts.new > 0 ? (
              <p className="text-base leading-snug text-[var(--muted)]">
                Early days — closest match so far:
              </p>
            ) : null}

            {tab === "new" && early && matches.length === 0 ? (
              <GlassCard className="p-5">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  No matches yet. Check back as more people join.
                </p>
                <CrowdPulse crowd={crowd} />
              </GlassCard>
            ) : null}

            {tab === "new" && !early && matches.length === 0 ? (
              <GlassCard className="p-5">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  No matches yet. Add another artist to widen your taste.
                </p>
                <CrowdPulse crowd={crowd} />
                <div className="mt-5">
                  <PrimaryButton href="/me">Edit artists</PrimaryButton>
                </div>
              </GlassCard>
            ) : null}

            {skipped && tab === "new" ? (
              <Notice
                text={`Skipped ${skipped.match.name || skipped.match.handle}. They won't be told.`}
                actionLabel="Undo"
                onAction={undoSkip}
                disabled={Boolean(busyId)}
              />
            ) : null}

            {moved && moved.to !== tab ? (
              <Notice
                text={
                  moved.to === "matched"
                    ? `It's mutual with ${moved.name}.`
                    : moved.to === "pending"
                      ? `${moved.name} is in Pending until they tap back.`
                      : `Took back your interest in ${moved.name}.`
                }
                actionLabel={moved.to === "matched" ? "See match" : "View"}
                onAction={() => showTab(moved.to)}
              />
            ) : null}

            {actionError ? <p className="text-sm text-[var(--muted)]">{actionError}</p> : null}

            {tab === "new" && matches.length > 0 && counts.new === 0 ? (
              <GlassCard className="p-5">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  You&apos;re all caught up. New people show up here as they join.
                </p>
              </GlassCard>
            ) : null}

            {tab === "pending" && counts.pending === 0 ? (
              <GlassCard className="p-5">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  Nobody pending. Tap I&apos;m interested on someone in New and they&apos;ll wait here
                  until they tap back.
                </p>
              </GlassCard>
            ) : null}

            {tab === "matched" && counts.matched === 0 ? (
              <GlassCard className="p-5">
                <p className="text-base font-normal leading-snug text-[var(--muted)]">
                  No mutual matches yet. When someone you&apos;re interested in taps back, you&apos;ll
                  both land here and can swap socials.
                </p>
                {counts.new > 0 ? (
                  <div className="mt-4">
                    <PrimaryButton size="compact" onClick={() => showTab("new")}>
                      Review new matches
                    </PrimaryButton>
                  </div>
                ) : null}
              </GlassCard>
            ) : null}

            {shown.map((match) => (
              <MatchCard
                key={match.userId}
                match={match}
                href={`/matches/${match.userId}`}
                busy={busyId === match.userId}
                onInterested={() => toggleInterest(match)}
                onSkip={() => skip(match)}
                onWithdraw={() => toggleInterest(match)}
              />
            ))}
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}

function Notice({
  text,
  actionLabel,
  onAction,
  disabled,
}: {
  text: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="status"
      className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-5 pr-1.5"
    >
      <p className="min-w-0 truncate text-sm font-normal text-[var(--muted)]">{text}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="font-sans inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-full px-4 text-center text-sm font-semibold leading-none text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40"
      >
        <span className="btn-label">{actionLabel}</span>
      </button>
    </div>
  );
}

function CrowdPulse({ crowd }: { crowd: CrowdSnapshot | null }) {
  if (!crowd) return null;

  const joinedLine =
    crowd.joined === undefined
      ? null
      : crowd.joined === 1
        ? "1 person has joined."
        : `${crowd.joined} people have joined.`;

  return (
    <div className="mt-4">
      {joinedLine ? <p className="text-base leading-snug text-[var(--muted)]">{joinedLine}</p> : null}
      {crowd.topArtists.length > 0 ? (
        <>
          <p className="mt-3 text-sm font-normal leading-snug text-[var(--muted)]">
            People here mostly listen to
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {crowd.topArtists.slice(0, 5).map((artist) => (
              <ArtistChip key={artist.name} name={artist.name} imageUrl={artist.imageUrl} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
