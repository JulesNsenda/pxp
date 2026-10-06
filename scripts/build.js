#!/usr/bin/env node
/*
 * Builds the static site for GitHub Pages into _site/. Zero dependencies, Node 20+.
 *
 *   node scripts/build.js            # writes _site/
 *   node scripts/build.js out-dir    # writes somewhere else
 *
 * The HTML holds the full spec text (no client script), so crawlers and agent fetch
 * tools that don't run JavaScript see the whole protocol. llms.txt and llms-full.txt
 * follow https://llmstxt.org.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://julesnsenda.github.io/pxp/';
const REPO = 'https://github.com/JulesNsenda/pxp';
const BEHALF = 'https://github.com/JulesNsenda/behalf';
const AUTHOR = 'Jules Nsenda';
const LATEST = 'v0';
const VERSIONS = ['v0'];
const SCHEMAS = [
  ['intent-card.schema.json', 'Intent Card', 'what a principal authorises its proxy to do'],
  ['envelope.schema.json', 'Envelope', 'one proxy message: claims, reviews, proposal, status'],
];
const SUMMARY = 'PXP (Proxy Exchange Protocol) is an open, transport-agnostic protocol for AI agents ' +
  'that negotiate on behalf of humans: every claim is tagged stated, sourced or assumed, proxies ' +
  'escalate to their principals at a limit, and an agreement produces a decision brief and a ' +
  'hash-chained ledger.';

const root = path.join(__dirname, '..');

// ---------- Markdown (the subset SPEC.md uses; all source text is escaped) ----------

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function inline(text) {
  let out = '';
  let last = 0;
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out += esc(text.slice(last, m.index));
    if (m[1] !== undefined) out += `<code>${esc(m[1])}</code>`;
    else if (m[2] !== undefined) out += `<strong>${esc(m[2])}</strong>`;
    else out += `<em>${esc(m[3])}</em>`;
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}

function slug(text) {
  return text.toLowerCase().replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cells(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const ITEM = /^(\d+\.|-) /;
const BLOCK_START = /^(#{1,3} |\||```|\d+\. |- )/;

function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,3}) (.*)/.exec(line);
    if (h) {
      const n = h[1].length;
      out.push(`<h${n} id="${slug(h[2])}">${inline(h[2])}</h${n}>`);
      i++;
    } else if (line.startsWith('```')) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const head = cells(rows[0]);
      const body = rows.slice(SEPARATOR.test(rows[1] || '') ? 2 : 1);
      out.push('<div class="table"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' + body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
    } else if (ITEM.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items = [];
      while (i < lines.length && ITEM.test(lines[i]) && /^\d+\./.test(lines[i]) === ordered) {
        let text = lines[i++].replace(ITEM, '');
        while (i < lines.length && /^ {2,}\S/.test(lines[i])) text += ' ' + lines[i++].trim();
        items.push(`<li>${inline(text)}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.join('')}</${tag}>`);
    } else {
      // Always take the first line, so a line no other branch claims can never stall the loop.
      const para = [lines[i++].trim()];
      while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) para.push(lines[i++].trim());
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

// ---------- Pages ----------

const CSS = `
:root{--bg:#fbfbf9;--fg:#1c1c1a;--muted:#5c5c57;--line:#deded8;--code:#f0f0ec;--link:#1d4fbf}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ececea;--muted:#a6a6a0;--line:#34342f;--code:#22221f;--link:#8fb0ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main,header,footer{max-width:46rem;margin:0 auto;padding:0 16px}
header{padding-top:2rem}
header nav{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.9rem}
footer{border-top:1px solid var(--line);margin-top:3rem;padding-top:1rem;padding-bottom:2rem;color:var(--muted);font-size:.875rem}
a{color:var(--link)}
h1{font-size:1.9rem;line-height:1.2;margin:1.5rem 0 1rem}
h2{font-size:1.3rem;margin:2.25rem 0 .5rem}
h3{font-size:1.1rem;margin:1.75rem 0 .5rem}
code{font:.875em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--code);padding:.1em .3em;border-radius:4px}
pre{background:var(--code);padding:1rem;border-radius:6px;overflow-x:auto}
pre code{padding:0;background:none}
.table{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.95rem}
th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:.4rem .6rem .4rem 0}
.lede{color:var(--muted)}
`;

function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function page({ version, canonical, prefix }) {
  const spec = fs.readFileSync(path.join(root, version, 'SPEC.md'), 'utf8');
  const schemaLinks = SCHEMAS.map(([file, name]) => `<a href="${prefix}${version}/${file}">${esc(name)} schema</a>`).join('\n      ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PXP ${esc(version)} — Proxy Exchange Protocol</title>
<meta name="description" content="${esc(SUMMARY)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" type="text/markdown" href="${prefix}${version}/SPEC.md" title="PXP ${esc(version)} specification (Markdown)">
<link rel="alternate" type="text/plain" href="${prefix}llms-full.txt" title="PXP for LLMs">
<style>${CSS}</style>
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `PXP ${version} — Proxy Exchange Protocol`,
    description: SUMMARY,
    url: canonical,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isBasedOn: REPO,
    author: { '@type': 'Person', name: AUTHOR },
  })}</script>
</head>
<body>
<header>
  <nav aria-label="Specification files">
      <a href="${prefix}${version}/SPEC.md">SPEC.md</a>
      ${schemaLinks}
      <a href="${prefix}llms.txt">llms.txt</a>
      <a href="${REPO}">Source on GitHub</a>
      <a href="${BEHALF}">Reference implementation (Behalf)</a>
  </nav>
</header>
<main>
${markdown(spec)}
</main>
<footer>
  © 2026 ${esc(AUTHOR)}. Specification text licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>;
  JSON schemas licensed MIT. Changes and issues: <a href="${REPO}">${esc(REPO.replace('https://', ''))}</a>.
</footer>
</body>
</html>
`;
}

function llms() {
  return `# PXP — Proxy Exchange Protocol

> ${SUMMARY}

PXP is a draft (${LATEST}); expect breaking changes until v1. It specifies the content proxies exchange
(Intent Cards, envelopes, claims with origin tags, reviews, escalation, a hash-chained ledger and a
decision brief), and an optional MCP transport binding. The reference implementation is Behalf.

## Specification

- [PXP ${LATEST} specification (Markdown)](${BASE}${LATEST}/SPEC.md): the normative protocol
${SCHEMAS.map(([file, name, what]) => `- [${name} JSON Schema](${BASE}${LATEST}/${file}): ${what}`).join('\n')}

## Implementations

- [Behalf](${BEHALF}): reference implementation; two AI proxies negotiate for two humans, with a remote MCP server so any MCP-capable agent can take a seat

## Optional

- [Full text for LLMs](${BASE}llms-full.txt): the specification and both schemas in one file
- [Source repository](${REPO}): issues and proposed changes
`;
}

function llmsFull() {
  const spec = fs.readFileSync(path.join(root, LATEST, 'SPEC.md'), 'utf8').trimEnd();
  const schemas = SCHEMAS.map(([file]) => {
    const body = fs.readFileSync(path.join(root, LATEST, file), 'utf8').trimEnd();
    return `## ${file}\n\nURL: ${BASE}${LATEST}/${file}\n\n\`\`\`json\n${body}\n\`\`\``;
  }).join('\n\n');
  return `# PXP — Proxy Exchange Protocol (full text)

> ${SUMMARY}

Source: ${REPO}. © 2026 ${AUTHOR}. Specification text CC BY 4.0, schemas MIT.

${spec}

# JSON Schemas (${LATEST})

${schemas}
`;
}

function build(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const write = (rel, body) => {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  };

  write('index.html', page({ version: LATEST, canonical: BASE, prefix: '' }));
  const urls = [BASE];
  for (const v of VERSIONS) {
    write(`${v}/index.html`, page({ version: v, canonical: `${BASE}${v}/`, prefix: '../' }));
    // An explicit list: a stray file in v0/ is never published.
    for (const file of ['SPEC.md', ...SCHEMAS.map(([f]) => f)]) {
      fs.copyFileSync(path.join(root, v, file), path.join(outDir, v, file));
      urls.push(`${BASE}${v}/${file}`);
    }
    urls.push(`${BASE}${v}/`);
  }
  write('llms.txt', llms());
  write('llms-full.txt', llmsFull());
  urls.push(`${BASE}llms.txt`, `${BASE}llms-full.txt`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n') + '\n</urlset>\n');
  // Served as-is: no Jekyll processing of the Markdown files.
  write('.nojekyll', '');
  return outDir;
}

module.exports = { BASE, LATEST, VERSIONS, SCHEMAS, esc, jsonLd, markdown, build };

if (require.main === module) {
  const out = build(path.resolve(process.argv[2] || path.join(root, '_site')));
  console.log(`built ${out}`);
}
