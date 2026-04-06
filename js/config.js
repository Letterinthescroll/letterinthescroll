// API Configuration Module
export const API_CONFIG = {
    SEFARIA_BASE: 'https://www.sefaria.org/api',
    ENGLISH_VERSION: 'The Contemporary Torah, Jewish Publication Society, 2006',
    HEBREW_VERSION: 'Miqra_according_to_the_Masorah'
};

// Double Parsha Pairs — combined during regular (non-leap) years
export const DOUBLE_PARSHA_PAIRS = [
    ['Vayakhel', 'Pekudei'],
    ['Tazria', 'Metzora'],
    ['Achrei Mot', 'Kedoshim'],
    ['Behar', 'Bechukotai'],
    ['Matot', 'Masei'],
    ['Nitzavim', 'Vayeilech']
];

// Torah Parshas Data
export const TORAH_PARSHAS = [
    // Bereshit (Genesis)
    { name: 'Bereshit', reference: 'Genesis 1:1-6:8', book: 'Genesis' },
    { name: 'Noach', reference: 'Genesis 6:9-11:32', book: 'Genesis' },
    { name: 'Lech-Lecha', reference: 'Genesis 12:1-17:27', book: 'Genesis' },
    { name: 'Vayera', reference: 'Genesis 18:1-22:24', book: 'Genesis' },
    { name: 'Chayei Sara', reference: 'Genesis 23:1-25:18', book: 'Genesis' },
    { name: 'Toldot', reference: 'Genesis 25:19-28:9', book: 'Genesis' },
    { name: 'Vayetzei', reference: 'Genesis 28:10-32:3', book: 'Genesis' },
    { name: 'Vayishlach', reference: 'Genesis 32:4-36:43', book: 'Genesis' },
    { name: 'Vayeshev', reference: 'Genesis 37:1-40:23', book: 'Genesis' },
    { name: 'Miketz', reference: 'Genesis 41:1-44:17', book: 'Genesis' },
    { name: 'Vayigash', reference: 'Genesis 44:18-47:27', book: 'Genesis' },
    { name: 'Vayechi', reference: 'Genesis 47:28-50:26', book: 'Genesis' },
    
    // Shemot (Exodus)
    { name: 'Shemot', reference: 'Exodus 1:1-6:1', book: 'Exodus' },
    { name: 'Vaera', reference: 'Exodus 6:2-9:35', book: 'Exodus' },
    { name: 'Bo', reference: 'Exodus 10:1-13:16', book: 'Exodus' },
    { name: 'Beshalach', reference: 'Exodus 13:17-17:16', book: 'Exodus' },
    { name: 'Yitro', reference: 'Exodus 18:1-20:23', book: 'Exodus' },
    { name: 'Mishpatim', reference: 'Exodus 21:1-24:18', book: 'Exodus' },
    { name: 'Terumah', reference: 'Exodus 25:1-27:19', book: 'Exodus' },
    { name: 'Tetzaveh', reference: 'Exodus 27:20-30:10', book: 'Exodus' },
    { name: 'Ki Tisa', reference: 'Exodus 30:11-34:35', book: 'Exodus' },
    { name: 'Vayakhel', reference: 'Exodus 35:1-38:20', book: 'Exodus' },
    { name: 'Pekudei', reference: 'Exodus 38:21-40:38', book: 'Exodus' },
    
    // Vayikra (Leviticus)
    { name: 'Vayikra', reference: 'Leviticus 1:1-5:26', book: 'Leviticus' },
    { name: 'Tzav', reference: 'Leviticus 6:1-8:36', book: 'Leviticus' },
    { name: 'Shmini', reference: 'Leviticus 9:1-11:47', book: 'Leviticus' },
    { name: 'Tazria', reference: 'Leviticus 12:1-13:59', book: 'Leviticus' },
    { name: 'Metzora', reference: 'Leviticus 14:1-15:33', book: 'Leviticus' },
    { name: 'Achrei Mot', reference: 'Leviticus 16:1-18:30', book: 'Leviticus' },
    { name: 'Kedoshim', reference: 'Leviticus 19:1-20:27', book: 'Leviticus' },
    { name: 'Emor', reference: 'Leviticus 21:1-24:23', book: 'Leviticus' },
    { name: 'Behar', reference: 'Leviticus 25:1-26:2', book: 'Leviticus' },
    { name: 'Bechukotai', reference: 'Leviticus 26:3-27:34', book: 'Leviticus' },
    
    // Bamidbar (Numbers)
    { name: 'Bamidbar', reference: 'Numbers 1:1-4:20', book: 'Numbers' },
    { name: 'Nasso', reference: 'Numbers 4:21-7:89', book: 'Numbers' },
    { name: 'Beha\'alotcha', reference: 'Numbers 8:1-12:16', book: 'Numbers' },
    { name: 'Sh\'lach', reference: 'Numbers 13:1-15:41', book: 'Numbers' },
    { name: 'Korach', reference: 'Numbers 16:1-18:32', book: 'Numbers' },
    { name: 'Chukat', reference: 'Numbers 19:1-22:1', book: 'Numbers' },
    { name: 'Balak', reference: 'Numbers 22:2-25:9', book: 'Numbers' },
    { name: 'Pinchas', reference: 'Numbers 25:10-30:1', book: 'Numbers' },
    { name: 'Matot', reference: 'Numbers 30:2-32:42', book: 'Numbers' },
    { name: 'Masei', reference: 'Numbers 33:1-36:13', book: 'Numbers' },
    
    // Devarim (Deuteronomy)
    { name: 'Devarim', reference: 'Deuteronomy 1:1-3:22', book: 'Deuteronomy' },
    { name: 'Vaetchanan', reference: 'Deuteronomy 3:23-7:11', book: 'Deuteronomy' },
    { name: 'Eikev', reference: 'Deuteronomy 7:12-11:25', book: 'Deuteronomy' },
    { name: 'Re\'eh', reference: 'Deuteronomy 11:26-16:17', book: 'Deuteronomy' },
    { name: 'Shoftim', reference: 'Deuteronomy 16:18-21:9', book: 'Deuteronomy' },
    { name: 'Ki Teitzei', reference: 'Deuteronomy 21:10-25:19', book: 'Deuteronomy' },
    { name: 'Ki Tavo', reference: 'Deuteronomy 26:1-29:8', book: 'Deuteronomy' },
    { name: 'Nitzavim', reference: 'Deuteronomy 29:9-30:20', book: 'Deuteronomy' },
    { name: 'Vayeilech', reference: 'Deuteronomy 31:1-31:30', book: 'Deuteronomy' },
    { name: 'Ha\'Azinu', reference: 'Deuteronomy 32:1-32:52', book: 'Deuteronomy' },
    { name: 'V\'Zot HaBerachah', reference: 'Deuteronomy 33:1-34:12', book: 'Deuteronomy' }
];

// ─── Special Readings ─────────────────────────────────────────────────────────
// Holiday, festival, and special-Shabbat readings users can study manually at
// any time of year. These are *not* part of TORAH_PARSHAS — weekly-parsha
// navigation, rollover logic, and double-parsha resolution deliberately ignore
// this list. They are surfaced only in the manual dropdown selector.
//
// Data model (per entry):
//   {
//     id:        stable unique identifier, used as the study-page ref key
//                (and therefore as the identity key for comments/reactions/
//                bookmarks). Format: "special:<slug>".
//     name:      display name in the dropdown and page header.
//     group:     dropdown subgroup header (e.g. "Pesach", "Rosh Hashanah").
//                All entries with the same group sort together.
//     sections:  ordered array of { label, ref } the study page renders
//                sequentially with labeled dividers between them.
//   }
//
// Diaspora schedule. Israel ("E"Y") variants intentionally omitted per
// product decision. Haftarah readings are included at the bottom of each
// entry; Sefaria's text API treats Nach refs identically to Torah.
//
// Some source readings (Haftarah for Pesach Day 1, Chanukah Day 6 overlaps,
// Simchat Torah end-then-restart) contain semicolon- or &-joined inline
// compound refs. Those are pre-split here into discrete labeled sections so
// the renderer never has to interpret delimiters.

const P = (label, ref) => ({ label, ref });

// Dropdown order follows the Jewish liturgical year, which begins in Tishrei
// (Rosh Hashanah) and runs Yom Kippur → Sukkot → Shemini Atzeret / Simchat
// Torah → Chanukah → the Special Shabbatot (Shekalim/Zachor/Parah/Hachodesh
// interleaved around Purim in Adar and early Nissan) → Pesach → Shavuot.
export const SPECIAL_READINGS = [
    // ── Rosh Hashanah (Tishrei 1-2) ──────────────────────────────────────────
    {
        id: 'special:rosh-hashanah-day-1',
        name: 'Rosh Hashanah Day 1',
        group: 'Rosh Hashanah',
        sections: [
            P('Torah Reading',  'Genesis 21:1-34'),
            P('Maftir',         'Numbers 29:1-6'),
            P('Haftarah',       'I Samuel 1:1-2:10'),
        ],
    },
    {
        id: 'special:rosh-hashanah-day-2',
        name: 'Rosh Hashanah Day 2',
        group: 'Rosh Hashanah',
        sections: [
            P('Torah Reading',  'Genesis 22:1-24'),
            P('Maftir',         'Numbers 29:1-6'),
            P('Haftarah',       'Jeremiah 31:1-19'),
        ],
    },

    // ── Yom Kippur ───────────────────────────────────────────────────────────
    {
        id: 'special:yom-kippur',
        name: 'Yom Kippur',
        group: 'Yom Kippur',
        sections: [
            P('Torah Reading',  'Leviticus 16:1-34'),
            P('Maftir',         'Numbers 29:7-11'),
            P('Haftarah',       'Isaiah 57:14-58:14'),
        ],
    },

    // ── Sukkot ───────────────────────────────────────────────────────────────
    {
        id: 'special:sukkot-day-1',
        name: 'Sukkot Day 1',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Leviticus 22:26-23:44'),
            P('Maftir',         'Numbers 29:12-16'),
            P('Haftarah',       'Zechariah 14:1-21'),
        ],
    },
    {
        id: 'special:sukkot-day-2',
        name: 'Sukkot Day 2',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Leviticus 22:26-23:44'),
            P('Maftir',         'Numbers 29:12-16'),
            P('Haftarah',       'I Kings 8:2-21'),
        ],
    },
    {
        id: 'special:sukkot-chol-hamoed-1',
        name: 'Sukkot Chol HaMoed Day 1',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Numbers 29:17-25'),
        ],
    },
    {
        id: 'special:sukkot-chol-hamoed-2',
        name: 'Sukkot Chol HaMoed Day 2',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Numbers 29:20-28'),
        ],
    },
    {
        id: 'special:sukkot-chol-hamoed-3',
        name: 'Sukkot Chol HaMoed Day 3',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Numbers 29:23-31'),
        ],
    },
    {
        id: 'special:sukkot-chol-hamoed-4',
        name: 'Sukkot Chol HaMoed Day 4',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Numbers 29:26-34'),
        ],
    },
    {
        id: 'special:hoshana-rabbah',
        name: 'Hoshana Rabbah',
        group: 'Sukkot',
        sections: [
            P('Torah Reading',  'Numbers 29:26-34'),
        ],
    },

    // ── Shemini Atzeret / Simchat Torah ──────────────────────────────────────
    {
        id: 'special:shemini-atzeret',
        name: 'Shemini Atzeret',
        group: 'Shemini Atzeret / Simchat Torah',
        sections: [
            P('Torah Reading',  'Deuteronomy 14:22-16:17'),
            P('Maftir',         'Numbers 29:35-30:1'),
            P('Haftarah',       'I Kings 8:54-66'),
        ],
    },
    {
        id: 'special:simchat-torah',
        name: 'Simchat Torah',
        group: 'Shemini Atzeret / Simchat Torah',
        sections: [
            P('Torah Reading (End of Deuteronomy)', 'Deuteronomy 33:1-34:12'),
            P('Torah Reading (Beginning of Genesis)', 'Genesis 1:1-2:3'),
            P('Maftir',  'Numbers 29:35-30:1'),
            P('Haftarah', 'Joshua 1:1-18'),
        ],
    },

    // ── Chanukah ─────────────────────────────────────────────────────────────
    {
        id: 'special:chanukah-day-1',
        name: 'Chanukah Day 1',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:1-17') ],
    },
    {
        id: 'special:chanukah-day-2',
        name: 'Chanukah Day 2',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:18-29') ],
    },
    {
        id: 'special:chanukah-day-3',
        name: 'Chanukah Day 3',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:24-35') ],
    },
    {
        id: 'special:chanukah-day-4',
        name: 'Chanukah Day 4',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:30-41') ],
    },
    {
        id: 'special:chanukah-day-5',
        name: 'Chanukah Day 5',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:36-47') ],
    },
    {
        id: 'special:chanukah-day-6',
        name: 'Chanukah Day 6',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:42-47') ],
    },
    {
        id: 'special:chanukah-day-7',
        name: 'Chanukah Day 7',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:48-53') ],
    },
    {
        id: 'special:chanukah-day-8',
        name: 'Chanukah Day 8',
        group: 'Chanukah',
        sections: [ P('Torah Reading', 'Numbers 7:54-8:4') ],
    },

    // ── Special Shabbatot (Adar) & Purim ─────────────────────────────────────
    {
        id: 'special:shekalim',
        name: 'Shekalim',
        group: 'Special Shabbatot',
        sections: [ P('Torah Reading', 'Exodus 30:11-16') ],
    },
    {
        id: 'special:zachor',
        name: 'Zachor',
        group: 'Special Shabbatot',
        sections: [ P('Torah Reading', 'Deuteronomy 25:17-19') ],
    },
    {
        id: 'special:purim',
        name: 'Purim',
        group: 'Purim',
        sections: [ P('Torah Reading', 'Exodus 17:8-16') ],
    },
    {
        id: 'special:parah',
        name: 'Parah',
        group: 'Special Shabbatot',
        sections: [ P('Torah Reading', 'Numbers 19:1-22') ],
    },
    {
        id: 'special:hachodesh',
        name: 'Hachodesh',
        group: 'Special Shabbatot',
        sections: [ P('Torah Reading', 'Exodus 12:1-20') ],
    },

    // ── Pesach ───────────────────────────────────────────────────────────────
    {
        id: 'special:pesach-day-1',
        name: 'Pesach Day 1',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Exodus 12:21-51'),
            P('Maftir',         'Numbers 28:16-25'),
            P('Haftarah',       'Joshua 3:5-7'),
            P('Haftarah (cont.)', 'Joshua 5:2-6:1'),
            P('Haftarah (cont.)', 'Joshua 6:27'),
        ],
    },
    {
        id: 'special:pesach-day-2',
        name: 'Pesach Day 2',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Leviticus 22:26-23:44'),
            P('Maftir',         'Numbers 28:16-25'),
            P('Haftarah',       'II Kings 23:1-9'),
            P('Haftarah (cont.)', 'II Kings 23:21-25'),
        ],
    },
    {
        id: 'special:pesach-shabbat-chol-hamoed',
        name: 'Shabbat Chol HaMoed Pesach',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Exodus 33:12-34:26'),
            P('Maftir',         'Numbers 28:19-25'),
            P('Haftarah',       'Ezekiel 37:1-14'),
        ],
    },
    {
        id: 'special:pesach-chol-hamoed-1',
        name: 'Pesach Chol HaMoed Day 1',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Exodus 13:1-16'),
            P('Maftir',         'Numbers 28:19-25'),
        ],
    },
    {
        id: 'special:pesach-chol-hamoed-2',
        name: 'Pesach Chol HaMoed Day 2',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Exodus 22:24-23:19'),
            P('Maftir',         'Numbers 28:19-25'),
        ],
    },
    {
        id: 'special:pesach-chol-hamoed-4',
        name: 'Pesach Chol HaMoed Day 4',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Numbers 9:1-14'),
            P('Maftir',         'Numbers 28:19-25'),
        ],
    },
    {
        id: 'special:pesach-day-7',
        name: 'Pesach Day 7 (Shvi\'i shel Pesach)',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Exodus 13:17-15:26'),
            P('Maftir',         'Numbers 28:19-25'),
            P('Haftarah',       'II Samuel 22:1-51'),
        ],
    },
    {
        id: 'special:pesach-day-8',
        name: 'Pesach Day 8 (Acharon shel Pesach)',
        group: 'Pesach',
        sections: [
            P('Torah Reading',  'Deuteronomy 15:19-16:17'),
            P('Maftir',         'Numbers 28:19-25'),
            P('Haftarah',       'Isaiah 10:32-12:6'),
        ],
    },

    // ── Shavuot ──────────────────────────────────────────────────────────────
    {
        id: 'special:shavuot-day-1',
        name: 'Shavuot Day 1',
        group: 'Shavuot',
        sections: [
            P('Torah Reading',  'Exodus 19:1-20:23'),
            P('Maftir',         'Numbers 28:26-31'),
            P('Haftarah',       'Ezekiel 1:1-28'),
            P('Haftarah (cont.)', 'Ezekiel 3:12'),
        ],
    },
    {
        id: 'special:shavuot-day-2',
        name: 'Shavuot Day 2',
        group: 'Shavuot',
        sections: [
            P('Torah Reading',  'Deuteronomy 14:22-16:17'),
            P('Maftir',         'Numbers 28:26-31'),
            P('Haftarah',       'Habakkuk 2:20-3:19'),
        ],
    },
];

/**
 * Look up a special reading by its id.
 * The id (e.g. "special:rosh-hashanah-day-1") is what the dropdown `<option>`
 * value stores and what every downstream component uses as the identity key.
 */
export function findSpecialReadingById(id) {
    return SPECIAL_READINGS.find(r => r.id === id) || null;
}

/** True if a ref string is a Special Reading identity key. */
export function isSpecialReadingId(ref) {
    return typeof ref === 'string' && ref.startsWith('special:');
}

/**
 * Splits an inline compound ref on " & " or ";" into discrete refs.
 * The SPECIAL_READINGS data model already pre-splits into `sections`, so this
 * helper is only used as a fallback for any legacy compound ref that might
 * still flow through the pipeline.
 */
export function splitCompoundRef(ref) {
    if (typeof ref !== 'string') return [ref];
    if (!/[;&]/.test(ref)) return [ref];
    return ref.split(/\s*[;&]\s*/).map(s => s.trim()).filter(Boolean);
}

export function isCompoundRef(ref) {
    return typeof ref === 'string' && /\s[&;]\s|;/.test(ref);
}
