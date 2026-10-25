"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";

type QrColors = { fg: string; bg: string };

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readQrColors(): QrColors {
  const styles = getComputedStyle(document.documentElement);
  return {
    fg: styles.getPropertyValue("--foreground").trim() || "#121212",
    bg: styles.getPropertyValue("--surface").trim() || "#ffffff",
  };
}

const fallbackColors: QrColors = { fg: "#121212", bg: "#ffffff" };

/** Production homepage encoded in the Share QR (not the current origin). */
const SITE_SHARE_URL = "https://music-match-woad.vercel.app/";

/**
 * Share control for Profile: opens a themed QR dialog that encodes the site homepage.
 */
export function ShareSiteQr() {
  const [open, setOpen] = useState(false);

  function openShare() {
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openShare}
        className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-normal leading-none text-[var(--foreground)] transition duration-200 ease-out hover:border-[var(--foreground)] hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
      >
        <ShareIcon />
        <span className="btn-label">Share</span>
      </button>
      {open ? <ShareQrDialog url={SITE_SHARE_URL} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShareQrDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colors = useSyncExternalStore(subscribeTheme, readQrColors, () => fallbackColors);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close share dialog"
        className="absolute inset-0 cursor-pointer bg-[var(--foreground)] opacity-35"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-[22rem] overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_40px_var(--shadow-soft)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-normal tracking-tight text-[var(--foreground)]">
              Share Resonate
            </h2>
            <p id={descId} className="mt-2 text-sm font-normal leading-snug text-[var(--muted)]">
              Scan to open the site homepage.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition duration-200 ease-out hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <div className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_28px_var(--shadow-soft)]">
            <div className="rounded-[0.9rem] bg-[var(--surface-soft)] p-3">
              {url ? (
                <ThemedQrCode value={url} fg={colors.fg} bg={colors.bg} label={`QR code for ${url}`} />
              ) : (
                <div className="h-[220px] w-[220px] animate-pulse rounded-[0.75rem] bg-[var(--surface)]" />
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 truncate text-center text-xs font-normal text-[var(--muted)]" title={url}>
          {url || "…"}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function ThemedQrCode({
  value,
  fg,
  bg,
  label,
}: {
  value: string;
  fg: string;
  bg: string;
  label: string;
}) {
  const [modules, setModules] = useState<boolean[][] | null>(null);

  useEffect(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      const size = qr.modules.size;
      const next: boolean[][] = [];
      for (let row = 0; row < size; row++) {
        const line: boolean[] = [];
        for (let col = 0; col < size; col++) {
          line.push(Boolean(qr.modules.get(row, col)));
        }
        next.push(line);
      }
      setModules(next);
    } catch {
      setModules(null);
    }
  }, [value]);

  if (!modules) {
    return <div className="h-[220px] w-[220px] animate-pulse rounded-[0.75rem] bg-[var(--surface)]" aria-hidden />;
  }

  const quiet = 3;
  const n = modules.length;
  const view = n + quiet * 2;
  // Soft modules for data; keep finder eyes square so scanners stay reliable.
  const softRadius = 0.22;

  function isFinder(x: number, y: number) {
    const inTopLeft = x < 7 && y < 7;
    const inTopRight = x >= n - 7 && y < 7;
    const inBottomLeft = x < 7 && y >= n - 7;
    return inTopLeft || inTopRight || inBottomLeft;
  }

  return (
    <svg
      role="img"
      aria-label={label}
      width={220}
      height={220}
      viewBox={`0 0 ${view} ${view}`}
      className="block h-[220px] w-[220px] overflow-hidden rounded-[0.75rem]"
      shapeRendering="geometricPrecision"
    >
      <title>{label}</title>
      <rect width={view} height={view} fill={bg} rx={1.2} ry={1.2} />
      {modules.map((row, y) =>
        row.map((on, x) => {
          if (!on) return null;
          const r = isFinder(x, y) ? 0 : softRadius;
          return (
            <rect
              key={`${x}-${y}`}
              x={x + quiet}
              y={y + quiet}
              width={1}
              height={1}
              rx={r}
              ry={r}
              fill={fg}
            />
          );
        }),
      )}
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="19" r="2.4" />
      <path d="m8.2 13.2 7.5 4.3M15.7 6.5l-7.5 4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
