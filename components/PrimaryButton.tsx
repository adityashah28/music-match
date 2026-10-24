"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const buttonClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--foreground)] px-6 text-base font-normal text-white transition duration-200 ease-out hover:bg-neutral-800 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

export function PrimaryButton({
  children,
  onClick,
  href,
  type,
  disabled,
  prefetch,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Prefetch linked route (default true for Get started → /pick). */
  prefetch?: boolean;
}) {
  if (href) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={`${buttonClass}${disabled ? " pointer-events-none opacity-40" : ""}`}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.();
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={buttonClass}>
      {children}
    </button>
  );
}
