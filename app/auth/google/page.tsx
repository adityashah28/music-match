"use client";

import { useEffect, useState } from "react";
import { GradientBackground } from "@/components/GradientBackground";
import { PrimaryButton } from "@/components/PrimaryButton";
import { startGoogleSignIn } from "@/lib/client";

/** Link any "Continue with Google" button here: it sends the person to Google's sign-in page. */
export default function GoogleSignInPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    startGoogleSignIn().catch((err: unknown) => {
      console.error("Couldn't start Google sign-in", err);
      setError("Google sign-in isn’t available right now. Try again in a moment.");
    });
  }, []);

  return (
    <GradientBackground>
      <main className="screen screen-end flex min-h-dvh flex-col">
        <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tight text-[var(--foreground)]">
          {error ? "Sign-in failed" : "Opening Google"}
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
