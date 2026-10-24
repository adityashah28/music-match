import type { ReactNode } from "react";

/** Light gallery page shell. Color prop kept for call-site compatibility; unused. */
export function GradientBackground({
  children,
}: {
  color?: string;
  children: ReactNode;
}) {
  return (
    <div className="page-wash relative min-h-dvh text-[var(--foreground)]">
      <div className="relative z-10">{children}</div>
    </div>
  );
}
