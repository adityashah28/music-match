# Music Match API

All routes live under `/api` and return JSON. Shapes are defined in `src/lib/types.ts`:
import types from there instead of guessing field names.

**Status:** every route below currently returns **mock data** (from `src/lib/mock.ts`)
so the frontend can build now. Routes switch to real data one by one; the shapes stay the same.

## Auth

There are no accounts. Signup returns `{ id, token }`. Save both in localStorage:

```ts
localStorage.setItem("mm_user", JSON.stringify({ id, token }));
```

Routes marked 🔒 need the token on every request:

```ts
fetch(`/api/users/${id}/matches`, { headers: { Authorization: `Bearer ${token}` } });
```

A `401` means the token is missing or wrong: send the user back to onboarding.

## Routes

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/artists/search?q=mit` | | `SearchArtistsResponse` |
| POST | `/api/users` | `CreateUserRequest` | `CreateUserResponse` |
| GET 🔒 | `/api/users/[id]/matches` | | `MatchesResponse` |
| POST 🔒 | `/api/matches/[otherId]/interest` | | `InterestResponse` |
| GET 🔒 | `/api/shows` | | `ShowsResponse` |
| GET 🔒 | `/api/shows/[id]` | | `ShowDetailResponse` |
| POST 🔒 | `/api/shows/[id]/rsvp` | `RsvpRequest` | `RsvpResponse` |
| GET | `/api/health` | | `{ ok, artists }` (backend check) |

## Notes for the UI

- Search: debounce typing by ~300ms. Use the `id` from results in `artistIds` at signup.
- `imageUrl` and `color` can be `null`. Have a fallback (initials, default gradient).
- `socials` is `null` until `mutual` is true. Never assume it's there.
- `isEarly: true` means few real users so far: show "You're one of the first here".
- `isDemo: true` on a match means a seeded profile: show the "demo" badge.
- Errors always look like `{ "error": "message you can show the user" }`.
