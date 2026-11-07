# Capital Club Events — demo site

A fully static, **non-indexed** demo website listing events at The Capital Club of Asheville
(rooftop venue, 82 Patton Ave, Asheville, NC). It is a sales/demo prop, not a live business
system: nothing a visitor types ever leaves the browser.

The spec lives in [`docs/plans/capital-club-events-demo-site/plan.md`](docs/plans/capital-club-events-demo-site/plan.md).

## Current state: design review

Three visual directions are built as static mockups so one can be chosen before the full site
is built:

| Route | What it shows |
| --- | --- |
| `/mockups` | Comparison board: live previews, palettes, type pairings, links |
| `/mockups/a` · `/mockups/a/events` · `/mockups/a/events/playgrounds-for-asheville-rooftop-benefit` | **A — Skyline Noir**: dark rooftop luxe |
| `/mockups/b` · `/mockups/b/events` · `/mockups/b/events/playgrounds-for-asheville-rooftop-benefit` | **B — Society Pages**: light editorial / classic |
| `/mockups/c` · `/mockups/c/events` · `/mockups/c/events/playgrounds-for-asheville-rooftop-benefit` | **C — Ridgeline**: warm modern Blue Ridge |
| `/` | Temporary holding page that links to `/mockups` |

Each direction's event pages include the mock reservation form. It validates inline, shows a
~1 s "Submitting…" state, then a confirmation with a fake code (e.g. `CC-1114-4F7A`). It makes
no network request. Without JavaScript the submit button stays disabled and a note explains why.

## Stack

- [Astro](https://astro.build) 7 with `output: 'static'` and no adapter: no server routes, API
  endpoints or form services.
- Plain CSS per direction, with fonts self-hosted through `@fontsource` (no third-party font
  requests).
- Minimal vanilla TypeScript for the mock form (`src/scripts/reservation-form.ts`).
- Event content is typed in `src/data/events.ts`, and event pages are generated from it.
- Hosting: Vercel project `capital-club-events` (team `mancejs-projects`), git-connected to
  GitHub `mancej/capital-club-events` (transferred from `Jordan7265`, which keeps write access)
  with `main` as production. Production URL: https://capital-club-events.vercel.app. Pushing or
  merging to `main` deploys, and PRs get preview deployments behind Vercel Authentication.

## Do-not-index layers (all routes)

1. `vercel.json` sends `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` for `/(.*)`.
2. `src/layouts/BaseLayout.astro` emits `<meta name="robots" content="noindex, nofollow">`.
3. `public/robots.txt` is `User-agent: *` / `Disallow: /`. No sitemap is generated.

`npm run verify:noindex` checks all three against the build output.

## Commands

Requires Node ≥ 22.23.4.

```sh
npm install
npm run dev              # local dev server
npm run build            # static build → dist/
npm run verify:noindex   # check the three noindex layers against dist/
npm run check            # astro check (types + diagnostics)
npx playwright install chromium   # once, for browser tests
npm run test:e2e         # Playwright: builds, serves dist/, runs tests/mockups.spec.ts
```

## Layout

```
public/
  robots.txt                 # Disallow: /
  images/venue/              # venue photos + logo (compressed WebP, ≤ 300 KB, ≤ 1800 px)
src/
  data/events.ts             # typed events + venue details (single source of truth)
  lib/format.ts              # Eastern-time date/time/price formatting
  layouts/BaseLayout.astro   # shared <head> incl. robots meta
  components/
    ReservationForm.astro    # shared mock reservation form markup
    MockupBar.astro          # review strip on mockup pages
  scripts/reservation-form.ts# client-side validation + fake submit (no network)
  mockups/{a,b,c}/           # per-direction layout, CSS and decorative components
  mockups/directions.ts      # names/descriptions shared by the board and review bar
  pages/
    index.astro, 404.astro
    mockups/index.astro
    mockups/{a,b,c}/index.astro, events/index.astro, events/[slug].astro
scripts/verify-noindex.mjs
tests/mockups.spec.ts
```

## Imagery

Venue photography and the logo come from capitalclubavl.com (home and gallery pages, under
`/wp-content/uploads/`). The operator authorized reuse for this demo. Files are downloaded and
re-encoded locally, with metadata stripped, never hotlinked.

Footer note on every page: *Demonstration site — reservations and messages are not processed.*
