"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { startGoogleSignIn } from "@/lib/client";
import { isInAppBrowser, preferredExternalBrowser } from "@/lib/inAppBrowser";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";

const primaryClass =
  "font-sans inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[var(--foreground)] px-6 text-center text-base font-normal leading-none text-[var(--on-foreground)] transition duration-200 ease-out hover:bg-[var(--foreground-hover)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

const headerClass =
  "font-sans inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 text-center text-sm font-normal leading-none text-[var(--on-foreground)] transition duration-200 ease-out hover:bg-[var(--foreground-hover)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

type Props = {
  /** Visual size — landing uses full-width primary; header uses compact. */
  variant?: "primary" | "header";
  className?: string;
  /** When true, hide the Google button and only show the in-app notice. */
  noticeOnlyInApp?: boolean;
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="btn-label">{children}</span>;
}

/**
 * Primary auth CTA. Gates Google OAuth when opened inside an in-app browser.
 */
export function GoogleSignInButton({
  variant = "primary",
  className,
  noticeOnlyInApp = true,
}: Props) {
  const [inApp, setInApp] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInApp(isInAppBrowser());
    setReady(true);
  }, []);

  async function onClick() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await startGoogleSignIn();
      // Redirect happens via Supabase; keep busy if we stay on this page briefly.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn’t start Google sign-in.";
      if (message === "IN_APP_BROWSER") {
        setInApp(true);
        setError("");
      } else {
        setError(message);
      }
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div
        className={`${variant === "header" ? headerClass : primaryClass} opacity-40 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  // Landing: replace CTA with the full notice.
  if (inApp && noticeOnlyInApp) {
    return <InAppBrowserNotice className={className} />;
  }

  // Header: keep compact — point people home where the full notice shows.
  if (inApp && variant === "header") {
    const browser = preferredExternalBrowser();
    return (
      <Link
        href="/"
        className={`${headerClass}${className ? ` ${className}` : ""}`}
        title={`Open in ${browser} to continue`}
      >
        <Label>Open in {browser}</Label>
      </Link>
    );
  }

  const shell = variant === "header" ? headerClass : primaryClass;

  return (
    <div className={variant === "primary" ? "w-full" : undefined}>
      {inApp ? <InAppBrowserNotice className="mb-3" /> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={busy || inApp}
        className={`${shell}${className ? ` ${className}` : ""}`}
      >
        {!inApp ? <GoogleMark className="shrink-0" /> : null}
        <Label>{busy ? "Opening Google…" : "Continue with Google"}</Label>
      </button>
      {error ? (
        <p className="mt-3 text-sm font-normal leading-snug text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
