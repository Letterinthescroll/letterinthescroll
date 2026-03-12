function getSongUrl(index) {
  return `/data/songs/${index}.json`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value = "") {
  return String(value).toLowerCase();
}

function getEntryType(entry = {}) {
  return normalizeText(entry.category) === "poem" ? "poem" : "song";
}

function getSongIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("song");
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function splitTextIntoStanzas(lines = []) {
  const stanzas = [];
  let current = [];

  lines.forEach(line => {
    const text = String(line || "").trim();
    if (!text) {
      if (current.length) {
        stanzas.push(current);
        current = [];
      }
      return;
    }
    current.push(text);
  });

  if (current.length) {
    stanzas.push(current);
  }

  return stanzas;
}

function formatPoemLineMarkup(line = "") {
  let formatted = escapeHtml(String(line || ""));
  formatted = formatted.replace(/\*\*__([\s\S]+?)__\*\*/g, "<strong><u>$1</u></strong>");
  formatted = formatted.replace(/__\*\*([\s\S]+?)\*\*__/g, "<u><strong>$1</strong></u>");
  formatted = formatted.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
  return formatted;
}

function buildPoemColumnHTML(stanzas = [], options = {}) {
  const { isHebrew = false } = options;
  if (!stanzas.length) {
    return '<p class="lyrics-empty">Text coming soon.</p>';
  }

  return stanzas
    .map(stanza => {
      const lines = stanza
        .map(line => {
          const attrs = isHebrew ? ' lang="he" dir="rtl"' : "";
          const hebrewClass = isHebrew ? " poem-line-hebrew" : "";
          return `<p class="poem-line${hebrewClass}"${attrs}>${formatPoemLineMarkup(line)}</p>`;
        })
        .join("");
      return `<section class="poem-stanza">${lines}</section>`;
    })
    .join("");
}

function buildPoemHTML(poemLines = [], poemHebrewLines = []) {
  const englishStanzas = splitTextIntoStanzas(poemLines);
  const hebrewStanzas = splitTextIntoStanzas(poemHebrewLines);

  if (!englishStanzas.length && !hebrewStanzas.length) {
    return '<p class="lyrics-empty">Poem text coming soon.</p>';
  }

  if (!hebrewStanzas.length) {
    return `<div class="poem-shell">${buildPoemColumnHTML(englishStanzas)}</div>`;
  }

  return `
    <div class="poem-shell">
      <div class="poem-grid">
        <section class="poem-column">
          <h3 class="poem-column-title">English</h3>
          ${buildPoemColumnHTML(englishStanzas)}
        </section>
        <section class="poem-column poem-column-hebrew">
          <h3 class="poem-column-title poem-column-title-hebrew" lang="he" dir="rtl">עברית</h3>
          ${buildPoemColumnHTML(hebrewStanzas, { isHebrew: true })}
        </section>
      </div>
    </div>
  `;
}

function buildLineSignature(line = {}) {
  const hebrew = String(line.hebrew || "").trim();
  const english = String(line.english || "").trim();
  const transliteration = String(line.transliteration || "").trim();
  const combined = normalizeText(`${hebrew}|${english}|${transliteration}`)
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, " ")
    .trim();
  return combined;
}

function buildRefrainMap(lyrics = []) {
  const counts = new Map();
  lyrics.forEach(line => {
    const signature = buildLineSignature(line);
    if (!signature) return;
    counts.set(signature, (counts.get(signature) || 0) + 1);
  });
  return counts;
}

function buildLyricsHTML(lyrics = []) {
  if (!Array.isArray(lyrics) || !lyrics.length) {
    return '<p class="lyrics-empty">Lyrics coming soon.</p>';
  }

  const refrainMap = buildRefrainMap(lyrics);
  let lineNumber = 0;

  const linesMarkup = lyrics
    .map(line => {
      const hebrew = String(line.hebrew || "").trim();
      const transliteration = String(line.transliteration || "").trim();
      const english = String(line.english || "").trim();

      if (!hebrew && !transliteration && !english) {
        return '<div class="lyrics-divider" aria-hidden="true"><span></span></div>';
      }

      lineNumber += 1;
      const signature = buildLineSignature(line);
      const isRefrain = signature && (refrainMap.get(signature) || 0) > 1;

      return `
        <article class="lyrics-line" style="--line-order:${lineNumber}">
          <div class="lyrics-line-index">${lineNumber}</div>
          <div class="lyrics-line-copy">
            <div class="lyrics-line-meta">
              ${isRefrain ? '<span class="lyrics-line-tag">Refrain</span>' : ""}
            </div>
            ${hebrew ? `<p class="lyric-hebrew" lang="he" dir="rtl">${escapeHtml(hebrew)}</p>` : ""}
            ${transliteration ? `<p class="lyric-translit">${escapeHtml(transliteration)}</p>` : ""}
            ${english ? `<p class="lyric-english">${escapeHtml(english)}</p>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  return `<div class="lyrics-lines">${linesMarkup}</div>`;
}

function getLyricsLineCount(entry = {}) {
  if (!Array.isArray(entry.lyrics)) return 0;
  return entry.lyrics.reduce((count, line) => {
    const hasText = String(line?.hebrew || "").trim() || String(line?.transliteration || "").trim() || String(line?.english || "").trim();
    return hasText ? count + 1 : count;
  }, 0);
}

function extractYouTubeVideoId(url = "") {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    let id = "";

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        id = parsed.pathname.split("/embed/")[1] || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        id = parsed.pathname.split("/shorts/")[1] || "";
      } else if (parsed.pathname.startsWith("/live/")) {
        id = parsed.pathname.split("/live/")[1] || "";
      } else {
        id = parsed.searchParams.get("v") || "";
      }
    }

    id = String(id).split(/[?&/]/)[0].trim();
    return /^[A-Za-z0-9_-]{8,}$/.test(id) ? id : "";
  } catch (error) {
    return "";
  }
}

function buildYouTubeEmbedUrl(videoId = "", autoplay = false) {
  if (!videoId) return "";
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1"
  });
  if (autoplay) {
    params.set("autoplay", "1");
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

const PREFERENCE_KEY = "song-detail-lyrics-preferences";

const DEFAULT_PREFERENCES = {
  showTransliteration: true,
  showTranslation: true,
  compactMode: false
};

const lyricPreferences = {
  showTransliteration: true,
  showTranslation: true,
  compactMode: false
};

function loadLyricPreferences() {
  try {
    const saved = localStorage.getItem(PREFERENCE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    lyricPreferences.showTransliteration = parsed.showTransliteration !== false;
    lyricPreferences.showTranslation = parsed.showTranslation !== false;
    lyricPreferences.compactMode = parsed.compactMode === true;
  } catch (error) {
    lyricPreferences.showTransliteration = DEFAULT_PREFERENCES.showTransliteration;
    lyricPreferences.showTranslation = DEFAULT_PREFERENCES.showTranslation;
    lyricPreferences.compactMode = DEFAULT_PREFERENCES.compactMode;
  }
}

function saveLyricPreferences() {
  try {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(lyricPreferences));
  } catch (error) {
    // Non-fatal.
  }
}

function setButtonState(button, isActive) {
  if (!button) return;
  button.classList.toggle("active", isActive);
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
}

function applyLyricsDisplayPreferences() {
  const lyricsSection = document.getElementById("lyrics-section");
  if (!lyricsSection) return;

  lyricsSection.classList.toggle("hide-transliteration", !lyricPreferences.showTransliteration);
  lyricsSection.classList.toggle("hide-translation", !lyricPreferences.showTranslation);
  lyricsSection.classList.toggle("compact-mode", lyricPreferences.compactMode);

  setButtonState(document.getElementById("toggle-transliteration"), lyricPreferences.showTransliteration);
  setButtonState(document.getElementById("toggle-translation"), lyricPreferences.showTranslation);
  setButtonState(document.getElementById("toggle-compact-mode"), lyricPreferences.compactMode);
}

function setupLyricControls(isPoem) {
  const controlsWrap = document.getElementById("lyrics-controls");
  const transliterationButton = document.getElementById("toggle-transliteration");
  const translationButton = document.getElementById("toggle-translation");
  const compactButton = document.getElementById("toggle-compact-mode");

  if (controlsWrap) {
    controlsWrap.style.display = isPoem ? "none" : "inline-flex";
  }

  if (isPoem) {
    return;
  }

  if (transliterationButton && !transliterationButton.dataset.bound) {
    transliterationButton.dataset.bound = "true";
    transliterationButton.addEventListener("click", () => {
      lyricPreferences.showTransliteration = !lyricPreferences.showTransliteration;
      applyLyricsDisplayPreferences();
      saveLyricPreferences();
    });
  }

  if (translationButton && !translationButton.dataset.bound) {
    translationButton.dataset.bound = "true";
    translationButton.addEventListener("click", () => {
      lyricPreferences.showTranslation = !lyricPreferences.showTranslation;
      applyLyricsDisplayPreferences();
      saveLyricPreferences();
    });
  }

  if (compactButton && !compactButton.dataset.bound) {
    compactButton.dataset.bound = "true";
    compactButton.addEventListener("click", () => {
      lyricPreferences.compactMode = !lyricPreferences.compactMode;
      applyLyricsDisplayPreferences();
      saveLyricPreferences();
    });
  }

  applyLyricsDisplayPreferences();
}

function renderVideoSection(entry = {}, pageTitle = "", isPoem = false) {
  const videoSection = document.getElementById("video-section");
  const videoContainer = document.getElementById("video-container");
  const youtubeLink = document.getElementById("youtube-link");

  const videoId = extractYouTubeVideoId(entry.youtube_url || "");
  const hasMedia = !isPoem && (videoId || entry.youtube_url);

  if (videoSection) {
    videoSection.style.display = hasMedia ? "block" : "none";
  }

  if (!videoContainer) return;

  if (!hasMedia) {
    videoContainer.innerHTML = "";
    if (youtubeLink) {
      youtubeLink.style.display = "none";
    }
    return;
  }

  if (youtubeLink && entry.youtube_url) {
    youtubeLink.href = entry.youtube_url;
    youtubeLink.style.display = "inline-flex";
  } else if (youtubeLink) {
    youtubeLink.style.display = "none";
  }

  if (!videoId) {
    videoContainer.innerHTML = '<p class="lyrics-empty">Video preview unavailable for this entry.</p>';
    return;
  }

  const posterUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const safeTitle = escapeHtml(pageTitle || "Song");

  videoContainer.innerHTML = `
    <button type="button" class="youtube-poster-btn" aria-label="Play ${safeTitle}">
      <img src="${escapeHtml(posterUrl)}" alt="Preview for ${safeTitle}" loading="lazy">
      <span class="youtube-poster-overlay">
        <span class="youtube-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
        </span>
        <span class="youtube-play-label">Play Video</span>
      </span>
    </button>
  `;

  const button = videoContainer.querySelector(".youtube-poster-btn");
  if (!button) return;

  button.addEventListener("click", () => {
    const embedUrl = buildYouTubeEmbedUrl(videoId, true);
    if (!embedUrl) return;
    videoContainer.innerHTML = `
      <iframe
        title="${safeTitle}"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    `;
  });
}

function displaySong(entry = {}) {
  const isPoem = getEntryType(entry) === "poem";
  const titleEnglish = String(entry.title_english || "").trim();
  const titleHebrew = String(entry.title_hebrew || "").trim();
  const pageTitle = titleEnglish || titleHebrew || "Entry";
  const overview = String(entry.overview || "").trim();

  document.title = `${pageTitle} - Songs and Poems - A Letter in the Scroll`;

  const metaTitle = entry.artist ? `${pageTitle} — ${entry.artist}` : pageTitle;
  const metaDescription = overview || `${isPoem ? "Poem" : "Song"}: ${pageTitle}.`;
  const metaUpdates = {
    "og:title": metaTitle,
    "og:description": metaDescription,
    "twitter:title": metaTitle,
    "twitter:description": metaDescription
  };

  Object.entries(metaUpdates).forEach(([key, value]) => {
    const node = document.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
    if (node) node.setAttribute("content", value);
  });

  const titleNode = document.getElementById("song-title");
  if (titleNode) {
    const parts = [];
    if (titleEnglish) parts.push(`<span class="song-title-main">${escapeHtml(titleEnglish)}</span>`);
    if (titleHebrew) parts.push(`<span class="song-title-hebrew" lang="he" dir="rtl">${escapeHtml(titleHebrew)}</span>`);
    titleNode.innerHTML = parts.length ? parts.join("") : "<span class='song-title-main'>Untitled Entry</span>";
  }

  const artistNode = document.getElementById("song-artist");
  if (artistNode) {
    if (entry.artist) {
      artistNode.textContent = entry.artist;
      artistNode.dataset.label = isPoem ? "Written by" : "Artist";
      artistNode.style.display = "inline-flex";
    } else {
      artistNode.style.display = "none";
    }
  }

  const dateNode = document.getElementById("song-date");
  if (dateNode) {
    if (entry.published_date) {
      dateNode.textContent = entry.published_date;
      dateNode.dataset.label = "Published";
      dateNode.style.display = "inline-flex";
    } else {
      dateNode.style.display = "none";
    }
  }

  const overviewNode = document.getElementById("song-overview");
  if (overviewNode) {
    if (overview) {
      overviewNode.textContent = overview;
      overviewNode.style.display = "block";
    } else {
      overviewNode.style.display = "none";
    }
  }

  const lineCountNode = document.getElementById("song-line-count");
  if (lineCountNode) {
    if (isPoem) {
      lineCountNode.textContent = "Poem";
    } else {
      const lineCount = getLyricsLineCount(entry);
      lineCountNode.textContent = lineCount > 0 ? `${lineCount} lines` : "Song";
    }
    lineCountNode.style.display = "inline-flex";
  }

  const typeChip = document.getElementById("sd-type-chip");
  if (typeChip) {
    typeChip.textContent = isPoem ? "Poem" : "Song";
  }

  renderVideoSection(entry, pageTitle, isPoem);

  const lyricsSectionLabel = document.getElementById("lyrics-section-label");
  if (lyricsSectionLabel) {
    lyricsSectionLabel.textContent = isPoem ? "Poem Text" : "Lyrics + Translation";
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

  if (document.body) {
    document.body.classList.toggle("poem-mode", isPoem);
  }

  setupLyricControls(isPoem);

  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const songContent = document.getElementById("song-content");
  if (loadingState) loadingState.classList.add("hidden");
  if (errorState) errorState.classList.add("hidden");
  if (songContent) songContent.classList.remove("hidden");
}

function showError() {
  if (document.body) {
    document.body.classList.remove("poem-mode");
  }

  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const songContent = document.getElementById("song-content");

  if (loadingState) loadingState.classList.add("hidden");
  if (songContent) songContent.classList.add("hidden");
  if (errorState) errorState.classList.remove("hidden");
}

async function loadAndDisplaySong() {
  const songIndex = getSongIndexFromURL();
  if (songIndex === null) {
    showError();
    return;
  }

  try {
    const response = await fetch(getSongUrl(songIndex));
    if (!response.ok) {
      throw new Error(`Failed to load song ${songIndex}`);
    }

    const entry = await response.json();
    displaySong(entry);
  } catch (error) {
    console.error("Error loading entry:", error);
    showError();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLyricPreferences();
  loadAndDisplaySong();
});
