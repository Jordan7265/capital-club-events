import { test, expect, type Page, type Locator } from '@playwright/test';

const SLUG = 'playgrounds-for-asheville-rooftop-benefit';
const DIRS = ['a', 'b', 'c'] as const;
type Dir = (typeof DIRS)[number];

const home = (d: Dir) => `/mockups/${d}/`;
const list = (d: Dir) => `/mockups/${d}/events/`;
const eventPage = (d: Dir) => `/mockups/${d}/events/${SLUG}/`;
const allMockupPages = DIRS.flatMap((d) => [home(d), list(d), eventPage(d)]);

const EVENT_TITLES_IN_ORDER = [
  'Playgrounds for Asheville',
  'Blue Ridge Bourbon & Bites',
  'Winter Rooftop Market & Mulled Wine Social',
  'Mistletoe Masquerade Holiday Party',
  'New Year’s Eve on the Rooftop',
  'Winter Jazz Night',
  'Valentine’s Supper Club',
];

/** Load every lazy asset up front so later network assertions only see what the form does. */
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

async function chooseGuests(form: Locator, d: Dir, n: number) {
  if (d === 'c') {
    const input = form.getByRole('spinbutton', { name: 'Number of guests' });
    const add = form.getByRole('button', { name: 'Add a guest' });
    while (Number(await input.inputValue()) < n) await add.click();
  } else {
    await form.getByLabel('Number of guests').selectOption(String(n));
  }
}

test('the /mockups index links to every page of all three directions', async ({ page, request }) => {
  await page.goto('/mockups/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.dir')).toHaveCount(3);
  for (const d of DIRS) {
    for (const path of [home(d), list(d), eventPage(d)]) {
      const href = path.replace(/\/$/, '');
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached();
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
  }
});

test('every route carries the robots noindex meta, and robots.txt disallows all', async ({ page, request }) => {
  for (const path of ['/', '/mockups/', ...allMockupPages, '/this-page-does-not-exist']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex, nofollow');
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toBe('User-agent: *\nDisallow: /\n');
});

for (const d of DIRS) {
  test.describe(`direction ${d.toUpperCase()}`, () => {
    test('home spotlights the Nov 14 benefit and links to its event page', async ({ page }) => {
      await page.goto(home(d));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator(`a[href="/mockups/${d}/events/${SLUG}"]`).first()).toBeVisible();
      await expect(page.getByText('Mikasa Catering').first()).toBeVisible();
      await expect(page.getByText('Demonstration site — reservations and messages are not processed.')).toBeVisible();
    });

    test('events list shows all seven events in chronological order', async ({ page }) => {
      await page.goto(list(d));
      const titles = await page.locator(`main h3 a[href^="/mockups/${d}/events/"]`).allTextContents();
      expect(titles).toHaveLength(7);
      titles.forEach((t, i) => expect(t).toContain(EVENT_TITLES_IN_ORDER[i]!));
    });

    test('Nov 14 page shows the event particulars', async ({ page }) => {
      await page.goto(eventPage(d));
      const main = page.locator('main');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Playgrounds for Asheville');
      for (const text of ['Saturday, November 14, 2026', '6:30 – 10:30 PM', 'Mikasa Catering', 'Live DJ', 'Cocktail or dressy casual', '$125', '82 Patton Ave']) {
        await expect(main.getByText(text, { exact: false }).first(), text).toBeVisible();
      }
      await expect(main.locator('a[href^="https://www.google.com/maps/search/"]')).toHaveCount(1);
    });

    test('reservation form validates inline, fakes a submit and sends nothing', async ({ page }) => {
      await page.goto(eventPage(d));
      await settle(page);
      const requests: string[] = [];
      page.on('request', (r) => requests.push(`${r.method()} ${r.resourceType()} ${r.url()}`));

      const form = page.locator('[data-mock-reservation]');
      const submit = form.locator('[data-rf-submit]');
      const name = form.getByLabel('Full name');
      const email = form.getByLabel('Email');
      const phone = form.getByLabel('Phone (optional)');
      await expect(submit).toBeEnabled();

      // Empty submit: required-field errors, focus moves to the first invalid field.
      await submit.click();
      await expect(form.getByText('Please enter your name.')).toBeVisible();
      await expect(form.getByText('Please enter your email address.')).toBeVisible();
      await expect(name).toHaveAttribute('aria-invalid', 'true');
      await expect(name).toBeFocused();

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
      await chooseGuests(form, d, 3);
      await expect(form.locator('[data-rf-total]')).toHaveText('$375');
      await form.getByLabel('Dietary notes (optional)').fill('One vegetarian');

      const started = Date.now();
      await submit.click();
      await expect(submit).toHaveText('Submitting…');
      await expect(submit).toBeDisabled();
      const confirmation = form.locator('[data-rf-confirmation]');
      await expect(confirmation).toBeVisible({ timeout: 3000 });
      expect(Date.now() - started).toBeGreaterThanOrEqual(900);

      await expect(confirmation.getByRole('heading', { name: 'You’re on the list!' })).toBeFocused();
      await expect(confirmation.locator('[data-rf-code]')).toHaveText(/^CC-1114-[0-9A-F]{4}$/);
      await expect(confirmation).toContainText('Playgrounds for Asheville — Rooftop Benefit');
      await expect(confirmation).toContainText('Saturday, November 14, 2026');
      await expect(confirmation.locator('[data-rf-guests]')).toHaveText('3 guests');
      await expect(confirmation).toContainText('Thank you, Avery');
      await expect(form.locator('form')).toBeHidden();

      // Nothing left the browser.
      expect(requests).toEqual([]);

      // "Make another reservation" restores an empty form.
      await confirmation.getByRole('button', { name: 'Make another reservation' }).click();
      await expect(form.locator('form')).toBeVisible();
      await expect(name).toHaveValue('');
      await expect(name).toBeFocused();
      await expect(submit).toHaveText(/Reserve my (spot|place)/);
      expect(requests).toEqual([]);
    });
  });
}

test('direction C guest stepper stays within 1–10', async ({ page }) => {
  await page.goto(eventPage('c'));
  const form = page.locator('[data-mock-reservation]');
  const input = form.getByRole('spinbutton', { name: 'Number of guests' });
  const add = form.getByRole('button', { name: 'Add a guest' });
  const remove = form.getByRole('button', { name: 'Remove a guest' });
  await expect(input).toHaveValue('2');
  for (let i = 0; i < 12; i++) await add.click();
  await expect(input).toHaveValue('10');
  await expect(form.locator('[data-rf-total]')).toHaveText('$1,250');
  for (let i = 0; i < 12; i++) await remove.click();
  await expect(input).toHaveValue('1');

  // Typed out-of-range values are rejected on submit.
  await input.fill('11');
  await form.locator('[data-rf-submit]').click();
  await expect(form.getByText('Choose between 1 and 10 guests.')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const d of DIRS) {
    test(`direction ${d.toUpperCase()} form cannot be submitted and says why`, async ({ page }) => {
      await page.goto(eventPage(d));
      const form = page.locator('[data-mock-reservation]');
      const submit = form.locator('[data-rf-submit]');
      await expect(submit).toBeDisabled();
      // Playwright's javaScriptEnabled:false stops script execution but the parser still treats
      // <noscript> as raw text, so assert the note is shipped in the markup (real no-JS browsers render it).
      await expect(form.locator('noscript')).toHaveCount(1);
      expect(await form.locator('noscript').textContent()).toContain(
        'Reservations on this page need JavaScript. Nothing you type here is sent anywhere.',
      );
      // Pressing Enter in a field cannot trigger implicit submission while the only submit button is disabled.
      await form.getByLabel('Full name').fill('Avery Example');
      await form.getByLabel('Full name').press('Enter');
      await expect(page).toHaveURL(new RegExp(`${eventPage(d)}$`));
      await expect(form.locator('[data-rf-confirmation]')).toBeHidden();
    });
  }
});

test.describe('small screens', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('mockup pages fit 375px without horizontal scrolling', async ({ page }) => {
    for (const path of ['/mockups/', ...allMockupPages]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
