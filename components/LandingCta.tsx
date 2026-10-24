"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { clearDraft, getUserId } from "@/lib/client";

/**
 * Primary auth is Google. Phone OTP pages remain at /phone and /verify but
 * are not linked from landing — kept for SMS-credit / internal testing.
 * Returning home abandons any mid-draft so Continue with Google starts clean.
 */
export function LandingCta() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = getUserId();

    // Leaving onboarding for home should not resume a later step.
    if (!userId) {
      clearDraft();
      sessionStorage.removeItem("resonate_dev_otp");
    }

    setLoggedIn(Boolean(userId));
    setReady(true);
  }, [pathname]);

  if (!ready) {
    return (
      <div
        className="font-sans inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-6 opacity-40"
        aria-hidden
      />
    );
  }

  // Old localStorage session would skip sign-in — clear it first.
  if (loggedIn) {
    return <PrimaryButton href="/logout">Get started</PrimaryButton>;
  }

  return <GoogleSignInButton variant="primary" />;
}
