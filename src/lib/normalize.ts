// Turns any spelling of an artist name into one comparable key, so
// "Phoebe Bridgers", "phoebe bridgers" and "Beyoncé" vs "Beyonce" all line up.
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ") // punctuation and symbols become spaces
    .trim()
    .replace(/^the /, "");
}
