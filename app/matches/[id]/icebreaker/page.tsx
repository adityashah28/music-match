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
    if (!me || !match || sendingPrompt || sendingCustom) return;
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

  const rounds = match?.icebreaker?.rounds ?? [];
  // One open prompt per pair at a time: once either side asks, nobody can ask again until
  // the recipient answers it.
  const openRound = rounds.length > 0 && !rounds[rounds.length - 1].reply ? rounds[rounds.length - 1] : null;
  const canSendNew = !openRound;
  const canReply = Boolean(openRound) && !openRound!.promptFromMe;

  async function sendText() {
    const me = getUserId();
    const text = customReply.trim();
    if (!me || !match || sendingCustom || sendingPrompt || !text) return;
    if (!canSendNew && !canReply) return;
    setSendingCustom(true);
    setPostError("");
    buzz();
    try {
      // Empty promptId: store opens a custom ask (no open round) or replies (open round).
      const icebreaker = await sendIcebreaker(me, match.userId, "", text);
      setMatch({ ...match, icebreaker });
      setCustomReply("");
    } catch {
      setPostError("Couldn't send that. Try again.");
    } finally {
      setSendingCustom(false);
    }
  }

  const bubbleClass = (mine: boolean) =>
    `inline-flex max-w-[85%] items-center rounded-[var(--radius)] px-4 py-2.5 text-base leading-snug ${
      mine
        ? "bg-[var(--foreground)] text-[var(--on-foreground)]"
        : "border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]"
    }`;

  return (
    <GradientBackground>
      <main className="screen flex h-dvh flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-[1fr_minmax(0,max-content)_1fr] items-center gap-3 border-b border-[var(--border)] py-3">
          <BackLink
            href={matchId ? `/matches/${encodeURIComponent(matchId)}` : "/matches"}
            label="Back"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 justify-self-start text-sm font-normal leading-none text-[var(--muted)] transition duration-200 ease-out hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
          />
          {match ? (
            <h1 className="font-sans min-w-0 truncate text-center text-lg font-semibold leading-tight pb-0.5 text-[var(--foreground)]">
              <span className="btn-label">{match.handle}</span>
            </h1>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
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
                  Nothing yet — pick a prompt or ask something below.
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
                    <p className={bubbleClass(round.promptFromMe)}>
                      <span className="inline-block translate-y-[var(--btn-label-nudge)] leading-snug">
                        {round.promptText}
                      </span>
                    </p>
                  </div>
                  {round.reply ? (
                    <div className={`flex ${round.reply.fromMe ? "justify-end" : "justify-start"}`}>
                      <p className={bubbleClass(round.reply.fromMe)}>
                        <span className="inline-block translate-y-[var(--btn-label-nudge)] leading-snug">
                          {round.reply.text}
                        </span>
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
            className="shrink-0 border-t border-[var(--border)] py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {postError ? <p className="mb-2 text-sm text-[var(--muted)]">{postError}</p> : null}

            {canSendNew || canReply ? (
              <div className="flex flex-col gap-2">
                {canSendNew ? (
                  <>
                    <p className="text-sm font-normal text-[var(--muted)]">
                      {rounds.length > 0 ? "Ask another" : "Pick a prompt or type your own"}
                    </p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {icebreakerPrompts(match.sharedArtists[0]?.name ?? null).map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => sendPrompt(prompt.id)}
                          disabled={Boolean(sendingPrompt) || sendingCustom}
                          className="font-sans inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left text-sm font-normal leading-none whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-60"
                        >
                          <span className="btn-label">
                            {sendingPrompt === prompt.id ? "Sending…" : prompt.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-normal text-[var(--muted)]">Answer their question</p>
                )}
                <div className="field flex min-h-12 w-full items-center px-4">
                  <input
                    value={customReply}
                    onChange={(event) => setCustomReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendText();
                      }
                    }}
                    placeholder={canSendNew ? "Ask something…" : "Say something…"}
                    maxLength={240}
                    disabled={sendingCustom || Boolean(sendingPrompt)}
                    className="field-control w-full text-base font-normal placeholder:text-[var(--muted)] disabled:opacity-60"
                  />
                </div>
                <PrimaryButton
                  onClick={sendText}
                  disabled={sendingCustom || Boolean(sendingPrompt) || !customReply.trim()}
                >
                  {sendingCustom ? "Sending…" : "Send"}
                </PrimaryButton>
              </div>
            ) : (
              <p className="text-sm font-normal text-[var(--muted)]">Waiting for them to reply…</p>
            )}
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}
