import { loadSettings, saveSettings, applyAppearance, buildSettingsUI } from './settings.js';
import { createStars } from './stars.js';
import { renderWeather } from './weather.js';
import { renderDailyArtwork, toggleDailyArtworkShibaMode } from './artwork.js';
import { initPet } from './pet.js';

let renderStocks = null;
async function loadStocks() {
  if (renderStocks) return renderStocks;
  try {
    const m = await import('./stocks.js');
    renderStocks = m.renderStocks;
  } catch (e) {
    console.warn('Stock module failed to load. It requires npm install and Vite bundling:', e);
    renderStocks = (card) => {
      card.innerHTML = '<div class="card-loading">The stock module requires npm run dev or build.</div>';
    };
  }
  return renderStocks;
}

const ENGINES = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q='
};

const TOP_SHORTCUTS = [
  {
    key: 'gemini',
    title: 'Gemini',
    url: 'https://gemini.google.com/',
    icon: 'icons/Gemini.png'
  },
  {
    key: 'logo',
    title: 'FCU iLearn',
    getUrl: (settings) => settings.topActions.logoUrl,
    icon: 'icons/LOGO.png'
  },
  {
    key: 'gmail',
    title: 'Gmail',
    url: 'https://mail.google.com/',
    icon: 'icons/Gmail.png'
  },
  {
    key: 'maps',
    title: 'Google Maps',
    url: 'https://maps.google.com/',
    icon: 'icons/GoogleMap.png'
  },
  {
    key: 'notebooklm',
    title: 'NotebookLM',
    url: 'https://notebooklm.google.com/',
    icon: 'icons/GoogleNoteBookLM.png'
  }
];

const state = loadSettings();
applyAppearance(state);

const starsCanvas = document.getElementById('stars-canvas');
const starCtl = createStars(starsCanvas, () => state);

renderQuickLinks();
renderTopShortcuts();
renderSearch();
renderWeather(document.getElementById('weather-card'), state);
renderDailyArtwork(document.getElementById('artwork-card'), state);
initPet().catch((error) => console.warn('Shiba pet failed to start.', error));

window.addEventListener('artwork:toggle-shiba', () => {
  toggleDailyArtworkShibaMode(document.getElementById('artwork-card'), state);
});

// settings panel
const panel = document.getElementById('settings-panel');
document.getElementById('settings-btn').addEventListener('click', () => panel.classList.add('open'));
document.getElementById('settings-close').addEventListener('click', () => panel.classList.remove('open'));

buildSettingsUI(state, (s, scope) => {
  applyAppearance(s);
  if (scope === 'bg') starCtl.rebuild();
  if (scope === 'links') renderQuickLinks();
  if (scope === 'topActions') renderTopShortcuts();
  if (scope === 'search') renderSearch();
  if (scope === 'weather') renderWeather(document.getElementById('weather-card'), s);
  if (scope === 'art') renderDailyArtwork(document.getElementById('artwork-card'), s);
});

function renderSearch() {
  const section = document.querySelector('.search-section');
  section.style.display = state.search.show ? '' : 'none';
  const form = document.getElementById('search-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const base = ENGINES[state.search.engine] || ENGINES.google;
    window.location.href = base + encodeURIComponent(q);
  };
}

function renderQuickLinks() {
  const wrap = document.getElementById('quick-links');
  wrap.innerHTML = '';
  state.links.items.forEach((item) => {
    const a = document.createElement('a');
    a.className = 'link-tile';
    a.href = item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    let host = '';
    try { host = new URL(item.url).hostname; } catch {}
    const img = document.createElement('img');
    img.src = getLinkIconUrl(item, host, 64);
    img.alt = '';
    img.onerror = () => { img.style.display = 'none'; };
    const span = document.createElement('span');
    span.textContent = item.name;
    a.appendChild(img);
    a.appendChild(span);
    wrap.appendChild(a);
  });
}

function getLinkIconUrl(item, host, size) {
  if (item.icon) return item.icon;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

function renderTopShortcuts() {
  const wrap = document.querySelector('.google-shortcuts');
  if (!wrap) return;

  wrap.innerHTML = '';
  TOP_SHORTCUTS.forEach((item) => {
    const a = document.createElement('a');
    a.className = `circle-shortcut glass shortcut-${item.key}`;
    a.href = item.getUrl ? normalizeUrl(item.getUrl(state)) : item.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = item.title;
    a.setAttribute('aria-label', item.title);

    const img = document.createElement('img');
    img.src = new URL(item.icon, window.location.href).href;
    img.alt = '';
    a.appendChild(img);
    wrap.appendChild(a);
  });
}

function normalizeUrl(value) {
  const fallback = 'https://ilearn.fcu.edu.tw/';
  const raw = (value || fallback).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).href;
  } catch {
    return fallback;
  }
}
