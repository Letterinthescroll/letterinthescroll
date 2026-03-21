#!/usr/bin/env node
/**
 * generate-song-pages.js
 *
 * Generates one HTML file per song/poem (songs/0.html, songs/1.html, …)
 * so that social crawlers (iMessage, WhatsApp, Facebook, Twitter/X, etc.)
 * receive the correct Open Graph meta tags at crawl time — without needing
 * JavaScript execution.
 *
 * Run:  node scripts/generate-song-pages.js
 * Re-run whenever songs-index.json changes (new songs added, titles edited).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT        = path.join(__dirname, '..');
const INDEX_PATH  = path.join(ROOT, 'data', 'songs-index.json');
const TPL_PATH    = path.join(ROOT, 'songs', 'song-detail.html');
const OUTPUT_DIR  = path.join(ROOT, 'songs');
const BASE_URL    = 'https://www.aletterinthescroll.com';
const DEFAULT_IMG = `${BASE_URL}/media/images/welcome.jpg`;

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

function truncate(str, max) {
  str = String(str || '').trim();
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '\u2026' : str;
}

// ── Load inputs ────────────────────────────────────────────────────────────
if (!fs.existsSync(INDEX_PATH)) {
  console.error(`ERROR: songs-index.json not found at ${INDEX_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(TPL_PATH)) {
  console.error(`ERROR: song-detail.html template not found at ${TPL_PATH}`);
  process.exit(1);
}

const songsIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const template   = fs.readFileSync(TPL_PATH, 'utf8');

if (!Array.isArray(songsIndex) || !songsIndex.length) {
  console.error('ERROR: songs-index.json is empty or not an array.');
  process.exit(1);
}

// ── Generate ───────────────────────────────────────────────────────────────
let generated = 0;

songsIndex.forEach((song, index) => {
  const titleEnglish = String(song.title_english || '').trim();
  const titleHebrew  = String(song.title_hebrew  || '').trim();
  const overview     = String(song.overview      || '').trim();
  const isPoem       = String(song.category      || '').toLowerCase() === 'poem';

  const displayTitle  = titleEnglish || titleHebrew || 'Entry';
  const sectionLabel  = isPoem ? 'Poems & Writings' : 'Songs';
  const ogTitle       = escapeAttr(`${displayTitle} \u2014 A Letter in the Scroll`);
  const ogDesc        = escapeAttr(
    truncate(overview, 155) ||
    `${isPoem ? 'A poem' : 'A song'} from A Letter in the Scroll.`
  );
  const ogUrl         = escapeAttr(`${BASE_URL}/songs/${index}`);
  const htmlTitle     = escapeAttr(`${displayTitle} \u2014 ${sectionLabel} \u2014 A Letter in the Scroll`);
  const canonicalUrl  = escapeAttr(`${BASE_URL}/songs/${index}.html`);

  let html = template;

  // <title>
  html = html.replace(
    /(<title>)[^<]*(<\/title>)/,
    `$1${htmlTitle}$2`
  );

  // og:title
  html = html.replace(
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
    `$1${ogTitle}$2`
  );
  // og:description
  html = html.replace(
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
    `$1${ogDesc}$2`
  );
  // og:url
  html = html.replace(
    /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
    `$1${ogUrl}$2`
  );
  // og:image — keep welcome.jpg (consistent branding)
  // og:image:width / og:image:height — add if missing
  html = html.replace(
    /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
    `$1${escapeAttr(DEFAULT_IMG)}$2`
  );

  // twitter:title
  html = html.replace(
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${ogTitle}$2`
  );
  // twitter:description
  html = html.replace(
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
    `$1${ogDesc}$2`
  );
  // twitter:image
  html = html.replace(
    /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/,
    `$1${escapeAttr(DEFAULT_IMG)}$2`
  );

  // Add canonical link (insert after the last <meta> in <head>)
  if (!html.includes('<link rel="canonical"')) {
    html = html.replace(
      /(<\/head>)/,
      `    <link rel="canonical" href="${canonicalUrl}">\n$1`
    );
  }

  // Inject window.SONG_INDEX so song-detail.js loads the right song
  html = html.replace(
    /(<script src="\/js\/shabbat\.js"><\/script>)/,
    `<script>window.SONG_INDEX = ${index};</script>\n    $1`
  );

  const outPath = path.join(OUTPUT_DIR, `${index}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  generated++;
  console.log(`  ✓  songs/${index}.html  —  ${displayTitle}`);
});

console.log(`\n✅  Generated ${generated} song/poem pages in songs/\n`);
