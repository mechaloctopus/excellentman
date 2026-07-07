# Manual of the Excellent Gentleman

*A Beginner's Guide to Etiquette* — by Josh Trembath.

A static web-book: nine Books, fifty chapters, one architecture (Mind,
Word, Body, Company, Companion, World, Guardian, Service, Crown), plus a
preface and a one-page appendix. This repo holds the source manuscript and
the generator that turns it into the published site.

## Structure

```text
content/manuscript/   The manuscript, in markdown (front matter, 9 Books, ch. 1 & 52 standalone)
content/reference/    Epigraph sourcing notes
scripts/build.mjs     Static site generator (markdown -> styled HTML)
assets/               Stylesheet, JS, favicon shared by every page
index.html            Generated cover page + full table of contents
read/*.html           Generated chapter pages (one per chapter, plus preface/appendix)
```

`index.html` and everything under `read/` are generated files, checked in
so the site can be served directly (e.g. via GitHub Pages) with no build
step. To regenerate after editing the manuscript or the templates:

```bash
npm install
npm run build
```

## Publishing via GitHub Pages

The site is plain static HTML at the repo root, so no build step is needed
on GitHub's side. One-time setup: **Settings → Pages → Build and
deployment → Source: "Deploy from a branch"**, branch `main`, folder
`/ (root)`, then Save. GitHub will publish at
`https://mechaloctopus.github.io/excellentman/`. A `.nojekyll` file is
included so Pages serves the files as-is instead of running them through
Jekyll.

## Design

Serif typography throughout (Fraunces for display, Source Serif 4 for
body text), a warm paper theme with a dark mode, a persistent chapter
sidebar on desktop and a slide-out one on mobile, a reading-progress bar,
drop caps, and styled epigraphs / practice callouts / closing pull-quotes
matching the book's own recurring structure.
