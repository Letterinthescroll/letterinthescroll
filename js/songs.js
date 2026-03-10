// songs.js - render the Songs and Poems page from songs.json

const SONGS_URL = "data/songs.json";
const DVAR_ARCHIVE_URL = "data/past-dvar-torahs.json";
let allEntries = [];
let activeTypeFilter = "all";

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

function getTypeLabel(type = "all") {
  if (type === "song") return "Songs";
  if (type === "poem") return "Poems";
  return "All entries";
}

function buildSearchText(entry) {
  const lyricText = Array.isArray(entry.lyrics)
    ? entry.lyrics
        .map(line => [line.hebrew, line.transliteration, line.english].filter(Boolean).join(" "))
        .join(" ")
    : "";

  const poemText = Array.isArray(entry.poem_lines) ? entry.poem_lines.filter(Boolean).join(" ") : "";
  const poemHebrewText = Array.isArray(entry.poem_hebrew_lines)
    ? entry.poem_hebrew_lines.filter(Boolean).join(" ")
    : "";

  return normalizeText(
    [
      entry.title_hebrew,
      entry.title_english,
      entry.artist,
      entry.overview,
      entry.published_date,
      entry.category,
      lyricText,
      poemText,
      poemHebrewText
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildSongCard(entry) {
  const entryType = getEntryType(entry);
  const isPoem = entryType === "poem";
  const sourceIndex = Number.isInteger(entry.sourceIndex) ? entry.sourceIndex : 0;

  const titleEnglish = entry.title_english ? escapeHtml(entry.title_english) : "";
  const titleHebrew = entry.title_hebrew ? escapeHtml(entry.title_hebrew) : "";
  const artist = entry.artist ? escapeHtml(entry.artist) : "";
  const overview = entry.overview ? escapeHtml(entry.overview) : "";
  const publishedDate = entry.published_date ? escapeHtml(entry.published_date) : "";

  const titleBlocks = [
    titleEnglish ? `<span>${titleEnglish}</span>` : "",
    titleHebrew ? `<span class="song-title-hebrew" lang="he">${titleHebrew}</span>` : ""
  ].filter(Boolean);

  const titleHtml = titleBlocks.length ? titleBlocks.join("") : "<span>Untitled Entry</span>";
  const typeLabel = isPoem ? "Poem" : "Song";
  const typeClass = isPoem ? "song-meta-chip-poem" : "song-meta-chip-song";
  const artistLabel = isPoem ? "Written by" : "Artist";
  const ctaText = isPoem ? "Read Poem" : "View Song Details";

  return `
    <article class="song-card ${isPoem ? "song-card-poem" : ""}" data-song-index="${sourceIndex}" data-entry-type="${entryType}">
      <a href="song-detail.html?song=${sourceIndex}" class="song-card-link">
        <header class="song-header">
          <div class="song-meta-row">
            <span class="song-meta-chip ${typeClass}">${typeLabel}</span>
            ${publishedDate ? `<span class="song-meta-date">${publishedDate}</span>` : ""}
          </div>
          <h3 class="song-title">${titleHtml}</h3>
          ${artist ? `<p class="song-artist">${artistLabel}: ${artist}</p>` : ""}
        </header>
        ${overview ? `<p class="song-overview">${overview}</p>` : ""}
        <div class="song-card-cta">
          <span class="song-card-cta-text">${ctaText}</span>
          <svg class="song-card-cta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </a>
    </article>
  `;
}

function renderEntries(entries) {
  const container = document.getElementById("songs-container");
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="songs-empty">No songs or poems match this filter yet.</div>';
    return;
  }

  // Use a single innerHTML write to minimize reflows
  const html = [];
  for (let i = 0; i < entries.length; i++) {
    html.push(buildSongCard(entries[i]));
  }
  container.innerHTML = html.join("");
}

function getTypeCounts(entries) {
  const counts = { all: entries.length, song: 0, poem: 0 };
  entries.forEach(entry => {
    const type = getEntryType(entry);
    if (type === "poem") {
      counts.poem += 1;
    } else {
      counts.song += 1;
    }
  });
  return counts;
}

function updateTypeTabCounts(entries) {
  const counts = getTypeCounts(entries);
  const allCount = document.getElementById("songs-tab-count-all");
  const songCount = document.getElementById("songs-tab-count-song");
  const poemCount = document.getElementById("songs-tab-count-poem");

  if (allCount) allCount.textContent = String(counts.all);
  if (songCount) songCount.textContent = String(counts.song);
  if (poemCount) poemCount.textContent = String(counts.poem);
}

function updateTypeTabsActiveState() {
  const tabs = document.querySelectorAll(".songs-type-tab");
  tabs.forEach(tab => {
    const isActive = tab.dataset.typeFilter === activeTypeFilter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
  });
}

function updateCounts(filteredCount, totalCount, query, typeFilter) {
  const countLabel = document.getElementById("songs-count");
  const filterPill = document.getElementById("songs-filter-pill");
  const typeLabel = getTypeLabel(typeFilter);

  if (countLabel) {
    if (totalCount === 0) {
      countLabel.textContent = "No entries yet";
    } else if (query || typeFilter !== "all") {
      countLabel.textContent = `Showing ${filteredCount} of ${totalCount} entries`;
    } else {
      countLabel.textContent = `Showing ${totalCount} ${totalCount === 1 ? "entry" : "entries"}`;
    }
  }

  if (filterPill) {
    if (!query && typeFilter === "all") {
      filterPill.textContent = "All entries";
    } else if (query && typeFilter !== "all") {
      filterPill.textContent = `${typeLabel} • Matches: ${filteredCount}`;
    } else if (query) {
      filterPill.textContent = `Matches: ${filteredCount}`;
    } else {
      filterPill.textContent = typeLabel;
    }
  }
}

function filterEntriesByType(entries, typeFilter) {
  if (typeFilter === "all") return entries;
  return entries.filter(entry => getEntryType(entry) === typeFilter);
}

function filterEntries(query, typeFilter) {
  const typeFiltered = filterEntriesByType(allEntries, typeFilter);
  if (!query) return typeFiltered;
  return typeFiltered.filter(entry => entry.searchText.includes(query));
}

function setupSearchAndTabs() {
  const searchInput = document.getElementById("song-search");
  const clearButton = document.getElementById("clear-song-search");
  const tabs = document.querySelectorAll(".songs-type-tab");

  const applyFilters = () => {
    const query = normalizeText(searchInput ? searchInput.value.trim() : "");
    const filteredEntries = filterEntries(query, activeTypeFilter);
    renderEntries(filteredEntries);
    updateCounts(filteredEntries.length, allEntries.length, query, activeTypeFilter);
    updateTypeTabsActiveState();
  };

  updateTypeTabCounts(allEntries);
  updateTypeTabsActiveState();

  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 150);
    });
  }

  if (clearButton && searchInput) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      applyFilters();
      searchInput.focus();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const nextFilter = tab.dataset.typeFilter || "all";
      if (nextFilter === activeTypeFilter) return;
      activeTypeFilter = nextFilter;
      applyFilters();
    });
  });

  applyFilters();
}

async function loadEntries() {
  try {
    const response = await fetch(SONGS_URL);
    if (!response.ok) {
      throw new Error("Failed to load songs and poems");
    }

    const data = await response.json();
    allEntries = Array.isArray(data)
      ? data.map((entry, index) => ({
          ...entry,
          sourceIndex: index,
          searchText: buildSearchText(entry)
        }))
      : [];

    setupSearchAndTabs();
  } catch (error) {
    const container = document.getElementById("songs-container");
    if (container) {
      container.innerHTML = '<div class="songs-empty">Songs and poems are unavailable right now.</div>';
    }
    updateCounts(0, 0, "", "all");
    updateTypeTabCounts([]);
    updateTypeTabsActiveState();
  }
}

function formatArchiveDate(dateValue = "") {
  if (!dateValue) return "";
  const parsedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return dateValue;
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getParshaGroupLabel(parshaValue = "") {
  if (!parshaValue) return "General Archive";
  if (normalizeText(parshaValue).includes("parsha")) return parshaValue;
  return `Parshat ${parshaValue}`;
}

function sortArchiveEntries(entries = []) {
  return entries.slice().sort((a, b) => {
    const dateA = String(a?.sharedOn || "");
    const dateB = String(b?.sharedOn || "");
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

function groupArchiveEntriesByParsha(entries = []) {
  const groupsMap = new Map();

  sortArchiveEntries(entries).forEach(entry => {
    const groupKey = String(entry?.parsha || "General Archive");
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, []);
    }
    groupsMap.get(groupKey).push(entry);
  });

  return Array.from(groupsMap.entries())
    .map(([parsha, groupEntries]) => {
      const firstDate = groupEntries[0]?.sharedOn || "";
      const lastDate = groupEntries[groupEntries.length - 1]?.sharedOn || "";
      return { parsha, entries: groupEntries, firstDate, lastDate };
    })
    .sort((a, b) => String(b?.lastDate || "").localeCompare(String(a?.lastDate || "")));
}

function renderPastDvarEntry(entry = {}) {
  const title = escapeHtml(entry?.title || "Untitled Dvar Torah");
  const sharedDate = formatArchiveDate(entry?.sharedOn || "");
  const writtenBy = escapeHtml(entry?.writtenBy || "Unknown");
  const sharedBy = escapeHtml(entry?.sharedBy || entry?.writtenBy || "Unknown");
  const fullText = typeof entry?.fullText === "string" ? entry.fullText.trim() : "";
  const excerpt = typeof entry?.excerpt === "string" ? entry.excerpt.trim() : "";
  const bodyText = fullText || excerpt || "Dvar Torah text coming soon.";
  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, "<br>");
  const detailsLabel = fullText ? "Read full text" : "Read summary";

  return `
    <article class="past-dvar-item">
      ${sharedDate ? `<div class="past-dvar-item-tags"><span class="past-dvar-tag past-dvar-tag-date">${escapeHtml(sharedDate)}</span></div>` : ""}
      <h4 class="past-dvar-item-title">${title}</h4>
      <div class="past-dvar-item-meta">
        <span class="past-dvar-meta-pill"><strong>Written by:</strong> ${writtenBy}</span>
        <span class="past-dvar-meta-pill"><strong>Shared by:</strong> ${sharedBy}</span>
      </div>
      <details class="past-dvar-entry-details">
        <summary class="past-dvar-entry-summary">${detailsLabel}</summary>
        <div class="past-dvar-item-copy">${bodyHtml}</div>
      </details>
    </article>
  `;
}

function renderPastWeeklyDvarTorahs(entries = []) {
  const listContainer = document.getElementById("past-dvar-list");
  const countBadge = document.getElementById("past-dvar-count");
  if (!listContainer) return;

  if (!Array.isArray(entries) || !entries.length) {
    listContainer.innerHTML = '<div class="past-dvar-empty">No past weekly dvar Torahs are available yet.</div>';
    if (countBadge) countBadge.textContent = "0 entries";
    return;
  }

  const groupedEntries = groupArchiveEntriesByParsha(entries);
  const html = groupedEntries.map((group, index) => {
    const groupTitle = escapeHtml(getParshaGroupLabel(group.parsha));
    const responseCount = group.entries.length;
    const responseLabel = responseCount === 1 ? "response" : "responses";
    const firstDateLabel = formatArchiveDate(group.firstDate);
    const lastDateLabel = formatArchiveDate(group.lastDate);
    const dateLabel = firstDateLabel && lastDateLabel
      ? (firstDateLabel === lastDateLabel ? firstDateLabel : `${firstDateLabel} - ${lastDateLabel}`)
      : "";
    const entriesHtml = group.entries.map(renderPastDvarEntry).join("");

    return `
      <details class="past-dvar-parsha-group" ${index === 0 ? "open" : ""}>
        <summary class="past-dvar-parsha-summary">
          <span class="past-dvar-parsha-title">${groupTitle}</span>
          <span class="past-dvar-parsha-meta">
            ${responseCount} ${responseLabel}${dateLabel ? ` • ${escapeHtml(dateLabel)}` : ""}
          </span>
        </summary>
        <div class="past-dvar-parsha-content">
          ${entriesHtml}
        </div>
      </details>
    `;
  });

  listContainer.innerHTML = html.join("");
  if (countBadge) {
    countBadge.textContent = `${groupedEntries.length} parshiyot`;
  }
}

async function loadPastWeeklyDvarTorahs() {
  const listContainer = document.getElementById("past-dvar-list");
  const countBadge = document.getElementById("past-dvar-count");
  if (!listContainer) return;

  try {
    const archiveResponse = await fetch(DVAR_ARCHIVE_URL);
    if (!archiveResponse.ok) {
      throw new Error("Failed to load dvar Torah archive");
    }

    const archiveData = await archiveResponse.json();
    const entries = Array.isArray(archiveData?.entries) ? archiveData.entries.slice() : [];
    renderPastWeeklyDvarTorahs(entries);
  } catch (error) {
    if (countBadge) countBadge.textContent = "Unavailable";
    listContainer.innerHTML = '<div class="past-dvar-empty">Past weekly dvar Torahs are unavailable right now.</div>';
  }
}

function loadAppleMusicEmbed() {
  const placeholder = document.getElementById("apple-music-placeholder");
  const container = document.getElementById("apple-music-embed");
  if (!placeholder || !container) return;

  function doLoad() {
    const iframe = document.createElement("iframe");
    iframe.allow = "autoplay *; encrypted-media *;";
    iframe.frameBorder = "0";
    iframe.height = "450";
    iframe.style.cssText = "width:100%;max-width:100%;overflow:hidden;border-radius:12px;";
    iframe.sandbox = "allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation";
    iframe.src = "https://embed.music.apple.com/us/playlist/%D7%9E%D7%95%D7%93%D7%94-%D7%90%D7%A0%D7%99/pl.u-WabZzV3sWGPPN4";
    placeholder.remove();
    container.appendChild(iframe);
  }

  placeholder.addEventListener("click", doLoad);
  placeholder.addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doLoad(); }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadEntries();
  loadPastWeeklyDvarTorahs();
  loadAppleMusicEmbed();
});
