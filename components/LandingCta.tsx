"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase falls back to the Site URL (this page) when the sign-in return address isn't on
    // its Redirect URLs list. Hand the Google code to the callback instead of dropping it here.
    const params = new URLSearchParams(window.location.search);
    if (params.has("code") || params.has("error_description")) {
      router.replace(`/auth/callback${window.location.search}`);
      return;
    }

    const userId = getUserId();

    // Leaving onboarding for home should not resume a later step.
    if (!userId) {
      clearDraft();
      sessionStorage.removeItem("resonate_dev_otp");
    }

    setLoggedIn(Boolean(userId));
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div
        className="font-sans inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-6 opacity-40"
        aria-hidden
      />
    );
  }

  // Signed in: carry on to the app. A stale saved session gets a 401 there, which clears it
  // and brings the person back here to sign in (fetchJson). Linking to /logout signed people
  // out right after a successful Google sign-in that happened to land on this page.
  if (loggedIn) {
    return <PrimaryButton href="/matches">Continue</PrimaryButton>;
  }

  return <GoogleSignInButton variant="primary" />;
}
