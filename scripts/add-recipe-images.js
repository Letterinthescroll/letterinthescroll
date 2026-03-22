#!/usr/bin/env node
/**
 * add-recipe-images.js
 * ---------------------
 * Injects hero images into every recipe page in food/recipes/*.html.
 *
 * For each file it:
 *   1. Checks if a `.recipe-hero` div already exists (skips if so).
 *   2. Extracts the recipe title from the <h1> tag for alt text.
 *   3. Looks up the slug (filename minus .html) in IMAGE_MAP to get an
 *      Unsplash photo ID.
 *   4. Inserts the hero-image HTML between the closing </div> of
 *      .recipe-header and the opening <div class="recipe-meta">.
 *   5. Injects the CSS for .recipe-hero just before the .recipe-meta rule
 *      (only once per file, skipped if already present).
 *   6. Writes the modified file back.
 *
 * Usage:  node scripts/add-recipe-images.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Unsplash photo-ID constants (reusable building blocks)
// ---------------------------------------------------------------------------
const PHOTO = {
  babka:       '1509440159596-0249088772ff',
  challah:     '1603379016385-bfef97da4b55',
  hummus:      '1577805947697-89e18249d767',
  falafel:     '1593001874117-c99c800e3eb7',
  matzoSoup:   '1547592166-23ac45744acd',
  honeyCake:   '1621303837174-89787a7d8525',
  donuts:      '1551024601-824d09b01c24',
  schnitzel:   '1585325701165-72c6e251cba3',
  salmon:      '1519708227418-b946079d9122',
  brisket:     '1588168333986-5078d3ae3976',
  tagine:      '1511690078903-71dc5a55e4e0',
  bourekas:    '1509722747-1f8e76a0a6e2',
  salad:       '1512621776951-a57141f2eefd',
  rice:        '1536304993881-227c68fc5b29',
  cookies:     '1499636136210-6f4ee915583e',
  stew:        '1476718406336-bb5a9690ee2a',
  fish:        '1534604973900-c43461c59578',
  soup:        '1547592166-23ac45744acd',
  meatballs:   '1529042410-6b430e935662',
  bread:       '1509440159596-0249088772ff',
  cheesecake:  '1524351199432-4a83a1fd4ead',
  dumplings:   '1496116218417-1a781b1c416c',
  couscous:    '1585937421612-70a008356fbe',
  eggs:        '1482049016530-d981e8ae2b4d',
  jam:         '1563805042-7684c019e1cb',
  cake:        '1578985545062-e1b2e4be3e26',
  fritters:    '1565299624946-b28f40a0ae38',
  eggplant:    '1576020619972-e8c0098b6a03',
};

// ---------------------------------------------------------------------------
// Slug → Unsplash photo-ID mapping  (all 120 recipe slugs)
// ---------------------------------------------------------------------------
const IMAGE_MAP = {
  // --- Fish ---
  'spicy-moroccan-fish-chraime':                        PHOTO.fish,
  'pomegranate-glazed-salmon':                          PHOTO.salmon,
  'sephardic-agristada-fish':                           PHOTO.fish,
  'sephardic-aggristada-fish-classic':                  PHOTO.fish,
  'classic-gefilte-fish':                               PHOTO.fish,
  'moroccan-fish-patties-ktzitzot-dagim':               PHOTO.fish,
  'iraqi-amba-fish-mango-braised-fish':                 PHOTO.fish,

  // --- Hummus & dips ---
  'authentic-israeli-hummus':                           PHOTO.hummus,
  'msabaha-warm-chunky-hummus':                         PHOTO.hummus,
  'homemade-labneh':                                    PHOTO.hummus,
  'homemade-amba':                                      PHOTO.jam,
  'matbucha':                                           PHOTO.stew,
  'yemenite-hilbe-fenugreek-dip':                       PHOTO.hummus,
  'syrian-muhammara-walnut-pepper-dip':                 PHOTO.hummus,
  'yemenite-zhug-cilantro-chili-paste':                 PHOTO.hummus,
  'green-schug-yemenite-herb-paste':                    PHOTO.hummus,
  'red-schug-fiery-yemenite-chili-paste':               PHOTO.hummus,
  'moroccan-tfaya-caramelized-onion-topping':           PHOTO.stew,

  // --- Falafel / fried ---
  'homemade-falafel':                                   PHOTO.falafel,
  'israeli-arayes':                                     PHOTO.falafel,
  'keftes-de-prasa':                                    PHOTO.fritters,
  'maakouda-moroccan-potato-fritters':                  PHOTO.fritters,
  'tunisian-fricassee-fried-sandwich-buns':              PHOTO.fritters,

  // --- Soups ---
  'matzah-ball-soup':                                   PHOTO.matzoSoup,
  'moroccan-harira-soup':                               PHOTO.soup,
  'yemenite-chicken-soup':                              PHOTO.soup,
  'iraqi-kubbeh-hamusta':                               PHOTO.soup,
  'iraqi-kubbeh-hamusta-sour-chard-soup':               PHOTO.soup,
  'iraqi-kubbeh-bamia':                                 PHOTO.soup,
  'kubbeh-selek-iraqi-beet-dumpling-soup':               PHOTO.soup,
  'hamod-lebanese-lemon-potato-soup':                   PHOTO.soup,
  'iraqi-chicken-shorba-hearty-rice-soup':              PHOTO.soup,
  'ashkenazi-mushroom-barley-soup':                     PHOTO.soup,

  // --- Stews & braised dishes ---
  'moroccan-lamb-tagine':                               PHOTO.tagine,
  'persian-fesenjan':                                   PHOTO.stew,
  'ghormeh-sabzi':                                      PHOTO.stew,
  'moroccan-schina-hamin':                              PHOTO.stew,
  'moroccan-schina-wheat-berry':                        PHOTO.stew,
  'yemenite-saltah-fenugreek-stew':                     PHOTO.stew,
  'abgoosht-with-gondi-persian-lamb-chickpea-stew':     PHOTO.stew,
  'iraqi-spayty-chicken-coconut-curry':                 PHOTO.stew,

  // --- Meat mains ---
  'fig-pomegranate-brisket':                            PHOTO.brisket,
  'israeli-chicken-schnitzel':                          PHOTO.schnitzel,
  'iraqi-tbeet':                                        PHOTO.brisket,
  'stuffed-cabbage-holishkes':                          PHOTO.stew,
  'iraqi-stuffed-vegetables-mahshi':                    PHOTO.stew,
  'ashkenazi-sweet-and-sour-tongue':                    PHOTO.brisket,
  'syrian-cherry-meatballs-kibbeh-geraz':               PHOTO.meatballs,
  'syrian-tamarind-meatballs':                          PHOTO.meatballs,
  'moroccan-chicken-pastilla':                          PHOTO.bourekas,
  'meorav-yerushalmi-jerusalem-mixed-grill':            PHOTO.brisket,
  'syrian-stuffed-zucchini-dried-fruit':                PHOTO.eggplant,
  'lisan-el-qathi-iraqi-stuffed-eggplant-rolls':        PHOTO.eggplant,
  'chopped-liver':                                      PHOTO.brisket,

  // --- Dumplings & filled doughs ---
  'iraqi-chickpea-sambousak':                           PHOTO.bourekas,
  'iraqi-kubbeh-batata':                                PHOTO.dumplings,
  'kubbeh-patata-iraqi-potato-meat-dumplings':          PHOTO.dumplings,
  'ashkenazi-kreplach-meat-dumplings':                  PHOTO.dumplings,
  'persian-gondi':                                      PHOTO.dumplings,
  'mina-de-carne-sephardic-meat-matzo-pie':             PHOTO.bourekas,
  'sephardic-pastelicos-meat-rice-pies':                PHOTO.bourekas,
  'potato-knishes':                                     PHOTO.bourekas,
  'spinach-cheese-bourekas':                            PHOTO.bourekas,
  'sephardic-borekas-de-spinaka-spinach-cheese-triangles': PHOTO.bourekas,
  'iraqi-ingeryieh':                                    PHOTO.stew,

  // --- Breads ---
  'holiday-challah':                                    PHOTO.challah,
  'chocolate-babka':                                    PHOTO.babka,
  'yemenite-jachnun':                                   PHOTO.bread,
  'yemenite-kubaneh':                                   PHOTO.bread,
  'yemenite-malawach':                                  PHOTO.bread,
  'moroccan-moufleta':                                  PHOTO.bread,
  'syrian-lachmagine':                                  PHOTO.bread,
  'israeli-pletzl-ashkenazi-onion-flatbread':            PHOTO.bread,
  'yemenite-lachuch-spongy-pancake-bread':              PHOTO.bread,
  'ethiopian-dabo-ritual-honey-bread':                  PHOTO.bread,
  'saluf-yemenite-soft-pita':                           PHOTO.bread,
  'israeli-malawach-pizza-modern-fusion':                PHOTO.bread,

  // --- Salads ---
  'israeli-chopped-salad':                              PHOTO.salad,
  'moroccan-carrot-salad':                              PHOTO.salad,
  'syrian-bazargan-bulgur-tamarind-salad':              PHOTO.salad,
  'israeli-sabich-salad-deconstructed':                  PHOTO.salad,
  'moroccan-cumin-beet-salad-barba':                    PHOTO.salad,
  'zaalouk':                                            PHOTO.eggplant,

  // --- Rice & grain dishes ---
  'mejadra-lentils-rice':                               PHOTO.rice,
  'bukharan-bakhsh-green-herb-pilaf':                   PHOTO.rice,
  'bukharan-osh-sovo-overnight-slow-cooked-rice':       PHOTO.rice,
  'shirin-polo-persian-wedding-rice':                   PHOTO.rice,

  // --- Kugels ---
  'yerushalmi-kugel':                                   PHOTO.cake,
  'dairy-noodle-kugel':                                 PHOTO.cake,
  'spinach-feta-kugel':                                 PHOTO.cake,
  'ashkenazi-apple-noodle-kugel':                       PHOTO.cake,
  'classic-potato-kugel-fluffy-method':                 PHOTO.cake,

  // --- Donuts & fried sweets ---
  'israeli-jelly-sufganiyot':                           PHOTO.donuts,
  'moroccan-sfenj':                                     PHOTO.donuts,
  'sephardic-bimuelos':                                 PHOTO.donuts,

  // --- Cakes ---
  'jewish-honey-cake':                                  PHOTO.honeyCake,
  'sephardic-pan-de-espana-sponge-cake':                PHOTO.cake,
  'sephardic-orange-chiffon-cake':                      PHOTO.cake,
  'israeli-baked-cheesecake-shavuot':                    PHOTO.cheesecake,

  // --- Cookies & pastries ---
  'maamoul-date-cookies':                               PHOTO.cookies,
  'olive-oil-mandel-bread':                             PHOTO.cookies,
  'tahini-cookies':                                     PHOTO.cookies,
  'traditional-teiglach':                               PHOTO.cookies,
  'honey-ginger-teiglach-with-nuts':                    PHOTO.cookies,
  'biscochos-de-huevo-sephardic-bracelet-cookies':      PHOTO.cookies,
  'israeli-krembo-chocolate-marshmallow-cookies':        PHOTO.cookies,
  'sephardic-travados-walnut-filled-pastries':           PHOTO.cookies,

  // --- Couscous ---
  'libyan-couscous-seven-vegetables':                   PHOTO.couscous,
  'couscous-au-lait-moroccan-mimouna-special':          PHOTO.couscous,
  'sefa-moroccan-sweet-ceremonial-couscous':            PHOTO.couscous,

  // --- Eggs ---
  'huevos-haminados-sephardic-slow-cooked-eggs':        PHOTO.eggs,

  // --- Jams & preserves ---
  'etrog-jam':                                          PHOTO.jam,
  'moroccan-spiced-kumquat-jam':                        PHOTO.jam,
  'sephardic-date-charoset':                            PHOTO.jam,

  // --- Desserts ---
  'coconut-cream-malabi':                               PHOTO.cheesecake,
  'persian-faloodeh':                                   PHOTO.cheesecake,
  'libyan-asida-semolina-pudding':                      PHOTO.cake,

  // --- Misc ---
  'ashkenazi-kishke':                                   PHOTO.brisket,
  'ashkenazi-arbes-ritual-peppery-chickpeas':           PHOTO.falafel,
  'yemenite-hawaij-coffee-ritual-spice':                PHOTO.jam,
};

// ---------------------------------------------------------------------------
// CSS to inject
// ---------------------------------------------------------------------------
const HERO_CSS = `
        .recipe-hero {
            margin: 0 0 1.5rem; border-radius: var(--radius-xl);
            overflow: hidden; box-shadow: var(--shadow-lg);
            max-height: 380px;
        }
        .recipe-hero img {
            width: 100%; height: 100%; object-fit: cover;
            display: block; max-height: 380px;
        }`;

// ---------------------------------------------------------------------------
// Build the image URL from a photo ID
// ---------------------------------------------------------------------------
function unsplashUrl(photoId) {
  return `https://images.unsplash.com/photo-${photoId}?w=800&h=500&fit=crop&q=80`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const recipesDir = path.join(__dirname, '..', 'food', 'recipes');

const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.html'));

let modified = 0;
let skipped = 0;
let noMapping = [];

for (const file of files) {
  const filePath = path.join(recipesDir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  const slug = file.replace('.html', '');

  // 1. Already has a hero image? Skip.
  if (html.includes('recipe-hero')) {
    console.log(`  SKIP (already has hero): ${file}`);
    skipped++;
    continue;
  }

  // 2. Lookup photo ID
  const photoId = IMAGE_MAP[slug];
  if (!photoId) {
    console.log(`  WARN (no mapping): ${file}`);
    noMapping.push(slug);
    continue;
  }

  // 3. Extract recipe title from <h1>
  const h1Match = html.match(/<h1>(.*?)<\/h1>/s);
  const altText = h1Match
    ? h1Match[1].replace(/&#x27;/g, "'").replace(/<[^>]*>/g, '').trim()
    : slug.replace(/-/g, ' ');

  // 4. Build the hero HTML
  const heroHtml = [
    '',
    '        <div class="recipe-hero">',
    `            <img src="${unsplashUrl(photoId)}" alt="${altText}" loading="lazy">`,
    '        </div>',
    '',
  ].join('\n');

  // 5. Insert hero HTML between </div> (end of .recipe-header) and <div class="recipe-meta">
  const insertionPattern = /(        <\/div>\n)(        <div class="recipe-meta">)/;
  if (!insertionPattern.test(html)) {
    console.log(`  WARN (pattern not found): ${file}`);
    noMapping.push(slug);
    continue;
  }
  html = html.replace(insertionPattern, `$1${heroHtml}\n$2`);

  // 6. Inject CSS (once) — right before the `.recipe-meta {` rule
  if (!html.includes('.recipe-hero {')) {
    const cssPattern = /(\n)(        \.recipe-meta \{)/;
    if (cssPattern.test(html)) {
      html = html.replace(cssPattern, `$1${HERO_CSS}\n$2`);
    } else {
      console.log(`  WARN (CSS pattern not found): ${file}`);
    }
  }

  // 7. Write back
  fs.writeFileSync(filePath, html, 'utf8');
  modified++;
  console.log(`  OK: ${file}`);
}

console.log('\n--- Summary ---');
console.log(`Modified: ${modified}`);
console.log(`Skipped (already had hero): ${skipped}`);
if (noMapping.length) {
  console.log(`No mapping or pattern mismatch: ${noMapping.length}`);
  noMapping.forEach(s => console.log(`    - ${s}`));
}
console.log('Done.');
