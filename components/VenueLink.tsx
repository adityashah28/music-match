import { mapsUrl } from "@/lib/client";

/** "Venue · City" that opens the place in Google Maps; plain text when there's no venue. */
export function VenueLink({
  venue,
  city,
  className,
}: {
  venue: string | null | undefined;
  city: string | null | undefined;
  className?: string;
}) {
  const label = [venue, city].filter(Boolean).join(" · ") || "Venue TBA";
  const href = mapsUrl(venue, city);
  if (!href) return <p className={className}>{label}</p>;
  return (
    <p className={className}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${label} (open in Google Maps)`}
        className="inline-flex items-center gap-1 underline-offset-2 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <PinIcon />
        {label}
      </a>
    </p>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[0.95em] w-[0.95em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}
