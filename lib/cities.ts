import type { CitySuggestion } from "@/lib/types";

type PhotonProps = {
  osm_id?: number | string;
  osm_type?: string;
  name?: string;
  city?: string;
  locality?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function labelFor(props: PhotonProps): { label: string; city: string } | null {
  const city =
    text(props.name) ||
    text(props.city) ||
    text(props.locality);
  if (!city) return null;
  const region = text(props.state);
  const country = text(props.country);
  const parts = [city, region, country].filter(Boolean);
  return { city, label: parts.join(", ") };
}

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.append("layer", "city");
  url.searchParams.append("layer", "locality");
  url.searchParams.append("layer", "district");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error("City search failed");

  const json: unknown = await response.json();
  if (!isRecord(json) || !Array.isArray(json.features)) return [];

  const seen = new Set<string>();
  const out: CitySuggestion[] = [];

  for (const feature of json.features) {
    if (!isRecord(feature)) continue;
    const props = isRecord(feature.properties) ? (feature.properties as PhotonProps) : null;
    const geometry = isRecord(feature.geometry) ? feature.geometry : null;
    const coords = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    if (!props || !coords || coords.length < 2) continue;
    const lng = typeof coords[0] === "number" ? coords[0] : null;
    const lat = typeof coords[1] === "number" ? coords[1] : null;
    if (lat == null || lng == null) continue;

    const named = labelFor(props);
    if (!named) continue;
    const id = `${props.osm_type ?? "x"}:${props.osm_id ?? named.label}:${lat},${lng}`;
    if (seen.has(id) || seen.has(named.label.toLowerCase())) continue;
    seen.add(id);
    seen.add(named.label.toLowerCase());

    out.push({
      id,
      label: named.label,
      city: named.city,
      region: text(props.state),
      country: text(props.country),
      lat,
      lng,
    });
    if (out.length >= 6) break;
  }

  return out;
}
