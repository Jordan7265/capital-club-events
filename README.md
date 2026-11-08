# Capital Club Events: demo site

A fully static, **non-indexed** demo website listing events at The Capital Club of Asheville
(rooftop venue, 82 Patton Ave, Asheville, NC). It is a sales/demo prop, not a live business
system: nothing a visitor types ever leaves the browser.

The spec lives in [`docs/plans/capital-club-events-demo-site/plan.md`](docs/plans/capital-club-events-demo-site/plan.md).

## Pages

Built in Direction A, **Skyline Noir** (dark rooftop luxe), chosen by the operator. See
[`docs/design-decision.md`](docs/design-decision.md).

| Route | What it shows |
| --- | --- |
| `/` | Dusk rooftop hero with café lights, the Nov 14 toy-drive spotlight, three more upcoming events, venue blurb, photo strip |
| `/events` | All seven upcoming events by month, each with photo, date, time, attire, price and a Reserve link |
| `/events/[slug]` | One page per event: description, details "ticket", map link and the mock reservation form |
| `/photos` | 16-photo gallery with an accessible lightbox (arrow keys, Home/End, Esc, swipe) |
| `/contact` | Address, phone, hours, a map card linking to Google Maps, and the mock contact form |
| 404 | Branded not-found page |

### Mock forms (no network, ever)

The reservation form (every event page) and the contact form share `src/scripts/mock-form.ts`.
They validate inline, show a ~1 s "Submitting…" state, then a confirmation with a fake code
(`CC-1114-4F7A` for reservations, `CC-MSG-4F7A` for messages). They make no network request
and never navigate. Without JavaScript the submit button stays disabled and a note explains why.
The reservation confirmation also tells guests to check the email address they entered for their
confirmation. No email is sent; the footer disclaimer says reservations are not processed.

Events with a `toyDrive` in `src/data/events.ts` (currently only Nov 14, "Deck the Rooftop") also
show a toy-drive panel and details row on the event page, a callout in the home spotlight and on
`/events`, and an optional "Toys you’ll bring to donate" picker (default one toy). The pledge is
echoed in the reservation confirmation.

On phones, event pages also show a slim "$125 · Reserve" bar that jumps to the form. It hides
once the form reaches the screen.

## Stack

- [Astro](https://astro.build) 7 with `output: 'static'` and no adapter: no server routes, API
  endpoints or form services.
- One plain stylesheet (`src/styles/site.css`), with fonts self-hosted through `@fontsource`
  (no third-party font requests).
- Minimal vanilla TypeScript for the mock forms, the lightbox and the mobile reserve bar
  (`src/scripts/`).
- Event content is typed in `src/data/events.ts`, and event pages are generated from it.
- Hosting: Vercel project `capital-club-events` (team `mancejs-projects`), git-connected to
  GitHub `mancej/capital-club-events` (transferred from `Jordan7265`, which keeps write access)
  with `main` as production. Pushing or merging to `main` deploys, and PRs get preview
  deployments behind Vercel Authentication.
- Live at **https://www.capitalclubavlevents.com** (canonical). `capitalclubavlevents.com`
  308-redirects to it with the path kept, and https://capital-club-events.vercel.app serves the
  same deployment. Domain, redirect and launch checks: [`docs/launch.md`](docs/launch.md).

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
npm run lint             # project rules: no network calls or API routes, no em dashes, no report.html
npx playwright install chromium   # once, for browser tests
npm run test:e2e         # Playwright: builds, serves dist/, runs tests/site.spec.ts
npm run screenshots      # full-page PNGs of every route at 375/390/430/1440 → .evidence/ (needs `npm run preview` running)
npm run verify:live      # live domain: TLS, apex → www 308, status + X-Robots-Tag per route, robots.txt, no sitemap
npm run test:scripts     # unit tests: each verify:live check fails on a bad response
PLAYWRIGHT_BASE_URL=https://www.capitalclubavlevents.com npm run test:e2e   # the Playwright suite against production
node scripts/screenshots.mjs https://www.capitalclubavlevents.com .evidence/live   # screenshots of production
```

The same checks are available through `make`: `make check` (types), `make lint` (project rules) and
`make test` (build, noindex verification, the verify:live unit tests, then the Playwright suite).

## Layout

```
public/
  robots.txt                 # Disallow: /
  images/venue/              # venue photos + logo (compressed WebP, ≤ 300 KB, ≤ 1800 px)
src/
  data/events.ts             # typed events, venue details and gallery photos (single source of truth)
  lib/format.ts              # Eastern-time date/time/price formatting
  layouts/
    BaseLayout.astro         # shared <head> incl. robots meta
    SiteLayout.astro         # header nav, main, footer with the demo disclaimer
  components/
    EventRow.astro           # "program" row used on / and /events
    StringLights.astro       # animated café-light strands over the home hero
    FormField.astro          # label + control + inline error slot
    ReservationForm.astro    # mock reservation form
    ContactForm.astro        # mock contact form
  scripts/
    mock-form.ts             # shared validation + fake submit (no network)
    reservation-form.ts, contact-form.ts
    lightbox.ts              # /photos dialog
    reserve-bar.ts           # mobile "Reserve" bar on event pages
  styles/base.css, site.css
  pages/
    index.astro, 404.astro, photos.astro, contact.astro
    events/index.astro, events/[slug].astro
scripts/verify-noindex.mjs, scripts/verify-live.mjs, scripts/screenshots.mjs
tests/site.spec.ts, tests/verify-live.unit.mjs
```

## Imagery

Venue photography and the logo come from capitalclubavl.com (home and gallery pages, under
`/wp-content/uploads/`). The operator authorized reuse for this demo. Files are downloaded and
re-encoded locally, with metadata stripped, never hotlinked.

The Nov 14 "Deck the Rooftop" holiday toy drive (benefiting the Asheville City Schools
Foundation) is pictured by a free-license stock photo of a teddy bear under holiday lights
(`public/images/events/`, Pexels License), not a venue photo. Its source, photographer and
license are in [`public/images/CREDITS.md`](public/images/CREDITS.md). The event's old URL,
`/events/playgrounds-for-asheville-rooftop-benefit`, permanently redirects to the new one via
`vercel.json`.

Footer note on every page: *Demonstration site. Reservations and messages are not processed.*
