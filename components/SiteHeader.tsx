"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getDraft, getUserId } from "@/lib/client";

const APP_NAV = [
  { href: "/matches", label: "Matches" },
  { href: "/shows", label: "Shows" },
  { href: "/crowd", label: "Crowd" },
  { href: "/me", label: "Profile" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUserId, setHasUserId] = useState(false);
  const [cta, setCta] = useState<{ href: string; label: string }>({
    href: "/pick",
    label: "Get started",
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const userId = getUserId();
    setHasUserId(Boolean(userId));

    if (userId) {
      setCta({ href: "/matches", label: "Continue" });
      return;
    }

    const draft = getDraft();
    if (draft.artists.length > 0 || draft.handle.trim()) {
      setCta({ href: "/pick", label: "Continue" });
      return;
    }
    setCta({ href: "/pick", label: "Get started" });
  }, [pathname]);

  const nav = hasUserId ? [...APP_NAV] : [];
  const isLanding = pathname === "/";

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Link
          href="/"
          className="shrink-0 font-sans text-lg font-bold tracking-tight text-[var(--foreground)] uppercase transition hover:opacity-70"
        >
          Resonate
        </Link>

        {isLanding ? null : (
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
                      className={`text-sm font-normal transition ${
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
              <Link
                href={cta.href}
                className={`min-h-10 items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-sm font-normal text-white transition hover:bg-neutral-800 ${
                  nav.length > 0 ? "hidden md:inline-flex" : "inline-flex"
                }`}
              >
                {cta.label}
              </Link>

              {nav.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 min-w-10 items-center justify-center border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal text-[var(--foreground)] md:hidden"
                  aria-expanded={menuOpen}
                  aria-controls="site-mobile-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {menuOpen ? "Close" : "Menu"}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {!isLanding && menuOpen && nav.length > 0 ? (
        <div
          id="site-mobile-menu"
          className="pointer-events-auto mx-4 mb-3 border border-[var(--border)] bg-[var(--surface)] p-3 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-3 text-base font-normal text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href={cta.href}
              className="mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--foreground)] px-4 text-sm font-normal text-white"
              onClick={() => setMenuOpen(false)}
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
