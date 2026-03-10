// prayers.js - renders the Important Prayers/Readings page using structured data

const TEXT_SECTIONS = [
  { key: "english", title: "English", className: "english-section" },
  { key: "hebrew", title: "Hebrew", className: "hebrew-section" },
  { key: "transliteration", title: "Transliteration", className: "transliteration-section" }
];

const LANGUAGE_VIEWS = [
  { key: "english", label: "English" },
  { key: "hebrew", label: "Hebrew" },
  { key: "both", label: "Both" },
  { key: "transliteration", label: "Transliteration" }
];

const RAW_PRAYER_DATA = typeof window !== "undefined" ? window.PRAYER_DATA : [];
const RAW_CATEGORY_DATA = typeof window !== "undefined" ? window.PRAYER_CATEGORIES : [];
const DEFAULT_DATA = Array.isArray(RAW_PRAYER_DATA) ? [...RAW_PRAYER_DATA] : [];
const CATEGORY_DATA = Array.isArray(RAW_CATEGORY_DATA) ? [...RAW_CATEGORY_DATA] : [];
const PRAYER_MAP = DEFAULT_DATA.reduce((map, entry) => map.set(entry.id, entry), new Map());
const CATEGORY_TITLE_MAP = CATEGORY_DATA.reduce((map, category) => map.set(category.id, category.title), new Map());

let allPrayers = [];
let currentPrayers = [];
let currentLanguageView = "both";
let filterState = { query: "", category: "" };

function formatParagraph(text = "") {
  return text.split("\n").join("<br>");
}

function titleCase(value = "") {
  return value
    .toLowerCase()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCategoryLabel(value = "") {
  if (!value) return "";
  return CATEGORY_TITLE_MAP.get(value) || titleCase(value);
}

function matchesQuery(prayer, query = "") {
  if (!query) {
    return true;
  }
  const haystack = [
    prayer.title,
    prayer.label,
    prayer.summary,
    prayer.english,
    prayer.hebrew,
    prayer.transliteration,
    prayer.details?.significance,
    prayer.details?.when,
    formatCategoryLabel(prayer.category)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function buildPrayerSection(prayer) {
  const summary = prayer.summary ? `<p class="prayer-summary">${prayer.summary}</p>` : "";
  return `
        <details id="${prayer.id}" class="prayer-section" data-prayer-id="${prayer.id}" data-language-view="${currentLanguageView}">
            <summary class="prayer-header">
                <div class="prayer-header-main">
                    <div class="prayer-title"><span class="prayer-index">${prayer.order}.</span> ${prayer.title}</div>
                    ${buildPrayerMeta(prayer)}
                    ${summary}
                </div>
                <span class="prayer-toggle-indicator">
                    <span class="prayer-toggle-text">Read</span>
                    <svg class="prayer-toggle-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0l-4.25-4.53a.75.75 0 01.02-1.06z" clip-rule="evenodd"></path>
                    </svg>
                </span>
            </summary>
            <div class="prayer-body">
                ${buildPrayerDetails(prayer)}
                ${buildLanguageSwitcher(prayer)}
                <div class="prayer-content">
                    ${TEXT_SECTIONS.map(section => buildTextBlock(prayer, section)).join("")}
                </div>
            </div>
        </details>
    `;
}

function buildPrayerMeta(prayer) {
  const label = formatCategoryLabel(prayer.category);
  if (!label) return "";
  return `<div class="prayer-meta"><span class="category-chip">${label}</span></div>`;
}

function buildPrayerDetails(prayer) {
  const details = prayer.details || {};
  const items = [
    details.significance
      ? `<div class="detail-item"><span class="detail-label">Significance</span><p>${details.significance}</p></div>`
      : "",
    details.when ? `<div class="detail-item"><span class="detail-label">When</span><p>${details.when}</p></div>` : ""
  ].filter(Boolean);

  if (!items.length) {
    return "";
  }

  return `<div class="prayer-details">${items.join("")}</div>`;
}

function buildLanguageSwitcher(prayer) {
  const label = `Choose text view for ${prayer.title}`;
  const buttons = LANGUAGE_VIEWS.map(view => {
    const isActive = view.key === currentLanguageView;
    return `
            <button type="button" class="language-tab${isActive ? " active" : ""}" data-language-view="${view.key}" role="tab" aria-selected="${isActive}">
                ${view.label}
            </button>
        `;
  }).join("");

  return `
        <div class="language-switcher" role="tablist" aria-label="${label}">
            ${buttons}
        </div>
    `;
}

function buildTextBlock(prayer, section) {
  const content = prayer[section.key];
  if (!content) {
    return "";
  }
  return `
        <div class="text-section ${section.className}" data-language-block="${section.key}">
            <div class="section-title">${section.title}</div>
            <div class="section-text">${formatParagraph(content)}</div>
        </div>
    `;
}

function renderPrayerSections(prayers) {
  const container = document.getElementById("prayers-container");
  if (!container) return;

  if (!prayers.length) {
    container.innerHTML = buildEmptyState();
    return;
  }

  const html = prayers.map(buildPrayerSection).join("\n");
  container.innerHTML = html;
  syncPrayerLanguageViews();
}

function buildEmptyState() {
  return `
        <div class="empty-state">
            <h4 class="empty-title">No prayers match yet</h4>
            <p class="empty-copy">Try a different keyword or reset your filters to see everything again.</p>
            <button type="button" class="reset-button ghost" data-reset-filters>Reset filters</button>
        </div>
    `;
}

function applyLanguageView(section, view) {
  if (!section) return;
  section.setAttribute("data-language-view", view);
  const tabs = section.querySelectorAll(".language-tab");
  tabs.forEach(tab => {
    const isActive = tab.getAttribute("data-language-view") === view;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });
}

function syncPrayerLanguageViews() {
  const sections = document.querySelectorAll(".prayer-section");
  sections.forEach(section => {
    applyLanguageView(section, currentLanguageView);
  });
}

function expandPrayerSection(target) {
  if (!target) return;
  const section = target.matches(".prayer-section") ? target : target.closest(".prayer-section");
  if (!section) return;
  if (section.tagName.toLowerCase() === "details") {
    section.open = true;
  }
  applyLanguageView(section, currentLanguageView);
}

function renderCategoryNav(categories) {
  const target = document.getElementById("category-nav");
  if (!target) return;

  const items = [
    {
      id: "",
      title: "All Prayers",
      description: "Show every prayer in the directory."
    },
    ...categories.map(category => ({
      id: category.id,
      title: category.title,
      description: category.description || ""
    }))
  ];

  target.innerHTML = items
    .map(
      item => `
            <button type="button" class="category-nav-item" data-category-value="${item.id}">
                <span class="category-nav-title">${item.title}</span>
                ${item.description ? `<span class="category-nav-desc">${item.description}</span>` : ""}
            </button>
        `
    )
    .join("\n");

  syncCategoryNav();
}

function renderPrayerDirectory(prayers) {
  const directory = document.getElementById("prayer-directory");
  if (!directory) return;

  if (!prayers.length) {
    directory.innerHTML = `<p class="directory-empty">No entries match your current filters.</p>`;
    return;
  }

  const links = prayers
    .map(
      prayer =>
        `<a href="#${prayer.id}" class="directory-link"><span class="directory-index">${prayer.order}.</span> ${
          prayer.label || prayer.title
        }</a>`
    )
    .join("\n");

  directory.innerHTML = links;
}

function updateResultCount(count) {
  const label = document.getElementById("prayer-count");
  if (!label) return;
  label.textContent = count === 1 ? "Showing 1 prayer" : `Showing ${count} prayers`;
}

function syncCategoryNav() {
  const nav = document.getElementById("category-nav");
  if (!nav) return;
  const buttons = nav.querySelectorAll("[data-category-value]");
  buttons.forEach(button => {
    const value = button.getAttribute("data-category-value") || "";
    const isActive = value === (filterState.category || "");
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
}

function populateCategoryFilter(prayers, selectElement) {
  if (!selectElement) return;
  const categories = getUniqueCategories(prayers)
    .map(value => ({ value, label: formatCategoryLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.value;
    option.textContent = category.label;
    selectElement.appendChild(option);
  });
}

function getUniqueCategories(prayers) {
  return Array.from(new Set(prayers.map(prayer => prayer.category).filter(Boolean)));
}

function setupBackToTop() {
  const backToTop = document.getElementById("back-to-top");
  if (!backToTop) return;

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  });

  backToTop.addEventListener("click", event => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupSmoothScroll() {
  document.addEventListener("click", event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    expandPrayerSection(target);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupPrayerInteractions() {
  const container = document.getElementById("prayers-container");
  if (!container || container.dataset.bound === "true") return;
  container.dataset.bound = "true";

  container.addEventListener("click", event => {
    const header = event.target.closest(".prayer-header");
    if (header) {
      const section = header.closest(".prayer-section");
      if (section) {
        requestAnimationFrame(() => {
          if (section.open) {
            applyLanguageView(section, currentLanguageView);
          }
        });
      }
    }

    const tab = event.target.closest(".language-tab");
    if (!tab) return;
    const section = tab.closest(".prayer-section");
    if (!section) return;
    const view = tab.getAttribute("data-language-view");
    if (!view) return;
    currentLanguageView = view;
    applyLanguageView(section, view);
  });
}

function setupNavigationHub() {
  const hub = document.getElementById("navigation-hub");
  if (!hub) return;
  const tabs = hub.querySelectorAll("[data-hub-tab]");

  const setView = view => {
    hub.setAttribute("data-hub-view", view);
    tabs.forEach(tab => {
      const isActive = tab.getAttribute("data-hub-tab") === view;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive);
    });
  };

  if (tabs.length) {
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.getAttribute("data-hub-tab");
        if (!view) return;
        setView(view);
      });
    });
    setView("categories");
  }

  const nav = hub.querySelector("#category-nav");
  if (nav && nav.dataset.bound !== "true") {
    nav.dataset.bound = "true";
    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-category-value]");
      if (!button) return;
      setCategoryFilter(button.getAttribute("data-category-value") || "");
    });
  }
}

function setupResetFilters(handler) {
  if (typeof handler !== "function") return;
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-reset-filters]");
    if (!trigger) return;
    event.preventDefault();
    handler();
  });
}

function applyFilters(prayers = allPrayers) {
  const filtered = prayers.filter(prayer => {
    if (filterState.category && prayer.category !== filterState.category) {
      return false;
    }
    return matchesQuery(prayer, filterState.query);
  });
  refreshPrayers(filtered);
  syncCategoryNav();
}

function setCategoryFilter(value = "") {
  filterState.category = value;
  const categorySelect = document.getElementById("prayer-category");
  if (categorySelect && categorySelect.value !== value) {
    categorySelect.value = value;
  }
  applyFilters();
}

function resetFilters() {
  filterState.query = "";
  filterState.category = "";
  const searchInput = document.getElementById("prayer-search");
  const categorySelect = document.getElementById("prayer-category");
  if (searchInput) searchInput.value = "";
  if (categorySelect) categorySelect.value = "";
  hideAutocomplete();
  applyFilters();
}

let autocompleteSelectedIndex = -1;

function showAutocomplete(matches) {
  const autocomplete = document.getElementById("prayer-autocomplete");
  if (!autocomplete) return;

  if (!matches || matches.length === 0) {
    autocomplete.classList.add("hidden");
    return;
  }

  const html = matches.slice(0, 8).map((prayer, index) => `
    <div class="autocomplete-item" data-prayer-id="${prayer.id}" data-index="${index}">
      <div class="autocomplete-item-title">${prayer.title}</div>
      <div class="autocomplete-item-category">${formatCategoryLabel(prayer.category)}</div>
    </div>
  `).join("");

  autocomplete.innerHTML = html;
  autocomplete.classList.remove("hidden");
  autocompleteSelectedIndex = -1;

  // Add click handlers
  autocomplete.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
      const prayerId = item.getAttribute("data-prayer-id");
      selectPrayerFromAutocomplete(prayerId);
    });
  });
}

function hideAutocomplete() {
  const autocomplete = document.getElementById("prayer-autocomplete");
  if (autocomplete) {
    autocomplete.classList.add("hidden");
    autocompleteSelectedIndex = -1;
  }
}

function selectPrayerFromAutocomplete(prayerId) {
  hideAutocomplete();
  const searchInput = document.getElementById("prayer-search");
  if (searchInput) {
    const prayer = PRAYER_MAP.get(prayerId);
    if (prayer) {
      searchInput.value = prayer.title;
      filterState.query = prayer.title.toLowerCase();
      applyFilters();
      // Scroll to and expand the prayer
      setTimeout(() => {
        const target = document.getElementById(prayerId);
        if (target) {
          expandPrayerSection(target);
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }
}

function handleAutocompleteKeyboard(event) {
  const autocomplete = document.getElementById("prayer-autocomplete");
  if (!autocomplete || autocomplete.classList.contains("hidden")) return;

  const items = autocomplete.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, items.length - 1);
    updateAutocompleteSelection(items);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, -1);
    updateAutocompleteSelection(items);
  } else if (event.key === "Enter" && autocompleteSelectedIndex >= 0) {
    event.preventDefault();
    const selectedItem = items[autocompleteSelectedIndex];
    if (selectedItem) {
      const prayerId = selectedItem.getAttribute("data-prayer-id");
      selectPrayerFromAutocomplete(prayerId);
    }
  } else if (event.key === "Escape") {
    hideAutocomplete();
  }
}

function updateAutocompleteSelection(items) {
  items.forEach((item, index) => {
    if (index === autocompleteSelectedIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

function setupPrayerFinder(prayers) {
  const searchInput = document.getElementById("prayer-search");
  const categorySelect = document.getElementById("prayer-category");

  populateCategoryFilter(prayers, categorySelect);

  if (searchInput) {
    searchInput.addEventListener("input", event => {
      const query = (event.target.value || "").trim();
      filterState.query = query.toLowerCase();

      // Show autocomplete suggestions
      if (query.length >= 2) {
        const matches = prayers.filter(prayer => matchesQuery(prayer, filterState.query));
        showAutocomplete(matches);
      } else {
        hideAutocomplete();
      }

      applyFilters();
    });

    searchInput.addEventListener("keydown", handleAutocompleteKeyboard);

    searchInput.addEventListener("blur", () => {
      // Delay hiding to allow click events on autocomplete items
      setTimeout(() => hideAutocomplete(), 200);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", event => {
      setCategoryFilter(event.target.value);
    });
  }

  setupResetFilters(() => resetFilters());
}

function refreshPrayers(prayers) {
  currentPrayers = [...prayers];
  renderPrayerDirectory(currentPrayers);
  renderPrayerSections(currentPrayers);
  updateResultCount(currentPrayers.length);
  updatePrayerContainerPosition();
}

function updatePrayerContainerPosition() {
  // Use a CSS class to visually reorder content instead of moving DOM elements,
  // which breaks mobile layout and container logic.
  const main = document.querySelector("main.container");
  if (!main) return;
  const isSearching = filterState.query || filterState.category;
  main.classList.toggle("prayers-searching", isSearching);
}

function initializePrayersPage() {
  if (!DEFAULT_DATA.length) return;
  allPrayers = [...DEFAULT_DATA].sort((a, b) => (a.order || 0) - (b.order || 0));
  currentPrayers = [...allPrayers];

  renderCategoryNav(CATEGORY_DATA);
  refreshPrayers(currentPrayers);
  setupBackToTop();
  setupSmoothScroll();
  setupPrayerFinder(allPrayers);
  setupPrayerInteractions();
  setupNavigationHub();

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) expandPrayerSection(target);
  }

  // Light usability: focus search on first load if present
  const searchInput = document.getElementById('prayer-search');
  if (searchInput) {
    // Defer focus to avoid layout shift
    setTimeout(() => {
      try { searchInput.focus({ preventScroll: true }); } catch (_) {}
    }, 50);
  }
}

document.addEventListener("DOMContentLoaded", initializePrayersPage);
