import type { ReactNode } from "react";

/** Light gallery panel (legacy name kept for imports). */
export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated Shared layout animations removed for bundle size; prop ignored. */
  layoutId?: string;
}) {
  const classes = className ? `panel overflow-hidden ${className}` : "panel overflow-hidden";
  return <div className={classes}>{children}</div>;
}
