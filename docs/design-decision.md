# Design decision — Capital Club Events demo site

**Decision:** Direction **A — Skyline Noir**
**Decided by:** operator, via Mission Control, 2026-11-07
**Mix-and-match notes:** none. Use A as built.

The three mockups were reviewed live at https://www.capitalclubavlevents.com/mockups. They
were built in step 1 of [the plan](plans/capital-club-events-demo-site/plan.md) (PR #2).

| Option | Summary | Status |
| --- | --- | --- |
| **A — Skyline Noir** | Dark rooftop luxe: ink-blue night, gilded hairlines, twinkling café lights across a full-screen dusk hero, high-contrast Bodoni type | **Chosen** |
| B — Society Pages | Light editorial: ivory broadsheet masthead, Caslon headlines, oxblood accents, R.S.V.P. reply-card form | Not chosen |
| C — Ridgeline | Warm modern Blue Ridge: generated ridgelines, golden-hour sun, Bricolage Grotesque, rounded cards, guest stepper | Not chosen |

## What carries into the full build (step 2)

The source of truth is the A implementation as merged: `src/mockups/a/` (`LayoutA.astro`,
`a.css`, `StringLights.astro`) and `src/pages/mockups/a/`.

- **Palette:** night ink `#0b0d12`, panel `#11141b` / `#191d26`, gilt `#d6b274`, gilt-deep
  `#b48e4f`, glow `#ffd99a`, linen text `#f1eadf`, muted `#aaa397`, error `#ff9b8a`.
- **Type:** Bodoni Moda (variable, optical sizes, roman + italic) for display; Jost (variable)
  for text and uppercase tracked labels. Self-hosted via `@fontsource-variable`.
- **Signature moves to keep:**
  - The animated café-light string over the full-bleed rooftop-at-dusk hero, positioned below the header.
  - Gold italic emphasis in headlines.
  - Event "program" rows with oversized date numerals and a hover photo reveal (desktop only).
  - Ticket-stub details panel with an "Admit one" price stub.
  - A sticky, gilded reservation card using the shared `ReservationForm` with the `rf--a` theme.
  - Gold drop cap on event descriptions.
  - A subtle film-grain overlay.
- **Motion:** staged rise-in reveals on hero text, a slow hero zoom, and twinkling bulbs, all
  disabled under `prefers-reduced-motion`.

## Step 2 housekeeping implied by this decision

- Promote the A layout, styles and components to the real site routes (`/`, `/events`,
  `/events/[slug]`, `/photos`, `/contact`, 404), then delete `src/mockups/`, the
  `/mockups` pages, `MockupBar.astro` and `src/mockups/directions.ts`. Remove the B/C-only
  font packages (`@fontsource/libre-caslon-display`, `@fontsource-variable/newsreader`,
  `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/figtree`).
- Replace the temporary holding page at `/` with the real homepage.
- Keep all three noindex layers and the shared mock-form behavior (no network, disabled
  without JS). Move `tests/mockups.spec.ts` coverage onto the real routes.

## Context recorded alongside the decision

- **Repository:** moved from `Jordan7265/capital-club-events` to `mancej/capital-club-events`
  so the Vercel account (signed in as GitHub `mancej`) could link it. `Jordan7265` keeps write
  access.
- **Vercel:** project `capital-club-events` (`prj_vH1DibWaTDQsCtUY0oiSQHVENnjY`), team
  `mancejs-projects`, production branch `main`.
- **Domain:** the operator bought `capitalclubavlevents.com` through Vercel on 2026-11-07, and
  it is already attached. Currently the apex 308-redirects to `www`; the plan specified `www`
  redirecting to the apex. Which way is canonical is left for step 3 to confirm with the operator.
