#!/usr/bin/env node
/**
 * HTTP-level launch checks against the live custom domain:
 *   - TLS: both hosts present a certificate that Node trusts, valid for the host and not expiring
 *     within 14 days
 *   - Redirect: the non-canonical host answers 308 to the canonical host, keeping path and query
 *   - Routes: every page returns 200, and an unknown path returns 404. Each carries
 *     X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, and every page's HTML carries
 *     <meta name="robots" content="noindex, nofollow">. The event routes come from
 *     src/data/events.ts, the same list the site generates its event pages from.
 *   - /robots.txt disallows everything; there is no sitemap; the /mockups routes are gone
 *
 *   node scripts/verify-live.mjs [canonicalHost] [redirectHost]
 *
 * Defaults: canonical www.capitalclubavlevents.com, redirecting host capitalclubavlevents.com.
 * Exits non-zero on any failure. Form behaviour and screenshots are covered by the Playwright
 * suite and scripts/screenshots.mjs, which both accept the live URL. The checks are exported
 * (runChecks, main) with injectable network and TLS access; tests/verify-live.unit.mjs uses
 * that to prove each check fails on a bad response.
 */
import { connect } from 'node:tls';
import { pathToFileURL } from 'node:url';
// Node strips the types natively; events.ts uses only erasable syntax and imports nothing.
import { events } from '../src/data/events.ts';

export const ROBOTS = 'noindex, nofollow, noarchive, nosnippet';
export const ROBOTS_META = 'noindex, nofollow';

/** Every page route the site builds: the fixed pages plus one per event (as getStaticPaths does). */
export const pagesFor = (eventList) => ['/', '/events', ...eventList.map((e) => `/events/${e.slug}`), '/photos', '/contact'];
export const PAGES = pagesFor(events);
export const GONE = ['/this-page-does-not-exist', '/mockups', '/mockups/a', '/mockups/b/events', '/sitemap.xml', '/sitemap-index.xml', '/sitemap-0.xml'];
export const REDIRECT_PATHS = ['/', '/events/winter-jazz-night', '/photos?from=launch-check', '/this-page-does-not-exist'];
const DAY = 86_400_000;
const TIMEOUT = 15_000;

/** Completes a TLS handshake and reports whether Node's default CA store trusts the certificate. */
export function tlsInfo(host) {
  return new Promise((resolve) => {
    const socket = connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      resolve({
        authorized: socket.authorized,
        error: socket.authorizationError,
        protocol: socket.getProtocol(),
        issuer: [cert.issuer?.O, cert.issuer?.CN].filter(Boolean).join(' '),
        san: cert.subjectaltname,
        validTo: new Date(cert.valid_to),
      });
      socket.end();
    });
    socket.setTimeout(TIMEOUT, () => socket.destroy(new Error('TLS handshake timed out')));
    socket.on('error', (error) => resolve({ authorized: false, error: error.code ?? error.message }));
  });
}

/** GET without following redirects. A network failure resolves to { error } instead of throwing. */
export async function httpGet(url) {
  try {
    return await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'capital-club-events-launch-check' },
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (error) {
    return { error: error.cause?.code ?? error.message };
  }
}

const statusOf = (res) => (res.error ? `no response (${res.error})` : res.status);
const headerOf = (res, name) => res.headers?.get(name) ?? null;
const bodyOf = async (res) => (res.error ? '' : res.text());
/** The content of the page's <meta name="robots">, or null when it has none. */
const robotsMetaOf = (html) => /<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html)?.[1] ?? null;

/**
 * Runs every launch check and returns one { ok, msg } per check. `get(url)` must resolve to a
 * fetch Response (or { error }) and `tls(host)` to the shape tlsInfo returns; both default to the
 * real network. `pages` defaults to every route derived from the event data.
 */
export async function runChecks({ canonical, redirecting, get = httpGet, tls = tlsInfo, now = Date.now(), pages = PAGES }) {
  const results = [];
  const check = (ok, msg) => results.push({ ok: Boolean(ok), msg });

  // TLS on both hosts
  for (const host of [canonical, redirecting]) {
    const t = await tls(host);
    const expires = t.validTo instanceof Date && !Number.isNaN(t.validTo.getTime()) ? t.validTo : null;
    const days = expires ? Math.floor((expires.getTime() - now) / DAY) : null;
    check(
      t.authorized && days !== null && days > 14,
      `TLS ${host}: ${t.authorized ? 'trusted' : `NOT trusted (${t.error})`}, ${t.protocol}, issuer ${t.issuer}, ` +
        `expires ${expires ? expires.toISOString().slice(0, 10) : 'unknown'} (${days ?? '?'} days), SAN ${t.san}`,
    );
  }

  // Plain HTTP upgrades to HTTPS on the canonical host
  {
    const res = await get(`http://${canonical}/events`);
    const loc = headerOf(res, 'location');
    check(
      [301, 308].includes(res.status) && loc === `https://${canonical}/events`,
      `http://${canonical}/events → ${statusOf(res)} ${loc}`,
    );
  }

  // Non-canonical host 308s to the canonical host, keeping path and query
  for (const path of REDIRECT_PATHS) {
    const res = await get(`https://${redirecting}${path}`);
    const loc = headerOf(res, 'location');
    check(res.status === 308 && loc === `https://${canonical}${path}`, `https://${redirecting}${path} → ${statusOf(res)} ${loc}`);
  }

  // Canonical host: pages 200 with the robots meta, everything gone 404, noindex header on all
  for (const [paths, want] of [[pages, 200], [GONE, 404]]) {
    for (const path of paths) {
      const res = await get(`https://${canonical}${path}`);
      const tag = headerOf(res, 'x-robots-tag');
      const type = (headerOf(res, 'content-type') ?? '').split(';')[0];
      const line = `${statusOf(res)} ${path.padEnd(52)} ${type.padEnd(10)} X-Robots-Tag: ${tag}`;
      if (want === 404) {
        check(res.status === want && tag === ROBOTS, line);
        continue;
      }
      const meta = robotsMetaOf(await bodyOf(res));
      check(res.status === want && tag === ROBOTS && meta === ROBOTS_META, `${line} · robots meta: ${meta ?? 'missing'}`);
    }
  }

  // robots.txt disallows everything and names no sitemap
  {
    const res = await get(`https://${canonical}/robots.txt`);
    const lines = (await bodyOf(res)).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    check(
      res.status === 200 &&
        headerOf(res, 'x-robots-tag') === ROBOTS &&
        lines.includes('User-agent: *') &&
        lines.includes('Disallow: /') &&
        !lines.some((l) => /^(allow|sitemap):/i.test(l)),
      `robots.txt ${statusOf(res)}: ${JSON.stringify(lines)}`,
    );
  }


  return results;
}

/** Prints every check and returns the process exit code: 0 when all pass, 1 otherwise. */
export async function main({ argv = process.argv.slice(2), log = console.log, ...deps } = {}) {
  const canonical = argv[0] ?? 'www.capitalclubavlevents.com';
  const redirecting = argv[1] ?? 'capitalclubavlevents.com';
  const results = await runChecks({ canonical, redirecting, ...deps });
  for (const { ok, msg } of results) log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  const failed = results.filter((r) => !r.ok).length;
  log(failed ? `\n${failed} live check(s) failed` : `\nall live checks passed for https://${canonical} (redirect from ${redirecting})`);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
