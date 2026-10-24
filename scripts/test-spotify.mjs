import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Spotify check skipped: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not set. Copy .env.example to .env.local, add the server-only Spotify credentials, then run npm run test:spotify.",
  );
  process.exit(1);
}

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

let tokenResponse;
try {
  tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Spotify token request failed: ${message}`);
  process.exit(1);
}

if (!tokenResponse.ok) {
  const body = await tokenResponse.text();
  console.error(
    `Spotify token request failed (${tokenResponse.status}): ${body}`,
  );
  process.exit(1);
}

const tokenJson = await tokenResponse.json();
const accessToken = tokenJson.access_token;
if (!accessToken) {
  console.error("Spotify token response did not include an access token.");
  process.exit(1);
}

const searchUrl = new URL("https://api.spotify.com/v1/search");
searchUrl.searchParams.set("q", "Mitski");
searchUrl.searchParams.set("type", "artist");
searchUrl.searchParams.set("limit", "1");

let searchResponse;
try {
  searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Spotify artist search failed: ${message}`);
  process.exit(1);
}

if (!searchResponse.ok) {
  const body = await searchResponse.text();
  console.error(
    `Spotify artist search failed (${searchResponse.status}): ${body}`,
  );
  process.exit(1);
}

const searchJson = await searchResponse.json();
const artist = searchJson.artists?.items?.[0];
if (!artist?.name) {
  console.error("Spotify artist search returned no results.");
  process.exit(1);
}

console.log(`Spotify client credentials ok. Found artist: ${artist.name}`);
process.exit(0);
