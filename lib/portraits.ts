/** Deezer CDN edge sizes we request — avoid shipping 1000×1000 for chips/blur. */
export type PortraitSize = 56 | 120 | 250 | 500 | 1000;

/**
 * Rewrite Deezer portrait URLs to a smaller edge size.
 * Non-Deezer URLs are returned unchanged.
 */
export function sizedPortraitUrl(
  url: string | undefined | null,
  size: PortraitSize,
): string | undefined {
  if (!url) return undefined;
  if (!/dzcdn\.net|deezer\.com/i.test(url)) return url;
  return url.replace(/\/\d+x\d+(-[^/?#]*)/, `/${size}x${size}$1`);
}

const ART: Record<string, { imageUrl: string; color: string }> = {
  mitski: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/95f0e0a39d7dd9eda8239c96d054527a/500x500-000000-80-0-0.jpg",
    color: "#c4622d",
  },
  phoebebridgers: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/aaf9a93b5b4dc7a2368d375201cc58e1/500x500-000000-80-0-0.jpg",
    color: "#c4a574",
  },
  radiohead: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/0d58cfbc90f2e776608bcdc0c45a4711/500x500-000000-80-0-0.jpg",
    color: "#1a6b73",
  },
  frankocean: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/882155c08dc31d6464d6d580083c968c/500x500-000000-80-0-0.jpg",
    color: "#c4a882",
  },
  sza: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/8ced041da2bed70d5715f0860956169b/500x500-000000-80-0-0.jpg",
    color: "#243e8a",
  },
  kendricklamar: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/be0a7c550567f4af0ed202d7235b74d6/500x500-000000-80-0-0.jpg",
    color: "#1f6f4a",
  },
  charlixcx: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/5a4f593c65c71292b4389e871f76c023/500x500-000000-80-0-0.jpg",
    color: "#e23b78",
  },
  arcticmonkeys: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/6c03e4c7c36800897fd468633286db24/500x500-000000-80-0-0.jpg",
    color: "#8f3a32",
  },
  chappellroan: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/14ca3aea25950189f30efe0fa79ac4f9/500x500-000000-80-0-0.jpg",
    color: "#e23b78",
  },
  clairo: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/933a9fcd1f1b4eae73e3f75bdf5fd3a0/500x500-000000-80-0-0.jpg",
    color: "#d7b48a",
  },
  fontainesdc: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/ee622eb8af3748a4e56c53c20f99a651/500x500-000000-80-0-0.jpg",
    color: "#c23b2e",
  },
  turnstile: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/8cc086b7cd608c8cdc06f79ae6075bfd/500x500-000000-80-0-0.jpg",
    color: "#e24b3b",
  },
  tylerthecreator: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/5eceecd683beab6dd901a7931294a121/500x500-000000-80-0-0.jpg",
    color: "#d7a13a",
  },
  littlesimz: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/f36e7a6e40e7d6f79116ba30365ad9f9/500x500-000000-80-0-0.jpg",
    color: "#1f6f4a",
  },
  fourtet: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/c5114cb88b590ed1352d75bfb7eb8033/500x500-000000-80-0-0.jpg",
    color: "#2f6fe0",
  },
  fredagain: {
    imageUrl:
      "https://cdn-images.dzcdn.net/images/artist/3f0a4f39334266aa963038d95bbb267f/500x500-000000-80-0-0.jpg",
    color: "#3d5bd6",
  },
};

/** Local, instant suggestions for the empty pick screen — no API. */
export const SUGGESTED_ARTISTS = [
  { name: "Charli XCX", ...ART.charlixcx },
  { name: "Fred again..", ...ART.fredagain },
  { name: "SZA", ...ART.sza },
  { name: "Kendrick Lamar", ...ART.kendricklamar },
  { name: "Phoebe Bridgers", ...ART.phoebebridgers },
  { name: "Frank Ocean", ...ART.frankocean },
  { name: "Chappell Roan", ...ART.chappellroan },
  { name: "Mitski", ...ART.mitski },
  { name: "Tyler, the Creator", ...ART.tylerthecreator },
  { name: "Clairo", ...ART.clairo },
  { name: "Radiohead", ...ART.radiohead },
  { name: "Arctic Monkeys", ...ART.arcticmonkeys },
] as const;

export function portraitFor(name?: string | null) {
  if (!name) return undefined;
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return ART[key];
}

export function photoFor(name?: string | null, imageUrl?: string | null) {
  if (imageUrl) return imageUrl;
  return portraitFor(name)?.imageUrl;
}
