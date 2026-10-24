# Resonate — Figma Make Design Brief

**Live UI tokens & type:** see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (source of truth after shipping code; prefer it over typography notes below if they conflict).

Use this brief to generate screens that match the **live product**, not a generic social/music app. Prefer a **light gallery** site: airy negative space, physical portrait tiles, and focused one-item browsing — not dark glassmorphism.

---

## 1. Product one-liner

**Resonate matches people by music taste and shows them concerts they can show up to together.**

You pick up to five artists you actually listen to. The product finds people who share those artists (and nearby taste), lets you tap “I’m interested,” and unlocks socials only when it’s mutual. Shows are listed for your artists and matches so you can RSVP and meet there.

---

## 2. Audience / context

- Concert-goers who care about **taste overlap**, not follower counts.
- Bay Area–flavored demo data (Berkeley / Oakland / SF venues like Greek Theatre, Fillmore, Fox Oakland) — use as atmosphere, not a hard lock-in.
- Light hackathon/community energy on Crowd (“hackers have joined”) — keep it understated; don’t design a “startup pitch” deck.
- Tone of voice: short, plain, specific. No AI marketing fluff (“reimagine connection,” “curated community,” etc.).

---

## 3. Brand & visual system

### Concept: “Artist gallery → go together”
- The site feels like a quiet gallery wall: near-white ground, hairline structure, color reserved for artist portraits and show posters.
- Landing metaphor: an **arc of artist portrait tiles** around centered brand + headline + one CTA (radial gallery energy — not DVD discs).
- Match browsing: one clear focus per screen — strong simple cards / focused stack, not translucent rows.

### Atmosphere
- Base: soft cool gray `#f4f5f7` with a subtle paper wash (cool gray radials only).
- Surfaces: white `#ffffff` panels with `1px` border `rgba(18,18,18,0.12)`.
- Soft fill: `#eceef2`.
- **No** glass blur, frosted chrome, dark vignettes, or purple gradient orbs.
- Artist photos belong **inside** chips, match cards, show posters, and the landing arc — not as blurred wallpaper.

### Typography
| Role | Font | Weight / feel |
|------|------|----------------|
| Brand, headings (h1–h3) | **Sulphur Point** | Normal / light display; tracking tight; large sizes (40–72px) |
| Welcome headline | **Inter** | Semibold, tracking-tight. Phone about 2.25rem. Not a second wordmark. |
| Body, UI, labels, nav | **Inter** | Regular; readable at 14–16px |
| Brand wordmark in header | **Inter** | Bold (700), uppercase, tracking-tight. Not Sulphur Point, not wide letter-spacing. |

Other screens keep Sulphur Point for headings. The welcome headline is the exception: Inter semibold, calm and tight, not bold-heavy SaaS.

### Color & surfaces
- Foreground: near-black `#121212`; muted copy: `rgba(18,18,18,0.55)`.
- Panel: white fill, hairline border, radius **18px** for cards; **999px** for pills/fields.
- Primary CTA: **solid near-black** pill, **white** text, full-width or max ~17.5rem on marketing CTAs, min-height 48px.
- Secondary / Skip: outlined white pill with dark text (no frosted glass).
- Match strength badge: small **near-black pill**, white text (“Strong match” / “Good match” / “72%”).
- Accent = near-black. No violet glass accents.

### Layout widths
- App flows: content max ~**42rem** (672px), centered.
- Pick / wide sections: ~**64rem**.
- Hero: desktop arc about `min(90vw, 68rem)`; centered composition (arc, clear gap, headline, one CTA).
- Desktop-first **website** chrome: fixed top header — logo left, simple text links when signed in, solid CTA right.
- Mobile app tabs: light floating **bottom nav** (Matches / Shows / Crowd / Profile). Hidden on welcome + onboarding.

### Motion (keep light — CSS only)
- Welcome arc: tiles stagger in once, then the headline and CTA. No infinite breathe.
- Chip enter scale; finding chips slide in.
- CTA hover: slight lift (−2px). Respect reduced motion.

---

## 4. IA / screens

| Route | Purpose |
|-------|---------|
| `/` Welcome | Logo-only header, wide artist arc, one Inter headline, one state-aware CTA |
| `/pick` | Search/select 1–5 artists (draft) |
| `/about` | Handle + city |
| `/socials` | Optional Instagram / TikTok / Snapchat; Skip allowed |
| `/finding` | Short transition: artist chips + “Finding matches” |
| `/matches` | Ranked people who share taste |
| `/matches/[id]` | One person: why, shared artists, interested → mutual socials |
| `/shows` | Upcoming shows for your artists/matches + RSVP |
| `/shows/[id]` | Single show detail |
| `/crowd` | Room pulse: joined count, top artists, people going |
| `/me` | Edit profile: handle, city, socials, artists |

**Chrome**
- `SiteHeader` on `/`: wordmark only — no app links, no header button. On every other page: guest = “RESONATE” + Get started/Continue only. App links (Matches · Shows · Crowd · Profile) are post-auth only (after `userId`) — plain text links, no glass pill.
- `BottomNav` only after onboarding (not on `/`, pick, about, socials, finding).

---

## 5. Key user flows

### A. First-run → matches
1. Welcome → **Get started**
2. **Pick artists** (at least 1, max 5) → Continue
3. **About you** (handle required, city default Berkeley) → Continue
4. **Socials** (optional) → Continue or Skip → creates profile
5. **Finding matches** (~1.5s animation) → auto to Matches
6. On a match: **I’m interested** or **Skip** → when mutual, socials unlock plus one suggested show to go to together

### B. After you’re in
- Matches ↔ Shows ↔ Crowd ↔ Profile via top nav (desktop) or bottom nav (mobile).
- Shows: RSVP Going / Maybe / Not going.
- Profile: edit artists/socials; empty socials prompt on Matches to “Add on Profile.”

---

## 6. Screen-by-screen UI spec

### Welcome `/`
**Must have**
- Fixed header: logo only. No Matches / Shows / Crowd / Profile, and no header button. Those stay on every other page.
- No second “Resonate” under the arc. **One headline** — `Meet people who like the same artists.` — one sentence, Inter semibold, tracking-tight. Phone size about 2.25rem. It may wrap on a narrow screen. No second sentence, no eyebrow, no subcopy.
- **One CTA**, same rules as the header on other pages: guest `Get started` → `/pick`; signed-in `Continue` → `/matches`; mid-draft (artists or handle saved) `Continue` → `/pick`. Button about 17.5rem wide.
- Arc of artist portraits as the frame, not a small sticker. **5 tiles on a phone** (shallower arc), **7 on desktop**. Desktop frame about `min(90vw, 68rem)`, tiles about 7.5–9rem tall. A clear gap under the arc so tiles never cross the letters. Two arc layouts, switched with CSS at the breakpoint (angles match the tiles that are visible).
- Tiles stagger in once; headline and button follow. No looping motion.
- The group is centered in the viewport. Outer tiles stay fully on screen.
- Light cool-gray ground; no glass, no dark gradient orbs.

**Do not put**
- A second “Resonate” eyebrow.
- Subcopy fluff under the headline.
- Header nav or a second CTA on this screen.
- “How it works” nav or section.
- Stats strips, feature grids, testimonials, app-store badges, purple SaaS cards.
- DVD / physical-media metaphors (product is concerts + taste).
- Infinite up-and-down motion on the tiles.

### Pick `/pick`
- Back link labeled “Resonate” → home.
- Title: `Pick your artists` + outlined pill counter `N of 5`.
- Helper: `At least one. Up to five.`
- Selected artists as removable **ArtistChips**.
- Pill search field: `Search an artist`.
- Desktop: sticky left column (title/search/CTA) + right grid of suggested / results (`ArtistResult` rows).
- Mobile: sticky bottom bar with Continue (disabled until ≥1 artist).

### About `/about`
- Title `About you` · sub `Handle and city.`
- Two pill inputs: Handle (`maya`), City (`Berkeley`).
- Sticky Continue at bottom.

### Socials `/socials`
- Title `Socials` · sub: optional; shared only after both tap interested.
- Fields: Instagram, TikTok, Snapchat (`@you`).
- Primary Continue + text link `Skip for now`.

### Finding `/finding`
- Centered: selected artist chips animating in → title `Finding matches` → `Looking for shared artists.`
- Light gallery ground (no color-pulse glass).
- No forms, no fake progress bars with marketing copy.

### Matches `/matches`
- Large title `Matches`.
- Vertical stack of **MatchCards** (strong simple white panels): cover from shared artist with handle + city, then why row (faces + count + strength pill + show), then Interested / Skip.
- Card footer: near-black `I'm interested` + outlined `Skip`. Once mutual: one near-black `It's mutual — open` button.
- Skip undo bar: outlined pill with Undo.
- Empty / early states: calm white panels + CTA to Crowd or edit artists.

### Match detail `/matches/[id]`
- Back to matches. One person = one focus.
- Huge handle + city; optional `demo` chip.
- Panel: shared artists + strength pill + show row.
- Mutual → socials + optional **Go together** suggested show.
- Keep Interested / Skip demo loop intact.

### Shows `/shows`
- Title + one-line sub.
- Poster cards in white panels: artist photo, bottom gradient for legibility, RSVP control.

### Crowd `/crowd`
- Title + honest sub.
- Big joined number, top artists chips, people going list + See shows.

### Profile `/me`
- Small uppercase handle eyebrow → `Profile` title.
- White panel sections: identity, socials, artists → Save.

---

## 7. Component list (design system)

1. **SiteHeader** — on `/` wordmark only; elsewhere brand wordmark · plain text nav · near-black CTA · mobile Menu sheet  
2. **BottomNav** — light bordered pill, 4 tabs with stroke icons  
3. **GradientBackground** — light page wash shell (legacy name; not dark glass)  
4. **PrimaryButton** — near-black full-width pill, white text  
5. **GlassCard / panel** — white hairline panel, 18px radius (legacy export name)  
6. **field** — rounded-full search & form fields on white  
7. **ArtistChip** — round photo + name; optional × remove  
8. **ArtistResult** — row: avatar + name (+ “Added”)  
9. **MatchCard** — image header → why → Interested / Skip  
10. **RsvpControl** — 3-option segmented light pill  
11. **BackLink** — ← Back / Resonate  
12. **Skeleton** — soft gray loading blocks  
13. **Hero gallery arc** — 5 phone / 7 desktop portrait tiles, one-shot stagger, then still  

Tokens to mirror:

```
--background: #f4f5f7
--foreground: #121212
--muted: rgba(18,18,18,0.55)
--border: rgba(18,18,18,0.12)
--surface: #ffffff
--surface-soft: #eceef2
--radius: 18px
--content-max: 42rem
--content-wide: 64rem
--font-display: Sulphur Point
--font-sans: Inter
```

---

## 8. Do / Don’t for Figma Make

### Do
- Light cool-gray gallery pages with airy negative space.
- Header wordmark is Inter bold, uppercase, tracking-tight. Welcome headline is Inter semibold. Other headings can stay Sulphur Point.
- Near-black primary CTAs; white panels with hairline borders.
- Desktop website header + mobile bottom nav for app tabs.
- Welcome hero = logo in the header, wide portrait arc, Inter headline, one CTA. No second wordmark.
- Put artist imagery in chips/cards/posters/hero arc.
- One clear focus on match detail (A24 lesson applied to people, not DVDs).

### Don’t
- Dark glassmorphism, backdrop-blur chrome, frosted pills.
- Purple-on-white / purple-indigo AI SaaS look.
- Warm cream + terracotta editorial cliché.
- Portrait-collage wallpaper blur stacks.
- How it works / subcopy fluff on landing.
- Bottom nav on welcome/onboarding.
- DVD / disc carousel metaphors.

---

## Generation priorities (order)

1. Welcome (desktop + mobile) with radial artist gallery  
2. Pick artists (desktop two-column)  
3. Matches list + Match detail  
4. Shows list with RSVP  
5. SiteHeader + BottomNav + PrimaryButton + ArtistChip set  
6. About / Socials / Finding / Crowd / Profile as secondary frames  

Output: high-fidelity **light gallery** UI frames aligned to the tokens and copy above, ready to hand off toward the existing Next.js app.
