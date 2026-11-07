/**
 * Unit tests for scripts/verify-live.mjs: proves each launch check fails, with a useful
 * diagnostic, when the live site violates it. Network and TLS are replaced by a fake site that
 * passes every check, and each test breaks exactly one thing.
 *
 *   node --test tests/verify-live.unit.mjs     (npm run test:scripts; also part of `make test`)
 *
 * The file name avoids Playwright's *.spec / *.test pattern, so the browser suite skips it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main, runChecks, pagesFor, GONE, PAGES, REDIRECT_PATHS, ROBOTS } from '../scripts/verify-live.mjs';
import { events } from '../src/data/events.ts';

const CANON = 'www.example.test';
const APEX = 'example.test';
const NOW = Date.parse('2026-11-07T12:00:00Z');
const DAY = 86_400_000;
const HOME_HTML = '<html><head><meta name="robots" content="noindex, nofollow"></head><body></body></html>';
const META_OK = ' · robots meta: noindex, nofollow';

const goodTls = async (host) => ({
  authorized: true,
  protocol: 'TLSv1.3',
  issuer: "Let's Encrypt YR1",
  san: `DNS:${host}`,
  validTo: new Date(NOW + 90 * DAY),
});

/** A site that passes every check. `override(url)` may return a different response for one URL. */
function site(override = () => undefined) {
  return async (url) => {
    const custom = override(new URL(url));
    if (custom) return custom;
    const u = new URL(url);
    const noindex = { 'x-robots-tag': ROBOTS, 'content-type': 'text/html' };
    if (u.protocol === 'http:') return new Response(null, { status: 308, headers: { location: url.replace('http:', 'https:') } });
    if (u.host === APEX) return new Response(null, { status: 308, headers: { location: `https://${CANON}${u.pathname}${u.search}` } });
    if (u.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { ...noindex, 'content-type': 'text/plain' } });
    if (PAGES.includes(u.pathname)) return new Response(HOME_HTML, { headers: noindex });
    return new Response('Not found', { status: 404, headers: noindex });
  };
}

/** Runs every check against the fake site and returns only the failure messages. */
async function failures({ get = site(), tls = goodTls, pages } = {}) {
  const results = await runChecks({ canonical: CANON, redirecting: APEX, get, tls, now: NOW, pages });
  return results.filter((r) => !r.ok).map((r) => r.msg);
}

const on = (host, path) => (u) => u.host === host && u.pathname + u.search === path;

test('baseline: a site that meets every condition passes all checks', async () => {
  const results = await runChecks({ canonical: CANON, redirecting: APEX, get: site(), tls: goodTls, now: NOW });
  assert.equal(results.length, 2 + 1 + REDIRECT_PATHS.length + PAGES.length + GONE.length + 1);
  assert.deepEqual(results.filter((r) => !r.ok), []);
});

test('routes: the pages checked are derived from src/data/events.ts, one per event', () => {
  assert.deepEqual(PAGES, ['/', '/events', ...events.map((e) => `/events/${e.slug}`), '/photos', '/contact']);
  assert.deepEqual(pagesFor([{ slug: 'spring-gala' }]), ['/', '/events', '/events/spring-gala', '/photos', '/contact']);
});

test('routes: a page for a newly added event is checked, so a missing one fails', async () => {
  // spring-gala is not built, so the fake site answers 404 for it.
  const failed = await failures({ pages: pagesFor([...events, { slug: 'spring-gala' }]) });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^404 \/events\/spring-gala +text\/html +X-Robots-Tag: noindex, nofollow, noarchive, nosnippet · robots meta: missing$/);
});

test('TLS: an untrusted certificate fails and names the host and the reason', async () => {
  const tls = async (host) => (host === APEX ? { ...(await goodTls(host)), authorized: false, error: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } : goodTls(host));
  const failed = await failures({ tls });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^TLS example\.test: NOT trusted \(UNABLE_TO_VERIFY_LEAF_SIGNATURE\)/);
});

test('TLS: a certificate expiring within 14 days fails and shows the days left', async () => {
  const tls = async (host) => ({ ...(await goodTls(host)), validTo: new Date(NOW + 7 * DAY) });
  const failed = await failures({ tls });
  assert.equal(failed.length, 2);
  assert.match(failed[0], /^TLS www\.example\.test: trusted, .* expires 2026-11-14 \(7 days\)/);
});

test('TLS: the expiry cutoff is "more than 14 days": exactly 14 days fails, 15 days passes', async () => {
  const expiringIn = (days) => async (host) => (host === CANON ? { ...(await goodTls(host)), validTo: new Date(NOW + days * DAY) } : goodTls(host));
  assert.deepEqual(await failures({ tls: expiringIn(14) }), [
    "TLS www.example.test: trusted, TLSv1.3, issuer Let's Encrypt YR1, expires 2026-11-21 (14 days), SAN DNS:www.example.test",
  ]);
  assert.deepEqual(await failures({ tls: expiringIn(15) }), []);
});

test('TLS: a failed handshake fails without crashing', async () => {
  const tls = async (host) => (host === CANON ? { authorized: false, error: 'ECONNREFUSED' } : goodTls(host));
  const failed = await failures({ tls });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^TLS www\.example\.test: NOT trusted \(ECONNREFUSED\), .* expires unknown \(\? days\)/);
});

test('HTTP: plain http that is not upgraded to https fails', async () => {
  const get = site((u) => (u.protocol === 'http:' ? new Response('ok', { status: 200 }) : undefined));
  assert.deepEqual(await failures({ get }), [`http://${CANON}/events → 200 null`]);
});

test('redirect: a 301 instead of a 308 fails on every redirect path', async () => {
  const get = site((u) => (u.host === APEX ? new Response(null, { status: 301, headers: { location: `https://${CANON}${u.pathname}${u.search}` } }) : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, REDIRECT_PATHS.length);
  assert.match(failed[1], /^https:\/\/example\.test\/events\/winter-jazz-night → 301 https:\/\/www\.example\.test\/events\/winter-jazz-night$/);
});

test('redirect: dropping the path or query fails and shows where it went', async () => {
  const get = site((u) => (u.host === APEX ? new Response(null, { status: 308, headers: { location: `https://${CANON}/` } }) : undefined));
  assert.deepEqual(await failures({ get }), [
    `https://${APEX}/events/winter-jazz-night → 308 https://${CANON}/`,
    `https://${APEX}/photos?from=launch-check → 308 https://${CANON}/`,
    `https://${APEX}/this-page-does-not-exist → 308 https://${CANON}/`,
  ]);
});

test('redirect: pointing at the wrong host fails', async () => {
  const get = site((u) => (on(APEX, '/')(u) ? new Response(null, { status: 308, headers: { location: 'https://elsewhere.test/' } }) : undefined));
  assert.deepEqual(await failures({ get }), [`https://${APEX}/ → 308 https://elsewhere.test/`]);
});

test('routes: a page that does not return 200 fails and names the status and path', async () => {
  const get = site((u) => (on(CANON, '/photos')(u) ? new Response('boom', { status: 500, headers: { 'x-robots-tag': ROBOTS } }) : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^500 \/photos +text\/plain X-Robots-Tag: noindex, nofollow, noarchive, nosnippet · robots meta: missing$/);
});

test('routes: a missing or weaker X-Robots-Tag fails', async () => {
  const get = site((u) => {
    if (on(CANON, '/events/winter-jazz-night')(u)) return new Response(HOME_HTML, { headers: { 'content-type': 'text/html' } });
    if (on(CANON, '/contact')(u)) return new Response(HOME_HTML, { headers: { 'x-robots-tag': 'noindex', 'content-type': 'text/html' } });
    return undefined;
  });
  const failed = await failures({ get });
  assert.equal(failed.length, 2);
  assert.equal(failed[0], `200 ${'/events/winter-jazz-night'.padEnd(52)} text/html  X-Robots-Tag: null${META_OK}`);
  assert.equal(failed[1], `200 ${'/contact'.padEnd(52)} text/html  X-Robots-Tag: noindex${META_OK}`);
});

test('routes: an unknown path served as 200 (a soft 404) fails', async () => {
  const get = site((u) => (on(CANON, '/this-page-does-not-exist')(u) ? new Response(HOME_HTML, { headers: { 'x-robots-tag': ROBOTS } }) : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^200 \/this-page-does-not-exist /);
});

test('routes: /mockups coming back fails', async () => {
  const get = site((u) => (on(CANON, '/mockups')(u) ? new Response('mockups', { headers: { 'x-robots-tag': ROBOTS } }) : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^200 \/mockups /);
});

test('sitemap: a served sitemap fails', async () => {
  const get = site((u) => (on(CANON, '/sitemap.xml')(u) ? new Response('<urlset/>', { headers: { 'x-robots-tag': ROBOTS, 'content-type': 'application/xml' } }) : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^200 \/sitemap\.xml +application\/xml/);
});

for (const [name, body] of [
  ['allows crawling', 'User-agent: *\nAllow: /\n'],
  ['names a sitemap', 'User-agent: *\nDisallow: /\nSitemap: https://www.example.test/sitemap.xml\n'],
  ['has no Disallow: /', 'User-agent: *\nDisallow: /private\n'],
]) {
  test(`robots.txt: fails when it ${name}`, async () => {
    const get = site((u) => (on(CANON, '/robots.txt')(u) ? new Response(body, { headers: { 'x-robots-tag': ROBOTS } }) : undefined));
    const failed = await failures({ get });
    assert.equal(failed.length, 1);
    assert.equal(failed[0], `robots.txt 200: ${JSON.stringify(body.split('\n').filter(Boolean))}`);
  });
}

test('robots meta: checked on every page, so the home, an event or the contact page without it, or with a weaker value, fails', async () => {
  const page = (html) => new Response(html, { headers: { 'x-robots-tag': ROBOTS, 'content-type': 'text/html' } });
  const get = site((u) => {
    if (on(CANON, '/')(u) || on(CANON, '/events/winter-jazz-night')(u)) return page('<html><head></head></html>');
    if (on(CANON, '/contact')(u)) return page('<html><head><meta name="robots" content="noindex"></head></html>');
    return undefined;
  });
  assert.deepEqual(await failures({ get }), [
    `200 ${'/'.padEnd(52)} text/html  X-Robots-Tag: ${ROBOTS} · robots meta: missing`,
    `200 ${'/events/winter-jazz-night'.padEnd(52)} text/html  X-Robots-Tag: ${ROBOTS} · robots meta: missing`,
    `200 ${'/contact'.padEnd(52)} text/html  X-Robots-Tag: ${ROBOTS} · robots meta: noindex`,
  ]);
});

test('network: a request that gets no response fails with the error instead of throwing', async () => {
  const get = site((u) => (on(CANON, '/contact')(u) ? { error: 'ECONNRESET' } : undefined));
  const failed = await failures({ get });
  assert.equal(failed.length, 1);
  assert.match(failed[0], /^no response \(ECONNRESET\) \/contact /);
});

test('main: prints FAIL lines and a summary, and returns exit code 1 on any failure', async () => {
  const lines = [];
  const get = site((u) => (on(CANON, '/sitemap.xml')(u) ? new Response('<urlset/>', { headers: { 'x-robots-tag': ROBOTS } }) : undefined));
  const code = await main({ argv: [CANON, APEX], log: (l) => lines.push(l), get, tls: goodTls, now: NOW });
  assert.equal(code, 1);
  assert.equal(lines.filter((l) => l.startsWith('FAIL ')).length, 1);
  assert.match(lines.find((l) => l.startsWith('FAIL ')), /^FAIL 200 \/sitemap\.xml/);
  assert.equal(lines.at(-1), '\n1 live check(s) failed');
});

test('main: returns exit code 0 and the all-passed summary when everything passes', async () => {
  const lines = [];
  const code = await main({ argv: [CANON, APEX], log: (l) => lines.push(l), get: site(), tls: goodTls, now: NOW });
  assert.equal(code, 0);
  assert.equal(lines.filter((l) => l.startsWith('FAIL ')).length, 0);
  assert.equal(lines.at(-1), `\nall live checks passed for https://${CANON} (redirect from ${APEX})`);
});

test('CLI: the real script exits 1 with FAIL lines when the hosts cannot be reached', async () => {
  const script = fileURLToPath(new URL('../scripts/verify-live.mjs', import.meta.url));
  // .invalid never resolves (RFC 6761), so every TLS and HTTP check fails fast.
  const { code, stdout } = await new Promise((resolve) => {
    execFile(process.execPath, [script, 'www.launch-check.invalid', 'launch-check.invalid'], { timeout: 60_000 }, (error, stdout) =>
      resolve({ code: error ? error.code : 0, stdout }),
    );
  });
  assert.equal(code, 1);
  assert.match(stdout, /^FAIL TLS www\.launch-check\.invalid: NOT trusted/m);
  assert.match(stdout, /^FAIL https:\/\/launch-check\.invalid\/ → no response/m);
  assert.match(stdout, /live check\(s\) failed$/m);
});
