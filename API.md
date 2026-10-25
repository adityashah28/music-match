# Resonate API

All routes live under `app/api` and return JSON. Response shapes are in `lib/types.ts`;
the frontend reads them through the helpers in `lib/client.ts`.

## Auth

There are no accounts. Signup (`POST /api/users`) returns the profile plus a `token`.
`app/socials/page.tsx` saves both the id and the token in localStorage, and `fetchJson`
in `lib/client.ts` sends the token on every `/api/` call as `Authorization: Bearer <token>`.

Routes marked 🔒 check that the token belongs to the `userId` the request acts for.
A wrong or missing token gets `401`, and `fetchJson` then clears the saved profile and
sends the user back to `/`. Always call the API through `fetchJson` so the token is attached.

## Signing in

- **Google:** link the button to the `/auth/google` page. It sends the person to Google, which
  returns them to `/auth/callback`; that page logs a known account in (goes to `/matches`) or
  keeps the Google proof in the onboarding draft and continues to `onboardingHref()`.
- **Phone:** onboarding has no phone screens (`/phone` and `/verify` redirect to `/about`). The
  SMS endpoints below still work for API clients. Codes come from Supabase Auth (Twilio Verify).
- Gate onboarding screens on `isVerified(draft)` from `lib/client.ts` (a Google sign-in).
- Onboarding is About, Age, Artists, Socials. There's no saved step number: `onboardingHref()`
  works out the next step from what the draft already has.
- Google refuses to sign in inside in-app browsers (Discord, Instagram): ask people to open
  the link in Safari or Chrome.

## Routes

| Method | Path | Notes |
|---|---|---|
| GET | `/api/artists/search?q=` | Spotify if `SPOTIFY_CLIENT_ID` is set, otherwise Deezer. Cached in `search_cache` |
| POST | `/api/auth/google` | Body `{ accessToken }` from the Google redirect. Known account: profile + `token`. New: `authProof` + name |
| POST | `/api/auth/phone` | Body `{ phone }`. Supabase texts a 6-digit code |
| POST | `/api/auth/verify` | Body `{ phone, code }`. Known number: profile + `token`. New: `phoneProof` |
| POST | `/api/users` | Signup. Needs `authProof` (Google) or `phoneProof` + `phone`. Returns profile + `token` |
| GET 🔒 | `/api/users/[id]` | Your own profile, including your socials |
| PATCH 🔒 | `/api/users/[id]` | Edit your profile or artists |
| GET 🔒 | `/api/users/[id]/matches` | Socials appear only when interest is mutual |
| POST 🔒 | `/api/matches/[otherId]/interest` | Body `{ userId }`. Toggles interest. Demo profiles always tap back |
| POST / DELETE 🔒 | `/api/matches/[otherId]/skip` | Body `{ userId }`. Hide or unhide a match |
| GET 🔒 | `/api/shows?userId=` | Shows by your artists, your matches' artists, then artists related to yours |
| GET 🔒 | `/api/shows/[id]?userId=` | Show detail with going count and crowd taste |
| POST 🔒 | `/api/shows/[id]/rsvp` | Body `{ userId, status }`, status is `going`, `maybe` or `not_going` |
| GET | `/api/crowd` | Room totals and top artists, for the projector |
| POST | `/api/webhooks/apify` | Needs header `x-webhook-secret: $APIFY_WEBHOOK_SECRET` |

Errors always look like `{ "error": "message you can show the user" }`.

## Data

`lib/store.ts` loads all tables into one snapshot (reads reuse it for 10 seconds) and writes back
only what changed. Without Supabase keys it falls back to in-memory demo data from `lib/seed.ts`.

Seed scripts fill Supabase (run in this order; each is safe to re-run):

```
npm run seed:artists   # ~320 artists in 8 scenes from Deezer, with related artists and colors
npm run seed:demo      # 29 demo profiles (is_demo = true)
npm run seed:shows     # Bay Area shows from Apify (Bandsintown, Songkick) and Ticketmaster
```

They need `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN` and `TICKETMASTER_KEY` in `.env.local`.
The database layout is `supabase/schema.sql`.
