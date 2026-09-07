#!/usr/bin/env python3
"""
Generate js/parsha-calendar-data.js — the precomputed Torah-reading calendar.

Why this exists
---------------
The study page used to ask Sefaria's /api/calendars endpoint "what is this
week's parsha?" and then string-match the answer against a local list. That
broke in two ways:

  1. Double parshiyot ("Nitzavim-Vayeilech") matched only the *second* half,
     so the reader was sent to Vayeilech alone.
  2. Holiday Shabbatot ("Rosh Hashana I") matched nothing at all, and the
     page silently fell back to Bereshit.

Instead we ship an exact, precomputed schedule of every Shabbat reading and
look it up locally. No network, no fuzzy matching, no drift.

Source of truth: Hebcal's leyning API (https://www.hebcal.com/leyning), which
implements the standard sedra/leyning rules (the same rules Sefaria's
Sefaria/Sefaria-Project `sefaria/utils/calendars.py` + pyluach follow). The
output is then cross-verified against Sefaria's live calendar API by
dev/verify_parsha_calendar.py.

Usage:  python3 dev/generate_parsha_calendar.py
"""

import datetime
import json
import re
import subprocess
import sys
from collections import OrderedDict

START = datetime.date(2019, 12, 1)
END = datetime.date(2051, 6, 30)
CHUNK_DAYS = 170  # Hebcal caps a leyning range at ~180 days

# 1-based parsha numbers, matching Hebcal's `parshaNum` and the order of
# TORAH_PARSHAS in js/config.js.
PARSHA_NAMES = [
    'Bereshit', 'Noach', 'Lech-Lecha', 'Vayera', 'Chayei Sara', 'Toldot',
    'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz', 'Vayigash', 'Vayechi',
    'Shemot', 'Vaera', 'Bo', 'Beshalach', 'Yitro', 'Mishpatim', 'Terumah',
    'Tetzaveh', 'Ki Tisa', 'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shmini',
    'Tazria', 'Metzora', 'Achrei Mot', 'Kedoshim', 'Emor', 'Behar',
    'Bechukotai', 'Bamidbar', 'Nasso', "Beha'alotcha", "Sh'lach", 'Korach',
    'Chukat', 'Balak', 'Pinchas', 'Matot', 'Masei', 'Devarim', 'Vaetchanan',
    'Eikev', "Re'eh", 'Shoftim', 'Ki Teitzei', 'Ki Tavo', 'Nitzavim',
    'Vayeilech', "Ha'Azinu", "V'Zot HaBerachah",
]

# Hebcal holiday name (as it appears on a Shabbat) → a stable identity key
# (matching the SPECIAL_READINGS ids in js/config.js, so comments / reactions /
# bookmarks keep working) plus the label we show the reader. The readings
# themselves come from Hebcal per-week, because some of them — the maftir of
# Shabbat Chol HaMoed Sukkot in particular — differ from year to year.
HOLIDAY_MAP = OrderedDict([
    ('Rosh Hashana I (on Shabbat)',   ('special:rosh-hashanah-day-1',       'Rosh Hashanah — Day 1')),
    ('Yom Kippur (on Shabbat)',       ('special:yom-kippur',                'Yom Kippur')),
    ('Sukkot I (on Shabbat)',         ('special:sukkot-day-1',              'Sukkot — Day 1')),
    ('Sukkot Shabbat Chol ha-Moed',   ('special:sukkot-shabbat-chol-hamoed','Shabbat Chol HaMoed Sukkot')),
    ('Shmini Atzeret (on Shabbat)',   ('special:shemini-atzeret',           'Shemini Atzeret')),
    ('Simchat Torah (on Shabbat)',    ('special:simchat-torah',             'Simchat Torah')),
    ('Pesach I (on Shabbat)',         ('special:pesach-day-1',              'Pesach — Day 1')),
    ('Pesach Shabbat Chol ha-Moed',   ('special:pesach-shabbat-chol-hamoed','Shabbat Chol HaMoed Pesach')),
    ('Pesach VII (on Shabbat)',       ('special:pesach-day-7',              'Pesach — Day 7')),
    ('Pesach VIII (on Shabbat)',      ('special:pesach-day-8',              'Pesach — Day 8')),
    ('Shavuot II (on Shabbat)',       ('special:shavuot-day-2',             'Shavuot — Day 2')),
])

# Items that share a Saturday but describe the *next* day's or afternoon's
# reading, never the Shabbat morning kriyah.
def _is_noise(name):
    return name.startswith('Erev ') or name.endswith('(Mincha)')


def fetch(start, end, israel):
    url = ('https://www.hebcal.com/leyning?cfg=json'
           f'&start={start}&end={end}&triennial=off' + ('&i=on' if israel else ''))
    # curl rather than urllib: this machine's Python has no CA bundle wired up.
    raw = subprocess.run(['curl', '-fsS', url], capture_output=True, check=True).stdout
    data = json.loads(raw)
    if 'items' not in data:
        raise RuntimeError(f'Hebcal error for {start}..{end}: {data}')
    return data['items']


# parshaNum (1-54) → Hebrew name with nikud, harvested from Hebcal as we go.
HEBREW_NAMES = {}


def collect(israel):
    """date-string → the single Shabbat-morning leyning item for that date."""
    out = {}
    cur = START
    while cur < END:
        stop = min(cur + datetime.timedelta(days=CHUNK_DAYS), END)
        for item in fetch(cur, stop, israel):
            num = item.get('parshaNum')
            if isinstance(num, int):
                HEBREW_NAMES.setdefault(num, item['name']['he'])
            d = datetime.date.fromisoformat(item['date'])
            if d.weekday() != 5:          # Saturdays only
                continue
            if _is_noise(item['name']['en']):
                continue
            prev = out.get(item['date'])
            if prev is not None and prev != item:
                # A real parsha reading always wins over a coinciding holiday
                # note (e.g. Shushan Purim in Israel falling on Tetzaveh).
                if prev.get('type') == 'shabbat':
                    continue
                if item.get('type') != 'shabbat':
                    raise RuntimeError(f'ambiguous Shabbat {item["date"]}: '
                                       f'{prev["name"]["en"]} vs {item["name"]["en"]}')
            out[item['date']] = item
        cur = stop + datetime.timedelta(days=1)
    return out


# A haftarah/maftir "reason" like "Shabbat Zachor" or "Matot-Masei on Shabbat
# Rosh Chodesh" tells us this week is also a named special Shabbat.
def special_shabbat_label(item):
    """A reader-facing 'this is a special Shabbat' label, or None."""
    reason = item.get('reason') or {}
    for key in ('M', '7', 'haftara'):
        raw = reason.get(key)
        if not raw:
            continue
        label = raw.split(' (')[0].strip()
        if ' on Shabbat ' in label:
            label = label.split(' on ', 1)[1].strip()
        if label == 'Shabbat Machar Chodesh':
            # A haftarah swap only — not worth flagging to the reader.
            continue
        if label.startswith('Shabbat ') or re.match(r'^Chanukah Day \d$', label):
            return label
    return None


# The five megillot are read on some festival Shabbatot, but the study page
# renders Torah + Maftir + Haftarah only (a whole book inline would swamp it).
MEGILLOT = ('Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther')

TORAH_BOOKS = ('Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy')


def holiday_sections(item):
    """Split a Hebcal holiday summary into labelled Torah/Maftir sections."""
    refs = [r.strip() for r in (item.get('summary') or '').split(';') if r.strip()]
    sections = []
    megillah = None
    for i, ref in enumerate(refs):
        book = ref.rsplit(' ', 1)[0]
        if book in MEGILLOT:
            megillah = ref
            continue
        if book not in TORAH_BOOKS:
            raise RuntimeError(f'unexpected reading {ref!r} in {item["name"]["en"]}')
        if i == 0:
            label = 'Torah Reading'
        elif book == 'Numbers':
            label = 'Maftir'
        else:
            label = 'Torah Reading (continued)'
        sections.append({'label': label, 'ref': ref})
    for i, ref in enumerate(split_haftarah(item.get('haftara') or '')):
        sections.append({'label': 'Haftarah' if i == 0 else 'Haftarah (continued)',
                         'ref': ref})
    return sections, megillah


BOOK_RE = re.compile(r'^((?:[IV]+ )?[A-Za-z][A-Za-z ]*?) \d')


def split_haftarah(raw):
    """"Joshua 3:5-7, 5:2-6:1, 6:27" → three refs Sefaria can each fetch."""
    raw = raw.strip()
    if not raw:
        return []
    out = []
    book = None
    for part in re.split(r'\s*[;,]\s*', raw):
        if not part:
            continue
        m = BOOK_RE.match(part)
        if m:
            book = m.group(1)
            out.append(part)
        elif book:
            out.append(f'{book} {part}')
        else:
            raise RuntimeError(f'cannot parse haftarah {raw!r}')
    return out


def build():
    saturdays = sorted(set(collect(False)) | set(collect(True)))
    base = datetime.date.fromisoformat(saturdays[0])
    last = datetime.date.fromisoformat(saturdays[-1])
    n_weeks = (last - base).days // 7 + 1

    holidays = []
    holiday_index = {}
    labels = []
    label_index = {}

    def label_id(text):
        if text not in label_index:
            label_index[text] = len(labels)
            labels.append(text)
        return label_index[text]

    locales = {}
    for israel in (False, True):
        items = collect(israel)
        tokens = []
        for w in range(n_weeks):
            d = (base + datetime.timedelta(days=7 * w)).isoformat()
            item = items.get(d)
            if item is None:
                raise RuntimeError(f'no reading for {d} (israel={israel})')
            name = item['name']['en']
            num = item.get('parshaNum')
            if item.get('type') == 'shabbat' and num:
                nums = num if isinstance(num, list) else [num]
                token = '+'.join(str(n) for n in nums)
                sp = special_shabbat_label(item)
                if sp:
                    token += '@' + str(label_id(sp))
            else:
                if name not in HOLIDAY_MAP:
                    raise RuntimeError(f'unmapped holiday reading {name!r} on {d}')
                special_id, display = HOLIDAY_MAP[name]
                sections, megillah = holiday_sections(item)
                entry = {
                    'id': special_id,
                    'name': display,
                    # Hebcal appends "(בשבת)" to a festival that lands on
                    # Shabbat; the reader already knows it's Shabbat.
                    'nameHe': item['name']['he'].split(' (')[0].strip(),
                    'sections': sections,
                    'megillah': megillah,
                }
                key = json.dumps(entry, sort_keys=True)
                if key not in holiday_index:
                    holiday_index[key] = len(holidays)
                    holidays.append(entry)
                token = 'H' + str(holiday_index[key])
            tokens.append(token)
        locales['israel' if israel else 'diaspora'] = ','.join(tokens)

    missing = [n for n in range(1, 55) if n not in HEBREW_NAMES]
    if missing:
        raise RuntimeError(f'no Hebrew name for parsha number(s) {missing}')

    return {
        'meta': {
            'firstShabbat': base.isoformat(),
            'lastShabbat': last.isoformat(),
            'weeks': n_weeks,
            'generated': datetime.date.today().isoformat(),
        },
        'hebrewNames': [HEBREW_NAMES[n] for n in range(1, 55)],
        'holidays': holidays,
        'labels': labels,
        'weeks': locales,
    }


HEADER = '''// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with:  python3 dev/generate_parsha_calendar.py
//
// The exact Torah reading for every Shabbat from {first} to {last},
// for both the Diaspora and Israel schedules. Generated from Hebcal's leyning
// API (the standard sedra rules) and cross-verified against Sefaria's live
// calendar API by dev/verify_parsha_calendar.py.
//
// `weeks.diaspora` / `weeks.israel` are comma-separated tokens, one per week,
// starting at meta.firstShabbat and advancing 7 days each step:
//
//   "50"       → parsha #50 (1-based, same order as TORAH_PARSHAS)
//   "51+52"    → double parsha: #51 and #52 read together
//   "50@3"     → parsha #50 on a special Shabbat, labels[3]
//   "H0"       → holiday reading holidays[0] replaces the weekly parsha
//
// `hebrewNames` holds the 54 parsha names with nikud, in the same order.
//
// Each holidays[] entry carries its own labelled Torah/Maftir/Haftarah
// `sections`, because a few of them (the maftir of Shabbat Chol HaMoed Sukkot)
// differ from year to year.
'''


def main():
    data = build()
    body = HEADER.format(first=data['meta']['firstShabbat'], last=data['meta']['lastShabbat'])
    body += '\nexport const PARSHA_CALENDAR = ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\n'
    path = 'js/parsha-calendar-data.js'
    with open(path, 'w') as f:
        f.write(body)
    print(f'wrote {path}: {data["meta"]["weeks"]} weeks, '
          f'{len(data["holidays"])} holiday readings, {len(data["labels"])} special-Shabbat labels')


if __name__ == '__main__':
    sys.exit(main())
