"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDDEN = new Set([
  "/",
  "/about",
  "/age",
  "/pick",
  "/socials",
  "/finding",
  "/auth/callback",
  "/logout",
]);
const HIDDEN_SUFFIXES = ["/icebreaker"];

const ITEMS = [
  { href: "/matches", label: "Matches", icon: MatchesIcon },
  { href: "/shows", label: "Shows", icon: ShowsIcon },
  { href: "/me", label: "Profile", icon: ProfileIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN.has(pathname) || HIDDEN_SUFFIXES.some((suffix) => pathname.endsWith(suffix))) {
    return null;
  }

  const activeIndex = ITEMS.findIndex(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative flex w-fit items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] p-2.5"
        style={{ borderRadius: 999 }}
      >
        <span
          aria-hidden="true"
          className={`absolute left-2.5 top-2.5 h-13 w-22 rounded-full bg-[var(--surface-soft)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            activeIndex < 0 ? "opacity-0" : "opacity-100"
          }`}
          style={{ transform: `translateX(calc(${Math.max(activeIndex, 0)} * (100% + 0.375rem)))` }}
        />
        {ITEMS.map(({ href, label, icon: Icon }, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-13 w-22 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-full font-normal transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] ${
                active ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon />
              <span className="btn-label text-[11px] leading-none tracking-[0.02em]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function MatchesIcon() {
  return (
    <IconFrame>
      <path d="M15.5 19.5v-1.1a2.9 2.9 0 0 0-2.9-2.9H7.4a2.9 2.9 0 0 0-2.9 2.9v1.1" />
      <circle cx="10" cy="8.2" r="2.4" />
      <path d="M20 19.5v-1.1a2.9 2.9 0 0 0-2.2-2.8" />
      <path d="M15.2 5.9a2.4 2.4 0 0 1 0 4.6" />
    </IconFrame>
  );
}

function ShowsIcon() {
  return (
    <IconFrame>
      <path d="M4.5 8.2A1.4 1.4 0 0 1 5.9 6.8h12.2a1.4 1.4 0 0 1 1.4 1.4v1.1a1.7 1.7 0 0 0 0 3.3v1.1a1.4 1.4 0 0 1-1.4 1.4H5.9a1.4 1.4 0 0 1-1.4-1.4v-1.1a1.7 1.7 0 0 0 0-3.3V8.2Z" />
      <path d="M12 6.8v9.4" />
    </IconFrame>
  );
}

function ProfileIcon() {
  return (
    <IconFrame>
      <circle cx="12" cy="8.2" r="2.6" />
      <path d="M6.2 18.6v-.8a3.4 3.4 0 0 1 3.4-3.4h4.8a3.4 3.4 0 0 1 3.4 3.4v.8" />
    </IconFrame>
  );
}
