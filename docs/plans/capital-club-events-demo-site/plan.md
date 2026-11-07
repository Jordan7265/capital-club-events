# Capital Club Events — Demo Site Spec

A fully static, non-indexed demo website listing events at **The Capital Club of Asheville**
(rooftop venue, 82 Patton Ave, Asheville, NC 28801 · 828-398-5055 · reference site
https://capitalclubavl.com/). It is a sales/demo prop, not a live business system.

## Hard constraints

- **Fully static.** No database, no Supabase, no serverless/API functions, no third-party form
  services. Nothing a visitor types ever leaves the browser.
- **Stack:** Astro with static output (`output: 'static'`, no adapter), plain CSS, minimal
  vanilla JS for forms/lightbox. Node LTS. Content lives in a typed data file
  (`src/data/events.ts`); event detail pages are generated from it.
- **Hosting:** Vercel, git-connected to GitHub `Jordan7265/capital-club-events` (`main` =
  production). Vercel team `mancejs-projects` (`team_kk8pgfBj70UFlHGr2PAtCKLl`), Hobby plan.
  Project name `capital-club-events`. Pushing/merging to `main` deploys.
- **Domain (provisional):** `capitalclubavlevents.com` (+ `www` redirect to apex). The operator
  buys the domain themselves; agents must never purchase a domain.
- **Do not index — all three layers, on every route:**
  1. `vercel.json` header `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` for `/(.*)`.
  2. `<meta name="robots" content="noindex, nofollow">` in the shared layout `<head>`.
  3. `public/robots.txt` → `User-agent: *` / `Disallow: /`. No sitemap.
- **Demo disclaimer:** a discreet footer line, e.g. "Demonstration site — reservations and
  messages are not processed." Keep it subtle; the site should otherwise feel real.
- Never commit Mission Control `report.html` artifacts.

## Pages

| Route | Content |
| --- | --- |
| `/` | Hero with rooftop venue photo, next-event spotlight (Nov 14 fundraiser), 3 upcoming events, short venue blurb, CTA to events. |
| `/events` | All upcoming events, chronological, card per event (image, date, time, title, short blurb, price, "Reserve" CTA). |
| `/events/[slug]` | Full event detail: description, date/time, catering, entertainment, attire, price, venue address/map link, reservation form. |
| `/photos` | Venue gallery grid with accessible lightbox (keyboard + Esc). |
| `/contact` | Address, phone, hours placeholder, embedded map link (no API key), mock contact form. |
| 404 | Branded not-found page. |

Header nav: Upcoming Events · Photos · Contact (logo → home). Fully responsive (375px → 1440px),
accessible (labels, focus states, alt text, contrast AA).

## Mock reservation form (on each event page)

Fields: name, email, phone (optional), number of guests (1–10), dietary notes (optional).
Client-side validation with inline errors. On submit: `preventDefault`, show a ~1s
"Submitting…" state, then a confirmation panel ("You're on the list!") with a fake
confirmation code (e.g. `CC-1114-4F7A`), event name/date, guest count. **No network request.**
The contact form behaves the same way. Works with JS disabled gracefully (form does not post
anywhere; show a note).

## Events (today is 2026-11-07)

| Date | Event | Notes |
| --- | --- | --- |
| **Sat Nov 14, 2026**, 6:30–10:30 PM | **Playgrounds for Asheville — Rooftop Benefit** | Fundraiser to renovate local children's playgrounds in the Asheville area. Catered by **Mikasa Catering**. **Live DJ**. Attire: **cocktail or dressy casual**. $125/person, proceeds to playground renovation. Featured/next event. |
| Fri Nov 20, 2026, 7–10 PM | Blue Ridge Bourbon & Bites | Guided tasting of regional bourbons with small plates. Smart casual. $75. |
| Sat Dec 5, 2026, 5–9 PM | Winter Rooftop Market & Mulled Wine Social | Local makers, mulled wine, mountain views. Casual. $25. |
| Fri Dec 18, 2026, 7–11 PM | Mistletoe Masquerade Holiday Party | Masks encouraged, live band, holiday cocktails. Festive attire. $95. |
| Thu Dec 31, 2026, 8:30 PM–1 AM | New Year's Eve on the Rooftop | Champagne toast, DJ, skyline countdown. Black tie optional. $175. |
| Sat Jan 16, 2027, 7–10 PM | Winter Jazz Night | Live jazz trio, seasonal cocktails. Dressy casual. $60. |
| Sat Feb 13, 2027, 6–10 PM | Valentine's Supper Club | Plated dinner for two, live acoustic set. Cocktail attire. $150/couple. |

Copy for non-featured events is fictional; keep it tasteful and plausible. Do not name real
vendors other than Mikasa Catering.

## Imagery

Download venue photos from capitalclubavl.com (home page and its Gallery page, under
`/wp-content/uploads/`, e.g. `Building.jpg`, `photoshoot-4.jpg`, `rehearsal-40.jpg`,
`rehearsal-13-1024x683.jpg`, plus `logo.png`) into `public/images/venue/` (operator has
authorized reuse for this demo). Resize/compress to web sizes (≤ ~300 KB each, ≤ 2000px wide);
aim for 12–20 gallery photos. Do not hotlink.

## Delivery sequence (one Mission Control task each, dependency-linked)

1. **Mockups + Vercel bootstrap** — scaffold Astro + noindex layers, build 3 distinct visual
   directions as static mockup pages (home + events list + one event page each) under
   `/mockups/a|b|c` with an index at `/mockups`, create/link the Vercel project, merge, verify
   the production URL serves them with noindex headers, then ask the operator to pick a
   direction (`request_input`) and record it in `docs/design-decision.md` (merged).
2. **Full site build** — implement every page above in the chosen direction, remove the
   mockups, verify locally (build, Playwright/screenshot checks at mobile + desktop, form
   behavior, zero network calls on submit, noindex), PR → Vercel preview check → merge →
   verify production.
3. **Domain + launch verification** — confirm the domain with the operator, attach apex +
   `www` to the Vercel project, report exact DNS/purchase steps, wait for the operator to buy
   it, then verify HTTPS, redirects, headers, robots.txt, and every page on the live domain.

## Definition of done

Live at the custom domain (or the `*.vercel.app` production URL while the domain is pending),
every page renders correctly on mobile and desktop, reservation and contact forms appear to
submit and send nothing, `curl -I` shows `X-Robots-Tag: noindex…` on every route,
`/robots.txt` disallows all, and the operator has been told the final URLs.
