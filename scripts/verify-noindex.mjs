#!/usr/bin/env node
/**
 * Verifies the three "do not index" layers against the build output:
 *   1. vercel.json sends X-Robots-Tag: noindex, nofollow, noarchive, nosnippet for /(.*)
 *   2. every generated HTML page carries <meta name="robots" content="noindex, nofollow">
 *   3. dist/robots.txt disallows everything, and no sitemap is emitted
 * Run after `npm run build`. Exits non-zero on any failure.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const failures = [];
const ok = (msg) => console.log(`ok   ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.log(`FAIL ${msg}`);
};

// Layer 1 — header config
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const rule = (vercel.headers ?? []).find((h) => h.source === '/(.*)');
const tag = rule?.headers?.find((h) => h.key.toLowerCase() === 'x-robots-tag')?.value;
if (tag === 'noindex, nofollow, noarchive, nosnippet') ok(`vercel.json X-Robots-Tag on /(.*): "${tag}"`);
else fail(`vercel.json X-Robots-Tag on /(.*) is ${JSON.stringify(tag)}`);

// Layer 2 — robots meta on every page
if (!existsSync(dist)) {
  fail('dist/ not found — run `npm run build` first');
} else {
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) pages.push(p);
    }
  };
  walk(dist);
  const meta = /<meta name="robots" content="noindex, nofollow"\s*\/?>/;
  const missing = pages.filter((p) => !meta.test(readFileSync(p, 'utf8')));
  if (pages.length && !missing.length) ok(`robots meta present on all ${pages.length} HTML pages`);
  else fail(`robots meta missing on ${missing.length}/${pages.length} pages: ${missing.map((p) => relative(dist, p)).join(', ')}`);

  // Layer 3 — robots.txt and no sitemap
  const robotsPath = join(dist, 'robots.txt');
  const robots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : '';
  const lines = robots.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.includes('User-agent: *') && lines.includes('Disallow: /') && !lines.some((l) => /^allow:/i.test(l)))
    ok('robots.txt: "User-agent: *" + "Disallow: /"');
  else fail(`robots.txt does not disallow all: ${JSON.stringify(robots)}`);
  if (/sitemap/i.test(robots)) fail('robots.txt references a sitemap');
  const sitemaps = readdirSync(dist).filter((n) => /sitemap/i.test(n));
  if (sitemaps.length) fail(`sitemap files emitted: ${sitemaps.join(', ')}`);
  else ok('no sitemap emitted');
}

if (failures.length) {
  console.log(`\n${failures.length} noindex check(s) failed`);
  process.exit(1);
}
console.log('\nall noindex layers verified');
