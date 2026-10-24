"use client";

import { ArtistImage } from "@/components/ArtistImage";
import { photoFor } from "@/lib/portraits";

export function ArtistChip({
  name,
  imageUrl,
  onRemove,
}: {
  name: string;
  imageUrl?: string;
  onRemove?: () => void;
}) {
  const photo = photoFor(name, imageUrl);

  return (
    <div className="chip-enter relative inline-flex w-[76px] flex-col items-center">
      <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-soft)]">
        {photo ? (
          <ArtistImage src={photo} size={120} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
          className="group absolute -right-2 -top-2 grid h-11 w-11 cursor-pointer place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--foreground)] text-base leading-none text-white transition duration-200 ease-out group-hover:bg-neutral-700">
            <span className="btn-label">×</span>
          </span>
        </button>
      ) : null}
      <span className="mt-1 line-clamp-2 w-full text-center text-[11px] font-normal leading-tight text-[var(--muted)]">
        {name}
      </span>
    </div>
  );
}

export function ArtistResult({
  name,
  imageUrl,
  picked,
  onPick,
}: {
  name: string;
  imageUrl?: string;
  picked?: boolean;
  onPick: () => void;
}) {
  const photo = photoFor(name, imageUrl);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={picked}
      className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition duration-200 ease-out hover:border-[var(--foreground)] hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] disabled:pointer-events-none disabled:opacity-60"
    >
      {photo ? (
        <ArtistImage
          src={photo}
          size={120}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-sm font-semibold text-[var(--foreground)]">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="chip-label min-w-0 flex-1 truncate text-base font-normal text-[var(--foreground)]">
        {name}
        {picked ? <span className="text-[var(--muted)]"> · Added</span> : null}
      </span>
    </button>
  );
}
