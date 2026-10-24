import Link from "next/link";

export function BackLink({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-normal text-[var(--muted)] transition hover:text-[var(--foreground)]"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
