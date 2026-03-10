// song-detail.js - display individual song and poem details

const SONGS_URL = "data/songs.json";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value = "") {
  return String(value).toLowerCase();
}

function getEntryType(entry = {}) {
  return normalizeText(entry.category) === "poem" ? "poem" : "song";
}

function getYouTubeEmbedUrl(url = "") {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let videoId = "";

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1];
    } else {
      videoId = parsed.searchParams.get("v") || "";
    }

    if (!videoId) return "";
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch (error) {
    return "";
  }
}

function getSongIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  const index = params.get("song");
  return index !== null ? parseInt(index, 10) : null;
}

function buildLyricsHTML(lyrics = []) {
  if (!Array.isArray(lyrics) || !lyrics.length) {
    return '<p class="lyrics-empty">Lyrics coming soon.</p>';
  }

  const rows = lyrics
    .map(line => {
      const hebrew = (line.hebrew || "").trim();
      const transliteration = (line.transliteration || "").trim();
      const english = (line.english || "").trim();

      if (!hebrew && !transliteration && !english) {
        return `
          <div class="lyrics-detail-row lyrics-detail-spacer" aria-hidden="true">
            <div class="lyrics-detail-cell">&nbsp;</div>
            <div class="lyrics-detail-cell">&nbsp;</div>
            <div class="lyrics-detail-cell">&nbsp;</div>
          </div>
        `;
      }

      const hebrewCell = hebrew ? escapeHtml(hebrew) : "&nbsp;";
      const transliterationCell = transliteration ? escapeHtml(transliteration) : "&nbsp;";
      const englishCell = english ? escapeHtml(english) : "&nbsp;";

      return `
        <div class="lyrics-detail-row">
          <div class="lyrics-detail-cell lyrics-detail-hebrew" lang="he">${hebrewCell}</div>
          <div class="lyrics-detail-cell lyrics-detail-transliteration">${transliterationCell}</div>
          <div class="lyrics-detail-cell lyrics-detail-english">${englishCell}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="lyrics-detail-grid">
      <div class="lyrics-detail-row lyrics-detail-labels">
        <div class="lyrics-detail-cell">Hebrew</div>
        <div class="lyrics-detail-cell">Transliteration</div>
        <div class="lyrics-detail-cell">English</div>
      </div>
      ${rows}
    </div>
  `;
}

function splitPoemIntoStanzas(lines = []) {
  const stanzas = [];
  let currentStanza = [];

  lines.forEach(rawLine => {
    const line = String(rawLine || "").trim();
    if (!line) {
      if (currentStanza.length) {
        stanzas.push(currentStanza);
        currentStanza = [];
      }
      return;
    }

    currentStanza.push(line);
  });

  if (currentStanza.length) {
    stanzas.push(currentStanza);
  }

  return stanzas;
}

function formatPoemLineMarkup(line = "") {
  // Escape first, then apply a constrained formatting subset for poem emphasis.
  let formatted = escapeHtml(String(line || ""));
  formatted = formatted.replace(/\*\*__([\s\S]+?)__\*\*/g, "<strong><u>$1</u></strong>");
  formatted = formatted.replace(/__\*\*([\s\S]+?)\*\*__/g, "<u><strong>$1</strong></u>");
  formatted = formatted.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
  return formatted;
}

function buildPoemStanzaHTML(stanzas = [], options = {}) {
  const { isHebrew = false, languageClass = "" } = options;
  return stanzas
    .map((stanza, stanzaIndex) => {
      const lineHtml = stanza
        .map((line, lineIndex) => {
          const openingClass = !isHebrew && stanzaIndex === 0 && lineIndex === 0 ? " poem-line-opening" : "";
          const languageLineClass = languageClass ? ` ${languageClass}` : "";
          const languageAttrs = isHebrew ? ' lang="he" dir="rtl"' : "";
          return `<p class="poem-line${openingClass}${languageLineClass}"${languageAttrs}>${formatPoemLineMarkup(line)}</p>`;
        })
        .join("");

      return `<section class="poem-stanza">${lineHtml}</section>`;
    })
    .join("");
}

function buildPoemHTML(poemLines = [], poemHebrewLines = []) {
  const englishStanzas = splitPoemIntoStanzas(poemLines);
  const hebrewStanzas = splitPoemIntoStanzas(poemHebrewLines);

  if (!englishStanzas.length && !hebrewStanzas.length) {
    return '<p class="lyrics-empty">Poem text coming soon.</p>';
  }

  if (!hebrewStanzas.length) {
    const stanzaHtml = buildPoemStanzaHTML(englishStanzas);
    return `<div class="poem-frame">${stanzaHtml}</div>`;
  }

  const englishColumn = englishStanzas.length
    ? buildPoemStanzaHTML(englishStanzas)
    : '<p class="lyrics-empty">English text coming soon.</p>';

  const hebrewColumn = hebrewStanzas.length
    ? buildPoemStanzaHTML(hebrewStanzas, { isHebrew: true, languageClass: "poem-line-hebrew" })
    : '<p class="lyrics-empty">תרגום עברי יופיע בקרוב.</p>';

  return `
    <div class="poem-frame poem-frame-bilingual">
      <div class="poem-bilingual-grid">
        <section class="poem-language-column">
          <h3 class="poem-language-title">ENGLISH</h3>
          ${englishColumn}
        </section>
        <section class="poem-language-column poem-language-column-hebrew">
          <h3 class="poem-language-title poem-language-title-hebrew" lang="he" dir="rtl">עברית</h3>
          ${hebrewColumn}
        </section>
      </div>
    </div>
  `;
}

function displaySong(entry) {
  const entryType = getEntryType(entry);
  const isPoem = entryType === "poem";

  const titleEnglish = entry.title_english || "";
  const titleHebrew = entry.title_hebrew || "";
  const pageTitle = titleEnglish || titleHebrew || "Entry";
  const artist = entry.artist || "";
  const overview = entry.overview || "";
  document.title = `${pageTitle} - Songs and Poems - A Letter in the Scroll`;

  // Update Open Graph meta tags for link previews
  const ogTitle = artist ? `${pageTitle} — ${artist}` : pageTitle;
  const ogDesc = overview || `${isPoem ? "Poem" : "Song"}: ${pageTitle}. Listen, reflect, read, and sing.`;
  const metaUpdates = {
    'og:title': ogTitle,
    'og:description': ogDesc,
    'twitter:title': ogTitle,
    'twitter:description': ogDesc
  };
  Object.entries(metaUpdates).forEach(function(pair) {
    var el = document.querySelector('meta[property="' + pair[0] + '"], meta[name="' + pair[0] + '"]');
    if (el) el.setAttribute("content", pair[1]);
  });

  const songTitleEl = document.getElementById("song-title");
  if (songTitleEl) {
    const titleParts = [];
    if (titleEnglish) {
      titleParts.push(`<span>${escapeHtml(titleEnglish)}</span>`);
    }
    if (titleHebrew) {
      titleParts.push(`<span class="song-title-hebrew" lang="he">${escapeHtml(titleHebrew)}</span>`);
    }
    songTitleEl.innerHTML = titleParts.length ? titleParts.join("") : "Untitled Entry";
  }

  const songArtistEl = document.getElementById("song-artist");
  if (songArtistEl && entry.artist) {
    songArtistEl.textContent = entry.artist;
    songArtistEl.dataset.label = isPoem ? "Written by" : "Artist";
    songArtistEl.style.display = "inline-flex";
  } else if (songArtistEl) {
    songArtistEl.style.display = "none";
  }

  const songDateEl = document.getElementById("song-date");
  if (songDateEl && entry.published_date) {
    songDateEl.textContent = entry.published_date;
    songDateEl.style.display = "inline-flex";
  } else if (songDateEl) {
    songDateEl.style.display = "none";
  }

  const songOverviewEl = document.getElementById("song-overview");
  if (songOverviewEl && entry.overview) {
    songOverviewEl.textContent = entry.overview;
    songOverviewEl.style.display = "block";
  } else if (songOverviewEl) {
    songOverviewEl.style.display = "none";
  }

  const videoSection = document.getElementById("video-section");
  const videoContainer = document.getElementById("video-container");
  const youtubeLink = document.getElementById("youtube-link");
  const embedUrl = getYouTubeEmbedUrl(entry.youtube_url || "");
  const hasMedia = !isPoem && (embedUrl || entry.youtube_url);

  if (videoSection) {
    videoSection.style.display = hasMedia ? "block" : "none";
  }

  if (videoContainer) {
    if (embedUrl) {
      videoContainer.innerHTML = `
        <iframe
          title="${escapeHtml(pageTitle)}"
          src="${escapeHtml(embedUrl)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    } else if (hasMedia) {
      videoContainer.innerHTML = '<p class="lyrics-empty">Video embed unavailable for this song.</p>';
    } else {
      videoContainer.innerHTML = "";
    }
  }

  if (youtubeLink && !isPoem && entry.youtube_url) {
    youtubeLink.href = entry.youtube_url;
    youtubeLink.style.display = "inline-flex";
  } else if (youtubeLink) {
    youtubeLink.style.display = "none";
  }

  const lyricsSectionLabel = document.getElementById("lyrics-section-label");
  if (lyricsSectionLabel) {
    lyricsSectionLabel.textContent = isPoem ? "Poem" : "Lyrics";
  }

  const lyricsContainer = document.getElementById("lyrics-container");
  if (lyricsContainer) {
    const poemLines = Array.isArray(entry.poem_lines)
      ? entry.poem_lines
      : Array.isArray(entry.lyrics)
        ? entry.lyrics.map(line => line.english || line.transliteration || line.hebrew || "")
        : [];
    const poemHebrewLines = Array.isArray(entry.poem_hebrew_lines) ? entry.poem_hebrew_lines : [];

    lyricsContainer.innerHTML = isPoem
      ? buildPoemHTML(poemLines, poemHebrewLines)
      : buildLyricsHTML(entry.lyrics || []);
  }

  const body = document.body;
  if (body) {
    body.classList.toggle("poem-mode", isPoem);
  }

  const songContent = document.getElementById("song-content");
  if (songContent) {
    songContent.setAttribute("data-entry-type", isPoem ? "poem" : "song");
  }

  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("song-content").classList.remove("hidden");
}

function showError() {
  if (document.body) {
    document.body.classList.remove("poem-mode");
  }
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("error-state").classList.remove("hidden");
}

async function loadAndDisplaySong() {
  const songIndex = getSongIndexFromURL();

  if (songIndex === null || songIndex < 0) {
    showError();
    return;
  }

  try {
    const response = await fetch(SONGS_URL);
    if (!response.ok) {
      throw new Error("Failed to load songs and poems");
    }

    const entries = await response.json();

    if (!Array.isArray(entries) || songIndex >= entries.length) {
      showError();
      return;
    }

    displaySong(entries[songIndex]);
  } catch (error) {
    console.error("Error loading entry:", error);
    showError();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAndDisplaySong();
});
