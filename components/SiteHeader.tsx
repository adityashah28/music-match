"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { clearDraft, getDraft, getUserId, isVerified, onboardingHref } from "@/lib/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const APP_NAV = [
  { href: "/matches", label: "Matches" },
  { href: "/shows", label: "Shows" },
  { href: "/me", label: "Profile" },
] as const;

const ONBOARDING_PATHS = new Set([
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
  /** Stays true through the close transition so the menu can fold away before unmounting. */
  const [menuMounted, setMenuMounted] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [hasUserId, setHasUserId] = useState(false);
  const [cta, setCta] = useState<HeaderCta>({ kind: "google" });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Backstop for transitionend, which never fires if the card is display:none or the tab is hidden.
  useEffect(() => {
    if (menuOpen || !menuMounted) return;
    const timer = setTimeout(() => setMenuMounted(false), 450);
    return () => clearTimeout(timer);
  }, [menuOpen, menuMounted]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
      setCta({ kind: "google" });
      return;
    }

    const draft = getDraft();
    // A Google-verified mid-draft can still resume.
    if (isVerified(draft)) {
      setCta({ kind: "link", href: onboardingHref(draft), label: "Continue" });
      return;
    }
    setCta({ kind: "google" });
  }, [pathname]);

  const nav = hasUserId ? [...APP_NAV] : [];
  const isLanding = pathname === "/";
  const isOnboarding = ONBOARDING_PATHS.has(pathname);

  function isActive(href: string) {
    const pathOnly = href.split("#")[0] || "/";
    return pathOnly !== "/" && (pathname === pathOnly || pathname.startsWith(`${pathOnly}/`));
  }

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
        className={`font-sans min-h-10 cursor-pointer items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-center text-sm font-normal leading-none text-[var(--on-foreground)] transition duration-200 ease-out hover:bg-[var(--foreground-hover)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
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

        {isLanding || isOnboarding ? (
          <ThemeToggle />
        ) : (
          <>
            {nav.length > 0 ? (
              <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
                {nav.map(({ href, label }) => {
                  const active = isActive(href);
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
              <ThemeToggle />
              {renderCta({})}

              {nav.length > 0 ? (
                <button
                  ref={menuButtonRef}
                  type="button"
                  className="font-sans inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-center text-sm font-normal leading-none text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] md:hidden"
                  aria-expanded={menuOpen}
                  aria-controls="site-mobile-menu"
                  onClick={() => {
                    setMenuMounted(true);
                    setMenuOpen((open) => !open);
                  }}
                >
                  <span className="grid">
                    <span
                      className="menu-toggle-label"
                      data-active={!menuOpen}
                      aria-hidden={menuOpen}
                    >
                      <span className="btn-label">Menu</span>
                    </span>
                    <span
                      className="menu-toggle-label"
                      data-active={menuOpen}
                      aria-hidden={!menuOpen}
                    >
                      <span className="btn-label">Close</span>
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {!isLanding && !isOnboarding && menuMounted && nav.length > 0 ? (
        <div
          id="site-mobile-menu"
          data-state={menuOpen ? "open" : "closed"}
          inert={!menuOpen}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === "opacity" && !menuOpen) {
              setMenuMounted(false);
            }
          }}
          className="menu-card pointer-events-auto mx-4 mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {nav.map(({ href, label }, index) => {
              const active = isActive(href);
              return (
                <Fragment key={href}>
                  {index > 0 ? (
                    <span aria-hidden="true" className="menu-rule mx-4" />
                  ) : null}
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    style={{ "--i": index } as CSSProperties}
                    className={`menu-item flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-normal hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
                      active
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </Fragment>
              );
            })}
            {renderCta({ mobile: true })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
