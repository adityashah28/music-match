import type { CSSProperties } from "react";
import { ArtistImage } from "@/components/ArtistImage";
import { LandingCta } from "@/components/LandingCta";
import { SUGGESTED_ARTISTS } from "@/lib/portraits";

type HeroArtist = (typeof SUGGESTED_ARTISTS)[number];

/** Outer angle must match `--arc-angle` in globals.css for that arc. */
const PHONE_ARTISTS = SUGGESTED_ARTISTS.slice(0, 5);
const PHONE_ANGLES = [-28, -14, 0, 14, 28] as const;

const DESK_ARTISTS = SUGGESTED_ARTISTS.slice(0, 7);
const DESK_ANGLES = [-36, -24, -12, 0, 12, 24, 36] as const;

function HeroArc({
  artists,
  angles,
  className,
}: {
  artists: readonly HeroArtist[];
  angles: readonly number[];
  className: string;
}) {
  return (
    <div className={className} aria-hidden>
      {artists.map((artist, index) => {
        const angle = angles[index] ?? 0;
        return (
          <div
            key={artist.name}
            className="gallery-tile"
            style={
              {
                "--tile-rot": `${angle}deg`,
                "--tile-delay": `${index * 0.07}s`,
              } as CSSProperties
            }
          >
            <div className="gallery-tile-inner">
              <ArtistImage
                src={artist.imageUrl}
                size={250}
                alt=""
                className="h-full w-full object-cover"
                preload={index < 3}
                loading={index < 3 ? "eager" : "lazy"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="page-wash relative min-h-dvh">
      <main>
        <section className="hero-shell relative flex min-h-dvh flex-col items-center justify-center px-4">
          <div className="flex w-full flex-col items-center">
            <HeroArc
              artists={PHONE_ARTISTS}
              angles={PHONE_ANGLES}
              className="gallery-arc gallery-arc-phone md:hidden"
            />
            <HeroArc
              artists={DESK_ARTISTS}
              angles={DESK_ANGLES}
              className="gallery-arc gallery-arc-desk hidden md:block"
            />

            <div
              className="hero-rise relative z-10 mx-auto w-full max-w-5xl text-center"
              style={{ animationDelay: "0.42s" }}
            >
              <h1 className="font-sans text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-[var(--foreground)] md:text-5xl md:leading-[1.05] lg:text-[3.25rem]">
                Meet people who like the same artists.
              </h1>
            </div>
            <div
              className="cta-hover hero-rise relative z-10 mx-auto mt-8 w-full max-w-[17.5rem]"
              style={{ animationDelay: "0.56s" }}
            >
              <LandingCta />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
