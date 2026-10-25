"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  createdUserId,
  createdUserToken,
  type Draft,
  fetchJson,
  getDraft,
  getUserId,
  isVerified,
  normalizeSocialHandle,
  setDraft,
  setUserId,
  setUserToken,
  userPayload,
} from "@/lib/client";

export default function SocialsPage() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getUserId()) {
      router.replace("/matches");
      return;
    }
    const draft = getDraft();
    if (!isVerified(draft)) {
      router.replace("/");
      return;
    }
    if (draft.artists.length < 1) {
      router.replace("/pick");
      return;
    }
    setInstagram(normalizeSocialHandle(draft.instagram));
    setTiktok(normalizeSocialHandle(draft.tiktok));
    setSnapchat(normalizeSocialHandle(draft.snapchat));
  }, [router]);

  async function submit(skip: boolean) {
    if (busy) return;
    const draft = getDraft();
    if (!isVerified(draft)) {
      setError("Sign in first.");
      router.push("/");
      return;
    }
    if (!draft.name.trim() || !draft.handle.trim() || !draft.city.trim()) {
      setError("Add your name, handle, and city first.");
      router.push("/about");
      return;
    }
    if (draft.age == null) {
      setError("Add your age first.");
      router.push("/age");
      return;
    }
    if (draft.artists.length < 1) {
      setError("Pick at least one artist first.");
      router.push("/pick");
      return;
    }

    const next: Draft = {
      ...draft,
      instagram: skip ? "" : normalizeSocialHandle(instagram),
      tiktok: skip ? "" : normalizeSocialHandle(tiktok),
      snapchat: skip ? "" : normalizeSocialHandle(snapchat),
    };
    setDraft(next);
    setBusy(true);
    setError("");

    try {
      const data = await fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPayload(next)),
      });
      const id = createdUserId(data);
      const token = createdUserToken(data);
      if (!id || !token) {
        setError("We saved nothing useful. Try again.");
        setBusy(false);
        return;
      }
      setUserId(id);
      setUserToken(token);
      router.push("/finding");
    } catch {
      setError("Couldn't create your profile. Try again.");
      setBusy(false);
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/pick" />
        <OnboardingProgress step="socials" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Socials
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Optional. Shared only after you both tap interested.
        </p>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submit(false);
          }}
        >
          <SocialField id="instagram" label="Instagram" value={instagram} onChange={setInstagram} />
          <SocialField id="tiktok" label="TikTok" value={tiktok} onChange={setTiktok} />
          <SocialField id="snapchat" label="Snapchat" value={snapchat} onChange={setSnapchat} />

          {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

          <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 pt-8">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create profile"}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={busy}
              className="font-sans inline-flex min-h-11 w-full cursor-pointer items-center justify-center text-center text-base font-normal leading-none text-[var(--muted)] transition duration-200 ease-out hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40"
            >
              <span className="btn-label">Skip for now</span>
            </button>
          </div>
        </form>
      </main>
    </GradientBackground>
  );
}

function SocialField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor={id}>
        {label}
      </label>
      <div className="field mt-2 flex min-h-12 w-full items-center pl-5 pr-4">
        <span className="field-prefix text-base font-normal text-[var(--muted)]" aria-hidden="true">
          {"@"}
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(normalizeSocialHandle(event.target.value))}
          onBlur={() => onChange(normalizeSocialHandle(value))}
          placeholder="you"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 w-auto text-base font-normal placeholder:text-[var(--muted)]"
        />
      </div>
    </>
  );
}
