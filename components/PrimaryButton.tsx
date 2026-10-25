"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const buttonClass =
  "font-sans inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--foreground)] text-center font-normal leading-none text-[var(--on-foreground)] transition duration-200 ease-out hover:bg-[var(--foreground-hover)] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40";

const sizeClass = {
  full: "min-h-12 w-full px-6 text-base",
  compact: "min-h-10 px-5 text-sm",
};

export function primaryButtonClass(size: keyof typeof sizeClass = "full") {
  return `${buttonClass} ${sizeClass[size]}`;
}

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
  size = "full",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Prefetch linked route (default true for Get started → /pick). */
  prefetch?: boolean;
  /** `full` stretches across its container; `compact` sizes to its label. */
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const classes = `${primaryButtonClass(size)}${className ? ` ${className}` : ""}${disabled ? " pointer-events-none opacity-40" : ""}`;

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
