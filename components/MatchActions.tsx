"use client";

import { PrimaryButton } from "@/components/PrimaryButton";

export function MatchActions({
  interested,
  mutual,
  busy,
  onInterested,
  onSkip,
}: {
  interested: boolean;
  mutual: boolean;
  busy?: boolean;
  onInterested: () => void;
  onSkip: () => void;
}) {
  if (mutual) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <PrimaryButton onClick={onInterested} disabled={busy || interested}>
        {interested ? "Interested" : busy ? "Saving…" : "I'm interested"}
      </PrimaryButton>
      <button
        type="button"
        onClick={onSkip}
        disabled={busy}
        className="font-sans inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 text-center text-base font-normal leading-none text-[var(--foreground)] transition duration-200 ease-out hover:border-[var(--foreground)] hover:bg-[var(--surface-soft)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40"
      >
        <span className="btn-label">Skip</span>
      </button>
    </div>
  );
}
