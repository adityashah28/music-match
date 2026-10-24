"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import {
  fetchJson,
  getUserId,
  normalizeMatches,
  sendIcebreaker,
  type MatchPerson,
} from "@/lib/client";
import { icebreakerPrompts } from "@/lib/icebreakers";

export default function IcebreakerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = typeof params?.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [missing, setMissing] = useState(false);
  const [match, setMatch] = useState<MatchPerson | null>(null);
  const [reload, setReload] = useState(0);
  const [postError, setPostError] = useState("");
  const [sendingPrompt, setSendingPrompt] = useState("");
  const [customReply, setCustomReply] = useState("");
  const [sendingCustom, setSendingCustom] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        if (!found || !found.mutual) {
          setMissing(true);
          return;
        }
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [match?.icebreaker]);

  function buzz() {
    try {
      navigator.vibrate?.(12);
    } catch {
      /* haptics are optional */
    }
  }

  async function sendPrompt(promptId: string) {
    const me = getUserId();
    if (!me || !match || sendingPrompt) return;
    setSendingPrompt(promptId);
    setPostError("");
    buzz();
    try {
      const icebreaker = await sendIcebreaker(me, match.userId, promptId);
      setMatch({ ...match, icebreaker });
    } catch {
      setPostError("Couldn't send that. Try again.");
    } finally {
      setSendingPrompt("");
    }
  }

  async function sendCustomReply() {
    const me = getUserId();
    const text = customReply.trim();
    if (!me || !match || sendingCustom || !text) return;
    setSendingCustom(true);
    setPostError("");
    buzz();
    try {
      const icebreaker = await sendIcebreaker(me, match.userId, "", text);
      setMatch({ ...match, icebreaker });
      setCustomReply("");
    } catch {
      setPostError("Couldn't send that. Try again.");
    } finally {
      setSendingCustom(false);
    }
  }

  const rounds = match?.icebreaker?.rounds ?? [];
  // One open prompt per pair at a time: once either side asks, nobody can ask again until
  // the recipient answers it.
  const openRound = rounds.length > 0 && !rounds[rounds.length - 1].reply ? rounds[rounds.length - 1] : null;
  const canSendNew = !openRound;
  const canReply = Boolean(openRound) && !openRound!.promptFromMe;

  return (
    <GradientBackground>
      <main className="flex h-dvh flex-col overflow-hidden">
        <div
          className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-4"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
        >
          <BackLink href={matchId ? `/matches/${encodeURIComponent(matchId)}` : "/matches"} label="Back" />
          {match ? (
            <h1 className="min-w-0 truncate text-lg font-semibold text-[var(--foreground)]">
              {match.handle}
            </h1>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div aria-busy="true" className="flex flex-col gap-2">
              <span className="sr-only">Loading icebreaker</span>
              <Skeleton className="h-14 w-3/4" />
              <Skeleton className="ml-auto h-14 w-3/4" />
            </div>
          ) : null}

          {!loading && error ? (
            <GlassCard className="p-5">
              <p className="text-base leading-snug text-[var(--muted)]">We couldn&apos;t open this.</p>
              <div className="mt-5">
                <PrimaryButton onClick={() => setReload((value) => value + 1)}>Try again</PrimaryButton>
              </div>
            </GlassCard>
          ) : null}

          {!loading && missing ? (
            <GlassCard className="p-5">
              <h2 className="font-display text-[28px] font-normal leading-[1.05] tracking-tight text-[var(--foreground)]">
                Not available
              </h2>
              <p className="mt-3 text-base leading-snug text-[var(--muted)]">
                This opens once you&apos;re both interested in each other.
              </p>
              <div className="mt-5">
                <PrimaryButton href="/matches">Back to matches</PrimaryButton>
              </div>
            </GlassCard>
          ) : null}

          {match ? (
            <div className="flex flex-col gap-2">
              {rounds.length === 0 ? (
                <p className="text-base leading-snug text-[var(--muted)]">
                  Nothing yet — pick a prompt below to break the ice.
                </p>
              ) : null}
              {rounds.map((round) => (
                <div key={round.id} className="flex flex-col gap-1">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] ${
                      round.promptFromMe ? "text-right" : "text-left"
                    }`}
                  >
                    {round.promptFromMe ? "You asked" : "They asked"}
                  </p>
                  <div className={`flex ${round.promptFromMe ? "justify-end" : "justify-start"}`}>
                    <p
                      className={`max-w-[85%] rounded-[var(--radius)] px-4 py-2.5 text-base leading-snug ${
                        round.promptFromMe
                          ? "bg-[var(--foreground)] text-white"
                          : "border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]"
                      }`}
                    >
                      {round.promptText}
                    </p>
                  </div>
                  {round.reply ? (
                    <div className={`flex ${round.reply.fromMe ? "justify-end" : "justify-start"}`}>
                      <p
                        className={`max-w-[85%] rounded-[var(--radius)] px-4 py-2.5 text-base leading-snug ${
                          round.reply.fromMe
                            ? "bg-[var(--foreground)] text-white"
                            : "border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]"
                        }`}
                      >
                        {round.reply.text}
                      </p>
                    </div>
                  ) : (
                    <p
                      className={`text-sm font-normal text-[var(--muted)] ${
                        round.promptFromMe ? "text-right" : "text-left"
                      }`}
                    >
                      Waiting for a reply…
                    </p>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          ) : null}
        </div>

        {match ? (
          <div
            className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] px-4 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {postError ? <p className="mb-2 text-sm text-[var(--muted)]">{postError}</p> : null}
            {canSendNew ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-normal text-[var(--muted)]">
                  {rounds.length > 0 ? "Ask another" : "Pick a prompt to break the ice"}
                </p>
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                  {icebreakerPrompts(match.sharedArtists[0]?.name ?? null).map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => sendPrompt(prompt.id)}
                      disabled={Boolean(sendingPrompt)}
                      className="flex min-h-14 w-full items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left font-sans text-base font-normal text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {sendingPrompt === prompt.id ? "Sending…" : prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {canReply ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-normal text-[var(--muted)]">Answer their question</p>
                <input
                  value={customReply}
                  onChange={(event) => setCustomReply(event.target.value)}
                  placeholder="Say something…"
                  maxLength={240}
                  disabled={sendingCustom}
                  className="field min-h-12 w-full px-4 text-base font-normal outline-none placeholder:text-[var(--muted)] disabled:opacity-60"
                />
                <PrimaryButton onClick={sendCustomReply} disabled={sendingCustom || !customReply.trim()}>
                  {sendingCustom ? "Sending…" : "Send"}
                </PrimaryButton>
              </div>
            ) : null}

            {!canSendNew && !canReply ? (
              <p className="text-sm font-normal text-[var(--muted)]">Waiting for them to reply…</p>
            ) : null}
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}
