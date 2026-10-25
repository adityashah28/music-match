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
      className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-normal text-[var(--muted)] transition duration-200 ease-out hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
