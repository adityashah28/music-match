"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

/** Production homepage encoded in the Share QR (not the current origin). */
const SITE_SHARE_URL = "https://music-match-woad.vercel.app/";

/**
 * Share control for Profile: opens an in-page QR dialog.
 * Never navigates — always a <button type="button">.
 */
export function ShareSiteQr() {
  const [open, setOpen] = useState(false);

  function openShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
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
  const [mounted, setMounted] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate QR only after the dialog opens. Dynamic-import so a qrcode failure
  // cannot take down /me, and use a single PNG (not hundreds of SVG nodes) —
  // large React SVG trees have crashed iOS Safari into Next's global error page
  // ("This page couldn't load") while the address bar still shows this site.
  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "H",
          margin: 4,
          width: 440,
          color: { dark: "#121212", light: "#ffffff" },
        });
        if (!cancelled) {
          setQrSrc(dataUrl);
          setQrFailed(false);
        }
      } catch {
        if (!cancelled) {
          setQrSrc(null);
          setQrFailed(true);
        }
      }
    }

    void buildQr();
    return () => {
      cancelled = true;
    };
  }, [url]);

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
          <div className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- data-URL from qrcode; not a remote asset
              <img
                src={qrSrc}
                alt={`QR code for ${url}`}
                width={220}
                height={220}
                className="block h-[220px] w-[220px] rounded-lg bg-white"
                draggable={false}
              />
            ) : qrFailed ? (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-lg bg-white px-4 text-center text-sm text-[#121212]">
                QR unavailable — copy the link below.
              </div>
            ) : (
              <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-white" aria-hidden />
            )}
          </div>
        </div>

        <p className="mt-4 select-all break-all text-center text-xs font-normal leading-relaxed text-[var(--muted)]">
          {url}
        </p>
      </div>
    </div>,
    document.body,
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
