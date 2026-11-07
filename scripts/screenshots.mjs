#!/usr/bin/env node
/**
 * Full-page screenshots of every route at phone and desktop widths, for visual review.
 *
 *   node scripts/screenshots.mjs [baseUrl] [outDir]
 *
 * baseUrl defaults to the local `astro preview` server (http://localhost:4321); outDir
 * defaults to .evidence/screenshots (gitignored, never commit it). It also captures
 * viewport-only shots of the open lightbox, the reservation form's inline errors, the
 * reservation and contact confirmations, and the mobile "Reserve" bar. Pass the live URL
 * (https://www.capitalclubavlevents.com) to review production.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const base = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const out = process.argv[3] ?? '.evidence/screenshots';
const WIDTHS = [375, 390, 430, 1440];
const SLUGS = [
  'deck-the-rooftop-holiday-toy-drive',
  'blue-ridge-bourbon-and-bites',
  'winter-rooftop-market-and-mulled-wine-social',
  'mistletoe-masquerade-holiday-party',
  'new-years-eve-on-the-rooftop',
  'winter-jazz-night',
  'valentines-supper-club',
];
const PAGES = [
  ['home', '/'],
  ['events', '/events'],
  ...SLUGS.map((s) => [`event-${s}`, `/events/${s}`]),
  ['photos', '/photos'],
  ['contact', '/contact'],
  ['404', '/this-page-does-not-exist'],
];

/** Load lazy images and fire scroll observers so the full-page capture is complete. */
async function settle(page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  await page.waitForLoadState('networkidle');
}

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const dir = join(out, String(width));
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width, height: width < 800 ? 812 : 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(base + path, { waitUntil: 'load' });
    await settle(page);
    // A full-page capture paints fixed elements mid-page; the reserve bar gets its own shot below.
    await page.screenshot({
      path: join(dir, `${name}.png`),
      fullPage: true,
      style: '[data-reserve-bar] { display: none !important; }',
    });
  }

  // Lightbox open on the third photo.
  await page.goto(`${base}/photos`, { waitUntil: 'load' });
  await settle(page);
  await page.locator('[data-gallery-index="2"]').click();
  await page.locator('[data-lightbox][open]').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(dir, 'photos-lightbox.png') });

  // Reservation form: inline errors after an empty submit, then the confirmation panel.
  await page.goto(`${base}/events/${SLUGS[0]}`, { waitUntil: 'load' });
  await settle(page);
  const reservation = page.locator('[data-mock-form="reservation"]');
  await reservation.locator('[data-mf-submit]').click();
  await reservation.getByText('Please enter your name.').waitFor();
  await reservation.locator('form').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(dir, 'event-form-errors.png'), style: '[data-reserve-bar] { display: none !important; }' });
  await reservation.getByLabel('Full name').fill('Avery Example');
  await reservation.getByLabel('Email').fill('avery@example.com');
  await reservation.getByLabel('Number of guests').selectOption('3');
  await reservation.locator('[data-mf-submit]').click();
  await reservation.locator('[data-mf-confirmation]').waitFor({ state: 'visible' });
  await reservation.locator('[data-mf-confirmation]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(dir, 'event-confirmation.png'), style: '[data-reserve-bar] { display: none !important; }' });

  // Contact form confirmation.
  await page.goto(`${base}/contact`, { waitUntil: 'load' });
  await settle(page);
  const contact = page.locator('[data-mock-form="contact"]');
  await contact.getByLabel('Full name').fill('Jordan Example');
  await contact.getByLabel('Email').fill('jordan@example.com');
  await contact.getByLabel('Topic').selectOption({ index: 1 });
  await contact.getByLabel('Message').fill('We would love to host a rehearsal dinner for 40 guests in May.');
  await contact.locator('[data-mf-submit]').click();
  await contact.locator('[data-mf-confirmation]').waitFor({ state: 'visible' });
  await contact.locator('[data-mf-confirmation]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(dir, 'contact-confirmation.png') });

  // Mobile reserve bar, part-way down an event page.
  if (width < 960) {
    await page.goto(`${base}/events/${SLUGS[0]}`, { waitUntil: 'load' });
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dir, 'event-reserve-bar.png') });
  }
  await context.close();
  console.log(`${width}px: ${PAGES.length + (width < 960 ? 5 : 4)} screenshots → ${dir}`);
}
await browser.close();
