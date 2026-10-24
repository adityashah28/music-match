import { ArtistImage } from "@/components/ArtistImage";
import { goingNote, showLine, type DraftArtist, type MatchShowItem } from "@/lib/client";
import { photoFor } from "@/lib/portraits";

export function sharedCount(count: number) {
  if (count === 0) return "No exact overlap";
  return count === 1 ? "1 shared artist" : `${count} shared artists`;
}

export function sharedNames(artists: Pick<DraftArtist, "name">[], max = 3) {
  const names = artists.slice(0, max).map((artist) => artist.name);
  const extra = artists.length - names.length;
  return extra > 0 ? `${names.join(", ")} +${extra}` : names.join(", ");
}

export function SharedFaces({ artists }: { artists: Pick<DraftArtist, "name" | "imageUrl">[] }) {
  if (artists.length === 0) return null;
  const shown = artists.slice(0, 5);
  return (
    <ul className="flex shrink-0 items-center">
      {shown.map((artist, index) => {
        const photo = photoFor(artist.name, artist.imageUrl);
        return (
          <li
            key={`${artist.name}-${index}`}
            className="-ml-2 relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-[var(--surface)] bg-[var(--surface-soft)] text-[11px] font-semibold text-[var(--foreground)] first:ml-0"
            style={{ zIndex: shown.length - index }}
          >
            {photo ? (
              <ArtistImage src={photo} size={56} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <span aria-label={artist.name}>{artist.name.slice(0, 1).toUpperCase()}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MatchShowRow({ show }: { show: MatchShowItem }) {
  const note = goingNote(show.going);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5">
      <p className="truncate text-sm font-normal text-[var(--foreground)]">{showLine(show)}</p>
      <p className="mt-0.5 truncate text-xs font-normal text-[var(--muted)]">
        {[show.city, note].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

/** Shared artists, the label, and one upcoming show: the reason this person is on the list. */
export function MatchWhy({
  label,
  why,
  sharedArtists,
  show,
}: {
  label: string;
  why: string;
  sharedArtists: DraftArtist[];
  show: MatchShowItem | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <SharedFaces artists={sharedArtists} />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-tight text-[var(--foreground)]">
          {sharedCount(sharedArtists.length)}
        </p>
        <span className="pill shrink-0 bg-[var(--foreground)] px-2.5 py-1 text-xs font-normal text-white">
          <span className="chip-label">{label}</span>
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-normal text-[var(--muted)]">
        {sharedArtists.length > 0 ? sharedNames(sharedArtists) : why}
      </p>
      {show ? (
        <div className="mt-3">
          <MatchShowRow show={show} />
        </div>
      ) : null}
    </div>
  );
}
