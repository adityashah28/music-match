"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const buttonClass =
  "font-sans inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--foreground)] px-6 text-center text-base font-normal leading-none text-white transition duration-200 ease-out hover:bg-neutral-700 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

function Label({ children }: { children: ReactNode }) {
  return <span className="btn-label">{children}</span>;
}

export function PrimaryButton({
  children,
  onClick,
  href,
  type,
  disabled,
  prefetch,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Prefetch linked route (default true for Get started → /pick). */
  prefetch?: boolean;
  className?: string;
}) {
  const classes = `${buttonClass}${className ? ` ${className}` : ""}${disabled ? " pointer-events-none opacity-40" : ""}`;

  if (href) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={classes}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.();
        }}
      >
        <Label>{children}</Label>
      </Link>
    );
  }

  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={classes}>
      <Label>{children}</Label>
    </button>
  );
}
