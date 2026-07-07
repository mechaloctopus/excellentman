// Static site generator for THE EXCELLENT MAN web book.
// Reads content/manuscript/*.md, converts to styled HTML pages under /read,
// plus the cover/TOC index. No client framework — plain generated HTML.

import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'manuscript');
const OUT = ROOT;
const READ_DIR = path.join(OUT, 'read');

marked.setOptions({ headerIds: false, mangle: false });

const BOOKS = [
  { num: 'I', title: 'The Mind', file: 'BOOK_I_THE_MIND.md' },
  { num: 'II', title: 'The Word', file: 'BOOK_II_THE_WORD.md' },
  { num: 'III', title: 'The Body', file: 'BOOK_III_THE_BODY.md' },
  { num: 'IV', title: 'The Company', file: 'BOOK_IV_THE_COMPANY.md' },
  { num: 'V', title: 'The Companion', file: 'BOOK_V_THE_COMPANION.md' },
  { num: 'VI', title: 'The World', file: 'BOOK_VI_THE_WORLD.md' },
  { num: 'VII', title: 'The Guardian', file: 'BOOK_VII_THE_GUARDIAN.md' },
  { num: 'VIII', title: 'The Service', file: 'BOOK_VIII_THE_SERVICE.md' },
  { num: 'IX', title: 'The Crown', file: 'BOOK_IX_THE_CROWN_49-51.md' },
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function readFile(name) {
  return fs.readFileSync(path.join(CONTENT, name), 'utf8');
}

// --- Parse a manuscript file into chapters -------------------------------
// Splits on "## Chapter N — Title" headings. Returns array of
// { num, title, book, raw } where raw is the markdown body of the chapter
// (everything up to the next chapter heading or EOF).
function parseChapters(fileText, bookMeta) {
  const lines = fileText.split('\n');
  const headingRe = /^##\s*Chapter\s+(\d+)\s*[—-]\s*(.+?)\s*$/;
  const chapters = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      if (current) chapters.push(current);
      current = { num: parseInt(m[1], 10), title: m[2].trim(), book: bookMeta, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) chapters.push(current);
  return chapters.map((c) => ({ ...c, raw: c.lines.join('\n') }));
}

// Pull the leading epigraph blockquote (lines starting with "> ") out of a
// chapter's raw body. Returns { epigraphHtml, rest }.
function extractEpigraph(raw) {
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const quoteLines = [];
  while (i < lines.length && lines[i].trim().startsWith('>')) {
    quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
    i++;
  }
  if (quoteLines.length === 0) {
    return { epigraphHtml: '', rest: raw };
  }
  // Last non-empty line is the attribution (starts with —), preceding lines are the quote.
  const attrIdx = quoteLines.findIndex((l) => l.trim().startsWith('—'));
  let quote, attribution;
  if (attrIdx !== -1) {
    quote = quoteLines.slice(0, attrIdx).join(' ').trim();
    attribution = quoteLines[attrIdx].replace(/^—\s*/, '').trim();
  } else {
    quote = quoteLines.join(' ').trim();
    attribution = '';
  }
  quote = quote.replace(/^\*+|\*+$/g, '').replace(/^"|"$/g, '');
  const epigraphHtml = `<figure class="epigraph">
    <blockquote>${inline(quote)}</blockquote>
    ${attribution ? `<figcaption>— ${inline(attribution)}</figcaption>` : ''}
  </figure>`;
  const rest = lines.slice(i).join('\n');
  return { epigraphHtml, rest };
}

// Pull the trailing "### The Line" pull-quote out of a chapter body.
function extractTheLine(raw) {
  const re = /###\s*The Line\s*\n+([\s\S]*?)\s*$/;
  const m = raw.match(re);
  if (!m) return { lineHtml: '', rest: raw };
  const text = m[1].trim().replace(/^\*+|\*+$/g, '');
  const lineHtml = `<div class="the-line">
    <span class="the-line-label">The Line</span>
    <p>${inline(text)}</p>
  </div>`;
  const rest = raw.slice(0, m.index).trim();
  return { lineHtml, rest };
}

function inline(md) {
  return marked.parseInline(md);
}

function renderBody(md) {
  let html = marked.parse(md);
  // Style numbered section headings: "### I. Title" -> split roman numeral / title
  html = html.replace(
    /<h3>([IVXLCDM]+)\.\s*(.*?)<\/h3>/g,
    '<h3 class="section-heading"><span class="roman">$1</span><span class="section-title">$2</span></h3>'
  );
  // Wrap the weekly practice paragraph in a callout box
  html = html.replace(
    /<p><strong>This week:?([\s\S]*?)<\/p>/,
    '<div class="practice-box"><p class="practice-label">Practice</p><p><strong>This week:$1</p></div>'
  );
  // Style illustration placeholders as an unobtrusive figure note rather than raw brackets
  html = html.replace(/\[DIAGRAM([^\]]*)\]/g, (_m, inner) => {
    const label = inner.replace(/DIAGRAM\s*\d+(-\d+)?:?\s*/gi, '').replace(/^\s*\d+(-\d+)?:?\s*/, '').trim();
    return `<span class="diagram-note">Figure — ${label}</span>`;
  });
  return html;
}

function estimateReadMinutes(raw) {
  const words = raw.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// --- Gather all chapters --------------------------------------------------
let allChapters = [];
for (const book of BOOKS) {
  const text = readFile(book.file);
  const chapters = parseChapters(text, book);
  allChapters.push(...chapters);
}
const ch1 = parseChapters(readFile('CH01_The_Monkey_King.md'), null)[0];
const ch52 = parseChapters(readFile('CH52_The_Sleeper_King.md'), null)[0];
allChapters.push(ch1, ch52);
allChapters.sort((a, b) => a.num - b.num);

// Process each chapter: extract epigraph + closing line, render body, slug, word count.
for (const c of allChapters) {
  const { epigraphHtml, rest: afterEpigraph } = extractEpigraph(c.raw);
  const { lineHtml, rest: bodyMd } = extractTheLine(afterEpigraph);
  c.epigraphHtml = epigraphHtml;
  c.lineHtml = lineHtml;
  c.bodyHtml = renderBody(bodyMd);
  c.slug = `${String(c.num).padStart(2, '0')}-${slugify(c.title)}`;
  c.minutes = estimateReadMinutes(c.raw);
  c.href = `read/${c.slug}.html`;
}

// --- Front matter ----------------------------------------------------------
const frontRaw = readFile('00_FRONT_MATTER.md');
const noteMatch = frontRaw.match(/## A Note on the Title\s*\n+([\s\S]*?)\n---/);
const prefaceMatch = frontRaw.match(/## Preface\s*\n+([\s\S]*?)\n---/);
const openingEpigraphMatch = frontRaw.match(/\*"([\s\S]*?)"\*\s*\n—\s*(.+)/);

const noteOnTitleHtml = marked.parse(noteMatch ? noteMatch[1].trim() : '');
const prefaceHtml = marked.parse(prefaceMatch ? prefaceMatch[1].trim() : '');
const openingEpigraph = openingEpigraphMatch
  ? { quote: openingEpigraphMatch[1].trim(), attribution: openingEpigraphMatch[2].trim() }
  : { quote: '', attribution: '' };

// --- Appendix ----------------------------------------------------------
const appendixRaw = readFile('APPENDIX_A.md');
const appendixBodyMd = appendixRaw.replace(/^## APPENDIX A.*\n/, '');
const appendixHtml = marked.parse(appendixBodyMd.trim());

// --- Reading order / prev-next -------------------------------------------
const flow = [
  { kind: 'preface', title: 'Preface', href: 'read/00-preface.html' },
  ...allChapters.map((c) => ({ kind: 'chapter', chapter: c, title: `Chapter ${c.num} — ${c.title}`, href: c.href })),
  { kind: 'appendix', title: 'Appendix A — The One-Page Code', href: 'read/appendix-the-one-page-code.html' },
];
for (let i = 0; i < flow.length; i++) {
  flow[i].prev = i > 0 ? flow[i - 1] : null;
  flow[i].next = i < flow.length - 1 ? flow[i + 1] : null;
}

// --- Templates -------------------------------------------------------------

const SITE_TITLE = 'Manual of the Excellent Gentleman';
const SITE_SUBTITLE = "A Beginner's Guide to Etiquette";

function layout({ title, description, bodyClass, content, isRead }) {
  const assetPrefix = isRead ? '../' : '';
  const fullTitle = title === SITE_TITLE ? title : `${title} · ${SITE_TITLE}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description}">
<link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${assetPrefix}assets/style.css">
</head>
<body class="${bodyClass}">
<div class="progress-bar" id="progressBar"></div>
${content}
<script src="${assetPrefix}assets/app.js"></script>
</body>
</html>`;
}

function sidebarNav(activeSlug) {
  const bookGroups = BOOKS.map((book) => {
    const chapters = allChapters.filter((c) => c.book && c.book.file === book.file);
    const items = chapters
      .map(
        (c) => `<li><a href="${isReadContext ? '' : 'read/'}${c.slug}.html" class="${c.slug === activeSlug ? 'active' : ''}"><span class="nav-num">${c.num}</span>${c.title}</a></li>`
      )
      .join('\n');
    return `<div class="nav-book">
      <p class="nav-book-title"><span class="roman">${book.num}</span> ${book.title}</p>
      <ul>${items}</ul>
    </div>`;
  }).join('\n');

  return `<nav class="sidebar" id="sidebar" aria-label="Table of contents">
    <div class="sidebar-head">
      <a href="${isReadContext ? '../' : ''}index.html" class="sidebar-title">${SITE_TITLE}</a>
      <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">&times;</button>
    </div>
    <ul class="nav-flat">
      <li><a href="${isReadContext ? '' : 'read/'}00-preface.html" class="${activeSlug === '00-preface' ? 'active' : ''}">Preface</a></li>
      <li><a href="${isReadContext ? '' : 'read/'}01-the-monkey-king.html" class="${activeSlug === '01-the-monkey-king' ? 'active' : ''}"><span class="nav-num">1</span>The Monkey King</a></li>
    </ul>
    ${bookGroups}
    <ul class="nav-flat nav-flat-end">
      <li><a href="${isReadContext ? '' : 'read/'}52-the-sleeper-king.html" class="${activeSlug === '52-the-sleeper-king' ? 'active' : ''}"><span class="nav-num">52</span>The Sleeper King</a></li>
      <li><a href="${isReadContext ? '' : 'read/'}appendix-the-one-page-code.html" class="${activeSlug === 'appendix-the-one-page-code' ? 'active' : ''}">Appendix A — The One-Page Code</a></li>
    </ul>
  </nav>`;
}

function topbar(title) {
  return `<header class="topbar">
    <button class="menu-btn" id="menuBtn" aria-label="Open table of contents">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 5H18M2 10H18M2 15H18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
    <span class="topbar-title">${title}</span>
    <button class="theme-btn" id="themeBtn" aria-label="Toggle dark mode">
      <svg class="icon-sun" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M10 1.5V4M10 16v2.5M3.5 3.5l1.8 1.8M14.7 14.7l1.8 1.8M1.5 10H4M16 10h2.5M3.5 16.5l1.8-1.8M14.7 5.3l1.8-1.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <svg class="icon-moon" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M17 11.5A7 7 0 1 1 8.5 3a5.5 5.5 0 0 0 8.5 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
    </button>
  </header>`;
}

let isReadContext = false;

function chapterNav(item) {
  if (!item.prev && !item.next) return '';
  return `<nav class="chapter-nav">
    ${item.prev ? `<a class="chapter-nav-link prev" href="${path.basename(item.prev.href)}"><span class="chapter-nav-label">&larr; Previous</span><span class="chapter-nav-title">${item.prev.title}</span></a>` : '<span></span>'}
    <a class="chapter-nav-toc" href="../index.html#toc">Contents</a>
    ${item.next ? `<a class="chapter-nav-link next" href="${path.basename(item.next.href)}"><span class="chapter-nav-label">Next &rarr;</span><span class="chapter-nav-title">${item.next.title}</span></a>` : '<span></span>'}
  </nav>`;
}

function chapterPage(c, flowItem) {
  isReadContext = true;
  const kicker = c.book ? `Book ${c.book.num} &middot; ${c.book.title}` : (c.num === 1 ? 'Prologue' : 'Epilogue');
  const content = `${topbar(`Chapter ${c.num}`)}
  ${sidebarNav(c.slug)}
  <div class="scrim" id="scrim"></div>
  <main class="reader">
    <article class="chapter">
      <p class="kicker">${kicker}</p>
      <h1 class="chapter-title"><span class="chapter-number">Chapter ${c.num}</span>${c.title}</h1>
      <p class="chapter-meta">${c.minutes} min read</p>
      ${c.epigraphHtml}
      <div class="chapter-body">
        ${c.bodyHtml}
      </div>
      ${c.lineHtml}
    </article>
    ${chapterNav(flowItem)}
  </main>`;
  return layout({
    title: `Chapter ${c.num} — ${c.title}`,
    description: `${c.title} — Chapter ${c.num} of ${SITE_TITLE}, ${SITE_SUBTITLE.toLowerCase()}.`,
    bodyClass: 'read-page',
    content,
    isRead: true,
  });
}

function prefacePage(flowItem) {
  isReadContext = true;
  const content = `${topbar('Preface')}
  ${sidebarNav('00-preface')}
  <div class="scrim" id="scrim"></div>
  <main class="reader">
    <article class="chapter front-matter">
      <p class="kicker">${SITE_TITLE}</p>
      <h1 class="chapter-title">Preface</h1>
      <h2 class="front-subhead">A Note on the Title</h2>
      <div class="chapter-body">${noteOnTitleHtml}</div>
      <h2 class="front-subhead">Preface</h2>
      <div class="chapter-body">${prefaceHtml}</div>
    </article>
    ${chapterNav(flowItem)}
  </main>`;
  return layout({
    title: 'Preface',
    description: `A note on the title, and the preface to ${SITE_TITLE}.`,
    bodyClass: 'read-page',
    content,
    isRead: true,
  });
}

function appendixPage(flowItem) {
  isReadContext = true;
  const content = `${topbar('Appendix A')}
  ${sidebarNav('appendix-the-one-page-code')}
  <div class="scrim" id="scrim"></div>
  <main class="reader">
    <article class="chapter front-matter">
      <p class="kicker">Appendix A</p>
      <h1 class="chapter-title">The One-Page Code</h1>
      <p class="chapter-meta">The whole manual on a single sheet</p>
      <div class="chapter-body appendix-body">${appendixHtml}</div>
    </article>
    ${chapterNav(flowItem)}
  </main>`;
  return layout({
    title: 'Appendix A — The One-Page Code',
    description: `${SITE_TITLE}, distilled to one page: the whole manual in fourteen lines.`,
    bodyClass: 'read-page',
    content,
    isRead: true,
  });
}

function indexPage() {
  isReadContext = false;
  const tocBooks = BOOKS.map((book) => {
    const chapters = allChapters.filter((c) => c.book && c.book.file === book.file);
    const items = chapters
      .map((c) => `<li><a href="${c.href}"><span class="toc-num">${c.num}</span><span class="toc-title">${c.title}</span></a></li>`)
      .join('\n');
    return `<div class="toc-book">
      <h3><span class="roman">Book ${book.num}</span> ${book.title}</h3>
      <ul class="toc-list">${items}</ul>
    </div>`;
  }).join('\n');

  const content = `${topbar(SITE_TITLE)}
  ${sidebarNav(null)}
  <div class="scrim" id="scrim"></div>
  <main class="cover">
    <section class="hero">
      <p class="hero-kicker">${SITE_SUBTITLE}</p>
      <h1 class="hero-title">Manual of the<br><span class="hero-title-emphasis">Excellent Gentleman</span></h1>
      <p class="hero-author">by Josh Trembath</p>
      <figure class="epigraph hero-epigraph">
        <blockquote>${inline(openingEpigraph.quote)}</blockquote>
        <figcaption>— ${inline(openingEpigraph.attribution)}</figcaption>
      </figure>
      <div class="hero-actions">
        <a class="btn btn-primary" href="read/00-preface.html">Begin Reading</a>
        <a class="btn btn-ghost" href="#toc">Table of Contents</a>
      </div>
    </section>

    <div class="ornament-break" aria-hidden="true"></div>

    <section class="about">
      <p>The book opens with a monkey king who becomes a bridge for his people and asks nothing back, and closes with the same figure revealed as a sleeper king who serves because he lacks nothing — with the rest of the book training everything from hygiene to courtship to power along the way. Nine Books, fifty chapters, one architecture: Mind, Word, Body, Company, Companion, World, Guardian, Service, Crown.</p>
    </section>

    <div class="ornament-break" aria-hidden="true"></div>

    <section class="toc" id="toc">
      <h2>Table of Contents</h2>
      <ul class="toc-list toc-bookend">
        <li><a href="read/01-the-monkey-king.html"><span class="toc-num">1</span><span class="toc-title">The Monkey King <em>(opens the book)</em></span></a></li>
      </ul>
      ${tocBooks}
      <ul class="toc-list toc-bookend">
        <li><a href="read/52-the-sleeper-king.html"><span class="toc-num">52</span><span class="toc-title">The Sleeper King <em>(closes the book)</em></span></a></li>
      </ul>
      <div class="toc-book toc-appendix">
        <h3>Appendix A</h3>
        <ul class="toc-list"><li><a href="read/appendix-the-one-page-code.html"><span class="toc-title">The One-Page Code</span></a></li></ul>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <p>${SITE_TITLE} &middot; by Josh Trembath</p>
  </footer>`;

  return layout({
    title: SITE_TITLE,
    description: `${SITE_SUBTITLE} — by Josh Trembath. Nine Books, fifty chapters, one architecture.`,
    bodyClass: 'cover-page',
    content,
    isRead: false,
  });
}

// --- Write files -------------------------------------------------------

fs.mkdirSync(READ_DIR, { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

fs.writeFileSync(path.join(OUT, 'index.html'), indexPage());

for (const item of flow) {
  let html;
  if (item.kind === 'preface') html = prefacePage(item);
  else if (item.kind === 'appendix') html = appendixPage(item);
  else html = chapterPage(item.chapter, item);
  fs.writeFileSync(path.join(READ_DIR, path.basename(item.href)), html);
}

console.log(`Built index.html + ${flow.length} pages under /read.`);

