"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { completeGoogleSignIn, onboardingHref } from "@/lib/client";

/** Google sends people back here after they approve sign-in. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  // Strict mode runs effects twice in dev; the sign-in code in the URL only works once
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeGoogleSignIn()
      .then((result) => router.replace(result === "existing" ? "/matches" : onboardingHref()))
      .catch((err: unknown) => {
        console.error("Google sign-in failed", err);
        const detail = err instanceof Error ? err.message.trim() : "";
        // Keep the friendly headline; surface a short actionable detail when we have one.
        setError(
          detail && detail !== "request failed"
            ? detail
            : "Google sign-in didn’t finish. Try again.",
        );
      });
  }, [router]);

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          {error ? "Sign-in failed" : "Signing you in"}
        </h1>
        <p className="mt-3 text-base font-normal leading-snug text-[var(--muted)]" role={error ? "alert" : "status"}>
          {error || "One moment…"}
        </p>
        {error ? (
          <div className="sticky bottom-0 z-20 mt-auto pt-8">
            <PrimaryButton href="/">Back to start</PrimaryButton>
          </div>
        ) : null}
      </main>
    </GradientBackground>
  );
}
