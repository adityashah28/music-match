// Fills in coordinates for shows that don't have them yet (one lookup per city).
// New shows get coordinates when they're saved; this is for rows saved before that existed.
//
// Run: npm run geocode:shows   (safe to re-run; only touches shows without coordinates)
import { geocodeCity } from "@/lib/geocode";
import { supabase } from "./lib/db";

async function main() {
  const cities = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("shows").select("city").is("lat", null).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    data.forEach((s) => s.city && cities.add(s.city));
    if (data.length < 1000) break;
  }
  console.log(`Looking up ${cities.size} cities...`);
  const missing: string[] = [];
  for (const city of cities) {
    const coords = await geocodeCity(city);
    if (!coords) {
      missing.push(city);
      continue;
    }
    const { error } = await supabase.from("shows").update({ lat: coords.lat, lng: coords.lng }).eq("city", city).is("lat", null);
    if (error) throw new Error(error.message);
    console.log(`  ${city.padEnd(16)} ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`);
    await new Promise((r) => setTimeout(r, 300)); // gentle on the free geocoder
  }
  const { count } = await supabase.from("shows").select("*", { count: "exact", head: true }).is("lat", null);
  console.log(`\nDone. ${count} shows still without coordinates${missing.length ? ` (not found: ${missing.join(", ")})` : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
