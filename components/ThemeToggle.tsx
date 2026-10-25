"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { THEME_BAR_COLOR, THEME_KEY, type Theme } from "@/lib/theme";

export { THEME_KEY };

/** The new theme grows out of the button as a circle (styles in app/globals.css). */
const REVEAL_MS = 600;
const REVEAL_STEPS = 30;

// Toggles notify these directly so a flushSync re-render picks up the new icon in the same frame
const listeners = new Set<() => void>();
let switching = false;

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BAR_COLOR[theme]);
  listeners.forEach((notify) => notify());
}

/**
 * Circle radii paced by screen coverage (not raw radius), so the wave doesn't stall under the
 * button or crawl the far corner. Origin is % of the viewport — px origins mis-align on desktop
 * when the view-transition snapshot box doesn't match CSS pixels (reads as top-center).
 */
function revealFrames(x: number, y: number, width: number, height: number): string[] {
  const cols = 48;
  const rows = Math.max(8, Math.round((cols * height) / width));
  const distances: number[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      distances.push(Math.hypot(((i + 0.5) * width) / cols - x, ((j + 0.5) * height) / rows - y));
    }
  }
  distances.sort((a, b) => a - b);
  const farthest = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const xPct = (x / width) * 100;
  const yPct = (y / height) * 100;
  const frames: string[] = [];
  for (let step = 0; step <= REVEAL_STEPS; step++) {
    const covered = 0.5 - 0.5 * Math.cos((Math.PI * step) / REVEAL_STEPS);
    const at = covered * (distances.length - 1);
    const low = distances[Math.floor(at)];
    const radius = step === REVEAL_STEPS ? farthest : low + (distances[Math.ceil(at)] - low) * (at - Math.floor(at));
    frames.push(`circle(${radius.toFixed(1)}px at ${xPct.toFixed(3)}% ${yPct.toFixed(3)}%)`);
  }
  return frames;
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

/** Origin = the clicked toggle's center (pointer only if it lands inside that same button). */
function revealOrigin(event: MouseEvent<HTMLButtonElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  if (event.detail > 0) {
    const { clientX: px, clientY: py } = event;
    const inside =
      Number.isFinite(px) &&
      Number.isFinite(py) &&
      px >= rect.left &&
      px <= rect.right &&
      py >= rect.top &&
      py <= rect.bottom;
    if (inside) return { x: px, y: py };
  }
  return { x: cx, y: cy };
}

/** Round header button that switches light/dark and remembers the choice on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, onServer);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (switching) return;
    const next: Theme = current() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit
    }

    const root = document.documentElement;
    const update = () => {
      root.dataset.themeSwitching = "";
      flushSync(() => {
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
      void root.offsetHeight;
      done();
      return;
    }

    const { x, y } = revealOrigin(event);
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const ox = (window.visualViewport?.offsetLeft ?? 0) + x;
    const oy = (window.visualViewport?.offsetTop ?? 0) + y;
    const frames = revealFrames(ox, oy, width, height);

    switching = true;
    const transition = document.startViewTransition(update);
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: frames },
          { duration: REVEAL_MS, easing: "linear", pseudoElement: "::view-transition-new(root)" },
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
      <span key={theme} className={`theme-icon flex ${theme ? "" : "invisible"}`} aria-hidden>
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
