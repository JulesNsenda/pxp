'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BASE, LATEST, VERSIONS, SCHEMAS, esc, jsonLd, markdown, build } = require('../scripts/build.js');

const root = path.join(__dirname, '..');
const out = build(fs.mkdtempSync(path.join(os.tmpdir(), 'pxp-site-')));
const read = (rel) => fs.readFileSync(path.join(out, rel), 'utf8');

test('every schema parses and its $id is the URL it is served at', () => {
  for (const v of VERSIONS) {
    for (const [file] of SCHEMAS) {
      const schema = JSON.parse(fs.readFileSync(path.join(root, v, file), 'utf8'));
      assert.equal(schema.$id, `${BASE}${v}/${file}`);
      assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
      assert.equal(read(`${v}/${file}`), fs.readFileSync(path.join(root, v, file), 'utf8'));
    }
  }
});

test('the HTML holds the whole spec as text, with no client script', () => {
  const spec = fs.readFileSync(path.join(root, LATEST, 'SPEC.md'), 'utf8');
  const headings = spec.split('\n').filter((l) => /^#{1,3} /.test(l)).map((l) => l.replace(/^#+ /, ''));
  assert.ok(headings.length >= 10);
  for (const page of ['index.html', `${LATEST}/index.html`]) {
    const html = read(page);
    for (const h of headings) assert.ok(html.includes(h.replace(/`/g, '').split(' ')[0]), `${page}: ${h}`);
    assert.ok(html.includes('semantic packet loss'));
    assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/i);
  }
  assert.match(read('index.html'), new RegExp(`<link rel="canonical" href="${BASE}">`));
  assert.match(read(`${LATEST}/index.html`), /href="\.\.\/v0\/SPEC\.md"/);
});

test('markdown escapes source text in every construct', () => {
  const P = `<x>"'&`;
  const E = '&lt;x&gt;&quot;&#39;&amp;';
  assert.equal(esc(P), E);
  const cases = {
    [`# ${P}`]: `<h1 id="x">${E}</h1>`,
    [`## ${P}`]: `<h2 id="x">${E}</h2>`,
    [`### ${P}`]: `<h3 id="x">${E}</h3>`,
    [`- ${P}`]: `<ul><li>${E}</li></ul>`,
    [`1. ${P}`]: `<ol><li>${E}</li></ol>`,
    [`**${P}**`]: `<p><strong>${E}</strong></p>`,
    [`*${P}*`]: `<p><em>${E}</em></p>`,
    [P]: `<p>${E}</p>`,
  };
  for (const [src, html] of Object.entries(cases)) assert.equal(markdown(src), html, src);
  const table = markdown(`| ${P} | h |\n|---|---|\n| ${P} | c |`);
  assert.ok(table.includes(`<th>${E}</th>`) && table.includes(`<td>${E}</td>`), table);
  assert.doesNotMatch(table, /<x>/);
});

test('JSON-LD cannot close its script element', () => {
  assert.equal(jsonLd({ a: '</script><script>' }), '{"a":"\\u003c/script>\\u003cscript>"}');
});

test('lines no branch claims still render, and never stall the build', () => {
  assert.equal(markdown('#### x'), '<p>#### x</p>');
  assert.equal(markdown('#'), '<p>#</p>');
  assert.equal(markdown('##x\nmore'), '<p>##x more</p>');
});

test('markdown escapes source text', () => {
  assert.equal(markdown('a <b> & `<i>`'), '<p>a &lt;b&gt; &amp; <code>&lt;i&gt;</code></p>');
  assert.equal(markdown('```\n<script>\n```'), '<pre><code>&lt;script&gt;</code></pre>');
  assert.match(markdown('| a | b |\n|---|---|\n| `x` | **y** |'), /<td><code>x<\/code><\/td><td><strong>y<\/strong><\/td>/);
  assert.equal(markdown('1. one\n   more\n2. two'), '<ol><li>one more</li><li>two</li></ol>');
});

test('llms.txt follows llmstxt.org and links only to published files', () => {
  const txt = read('llms.txt');
  const lines = txt.split('\n');
  assert.match(lines[0], /^# /);
  assert.match(lines[2], /^> /);
  assert.ok(lines.some((l) => /^## /.test(l)));
  const links = [...txt.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length >= 4);
  for (const url of links.filter((u) => u.startsWith(BASE))) {
    assert.ok(fs.existsSync(path.join(out, url.slice(BASE.length))), url);
  }
});

test('llms-full.txt carries the spec and both schemas', () => {
  const txt = read('llms-full.txt');
  assert.ok(txt.includes(fs.readFileSync(path.join(root, LATEST, 'SPEC.md'), 'utf8').trim()));
  for (const [file] of SCHEMAS) assert.ok(txt.includes(`"$id": "${BASE}${LATEST}/${file}"`));
});

test('sitemap lists only files that exist, and robots points at it', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.includes(BASE));
  for (const loc of locs) {
    const rel = loc.slice(BASE.length);
    assert.ok(fs.existsSync(path.join(out, rel.endsWith('/') || rel === '' ? rel + 'index.html' : rel)), loc);
  }
  assert.ok(read('robots.txt').includes(`Sitemap: ${BASE}sitemap.xml`));
  assert.ok(fs.existsSync(path.join(out, '.nojekyll')));
});
