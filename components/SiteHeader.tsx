"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { clearDraft, getDraft, getUserId, isVerified, onboardingHref } from "@/lib/client";

const APP_NAV = [
  { href: "/matches", label: "Matches" },
  { href: "/shows", label: "Shows" },
  { href: "/me", label: "Profile" },
] as const;

const ONBOARDING_PATHS = new Set([
  "/phone",
  "/verify",
  "/about",
  "/age",
  "/pick",
  "/socials",
  "/finding",
  "/auth/callback",
]);

type HeaderCta =
  | { kind: "link"; href: string; label: string }
  | { kind: "google" }
  | null;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserId, setHasUserId] = useState(false);
  const [cta, setCta] = useState<HeaderCta>({ kind: "google" });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const userId = getUserId();
    setHasUserId(Boolean(userId));

    // Signed-in users already have Matches/Shows/Profile nav — no Continue CTA.
    if (userId) {
      setCta(null);
      return;
    }

    // Already mid-flow — no header CTA needed.
    if (ONBOARDING_PATHS.has(pathname)) {
      setCta(null);
      return;
    }

    // Backing out to home abandons guest onboarding; Google starts over.
    if (pathname === "/") {
      clearDraft();
      sessionStorage.removeItem("resonate_dev_otp");
      setCta({ kind: "google" });
      return;
    }

    const draft = getDraft();
    // Verified mid-draft (Google or SMS) can still resume.
    if (isVerified(draft)) {
      setCta({ kind: "link", href: onboardingHref(draft), label: "Continue" });
      return;
    }
    setCta({ kind: "google" });
  }, [pathname]);

  const nav = hasUserId ? [...APP_NAV] : [];
  const isLanding = pathname === "/";
  const isOnboarding = ONBOARDING_PATHS.has(pathname);

  function renderCta(opts: { mobile?: boolean }) {
    if (!cta) return null;

    if (cta.kind === "google") {
      return (
        <GoogleSignInButton
          variant="header"
          className={opts.mobile ? "mt-1 w-full" : nav.length > 0 ? "hidden md:inline-flex" : ""}
          noticeOnlyInApp={false}
        />
      );
    }

    return (
      <Link
        href={cta.href}
        className={`font-sans min-h-10 cursor-pointer items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-center text-sm font-normal leading-none text-white transition duration-200 ease-out hover:bg-neutral-700 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
          opts.mobile
            ? "mt-1 inline-flex min-h-11 w-full"
            : nav.length > 0
              ? "hidden md:inline-flex"
              : "inline-flex"
        }`}
        onClick={opts.mobile ? () => setMenuOpen(false) : undefined}
      >
        <span className="btn-label">{cta.label}</span>
      </Link>
    );
  }

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6"
        style={{
          paddingTop: "max(1.25rem, calc(0.5rem + env(safe-area-inset-top)))",
        }}
      >
        <Link
          href="/"
          className="font-wordmark shrink-0 cursor-pointer text-xl font-normal text-[var(--foreground)] transition duration-200 ease-out hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] md:text-2xl"
        >
          Resonate
        </Link>

        {isLanding || isOnboarding ? null : (
          <>
            {nav.length > 0 ? (
              <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
                {nav.map(({ href, label }) => {
                  const pathOnly = href.split("#")[0] || "/";
                  const active =
                    pathOnly !== "/" &&
                    (pathname === pathOnly || pathname.startsWith(`${pathOnly}/`));
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`cursor-pointer text-sm font-normal transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
                        active
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex items-center gap-2">
              {renderCta({})}

              {nav.length > 0 ? (
                <button
                  type="button"
                  className="font-sans inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-center text-sm font-normal leading-none text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] md:hidden"
                  aria-expanded={menuOpen}
                  aria-controls="site-mobile-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="btn-label">{menuOpen ? "Close" : "Menu"}</span>
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {!isLanding && !isOnboarding && menuOpen && nav.length > 0 ? (
        <div
          id="site-mobile-menu"
          className="pointer-events-auto mx-4 mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="cursor-pointer px-4 py-3 text-base font-normal text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            {renderCta({ mobile: true })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
