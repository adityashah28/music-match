# Resonate design system

Source of truth for UI: `app/globals.css`, `app/layout.tsx`, and components under `components/`.  
This file mirrors **what is shipped now**. Prefer code over older briefs.

---

## 1. Brand & composition

- **Product:** Match people by music taste; find shows to go to together.
- **Look:** Quiet light gallery — cool gray ground, hairline borders, color lives in portraits. Not dark mode, not glass, not SaaS dashboard.
- **One composition per viewport.** Landing = arc + one headline + one CTA. Don’t stack promos, stats, or secondary marketing in the first screen.
- **Brand mark:** Quiet corner signature in `SiteHeader` (top-left). Not a second hero headline. Don’t center the wordmark in the hero stack.
- **Tone:** Short, plain, specific. No “reimagine connection” fluff.
- **Avoid:** Purple / indigo gradients, warm cream + terracotta, broadsheet newspaper layouts, glass blur, glow orbs, emoji decoration, card-heavy heroes.

---

## 2. Typography

Loaded in `app/layout.tsx` via `next/font/google`:

| Role | Font | How |
|------|------|-----|
| Body, UI, nav, buttons, fields | **Khula** | `--font-sans` / `font-sans` / body default |
| Page titles, h1–h3, hero headline | **Instrument Serif** | `--font-display` / `font-display` / global `h1,h2,h3` |
| Wordmark “Resonate” | **Instrument Serif** | `font-wordmark` |

**Do not use Inter** (or Sulphur Point).

### Examples from code

```txt
Wordmark:  font-wordmark text-xl font-normal md:text-2xl  (title case, not uppercase)
Hero h1:   font-display text-[2.35rem] font-normal md:text-5xl lg:text-[3.35rem]
Page h1:   font-display text-[40px] font-normal leading-[1.02] tracking-tight
UI / nav:  font-sans text-sm | text-base font-normal
Buttons:   font-sans text-base font-normal leading-none + .btn-label on the label
```

Instrument Serif headings stay **font-normal (400)**. Khula for UI may use 400 / 600 / 700 where needed; prefer normal on primary pills.

---

## 3. Color tokens (`:root` in `globals.css`)

| Token | Value | Use |
|-------|--------|-----|
| `--background` | `#f4f5f7` | Page ground |
| `--foreground` | `#121212` | Text, primary pills |
| `--muted` | `rgba(18,18,18,0.55)` | Secondary copy |
| `--border` | `rgba(18,18,18,0.12)` | Hairlines |
| `--surface` | `#ffffff` | Panels, fields |
| `--surface-soft` | `#eceef2` | Soft fills / hover |
| `--radius` | `18px` | Cards / panels |
| `--accent` | `#121212` | Same as foreground |
| `--c1` / `--c2` | `#2a2a2a` / `#f4f5f7` | Legacy helpers |

Tailwind bridges: `bg-[var(--surface)]`, `text-[var(--muted)]`, `border-[var(--border)]`, etc.

**Atmosphere:** `.page-wash` — cool gray radials only (no purple/cream).

---

## 4. Layout & spacing

| Shell | Role |
|-------|------|
| `.screen` | App pages: max `--content-max` (42rem), top pad for fixed header |
| `.screen-nav` | Extra bottom pad for mobile bottom nav |
| `.screen-end` | Short bottom pad (no tab bar) |
| `.screen-wide` / `.screen-pick` | Max `--content-wide` (64rem) |
| `.hero-shell` | Full-viewport landing column |

Safe-area vars: `--safe-top|right|bottom|left`.

**Landing rhythm (current):** arc → `mt-6 md:mt-8` headline → `mt-7 md:mt-8` CTA (`max-w-[17.5rem]`). Keep arc / line / button as one tight group — don’t reintroduce huge empty gaps.

Header row top padding: `max(1.25rem, calc(0.5rem + env(safe-area-inset-top)))`.

---

## 5. Components

### Primary CTA — `components/PrimaryButton.tsx`

```txt
font-sans inline-flex min-h-12 w-full items-center justify-center
rounded-full bg-[var(--foreground)] px-6
text-center text-base font-normal leading-none text-white
```

- Label **must** wrap in `<span className="btn-label">…</span>` (Khula optical fix).
- `.btn-label` in CSS: `line-height: 1; transform: translateY(0.2em);`
- Hover: `hover:bg-neutral-800`. Don’t invent giant landing-only sizes — `LandingCta` uses the default PrimaryButton.

### Secondary / Skip pills

Same shell as primary but:

```txt
border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]
```

Also wrap label in `.btn-label`.

### Wordmark — `SiteHeader`

```txt
font-wordmark text-xl font-normal text-[var(--foreground)] md:text-2xl
hover:opacity-70
```

Title case: `Resonate`. Landing: wordmark only (no nav/CTA in header). Signed-in: text nav + small Continue pill (also `.btn-label`).

### Panels & fields

```txt
.panel       → white + border + radius 18px
.panel-soft  → surface-soft + border + radius 18px
.field       → pill input (radius 999px), white, hairline; focus darkens border
```

### Bottom nav — `BottomNav`

Mobile-only floating pill bar (Matches / Shows / Crowd / Profile). Hidden on `/`, onboarding routes. Labels use `.btn-label`.

### Match / artist chrome

- Prefer existing `MatchCard`, `ArtistChip`, `MatchActions`, `RsvpControl`.
- Match strength: small near-black pill, white text.
- Artist photos inside chips/cards/arc — not blurred page wallpaper.

---

## 6. Motion

CSS only; respect `prefers-reduced-motion`.

| Class | Behavior |
|-------|----------|
| `.gallery-enter` / tile delay | Arc tiles stagger in once |
| `.hero-rise` | Headline/CTA rise (stagger via `animationDelay`) |
| `.cta-hover:hover` | `translateY(-2px)` |
| `.chip-enter` | Chip scale-in |
| finding slide | Onboarding chip slide |

No infinite loops, no heavy parallax.

---

## 7. Images

- Component: `ArtistImage` + `sizedPortraitUrl` (Deezer `NxN` rewrite).
- **Landing hero arc:** `size={500}`, `quality={90}`, `sizes="(max-width: 768px) 28vw, 9rem"`.
- Chips / lists: smaller sizes (`120`, etc.) — don’t request 500 everywhere.
- Gallery CSS: `object-fit: cover` inside `.gallery-tile-inner`; no soft `image-rendering` hacks.
- Sources are CDN-capped (~500–1000px); don’t expect print sharpness from tiny Deezer thumbs.

---

## 8. Do / Don’t (for agents)

**Do**

- Use Khula for UI, Instrument Serif for titles + wordmark.
- Use CSS variables for color; PrimaryButton + `.btn-label` for CTAs.
- Keep landing: arc → one serif line → one black pill.
- Keep wordmark top-left, quiet, title case.
- Reuse `.screen` / `.panel` / `.field` / `.page-wash`.

**Don’t**

- Add Inter, Sulphur Point, or a third display font.
- Put brand in the hero stack or make the wordmark a second headline.
- Use glass, purple gradients, cream/terracotta clichés, or card grids in the hero.
- Ship oversized one-off CTA classes that break sitewide PrimaryButton.
- Drop `.btn-label` on pill text (Khula sits optically high).
- Invent a parallel token set — extend `globals.css` if you must.

---

## File map

| Path | Why |
|------|-----|
| `app/globals.css` | Tokens, shells, `.btn-label`, gallery, motion |
| `app/layout.tsx` | Font loading |
| `components/PrimaryButton.tsx` | Primary CTA |
| `components/SiteHeader.tsx` | Wordmark + chrome |
| `components/LandingCta.tsx` | Home CTA → PrimaryButton |
| `components/BottomNav.tsx` | Mobile tabs |
| `app/page.tsx` | Landing composition |
| `FIGMA_BRIEF.md` | Product/flows for Figma — defer to this file for live type/color |
