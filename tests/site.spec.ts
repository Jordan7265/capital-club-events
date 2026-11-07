import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end checks for the static site, run against the built output served by `astro preview`.
 * Expected event details are written out here (not imported from src/data) so a data regression
 * fails the suite instead of silently updating the expectation.
 */

const EVENTS = [
  {
    slug: 'playgrounds-for-asheville-rooftop-benefit',
    title: 'Playgrounds for Asheville \u2014 Rooftop Benefit',
    date: 'Saturday, November 14, 2026',
    time: '4:30 – 8:30 PM',
    price: '$125',
    per: 'person',
    attire: 'Cocktail or dressy casual',
    extra: ['Mikasa Catering', 'Live DJ'],
    code: '1114',
  },
  { slug: 'blue-ridge-bourbon-and-bites', title: 'Blue Ridge Bourbon & Bites', date: 'Friday, November 20, 2026', time: '7 – 10 PM', price: '$75', per: 'person', attire: 'Smart casual', extra: ['bourbon'], code: '1120' },
  { slug: 'winter-rooftop-market-and-mulled-wine-social', title: 'Winter Rooftop Market & Mulled Wine Social', date: 'Saturday, December 5, 2026', time: '5 – 9 PM', price: '$25', per: 'person', attire: 'Casual', extra: ['mulled wine', 'makers'], code: '1205' },
  { slug: 'mistletoe-masquerade-holiday-party', title: 'Mistletoe Masquerade Holiday Party', date: 'Friday, December 18, 2026', time: '7 – 11 PM', price: '$95', per: 'person', attire: 'Festive', extra: ['Live band', 'mask'], code: '1218' },
  { slug: 'new-years-eve-on-the-rooftop', title: 'New Year’s Eve on the Rooftop', date: 'Thursday, December 31, 2026', time: '8:30 PM – 1 AM', price: '$175', per: 'person', attire: 'Black tie optional', extra: ['champagne toast', 'DJ', 'countdown'], code: '1231' },
  { slug: 'winter-jazz-night', title: 'Winter Jazz Night', date: 'Saturday, January 16, 2027', time: '7 – 10 PM', price: '$60', per: 'person', attire: 'Dressy casual', extra: ['jazz trio', 'seasonal cocktails'], code: '0116' },
  { slug: 'valentines-supper-club', title: 'Valentine’s Supper Club', date: 'Saturday, February 13, 2027', time: '6 – 10 PM', price: '$150', per: 'couple', attire: 'Cocktail attire', extra: ['dinner for two', 'acoustic'], code: '0213' },
] as const;

const FEATURED = EVENTS[0];
const PAGES = ['/', '/events', ...EVENTS.map((e) => `/events/${e.slug}`), '/photos', '/contact'];
const NOT_FOUND = '/this-page-does-not-exist';
const DISCLAIMER = 'Demonstration site. Reservations and messages are not processed.';

/** Load every lazy asset up front so later network assertions only see what the page does. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 20));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

/** Records every request the page makes from now on. */
function recordRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(`${r.method()} ${r.resourceType()} ${r.url()}`));
  return requests;
}

// ---------------------------------------------------------------------------------------------
// Routes, noindex, chrome
// ---------------------------------------------------------------------------------------------

test('every page returns 200, the mockups are gone, and unknown paths get the branded 404', async ({ request, page }) => {
  for (const path of PAGES) expect((await request.get(path)).status(), path).toBe(200);
  for (const path of ['/mockups', '/mockups/a', '/mockups/b/events', '/mockups/c/events/winter-jazz-night'])
    expect((await request.get(path)).status(), path).toBe(404);

  const res = await page.goto(NOT_FOUND);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('This page wandered off the rooftop');
  await expect(page.getByRole('link', { name: 'See upcoming events' })).toHaveAttribute('href', '/events');
});

test('every route carries the robots noindex meta, and robots.txt disallows all', async ({ page, request }) => {
  for (const path of [...PAGES, NOT_FOUND]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex, nofollow');
  }
  expect(await (await request.get('/robots.txt')).text()).toBe('User-agent: *\nDisallow: /\n');
});

test('no em dashes in shipped text or scripts, except the operator-approved event name', async ({ page, request }) => {
  // The operator approved one exception: the Nov 14 event keeps its given name, dash included.
  const strip = (text: string) => text.split(FEATURED.title).join('');
  const scripts = new Set<string>();
  for (const path of [...PAGES, NOT_FOUND]) {
    await page.goto(path);
    // Rendered text (entities decoded) plus every attribute value, e.g. titles, labels, alt text.
    const text = await page.evaluate(() =>
      [
        document.title,
        document.body.textContent ?? '',
        ...[...document.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => a.value)),
      ].join('\n'),
    );
    const leftover = strip(text).match(/.{0,30}\u2014.{0,30}/);
    expect(leftover?.[0], `${path} contains an em dash`).toBeUndefined();
    const html = await (await request.get(path)).text();
    expect(/&mdash;|&#8212;|&#x2014;/i.test(html), `${path} contains an em dash entity`).toBe(false);
    for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) scripts.add(src!);
  }
  expect(scripts.size).toBeGreaterThan(0);
  for (const src of scripts) {
    expect(/\u2014|&mdash;|&#8212;/i.test(strip(await (await request.get(src)).text())), `${src} contains an em dash`).toBe(false);
  }
});

test('header nav and footer disclaimer appear on every page; nav marks the current section', async ({ page }) => {
  const current: Record<string, string | null> = { '/': null, '/events': 'Upcoming Events', '/photos': 'Photos', '/contact': 'Contact' };
  for (const path of [...PAGES, NOT_FOUND]) {
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Upcoming Events' })).toHaveAttribute('href', '/events');
    await expect(nav.getByRole('link', { name: 'Photos' })).toHaveAttribute('href', '/photos');
    await expect(nav.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
    await expect(page.getByRole('link', { name: 'The Capital Club of Asheville home page' })).toHaveAttribute('href', '/');
    await expect(page.getByText(DISCLAIMER), path).toBeVisible();
    if (path in current) {
      const label = current[path];
      const active = nav.locator('a[aria-current="page"]');
      if (label) await expect(active).toHaveText(label);
      else await expect(active).toHaveCount(0);
    }
  }
  // Event detail pages highlight "Upcoming Events" without claiming to be that page.
  await page.goto(`/events/${FEATURED.slug}`);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Upcoming Events' })).toHaveClass(/is-active/);
  await expect(nav.locator('a[aria-current="page"]')).toHaveCount(0);
});

// ---------------------------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------------------------

test('home: hero CTA to events, Nov 14 spotlight, three more upcoming events, venue blurb, photos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Evenings\s*above\s*Asheville/);
  await expect(page.getByRole('link', { name: 'See upcoming events' })).toHaveAttribute('href', '/events');

  const spotlight = page.locator('section', { has: page.locator('#spotlight-title') });
  await expect(spotlight.getByRole('heading', { level: 2 })).toHaveText(FEATURED.title);
  for (const text of ['Saturday, November 14, 2026', '4:30 – 8:30 PM', 'Mikasa Catering', 'Live DJ', 'Cocktail or dressy casual', '$125', 'playgrounds']) {
    await expect(spotlight.getByText(text, { exact: false }).first(), text).toBeVisible();
  }
  await expect(spotlight.getByRole('link', { name: /Reserve your place/ })).toHaveAttribute('href', `/events/${FEATURED.slug}`);

  const more = page.locator('section', { has: page.locator('#calendar-title') }).locator('.cc-row__title a');
  await expect(more).toHaveText([EVENTS[1].title, EVENTS[2].title, EVENTS[3].title]);
  await expect(page.getByRole('heading', { name: /A rooftop in the heart of downtown/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View the gallery' })).toHaveAttribute('href', '/photos');
});

test('events list: all seven events in date order, each with date, time, price and a Reserve link', async ({ page }) => {
  await page.goto('/events');
  const rows = page.locator('main .cc-row');
  await expect(rows).toHaveCount(EVENTS.length);
  for (const [i, e] of EVENTS.entries()) {
    const row = rows.nth(i);
    await expect(row.locator('.cc-row__title a')).toHaveText(e.title);
    await expect(row.locator('.cc-row__title a')).toHaveAttribute('href', `/events/${e.slug}`);
    await expect(row.locator('time')).toHaveAttribute('datetime', new RegExp(`^${e.date.match(/\d{4}/)![0]}-`));
    await expect(row).toContainText(e.time);
    await expect(row.locator('.cc-row__price')).toHaveText(e.price);
    await expect(row.locator('.cc-row__per')).toHaveText(`per ${e.per}`);
    await expect(row.getByRole('link', { name: `Reserve for ${e.title}` })).toHaveAttribute('href', `/events/${e.slug}#reserve-form`);
  }
  await expect(rows.first().locator('.cc-badge')).toHaveText('Next up');
});

for (const e of EVENTS) {
  test(`event page ${e.slug}: exact date, time, price, attire and details`, async ({ page }) => {
    await page.goto(`/events/${e.slug}`);
    await expect(page).toHaveTitle(`${e.title} | The Capital Club of Asheville`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(e.title);
    const details = page.locator('.cc-ticket');
    await expect(details.locator('dl > div', { has: page.locator('dt', { hasText: /^Date$/ }) }).locator('dd')).toHaveText(e.date);
    await expect(details.locator('dl > div', { has: page.locator('dt', { hasText: /^Time$/ }) }).locator('dd')).toHaveText(e.time);
    await expect(details.locator('dl > div', { has: page.locator('dt', { hasText: /^Attire$/ }) }).locator('dd')).toContainText(e.attire);
    await expect(details.locator('.cc-ticket__stub strong')).toHaveText(e.price);
    await expect(details.locator('.cc-ticket__stub')).toContainText(`per ${e.per}`);
    await expect(details).toContainText('82 Patton Ave, Asheville, NC 28801');
    await expect(details.locator('a[href^="https://www.google.com/maps/search/"]')).toHaveCount(1);
    for (const text of e.extra) await expect(page.locator('main').getByText(text, { exact: false }).first(), text).toBeVisible();
    await expect(page.locator('#reserve-form [data-mock-form="reservation"]')).toHaveCount(1);
  });
}

test('Nov 14 benefit states its purpose, caterer, DJ and attire', async ({ page }) => {
  await page.goto(`/events/${FEATURED.slug}`);
  const main = page.locator('main');
  await expect(main.locator('.cc-benefit')).toContainText('Renovating children’s playgrounds across the Asheville area');
  await expect(main.locator('.cc-prose')).toContainText('renovate children’s playgrounds across the Asheville area');
  await expect(main.locator('.cc-prose')).toContainText('We start at 4:30 so you can watch the sunset over the Blue Ridge with a cocktail hour');
  const dd = (label: string) => main.locator('.cc-ticket dl > div', { has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
  await expect(dd('Catering')).toContainText('Mikasa Catering');
  await expect(dd('Entertainment')).toContainText('Live DJ');
  await expect(dd('Attire')).toHaveText('Cocktail or dressy casual');
});

// ---------------------------------------------------------------------------------------------
// Mock forms: validation, "Submitting…", confirmation, and zero network requests
// ---------------------------------------------------------------------------------------------

for (const width of [1440, 390]) {
  test(`reservation form end to end at ${width}px: validates, fakes a submit, sends nothing`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/events/${FEATURED.slug}`);
    await settle(page);
    const requests = recordRequests(page);
    const url = page.url();

    const form = page.locator('[data-mock-form="reservation"]');
    const submit = form.locator('[data-mf-submit]');
    const name = form.getByLabel('Full name');
    const email = form.getByLabel('Email');
    const phone = form.getByLabel('Phone (optional)');
    const guests = form.getByLabel('Number of guests');
    await expect(submit).toBeEnabled();
    await expect(guests.locator('option')).toHaveText(Array.from({ length: 10 }, (_, i) => `${i + 1} ${i ? 'guests' : 'guest'}`));

    // Empty submit: required-field errors inline, focus moves to the first invalid field.
    await submit.click();
    await expect(form.getByText('Please enter your name.')).toBeVisible();
    await expect(form.getByText('Please enter your email address.')).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', 'reserve-name-error');
    await expect(name).toBeFocused();
    await expect(form.locator('[data-mf-status]')).toHaveText('Please fix the 2 highlighted fields.');

    // Malformed values get specific messages; fixed fields clear.
    await name.fill('Avery Example');
    await email.fill('avery@example');
    await phone.fill('123');
    await submit.click();
    await expect(form.getByText('Please enter your name.')).toHaveCount(0);
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Please enter a valid email address, like name@example.com.')).toBeVisible();
    await expect(form.getByText('Please enter a 10-digit phone number, or leave this blank.')).toBeVisible();
    await expect(email).toBeFocused();

    // Valid submit.
    await email.fill('avery@example.com');
    await phone.fill('828-555-0142');
    await guests.selectOption('3');
    await expect(form.locator('[data-mf-total]')).toHaveText('$375');
    await form.getByLabel('Dietary notes (optional)').fill('One vegetarian');

    const started = Date.now();
    await submit.click();
    await expect(submit).toHaveText('Submitting…');
    await expect(submit).toBeDisabled();
    await expect(form.locator('form')).toHaveAttribute('aria-busy', 'true');
    const confirmation = form.locator('[data-mf-confirmation]');
    await expect(confirmation).toBeVisible({ timeout: 3000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);

    await expect(confirmation.getByRole('heading', { name: 'You’re on the list!' })).toBeFocused();
    await expect(confirmation.locator('[data-fill="code"]')).toHaveText(/^CC-1114-[0-9A-F]{4}$/);
    await expect(confirmation).toContainText(FEATURED.title);
    await expect(confirmation).toContainText('Saturday, November 14, 2026 · 4:30 – 8:30 PM');
    await expect(confirmation.locator('[data-fill="emailNote"]')).toHaveText('Check your email at avery@example.com for your confirmation.');
    await expect(confirmation.locator('[data-fill="guests"]')).toHaveText('3 guests');
    await expect(confirmation).toContainText('Thank you, Avery');
    await expect(form.locator('form')).toBeHidden();

    // Nothing left the browser, and the page never navigated.
    expect(requests).toEqual([]);
    expect(page.url()).toBe(url);

    // "Make another reservation" restores an empty form.
    await confirmation.getByRole('button', { name: 'Make another reservation' }).click();
    await expect(form.locator('form')).toBeVisible();
    await expect(name).toHaveValue('');
    await expect(name).toBeFocused();
    await expect(submit).toHaveText('Reserve my spot');
    await expect(form.locator('[data-mf-total]')).toHaveText('$250');
    expect(requests).toEqual([]);
  });
}

test('per-couple pricing and guest-count bounds', async ({ page }) => {
  await page.goto('/events/valentines-supper-club');
  const form = page.locator('[data-mock-form="reservation"]');
  const guests = form.getByLabel('Number of guests');
  await expect(form.locator('[data-mf-total]')).toHaveText('$150');
  await guests.selectOption('3');
  await expect(form.locator('[data-mf-total]')).toHaveText('$300');
  // A tampered value outside 1–10 is rejected on submit.
  await guests.evaluate((el: HTMLSelectElement) => {
    el.add(new Option('11 guests', '11'));
    el.value = '11';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await form.locator('[data-mf-submit]').click();
  await expect(form.getByText('Choose between 1 and 10 guests.')).toBeVisible();
});

test('contact form end to end: validates, fakes a submit, sends nothing', async ({ page }) => {
  await page.goto('/contact');
  await settle(page);
  const requests = recordRequests(page);
  const url = page.url();

  const form = page.locator('[data-mock-form="contact"]');
  const submit = form.locator('[data-mf-submit]');
  await submit.click();
  for (const msg of ['Please enter your name.', 'Please enter your email address.', 'Please choose a topic.', 'Please enter a message.']) {
    await expect(form.getByText(msg), msg).toBeVisible();
  }
  await expect(form.getByLabel('Full name')).toBeFocused();

  await form.getByLabel('Full name').fill('Jordan Example');
  await form.getByLabel('Email').fill('jordan@example.com');
  await form.getByLabel('Topic').selectOption({ label: 'Hosting a private event or wedding' });
  await form.getByLabel('Message').fill('Short');
  await submit.click();
  await expect(form.getByText('Please add a little more detail (at least 10 characters).')).toBeVisible();
  await form.getByLabel('Message').fill('We would love to host a rehearsal dinner for 40 guests in May.');

  await submit.click();
  await expect(submit).toHaveText('Submitting…');
  await expect(submit).toBeDisabled();
  const confirmation = form.locator('[data-mf-confirmation]');
  await expect(confirmation).toBeVisible({ timeout: 3000 });
  await expect(confirmation.getByRole('heading', { name: 'Thank you. We’ll be in touch.' })).toBeFocused();
  await expect(confirmation.locator('[data-fill="code"]')).toHaveText(/^CC-MSG-[0-9A-F]{4}$/);
  await expect(confirmation.locator('[data-fill="topic"]')).toHaveText('Hosting a private event or wedding');
  await expect(confirmation.locator('[data-fill="email"]')).toHaveText('jordan@example.com');
  await expect(confirmation).toContainText('Thanks, Jordan.');

  expect(requests).toEqual([]);
  expect(page.url()).toBe(url);

  await confirmation.getByRole('button', { name: 'Send another message' }).click();
  await expect(form.getByLabel('Full name')).toHaveValue('');
  await expect(form.getByLabel('Topic')).toHaveValue('');
});

test('contact page: address, phone, hours and an external map link', async ({ page }) => {
  await page.goto('/contact');
  const main = page.locator('main');
  await expect(main.locator('address')).toContainText('82 Patton Ave');
  await expect(main.getByRole('link', { name: '828-398-5055' })).toHaveAttribute('href', 'tel:+18283985055');
  await expect(main.locator('.cc-hours')).toContainText('Event office');
  const map = main.locator('a.cc-mapcard');
  await expect(map).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  await expect(map).toHaveAttribute('target', '_blank');
  // No embedded third-party map: nothing on the page loads from another origin.
  await expect(page.locator('iframe')).toHaveCount(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('forms cannot be submitted and say why; the reserve bar stays hidden', async ({ page }) => {
    for (const [path, kind, note] of [
      [`/events/${FEATURED.slug}`, 'reservation', 'Reservations on this page need JavaScript. Nothing you type here is sent anywhere.'],
      ['/contact', 'contact', 'This form needs JavaScript. Nothing you type here is sent anywhere'],
    ] as const) {
      await page.goto(path);
      const form = page.locator(`[data-mock-form="${kind}"]`);
      await expect(form.locator('[data-mf-submit]')).toBeDisabled();
      // Playwright's javaScriptEnabled:false still parses <noscript> as raw text, so assert the
      // note ships in the markup (real no-JS browsers render it).
      expect(await form.locator('noscript').textContent()).toContain(note);
      // Enter cannot trigger implicit submission while the only submit button is disabled.
      await form.getByLabel('Full name').fill('Avery Example');
      await form.getByLabel('Full name').press('Enter');
      await expect(page).toHaveURL(new RegExp(`${path}/?$`));
      await expect(form.locator('[data-mf-confirmation]')).toBeHidden();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/events/${FEATURED.slug}`);
    await expect(page.locator('[data-reserve-bar]')).toBeHidden();
  });

  test('gallery thumbnails are plain links to the full images', async ({ page }) => {
    await page.goto('/photos');
    const links = page.locator('[data-gallery-index]');
    await expect(links).toHaveCount(16);
    await expect(links.first()).toHaveAttribute('href', /^\/images\/venue\/.+\.webp$/);
  });
});

// ---------------------------------------------------------------------------------------------
// Lightbox and keyboard
// ---------------------------------------------------------------------------------------------

test.describe('photo lightbox', () => {
  const dialog = (page: Page) => page.locator('dialog[data-lightbox]');
  const count = (page: Page) => dialog(page).locator('[data-lightbox-count]');

  test('opens from the keyboard, moves with arrow keys, traps focus, closes on Esc and restores focus', async ({ page }) => {
    await page.goto('/photos');
    const links = page.locator('[data-gallery-index]');
    await expect(links).toHaveCount(16);
    await expect(links.first()).toHaveAttribute('aria-haspopup', 'dialog');

    await links.nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toHaveAttribute('open', '');
    await expect(dialog(page).getByRole('button', { name: 'Close photo viewer' })).toBeFocused();
    await expect(count(page)).toHaveText('3 / 16');
    const thirdAlt = await links.nth(2).locator('img').getAttribute('alt');
    await expect(dialog(page).locator('[data-lightbox-img]')).toHaveAttribute('alt', thirdAlt!);
    await expect(dialog(page).locator('[data-lightbox-img]')).toHaveAttribute('src', (await links.nth(2).getAttribute('href'))!);

    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('4 / 16');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(count(page)).toHaveText('2 / 16');
    await page.keyboard.press('End');
    await expect(count(page)).toHaveText('16 / 16');
    await page.keyboard.press('ArrowRight');
    await expect(count(page)).toHaveText('1 / 16');
    await page.keyboard.press('ArrowLeft');
    await expect(count(page)).toHaveText('16 / 16');
    await page.keyboard.press('Home');
    await expect(count(page)).toHaveText('1 / 16');
    await expect(dialog(page).locator('[data-lightbox-live]')).toContainText('Photo 1 of 16');

    // Focus stays inside the modal while tabbing.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]'))), `tab ${i}`).toBe(true);
    }
    await dialog(page).getByRole('button', { name: 'Next photo' }).focus();
    await page.keyboard.press('Enter');
    await expect(count(page)).toHaveText('2 / 16');

    // The page behind is not scrollable while the dialog is open.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toHaveAttribute('open', '');
    await expect(links.nth(1)).toBeFocused();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  });

  test('opens on click; the buttons and the backdrop work', async ({ page }) => {
    await page.goto('/photos');
    const links = page.locator('[data-gallery-index]');
    await links.nth(5).click();
    await expect(dialog(page)).toHaveAttribute('open', '');
    await expect(count(page)).toHaveText('6 / 16');
    await dialog(page).getByRole('button', { name: 'Next photo' }).click();
    await expect(count(page)).toHaveText('7 / 16');
    await dialog(page).getByRole('button', { name: 'Previous photo' }).click();
    await expect(count(page)).toHaveText('6 / 16');
    await dialog(page).getByRole('button', { name: 'Close photo viewer' }).click();
    await expect(dialog(page)).not.toHaveAttribute('open', '');
    await expect(links.nth(5)).toBeFocused();

    await links.nth(0).click();
    await expect(dialog(page)).toHaveAttribute('open', '');
    await page.mouse.click(8, 300); // empty backdrop area at the left edge
    await expect(dialog(page)).not.toHaveAttribute('open', '');
  });
});

test('keyboard: skip link first, then the header nav in order, with a visible focus ring', async ({ page }) => {
  await page.goto('/events');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  await page.goto('/events');
  const order = ['Skip to content', 'The Capital Club of Asheville home page', 'Upcoming Events', 'Photos', 'Contact'];
  for (const name of order) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAccessibleName(name);
  }
  const outline = await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');

  // Reserve buttons in the list are reachable by keyboard and go to the form.
  const reserve = page.getByRole('link', { name: `Reserve for ${FEATURED.title}` });
  await reserve.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/events/${FEATURED.slug}/?#reserve-form$`));
});

// ---------------------------------------------------------------------------------------------
// Mobile polish gates (375 / 390 / 430) and desktop sanity (1440)
// ---------------------------------------------------------------------------------------------

/** Boxes of bulbs/halos vs hero text: none may intersect. */
async function heroOverlaps(page: Page) {
  return page.evaluate(() => {
    const bulbs = [...document.querySelectorAll('.cc-lights__halo')].map((c) => c.getBoundingClientRect());
    const text = [...document.querySelectorAll('.cc-hero__content > *, .cc-hero__title span')].map((el) => ({
      name: el.className || el.tagName,
      box: el.getBoundingClientRect(),
    }));
    const hits: string[] = [];
    for (const t of text)
      for (const b of bulbs)
        if (b.right > t.box.left && b.left < t.box.right && b.bottom > t.box.top && b.top < t.box.bottom)
          hits.push(`${t.name} @ y=${Math.round(t.box.top)} vs bulb y=${Math.round(b.top)}–${Math.round(b.bottom)}`);
    return hits;
  });
}

for (const width of [375, 390, 430, 768, 1024, 1440, 1920]) {
  test(`home hero at ${width}px: café lights never overlap the hero text`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
    await page.goto('/');
    expect(await heroOverlaps(page)).toEqual([]);
    // The eyebrow stays on a single line.
    const eyebrow = page.locator('.cc-hero__eyebrow');
    const lh = await eyebrow.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect((await eyebrow.boundingBox())!.height).toBeLessThan(lh * 1.5);
  });
}

for (const width of [375, 390, 430]) {
  test.describe(`phone ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('no page scrolls horizontally', async ({ page }) => {
      for (const path of [...PAGES, NOT_FOUND]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });

    test('tap targets are at least 44px tall', async ({ page }) => {
      for (const path of [...PAGES, NOT_FOUND]) {
        await page.goto(path);
        const small = await page.evaluate(() => {
          const out: string[] = [];
          const visible = (el: Element) => {
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1 && !el.closest('.visually-hidden, [hidden], dialog:not([open]), [inert]');
          };
          for (const el of document.querySelectorAll('a[href], button, input, select, textarea')) {
            if (!visible(el) || el.matches('.skip-link, .cc-inline-link')) continue;
            // Row titles are covered by a full-row overlay link; measure the row instead.
            const target = el.closest('.cc-row__title') ? el.closest('.cc-row')! : el;
            const h = target.getBoundingClientRect().height;
            if (h < 44) out.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent?.trim().slice(0, 30)}" ${h.toFixed(1)}px`);
          }
          return out;
        });
        expect(small, path).toEqual([]);
      }
    });

    test('reading text is at least 16px (labels and fine print excepted, but never below 12px / 10px)', async ({ page }) => {
      const finePrint = '.cc-footer__base p, .cc-row__per, .cc-reservebar__price span, .cc-ticket__stub small, .mf__optional';
      for (const path of [...PAGES, NOT_FOUND]) {
        await page.goto(path);
        const bad = await page.evaluate((finePrint) => {
          const out: string[] = [];
          for (const el of document.querySelectorAll('body *')) {
            const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
            const r = el.getBoundingClientRect();
            if (!hasText || r.width < 2 || el.closest('.visually-hidden, [hidden], dialog:not([open]), [aria-hidden="true"]')) continue;
            const cs = getComputedStyle(el);
            const size = parseFloat(cs.fontSize);
            const label = cs.textTransform === 'uppercase';
            const min = label ? 10 : el.matches(finePrint) ? 12 : 16;
            if (size < min) out.push(`${el.tagName.toLowerCase()}.${el.className} ${size}px "${el.textContent!.trim().slice(0, 30)}"`);
          }
          return out;
        }, finePrint);
        expect(bad, path).toEqual([]);
      }
    });

    test('hero CTAs stack full-width with equal widths', async ({ page }) => {
      await page.goto('/');
      const [a, b] = await page.locator('.cc-hero__actions .cc-btn').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
      expect(Math.abs(a.width - b.width)).toBeLessThan(1);
      expect(b.top).toBeGreaterThan(a.bottom - 1);
      const wrap = await page.locator('.cc-hero__content').evaluate((el) => el.getBoundingClientRect().width);
      expect(a.width).toBeGreaterThan(wrap - 1);
    });

    test('program rows: one-line date above a full-width title, price beside its unit', async ({ page }) => {
      for (const path of ['/', '/events']) {
        await page.goto(path);
        const rows = await page.locator('main .cc-row').evaluateAll((els) =>
          els.map((row) => {
            const box = (sel: string) => row.querySelector(sel)!.getBoundingClientRect();
            const month = row.querySelector('.cc-row__month')!;
            return {
              date: box('.cc-row__date'),
              title: box('.cc-row__title'),
              body: box('.cc-row__body'),
              row: row.getBoundingClientRect(),
              monthH: month.getBoundingClientRect().height,
              monthLH: parseFloat(getComputedStyle(month).lineHeight),
              price: box('.cc-row__price'),
              per: box('.cc-row__per'),
            };
          }),
        );
        expect(rows.length, path).toBeGreaterThan(0);
        for (const r of rows) {
          expect(r.monthH, `${path} month label on one line`).toBeLessThan(r.monthLH * 1.5);
          expect(r.date.bottom, `${path} date above title`).toBeLessThanOrEqual(r.title.top + 1);
          expect(r.body.width, `${path} text uses the full row width`).toBeGreaterThan(r.row.width - 2);
          expect(Math.abs(r.price.bottom - r.per.bottom), `${path} price and unit on one line`).toBeLessThan(8);
          expect(r.per.left - r.price.right, `${path} unit sits right after the price`).toBeLessThan(16);
        }
      }
    });

    test('forms are single-column with controls at least 44px tall', async ({ page }) => {
      for (const [path, kind] of [[`/events/${FEATURED.slug}`, 'reservation'], ['/contact', 'contact']] as const) {
        await page.goto(path);
        const form = page.locator(`[data-mock-form="${kind}"]`);
        const lefts = await form.locator('.mf__field').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
        expect(new Set(lefts).size, path).toBe(1);
        const heights = await form.locator('input, select, textarea, button[type="submit"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
        for (const h of heights) expect(h, path).toBeGreaterThanOrEqual(44);
      }
    });

    test('event page reserve bar: shows while the form is below, hides at the form and footer, recovers after jumps', async ({ page }) => {
      await page.goto(`/events/${FEATURED.slug}`);
      const bar = page.locator('[data-reserve-bar]');
      await expect(bar).toHaveClass(/is-visible/);
      await expect(bar.getByRole('link', { name: /^Reserve/ })).toHaveAttribute('href', '#reserve-form');
      await expect(bar).toContainText('$125');

      await bar.getByRole('link', { name: /^Reserve/ }).click();
      await expect(page.locator('#reserve-form')).toBeInViewport();
      await expect(bar).not.toHaveClass(/is-visible/);
      expect(await bar.evaluate((el) => (el as HTMLElement).inert)).toBe(true);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByText(DISCLAIMER)).toBeInViewport();
      await expect(bar).not.toHaveClass(/is-visible/);

      // Jumping straight back to the top (skipping the form) brings the bar back.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(bar).toHaveClass(/is-visible/);
    });
  });
}

test.describe('desktop 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no horizontal scroll; the reserve bar is not shown; the sticky reservation card is', async ({ page }) => {
    for (const path of [...PAGES, NOT_FOUND]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto(`/events/${FEATURED.slug}`);
    await expect(page.locator('[data-reserve-bar]')).toBeHidden();
    expect(await page.locator('.cc-reserve').evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
  });
});
