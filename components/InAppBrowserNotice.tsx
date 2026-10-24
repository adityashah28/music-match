"use client";

import { useEffect, useState } from "react";
import { preferredExternalBrowser } from "@/lib/inAppBrowser";

type Props = {
  className?: string;
};

/**
 * Shown when Google OAuth would fail inside Discord / Instagram / etc. WebViews.
 */
export function InAppBrowserNotice({ className }: Props) {
  const [browser, setBrowser] = useState<"Safari" | "Chrome">("Chrome");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBrowser(preferredExternalBrowser());
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — user can still copy from the address bar in the menu */
    }
  }

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left ${className ?? ""}`}
      role="status"
    >
      <p className="text-base font-normal leading-snug text-[var(--foreground)]">
        Open in {browser} to continue
      </p>
      <p className="mt-2 text-sm font-normal leading-snug text-[var(--muted)]">
        Google sign-in doesn’t work inside Discord, Instagram, and other in-app browsers.
        Tap the menu (⋯) and choose <span className="text-[var(--foreground)]">Open in {browser}</span>
        , then try again.
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="font-sans mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-center text-sm font-normal leading-none text-[var(--foreground)] transition hover:bg-[var(--border)]"
      >
        <span className="btn-label">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
