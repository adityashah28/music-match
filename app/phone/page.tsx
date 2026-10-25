"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GradientBackground } from "@/components/GradientBackground";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PrimaryButton } from "@/components/PrimaryButton";
import { fetchJson, getDraft, getUserId, setDraft } from "@/lib/client";
import {
  composeE164,
  DEFAULT_DIAL_CODE,
  DIAL_CODES,
  type DialCode,
  splitE164,
} from "@/lib/phone";

/**
 * Phone OTP signup/login — kept for SMS-credit / internal testing.
 * Not linked from LandingCta or SiteHeader; open /phone directly to use.
 */
export default function PhonePage() {
  const router = useRouter();
  const [dialCode, setDialCode] = useState<DialCode>(DEFAULT_DIAL_CODE);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existingSession, setExistingSession] = useState(false);

  useEffect(() => {
    if (getUserId()) {
      setExistingSession(true);
      return;
    }
    const draft = getDraft();
    // Allow returning here from Verify — don't bounce forward when already verified.
    if (draft.phone) {
      const parts = splitE164(draft.phone);
      setDialCode(parts.dialCode);
      setPhone(parts.national);
    }
  }, [router]);

  async function continueNext() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const composed = composeE164(dialCode, phone);
      if (!composed) {
        setError("Couldn’t send a code. Check the number.");
        setBusy(false);
        return;
      }
      const data = await fetchJson("/api/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: composed }),
      });
      const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      const normalized = typeof row?.phone === "string" ? row.phone : "";
      if (!normalized) {
        setError("Couldn’t send a code. Check the number.");
        setBusy(false);
        return;
      }
      const draft = getDraft();
      setDraft({ ...draft, phone: normalized, phoneVerified: false });
      if (typeof row?.devCode === "string") {
        sessionStorage.setItem("resonate_dev_otp", row.devCode);
      } else {
        sessionStorage.removeItem("resonate_dev_otp");
      }
      router.push("/verify");
    } catch {
      setError("Couldn’t send a code. Try again.");
      setBusy(false);
    }
  }

  function onPhoneKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (busy || !phone.trim()) return;
    void continueNext();
  }

  if (existingSession) {
    return (
      <GradientBackground>
        <main className="screen screen-end flex min-h-dvh flex-col">
          <BackLink href="/" />
          <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
            You’re signed in
          </h1>
          <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
            Continue into the app, or sign out to use a phone number.
          </p>
          <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 pt-8">
            <PrimaryButton href="/matches">Go to matches</PrimaryButton>
            <PrimaryButton href="/logout">Continue with phone</PrimaryButton>
          </div>
        </main>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <BackLink href="/" />
        <OnboardingProgress step="phone" />
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          Your number
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]">
          We’ll text a code. Same number logs you back in later.
        </p>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void continueNext();
          }}
        >
          <p className="mt-8 text-sm font-normal text-[var(--muted)]" id="phone-label">
            Phone
          </p>
          <div className="mt-2 flex w-full items-stretch gap-2">
            <label
              className="field flex h-12 shrink-0 items-center px-3 sm:px-4"
              htmlFor="dial-code"
            >
              <span className="sr-only">Country code</span>
              <select
                id="dial-code"
                value={dialCode}
                onChange={(event) => setDialCode(event.target.value as DialCode)}
                className="field-control w-[4.75rem] cursor-pointer text-base font-normal text-[var(--foreground)]"
                aria-label="Country code"
              >
                {DIAL_CODES.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="field flex h-12 min-w-0 flex-1 items-center px-4"
              htmlFor="phone"
              aria-labelledby="phone-label"
            >
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={onPhoneKeyDown}
                placeholder={dialCode === "+1" ? "(415) 555-0100" : "Phone number"}
                className="field-control text-base font-normal text-[var(--foreground)] placeholder:text-[var(--muted)]"
              />
            </label>
          </div>

          {error ? <p className="mt-4 text-sm font-normal text-[var(--muted)]">{error}</p> : null}

          <div className="sticky bottom-0 z-20 mt-auto pt-8">
            <PrimaryButton type="submit" disabled={busy || !phone.trim()}>
              {busy ? "Sending…" : "Text me a code"}
            </PrimaryButton>
          </div>
        </form>
      </main>
    </GradientBackground>
  );
}
