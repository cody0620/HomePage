const ARTWORKS_URL = '/artworks/artworks.json';
const STORAGE_KEY = 'homepage.artwork.shibaMode.v1';

let shibaMode = readShibaMode();

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
    const response = await fetch(ARTWORKS_URL);
    if (!response.ok) throw new Error('artworks not found');

    const artworks = await response.json();
    if (!Array.isArray(artworks) || artworks.length === 0) {
      throw new Error('empty artwork list');
    }

    const artwork = artworks[getDayIndex(artworks.length)];
    const displayImage = shibaMode && artwork.shibaImage ? artwork.shibaImage : artwork.image;
    const title = escapeHtml(clean(artwork.title));
    const alt = escapeHtml(artwork.alt || artwork.title);
    const image = escapeHtml(displayImage);
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
