"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  createdUserId,
  fetchJson,
  getDraft,
  setDraft,
  setUserId,
  userPayload,
  type Draft,
} from "@/lib/client";

export default function SocialsPage() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const draft = getDraft();
    setInstagram(draft.instagram);
    setTiktok(draft.tiktok);
    setSnapchat(draft.snapchat);
  }, []);

  async function submit(skip: boolean) {
    if (busy) return;
    const draft = getDraft();
    if (!draft.handle.trim()) {
      setError("Add a handle first.");
      router.push("/about");
      return;
    }
    if (draft.artists.length < 1) {
      setError("Pick at least one artist first.");
      router.push("/pick");
      return;
    }

    const next: Draft = {
      ...draft,
      instagram: skip ? "" : instagram.trim(),
      tiktok: skip ? "" : tiktok.trim(),
      snapchat: skip ? "" : snapchat.trim(),
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
      if (!id) {
        setError("We saved nothing useful. Try again.");
        setBusy(false);
        return;
      }
      setUserId(id);
      router.push("/finding");
    } catch {
      setError("Couldn't create your profile. Try again.");
      setBusy(false);
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/about" />
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-tight text-[var(--foreground)]">
          Socials
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Optional. Shared only after you both tap interested.
        </p>

        <SocialField id="instagram" label="Instagram" value={instagram} onChange={setInstagram} />
        <SocialField id="tiktok" label="TikTok" value={tiktok} onChange={setTiktok} />
        <SocialField id="snapchat" label="Snapchat" value={snapchat} onChange={setSnapchat} />

        {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

        <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 pt-8">
          <PrimaryButton onClick={() => submit(false)} disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={busy}
            className="min-h-11 w-full text-base font-normal text-[var(--muted)] disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>
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
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="@you"
        autoCapitalize="none"
        autoCorrect="off"
        className="field mt-2 min-h-12 w-full px-4 text-base font-normal outline-none placeholder:text-[var(--muted)]"
      />
    </>
  );
}
