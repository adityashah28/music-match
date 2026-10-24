export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[var(--radius)] bg-[var(--surface-soft)] ${className ?? "h-4 w-full"}`}
    />
  );
}
