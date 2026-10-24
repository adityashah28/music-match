"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { OtpInput } from "@/components/OtpInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  clearDraft,
  fetchJson,
  getDraft,
  getUserId,
  onboardingHref,
  setDraft,
  setUserId,
} from "@/lib/client";
import { formatPhoneDisplay } from "@/lib/phone";

const RESEND_SECONDS = 30;

export default function VerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (getUserId()) {
      router.replace("/matches");
      return;
    }
    const draft = getDraft();
    if (!draft.phone) {
      router.replace("/phone");
      return;
    }
    if (draft.phoneVerified) {
      router.replace(onboardingHref(draft));
      return;
    }
    setPhone(draft.phone);
    const dev = sessionStorage.getItem("resonate_dev_otp");
    if (dev) setHint(`Dev code: ${dev}`);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function continueNext() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await fetchJson("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!row?.ok) {
        setError("Incorrect code. Please try again.");
        setBusy(false);
        return;
      }

      const user =
        row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
      const userId = typeof user?.id === "string" ? user.id : null;

      if (row.isNew === false && userId) {
        setUserId(userId);
        clearDraft();
        sessionStorage.removeItem("resonate_dev_otp");
        router.push("/matches");
        return;
      }

      const draft = getDraft();
      setDraft({
        ...draft,
        phone: typeof row.phone === "string" ? row.phone : draft.phone,
        phoneVerified: true,
      });
      sessionStorage.removeItem("resonate_dev_otp");
      router.push("/about");
    } catch {
      setError("Incorrect code. Please try again.");
      setBusy(false);
    }
  }

  async function resendCode() {
    if (resending || cooldown > 0 || !phone) return;
    setResending(true);
    setError("");
    try {
      const data = await fetchJson("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!row?.ok) {
        setError("Couldn’t resend. Try again.");
        setResending(false);
        return;
      }
      if (typeof row.devCode === "string") {
        sessionStorage.setItem("resonate_dev_otp", row.devCode);
        setHint(`Dev code: ${row.devCode}`);
      } else {
        sessionStorage.removeItem("resonate_dev_otp");
        setHint("");
      }
      setCode("");
      setCooldown(RESEND_SECONDS);
      setResending(false);
    } catch {
      setError("Couldn’t resend. Try again.");
      setResending(false);
    }
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/phone" />
        <OnboardingProgress step="verify" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Enter the code
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          Sent to {phone ? formatPhoneDisplay(phone) : "your phone"}.
        </p>

        <p className="mt-8 text-sm font-normal text-[var(--muted)]" id="code-label">
          6-digit code
        </p>
        <div className="mt-2">
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (error) setError("");
            }}
            disabled={busy}
            autoFocus
            aria-labelledby="code-label"
            aria-describedby={error ? "code-error" : undefined}
          />
        </div>

        <p className="mt-4 text-sm font-normal text-[var(--muted)]">
          {cooldown > 0 ? (
            <>Resend in {cooldown}s</>
          ) : (
            <button
              type="button"
              onClick={resendCode}
              disabled={resending}
              className="text-[var(--muted)] underline decoration-[var(--border)] underline-offset-2 transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </p>

        {hint ? <p className="mt-3 text-sm font-normal text-[var(--muted)]">{hint}</p> : null}
        {error ? (
          <p id="code-error" className="mt-3 text-sm font-normal text-[var(--muted)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 z-20 mt-auto pt-8">
          <PrimaryButton onClick={continueNext} disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Continue"}
          </PrimaryButton>
        </div>
      </main>
    </GradientBackground>
  );
}
