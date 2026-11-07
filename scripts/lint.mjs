#!/usr/bin/env node
/**
 * Dependency-free lint for the project's hard rules (docs/plans/capital-club-events-demo-site/plan.md):
 *   1. Every Node script under scripts/ parses (node --check).
 *   2. The site makes no network calls: no fetch, XHR, beacons, sockets or event streams in src/,
 *      and nothing can submit a form: no <form> with an action or POST method, no formaction /
 *      formmethod="post" on its buttons, and no scripted submit or action/method assignment.
 *      These checks scan whole files, so tags and calls split across lines are still caught.
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

/**
 * Scans each file as a whole (so matches may span line breaks) and lists every match of the
 * global `regex` as "file:line: text", using the line where the match starts. An optional
 * `keep` predicate filters the matched text, e.g. to test a complete tag for an attribute.
 */
function findInFiles(files, regex, keep = () => true) {
  const hits = [];
  for (const file of files) {
    const text = read(file);
    for (const match of text.matchAll(regex)) {
      if (!keep(match[0])) continue;
      const line = text.slice(0, match.index).split('\n').length;
      hits.push(`${rel(file)}:${line}: ${match[0].replace(/\s+/g, ' ').trim().slice(0, 100)}`);
    }
  }
  return hits;
}

/**
 * One complete <form ...> start tag, across line breaks. Quoted values and {...} expressions
 * (two levels deep) are skipped as units, so a ">" inside them (e.g. an arrow function) does
 * not end the tag early.
 */
const FORM_TAG = /<form\b(?:"[^"]*"|'[^']*'|`[^`]*`|\{(?:[^{}]|\{[^{}]*\})*\}|[^>"'`{}])*>/gi;
const POSTS = /\baction\s*=|\bmethod\s*=\s*\{?\s*["'`]?\s*post\b/i;

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
  findInFiles(codeFiles, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/g),
);
report(
  'no form submission paths in src/ (<form> action or method="post", formaction, scripted submit)',
  [
    ...findInFiles(codeFiles, FORM_TAG, (tag) => POSTS.test(tag)),
    ...findInFiles(codeFiles, /\bformaction\s*=|\bformmethod\s*=\s*\{?\s*["'`]?\s*post\b/gi),
    ...findInFiles(
      codeFiles,
      /\.(?:submit|requestSubmit)\s*\(|\.(?:action|method|formAction|formMethod)\s*=(?!=)|setAttribute\s*\(\s*["'`](?:action|method|formaction|formmethod)["'`]/g,
    ),
  ],
);

// 3. No API / server routes
const pages = walk(join(root, 'src', 'pages'));
report(
  'src/pages contains only .astro pages (no API endpoints)',
  pages.filter((p) => extname(p) !== '.astro').map(rel),
);
report('nothing opts out of static prerendering', findInFiles(codeFiles, /export\s+const\s+prerender\s*=\s*false/g));

// 4. No em dashes in shipped UI text or the README
const EM_DASH = /\u2014|&mdash;|&#8212;|&#x2014;/gi;
const textFiles = [...srcFiles, ...walk(join(root, 'public')).filter((p) => extname(p) === '.txt'), join(root, 'README.md')];
report('no em dashes in src/, public/*.txt or README.md', findInFiles(textFiles, EM_DASH));

// 5. No tracked report.html
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
report('no report.html tracked by git', tracked.filter((p) => /(^|\/)report\.html$/i.test(p)));

if (failures.length) {
  console.log(`\n${failures.length} lint check(s) failed`);
  process.exit(1);
}
console.log('\nlint passed');
