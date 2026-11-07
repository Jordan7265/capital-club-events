#!/usr/bin/env node
/**
 * Dependency-free lint for the project's hard rules (docs/plans/capital-club-events-demo-site/plan.md):
 *   1. Every Node script under scripts/ parses (node --check).
 *   2. The site makes no network calls: no fetch, XHR, beacons, sockets or event streams in src/,
 *      and no <form> with an action or POST method.
 *   3. No API or server routes: src/pages holds only .astro pages (no .ts/.js endpoints) and
 *      nothing opts out of prerendering.
 *   4. No em dashes in shipped UI text or the README (operator rule). The one exception, approved
 *      by the operator, is the Nov 14 event's proper name, which keeps the dash it was given.
 *   5. No Mission Control report.html is tracked by git.
 * Exits non-zero on any failure.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];
const ok = (msg) => console.log(`ok   ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.log(`FAIL ${msg}`);
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const rel = (p) => relative(root, p);
const read = (p) => readFileSync(p, 'utf8');

/** Lists every line matching `pattern` (a RegExp or a line predicate) as "file:line: text". */
function findAll(files, pattern) {
  const matches = typeof pattern === 'function' ? pattern : (line) => pattern.test(line);
  const hits = [];
  for (const file of files) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        if (matches(line)) hits.push(`${rel(file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
  }
  return hits;
}

const report = (label, hits) => {
  if (hits.length) fail(`${label}:\n     ${hits.join('\n     ')}`);
  else ok(label);
};

// 1. Script syntax
const scripts = walk(join(root, 'scripts')).filter((p) => ['.mjs', '.js'].includes(extname(p)));
const badSyntax = [];
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    badSyntax.push(`${rel(file)}: ${String(error.stderr).split('\n')[0]}`);
  }
}
report(`${scripts.length} Node scripts in scripts/ parse`, badSyntax);

// 2. No network calls from the site
const srcFiles = walk(join(root, 'src'));
const codeFiles = srcFiles.filter((p) => ['.astro', '.ts', '.js', '.mjs'].includes(extname(p)));
report(
  'no network APIs in src/ (fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource)',
  findAll(codeFiles, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/),
);
report(
  'no <form> posts anywhere in src/ (no action attribute, no method="post")',
  findAll(codeFiles, /<form\b[^>]*\b(action\s*=|method\s*=\s*["']?post)/i),
);

// 3. No API / server routes
const pages = walk(join(root, 'src', 'pages'));
report(
  'src/pages contains only .astro pages (no API endpoints)',
  pages.filter((p) => extname(p) !== '.astro').map(rel),
);
report('nothing opts out of static prerendering', findAll(codeFiles, /export\s+const\s+prerender\s*=\s*false/));

// 4. No em dashes in shipped UI text or the README, except the operator-approved event name
const APPROVED_NAME = 'Playgrounds for Asheville \u2014 Rooftop Benefit';
const EM_DASH = /\u2014|&mdash;|&#8212;|&#x2014;/i;
const textFiles = [...srcFiles, ...walk(join(root, 'public')).filter((p) => extname(p) === '.txt'), join(root, 'README.md')];
report(
  'no em dashes in src/, public/*.txt or README.md (besides the approved event name)',
  findAll(textFiles, (line) => EM_DASH.test(line.split(APPROVED_NAME).join(''))),
);

// 5. No tracked report.html
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
report('no report.html tracked by git', tracked.filter((p) => /(^|\/)report\.html$/i.test(p)));

if (failures.length) {
  console.log(`\n${failures.length} lint check(s) failed`);
  process.exit(1);
}
console.log('\nlint passed');
