"use client";

import { useState, useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";

/** Saved choice; when unset the app is light (see the script in app/layout.tsx). */
export const THEME_KEY = "resonate_theme";

type Theme = "light" | "dark";

/** Browser bar color per theme (matches --background). */
const BAR_COLOR: Record<Theme, string> = { light: "#f4f5f7", dark: "#0e0f11" };

/** The new theme grows out of the button as a circle (styles in app/globals.css). */
const REVEAL_MS = 650;
const REVEAL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

// Toggles notify these directly so a flushSync re-render picks up the new icon in the same frame
const listeners = new Set<() => void>();
let switching = false;

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[theme]);
  listeners.forEach((notify) => notify());
}

// The theme lives on <html data-theme> (set before paint by the layout script); read it from there
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  listeners.add(onChange);
  return () => {
    observer.disconnect();
    listeners.delete(onChange);
  };
}
const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const onServer = (): Theme | null => null;

/** Round header button that switches light/dark and remembers the choice on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, onServer);
  // Only spin the icon after a click, not on first paint
  const [spinIcon, setSpinIcon] = useState(false);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (switching) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit
    }

    const root = document.documentElement;
    // Color transitions on buttons/links would lag behind the new theme, so they're paused for the switch
    const update = () => {
      root.dataset.themeSwitching = "";
      flushSync(() => {
        setSpinIcon(true);
        applyTheme(next);
      });
    };
    const done = () => {
      delete root.dataset.themeSwitching;
      switching = false;
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition !== "function" || reduceMotion) {
      update();
      // Styles must settle with transitions off before they're switched back on
      void root.offsetHeight;
      done();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    switching = true;
    const transition = document.startViewTransition(update);
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    transition.finished.then(done, done);
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
    >
      {/* Hidden until mounted, so the icon never shows the wrong theme for a frame */}
      <span key={theme} className={`flex ${theme ? "" : "invisible"} ${spinIcon ? "theme-icon-in" : ""}`} aria-hidden>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}
