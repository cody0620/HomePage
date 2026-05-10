const ARTWORKS_URLS = [
  new URL('artworks/artworks.json', document.baseURI).href,
  new URL('public/artworks/artworks.json', document.baseURI).href
];
const STORAGE_KEY = 'homepage.artwork.shibaMode.v1';

let shibaMode = readShibaMode();
let artworkAssetBase = new URL('artworks/', document.baseURI).href;

function getDayIndex(length) {
  const now = new Date();
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Math.floor(localDate.getTime() / 86400000);
  return ((day % length) + length) % length;
}

function clean(value) {
  return value || 'Unknown';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

export async function renderDailyArtwork(card, settings) {
  if (settings.art && !settings.art.show) {
    card.innerHTML = '';
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  card.innerHTML = '<div class="card-loading">Loading daily artwork...</div>';

  try {
    const artworks = await loadArtworks();
    if (!Array.isArray(artworks) || artworks.length === 0) {
      throw new Error('empty artwork list');
    }

    const artwork = artworks[getDayIndex(artworks.length)];
    const displayImage = shibaMode && artwork.shibaImage ? artwork.shibaImage : artwork.image;
    const title = escapeHtml(clean(artwork.title));
    const alt = escapeHtml(artwork.alt || artwork.title);
    const image = escapeHtml(resolveArtworkAsset(displayImage));
    const sourceUrl = escapeHtml(artwork.sourceUrl);

    card.classList.toggle('shiba-mode', shibaMode && !!artwork.shibaImage);
    card.dataset.hasShibaVariant = artwork.shibaImage ? 'true' : 'false';
    card.innerHTML = `
      <a class="artwork-link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">
        <figure class="artwork-figure">
          <img src="${image}" alt="${alt}" loading="lazy" />
          <figcaption class="artwork-caption">
            <strong>${title}</strong>
          </figcaption>
        </figure>
      </a>
    `;
  } catch (error) {
    console.warn('Daily artwork failed to load.', error);
    card.innerHTML = '<div class="card-loading">Daily artwork is unavailable.</div>';
  }
}

async function loadArtworks() {
  let lastError = null;

  for (const url of ARTWORKS_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`artworks not found: ${url}`);
      artworkAssetBase = new URL('.', url).href;
      const artworks = await response.json();
      if (!Array.isArray(artworks) || artworks.length === 0) {
        throw new Error('empty artwork list');
      }
      return artworks;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('artworks not found');
}

function resolveArtworkAsset(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const relativePath = path.replace(/^\/?artworks\//, '');
  return new URL(relativePath.replace(/^\//, ''), artworkAssetBase).href;
}

export function toggleDailyArtworkShibaMode(card, settings) {
  shibaMode = !shibaMode;
  localStorage.setItem(STORAGE_KEY, shibaMode ? '1' : '0');
  renderDailyArtwork(card, settings);
}

function readShibaMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
