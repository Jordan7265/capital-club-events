# Launch record: Capital Club Events demo site

Step 3 of [the plan](plans/capital-club-events-demo-site/plan.md) (domain and launch
verification), carried out on 2026-11-07. The site is built in Direction A, Skyline Noir (see
[the design decision](design-decision.md)).

## Final URLs

| URL | Role |
| --- | --- |
| **https://www.capitalclubavlevents.com** | Canonical live site |
| https://capitalclubavlevents.com | 308 redirect to `https://www.capitalclubavlevents.com`, keeping path and query |
| https://capital-club-events.vercel.app | Vercel production alias that serves the same deployment (noindexed like every route) |

## Domain and redirect configuration

- **Domain:** `capitalclubavlevents.com`, bought by the operator through Vercel on 2026-11-07.
  Vercel is the registrar and DNS host (nameservers `ns1.vercel-dns.com` and `ns2.vercel-dns.com`).
- **Expiry:** 2027-11-07. **Auto-renew is OFF.** The operator was reminded and can turn it on in
  Vercel → Domains → capitalclubavlevents.com. No agent changes billing or renewal settings.
- **Canonical host:** `www`. On 2026-11-07, via Mission Control, the operator chose to keep the
  configuration as attached rather than the plan's default (`www` → apex). No Vercel change was
  needed.
- **Vercel project domains** (project `capital-club-events`, `prj_vH1DibWaTDQsCtUY0oiSQHVENnjY`,
  team `team_kk8pgfBj70UFlHGr2PAtCKLl`, production branch `main`):

  | Domain | Redirect | Status | Verified |
  | --- | --- | --- | --- |
  | `www.capitalclubavlevents.com` | none: serves production | n/a | yes |
  | `capitalclubavlevents.com` | `www.capitalclubavlevents.com` | 308 | yes |
  | `capital-club-events.vercel.app` | none | n/a | yes |

- **TLS:** Let's Encrypt certificates are issued and renewed by Vercel. `www` is covered by its own
  certificate; the apex by one for `capitalclubavlevents.com` and `*.capitalclubavlevents.com`.
  Both are TLSv1.3, trusted, and currently valid to 2027-02-05.
- **Expected, not a defect:** Vercel's domain-level 308 response carries no `X-Robots-Tag`, because
  `vercel.json` headers apply only to responses the deployment serves. The redirect has no content,
  and its target is noindexed.

## Verification on the live domain

Production at verification time: commit `2dacf46` (PR #5), deployment
`dpl_2eVGBUmcUEtS61hBDbWrNTf1xBjH`.

### HTTP checks: `npm run verify:live` (all passed)

`scripts/verify-live.mjs` checks:

- **TLS:** both hosts are trusted, TLSv1.3, more than 14 days to expiry.
- **HTTP upgrade:** `http://www.capitalclubavlevents.com/events` returns 308 to its `https://` URL.
- **Redirect:** `https://capitalclubavlevents.com{/, /events/winter-jazz-night,
  /photos?from=launch-check, /this-page-does-not-exist}` each return 308 to the same path and
  query on `https://www.capitalclubavlevents.com`.
- **Status and noindex header:** each route below carries
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.
  - 200: `/`, `/events`, all seven `/events/[slug]`, `/photos`, `/contact`.
  - 404: `/this-page-does-not-exist`, `/mockups`, `/mockups/a`, `/mockups/b/events`.
- **No sitemap:** `/sitemap.xml`, `/sitemap-index.xml` and `/sitemap-0.xml` return 404.
- **robots.txt:** `/robots.txt` returns 200 with exactly `User-agent: *` / `Disallow: /`, and
  names no sitemap.
- **Robots meta:** the HTML carries `<meta name="robots" content="noindex, nofollow">`.

### Browser checks against production (all passed)

`PLAYWRIGHT_BASE_URL=https://www.capitalclubavlevents.com npm run test:e2e` passed 53 of 53 on
the `2dacf46` suite. This includes:

- **Reservation form**, at 1440 and 390px: inline validation, the ~1 s "Submitting…" state, and
  the "You're on the list!" confirmation with a `CC-1114-XXXX` code. It records **zero network
  requests** and the URL does not change.
- **Contact form:** the same flow, with a `CC-MSG-XXXX` reference and **zero network requests**.
- **Lightbox:** keyboard, click, focus trap, Esc, and focus return.
- **Phone layout (375, 390, 430):** no horizontal scroll, tap-target and text-size gates,
  single-column forms, and the mobile reserve bar.

## Mobile launch gate

The operator asked that the site look good on phones, so screenshots were reviewed for every page at
375, 390, 430 and 1440px. That covered the open lightbox, the reservation form's inline errors,
the reservation and contact confirmations, and the mobile reserve bar. `npm run screenshots`
captures this set; for production, pass `https://www.capitalclubavlevents.com`. An independent
audit also measured tap targets (width and height) and text sizes in every page and every
interactive state.

### Found on production and fixed in this change

| Defect | Widths | Fix |
| --- | --- | --- |
| Reservation confirmation squeezed each value to the right of its label, so the time range split mid-range ("4:30 –" / "8:30 PM") and the event name wrapped ragged-right. The contact confirmation shares the layout. | 375, 390, 430 | On phones (≤ 560px) each label now sits above a left-aligned value. The date and the time range are each kept on one line, so the value only wraps at the "·" between them. |
| Home "next evening" facts were two columns, so the date split ("Saturday, November" / "14, 2026"). | 375, 390, 430 | On phones the facts list is one column, so each value has the full width. |
| Footer "Home" link was 43px wide, under the 44px tap-target minimum. | all phones | `.cc-link` has a 44px minimum width. |
| Text under 16px: uppercase labels, eyebrows, dates and button text at 9.9 to 12.8px, and fine print at 12.8 to 14px ("per person", "(optional)", the reserve-bar subline, the ticket stub note, the footer). | 375, 390, 430 | On phones (≤ 560px) every one of them is 16px. Uppercase tracking tightens so labels still fit. The nav links and "Make another reservation" / "Send another message" switch to sentence case, because uppercase at 16px would wrap them. Long eyebrows wrap in balanced lines. The 9.9px header tagline ("Rooftop Events · Asheville") is hidden on phones, because it cannot fit beside the logo at 16px; the club name stays. Desktop keeps its type scale. |

**Checked with no defect found:**

- **Layout:** no horizontal overflow on any page or state. No overlaps: the café lights stay clear
  of the hero text, and the outline "14" over the spotlight photo is a deliberate design move.
- **Forms:** single-column on phones, with controls at least 44px tall.
- **Lightbox:** the close, previous and next buttons are 48 × 48.
- **Reserve bar:** clear of content.

**Text sizes:** on phones, no visible text is under 16px. This covers every page, the open
lightbox, the reservation form's errors, and both confirmations. It includes labels, buttons,
fine print and decorative (`aria-hidden`) text. A Playwright test enforces it at 375, 390 and
430px with no exemptions.

### Benefit imagery (operator request, same change)

The operator asked that the Nov 14 Playgrounds for Asheville benefit not be shown with a wedding
photo. The home spotlight used a rooftop wedding ceremony. The benefit now uses a free-license
photo of children on playground swings everywhere it appears: the home spotlight, the event
page hero and the `/events` row.

- **Photo:** Pexels 4430308, "Children Playing on Swing", by cottonbro studio, under the Pexels
  License. Taken in India, so it is never captioned as an Asheville playground.
- **File:** `public/images/events/playground-swings-golden-hour.webp`, 1800 × 1200, 169 KB, no
  metadata. Source and license are in `public/images/CREDITS.md`.
- **Crops:** the children are seen from behind or mid-swing, with no identifiable faces. The
  4:5 spotlight keeps both swings in frame; the tall phone hero uses its own `phonePosition` to
  centre one child.
- The rooftop dusk photo stays as the home page hero, because it represents the venue.

### Regression tests added

`tests/site.spec.ts` now has 63 tests. Each added test is listed below with what it checks.

- **Text size (phones):** no visible text under 16px on any page, or with the lightbox open, form
  errors showing, or a confirmation showing. This replaces the step-2 test, which exempted
  labels and fine print.
- **Tap targets (phones):** every target must be at least 44px **wide** as well as tall.
- **Spotlight "When" (phones):** spans the row, and its value is exactly two lines.
- **Reservation confirmation (phones):**
  - Every value sits below its label, left-aligned.
  - The date and the time range each stay on one line.
  - "Make another reservation" is at least 44 × 44.
- **Open lightbox (phones):** close, previous and next are at least 44 × 44.
- **Benefit image:** the home spotlight, the `/events` row and the event hero all use the
  playground photo.

Against the unfixed production site, the new and tightened checks fail on exactly these defects;
against the fixed build, all 63 Playwright tests pass. The fixed build also passes `npm run lint`,
`npm run check` (0 errors) and `npm run verify:noindex`.

### Live verifier tests

`tests/verify-live.unit.mjs` (22 tests, `npm run test:scripts`, part of `make test`) gives
`scripts/verify-live.mjs` a fake site that passes every check, then breaks one condition per test.
It asserts the failure and its diagnostic for each of these:

- An untrusted, expiring or unreachable certificate. A boundary test pins the expiry cutoff:
  exactly 14 days left fails, 15 passes.
- http not upgraded to https.
- A 301 instead of a 308, a dropped path or query, or the wrong redirect host.
- A page not returning 200, a missing or weaker `X-Robots-Tag`, a soft 404, or `/mockups` coming
  back.
- A served sitemap.
- A robots.txt that allows crawling, names a sitemap, or lacks `Disallow: /`.
- A missing robots meta.
- A request with no response.

`main` must return exit code 1 with FAIL lines and a summary, and the real CLI must exit 1
against unreachable `.invalid` hosts. Weakening the redirect or noindex check makes these
tests fail.

## After merging

Merging to `main` deploys. Then re-run both checks against production and expect them to pass:

```sh
npm run verify:live
PLAYWRIGHT_BASE_URL=https://www.capitalclubavlevents.com npm run test:e2e   # expect 63 passed
```
