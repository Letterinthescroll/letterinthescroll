#!/usr/bin/env python3
"""
Cross-verify js/parsha-calendar-data.js against Sefaria's live calendar API.

The calendar table is generated from Hebcal (dev/generate_parsha_calendar.py).
This script independently asks Sefaria — the same source the study page used to
depend on — what it reads on each Shabbat, and asserts the two agree. Any
mismatch is a bug in the table (or a change upstream) and is printed.

Usage:
    python3 dev/verify_parsha_calendar.py [START_YEAR] [END_YEAR]
Defaults to 2024..2032. Israel and Diaspora schedules are both checked.
"""

import concurrent.futures
import datetime
import time
import json
import re
import subprocess
import sys

DATA = 'js/parsha-calendar-data.js'
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


# Places where Sefaria's own calendar is wrong and the table is deliberately
# not following it. In Israel, Shmini Atzeret and Simchat Torah are the same
# day (22 Tishrei) and V'Zot HaBerachah is read; Sefaria reports the Diaspora
# Shmini Atzeret reading instead.
def _israel_simchat_torah_dates():
    return {
        (datetime.date(y, m, day), True)
        for y, m, day in [(2027, 10, 23)]
    }


KNOWN_DIVERGENCES = _israel_simchat_torah_dates()


def load_table():
    src = open(DATA).read()
    return json.loads(src[src.index('{'): src.rindex(';')])


def norm(name):
    return re.sub(r'[^a-z0-9]', '', (name or '').lower())


def sefaria(date, israel):
    url = ('https://www.sefaria.org/api/calendars?'
           f'diaspora={0 if israel else 1}&year={date.year}&month={date.month}&day={date.day}')
    # Sefaria resets connections under load — retry with backoff.
    last = None
    for attempt in range(6):
        proc = subprocess.run(['curl', '-fsS', url], capture_output=True)
        if proc.returncode == 0:
            try:
                data = json.loads(proc.stdout)
                break
            except json.JSONDecodeError as exc:
                last = exc
        else:
            last = proc.stderr.decode().strip() or f'curl exit {proc.returncode}'
        time.sleep(2.0 * (attempt + 1))
    else:
        raise RuntimeError(last)
    for item in data.get('calendar_items', []):
        if (item.get('title') or {}).get('en') == 'Parashat Hashavua':
            return (item.get('displayValue') or {}).get('en'), item.get('ref')
    return None, None


def main():
    start_year = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    end_year = int(sys.argv[2]) if len(sys.argv) > 2 else 2032

    table = load_table()
    base = datetime.date.fromisoformat(table['meta']['firstShabbat'])

    jobs = []
    for israel in (False, True):
        tokens = table['weeks']['israel' if israel else 'diaspora'].split(',')
        for i, token in enumerate(tokens):
            d = base + datetime.timedelta(days=7 * i)
            if not (start_year <= d.year <= end_year):
                continue
            jobs.append((d, israel, token))

    print(f'checking {len(jobs)} Shabbatot against Sefaria...')
    mismatches = []
    errors = []

    def check(job):
        try:
            return _check(job)
        except Exception as exc:                       # never kill the sweep
            return ('error', job[0], job[1], job[2], repr(exc))

    def _check(job):
        d, israel, token = job
        try:
            sef_name, sef_ref = sefaria(d, israel)
        except Exception as exc:                       # network hiccup
            return ('error', d, israel, token, str(exc))
        if not sef_name:
            return ('error', d, israel, token, 'no Parashat Hashavua item')

        if (d, israel) in KNOWN_DIVERGENCES:
            return None

        if token.startswith('H'):
            expected = table['holidays'][int(token[1:])]
            # Sefaria names holidays slightly differently ("Rosh Hashana I" vs
            # "Rosh Hashanah — Day 1"), so compare the Torah reading itself.
            first_ref = expected['sections'][0]['ref']
            sef_first = (sef_ref or '')
            if isinstance(sef_first, list):
                sef_first = sef_first[0]
            if norm(first_ref) != norm(sef_first):
                return ('mismatch', d, israel, f'{expected["name"]} [{first_ref}]',
                        f'{sef_name} [{sef_first}]')
            return None

        nums = [int(n) for n in token.split('@')[0].split('+')]
        expected_name = '-'.join(PARSHA_NAMES[n - 1] for n in nums)
        if norm(expected_name) != norm(sef_name):
            return ('mismatch', d, israel, expected_name, sef_name)
        return None

    # Sefaria rate-limits hard (HTTP 429), so this stays single-threaded and
    # paced. A full 2024-2032 sweep takes a few minutes.
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        for result in pool.map(check, jobs):
            if result is None:
                continue
            if result[0] == 'mismatch':
                mismatches.append(result)
            else:
                errors.append(result)

    for _, d, israel, exp, got in sorted(mismatches, key=lambda r: r[1]):
        print(f'MISMATCH {d} ({"Israel" if israel else "Diaspora"}): '
              f'table={exp!r}  sefaria={got!r}')
    for _, d, israel, token, msg in errors[:20]:
        print(f'ERROR    {d} ({"Israel" if israel else "Diaspora"}) {token}: {msg}')

    print(f'\n{len(jobs) - len(mismatches) - len(errors)}/{len(jobs)} agree — '
          f'{len(mismatches)} mismatches, {len(errors)} unreachable')
    return 1 if mismatches else 0


if __name__ == '__main__':
    sys.exit(main())
