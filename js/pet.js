const PET_BASE_URL = new URL(`${import.meta.env.BASE_URL}pets/shiba/`, window.location.href);
const PET_JSON_URL = new URL('pet.json', PET_BASE_URL);
const STORAGE_KEY = 'homepage.pet.shiba.position.v1';

const DEFAULT_ATLAS = {
  columns: 8,
  rows: 9,
  cellWidth: 192,
  cellHeight: 208,
  animations: {
    idle: { row: 0, columns: [0, 1, 2, 3, 4, 5], durations: [280, 110, 110, 140, 140, 320] },
    'running-right': { row: 1, columns: [0, 1, 2, 3, 4, 5, 6, 7], durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    'running-left': { row: 2, columns: [0, 1, 2, 3, 4, 5, 6, 7], durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    waving: { row: 3, columns: [0, 1, 2, 3], durations: [140, 140, 140, 280] },
    jumping: { row: 4, columns: [0, 1, 2, 3, 4], durations: [140, 140, 140, 140, 280] },
    failed: { row: 5, columns: [0, 1, 2, 3, 4, 5, 6, 7], durations: [140, 140, 140, 140, 140, 140, 140, 240] },
    waiting: { row: 6, columns: [0, 1, 2, 3, 4, 5], durations: [150, 150, 150, 150, 150, 260] },
    running: { row: 7, columns: [0, 1, 2, 3, 4, 5], durations: [120, 120, 120, 120, 120, 220] },
    review: { row: 8, columns: [0, 1, 2, 3, 4, 5], durations: [150, 150, 150, 150, 150, 280] }
  }
};

export async function initPet() {
  const pet = await loadPetConfig();
  const spriteUrl = new URL(pet.spritesheetPath || 'spritesheet.webp', PET_JSON_URL).href;
  const image = await loadImage(spriteUrl);
  const atlas = normalizeAtlas(pet, image);

  const root = document.createElement('div');
  root.className = 'site-pet';
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', pet.displayName || 'Shiba');
  root.tabIndex = 0;

  const sprite = document.createElement('div');
  sprite.className = 'site-pet-sprite';
  sprite.style.backgroundImage = `url("${spriteUrl.replace(/"/g, '\\"')}")`;
  root.appendChild(sprite);
  document.body.appendChild(root);

  const player = createPlayer(root, sprite, atlas);
  const dragger = createDragger(root, player, atlas.animations);

  player.play('idle');
  requestAnimationFrame(() => {
    dragger.restorePosition();
    player.resize();
  });

  window.addEventListener('resize', () => {
    dragger.clampToViewport();
    player.resize();
  });
}

async function loadPetConfig() {
  try {
    const response = await fetch(PET_JSON_URL);
    if (!response.ok) throw new Error(`Unable to load ${PET_JSON_URL}`);
    return await response.json();
  } catch (error) {
    console.warn('Shiba pet config could not be loaded; using defaults.', error);
    return {
      id: 'shiba',
      displayName: 'Shiba',
      spritesheetPath: 'spritesheet.webp'
    };
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function normalizeAtlas(pet, image) {
  const atlas = pet.atlas || pet.spritesheet || {};
  const cell = pet.cell || pet.frame || atlas.cell || {};
  const columns = numberFrom(atlas.columns, pet.columns, pet.cols, DEFAULT_ATLAS.columns);
  const rows = numberFrom(atlas.rows, pet.rows, DEFAULT_ATLAS.rows);
  const cellWidth = numberFrom(cell.width, pet.cellWidth, pet.frameWidth, image.naturalWidth / columns, DEFAULT_ATLAS.cellWidth);
  const cellHeight = numberFrom(cell.height, pet.cellHeight, pet.frameHeight, image.naturalHeight / rows, DEFAULT_ATLAS.cellHeight);

  const animations = {};
  for (const [name, fallback] of Object.entries(DEFAULT_ATLAS.animations)) {
    animations[name] = normalizeAnimation(name, pet, fallback);
  }

  if (!animations.moving) animations.moving = animations.running || animations['running-right'];

  return {
    columns,
    rows,
    cellWidth,
    cellHeight,
    animations
  };
}

function normalizeAnimation(name, pet, fallback) {
  const source = pet.animations || pet.states || {};
  const raw = source[name] || source[name.replaceAll('-', '_')] || {};
  const row = numberFrom(raw.row, raw.frameRow, raw.y, fallback.row);
  const columns = normalizeColumns(raw.frames ?? raw.columns ?? raw.usedColumns, fallback.columns);
  const durations = normalizeDurations(raw.durations ?? raw.frameDurations, fallback.durations, columns.length);

  return { row, columns, durations };
}

function normalizeColumns(value, fallback) {
  if (Array.isArray(value)) {
    return value.map((frame, index) => {
      if (typeof frame === 'number') return frame;
      return numberFrom(frame.column, frame.col, frame.x, index);
    });
  }

  if (typeof value === 'number') {
    return Array.from({ length: value }, (_, index) => index);
  }

  if (typeof value === 'string') {
    const range = value.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = parseInt(range[1], 10);
      const end = parseInt(range[2], 10);
      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }
  }

  return fallback;
}

function normalizeDurations(value, fallback, frameCount) {
  if (Array.isArray(value) && value.length) {
    return Array.from({ length: frameCount }, (_, index) => numberFrom(value[index], value[value.length - 1], fallback[index], 140));
  }

  if (typeof value === 'number') {
    return Array.from({ length: frameCount }, () => value);
  }

  return fallback;
}

function numberFrom(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function createPlayer(root, sprite, atlas) {
  let active = atlas.animations.idle;
  let activeName = 'idle';
  let frameIndex = 0;
  let frameStarted = 0;
  let frameWidth = atlas.cellWidth;
  let frameHeight = atlas.cellHeight;

  const resize = () => {
    const rect = root.getBoundingClientRect();
    frameWidth = rect.width || atlas.cellWidth;
    frameHeight = rect.height || atlas.cellHeight;
    sprite.style.backgroundSize = `${frameWidth * atlas.columns}px ${frameHeight * atlas.rows}px`;
    paint();
  };

  const paint = () => {
    const column = active.columns[frameIndex] || 0;
    sprite.style.backgroundPosition = `${-column * frameWidth}px ${-active.row * frameHeight}px`;
  };

  const tick = (now) => {
    if (!frameStarted) frameStarted = now;
    const duration = active.durations[frameIndex] || active.durations[active.durations.length - 1] || 140;

    if (now - frameStarted >= duration) {
      frameIndex = (frameIndex + 1) % active.columns.length;
      frameStarted = now;
      paint();
    }

    requestAnimationFrame(tick);
  };

  const play = (name) => {
    const next = atlas.animations[name] || atlas.animations.idle;
    if (activeName === name && active === next) return;
    active = next;
    activeName = name;
    frameIndex = 0;
    frameStarted = 0;
    root.dataset.petState = name;
    paint();
  };

  resize();
  requestAnimationFrame(tick);

  return { play, resize };
}

function createDragger(root, player, animations) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let lastClientX = 0;
  let activeDropTarget = null;

  const setPosition = (x, y) => {
    const rect = root.getBoundingClientRect();
    const next = clampPosition(x, y, rect.width, rect.height);
    root.style.left = `${next.x}px`;
    root.style.top = `${next.y}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  };

  const savePosition = () => {
    const rect = root.getBoundingClientRect();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
  };

  const restorePosition = () => {
    const rect = root.getBoundingClientRect();
    const saved = readSavedPosition();
    const fallbackX = window.innerWidth - rect.width - 22;
    const fallbackY = window.innerHeight - rect.height - 18;
    setPosition(saved?.x ?? fallbackX, saved?.y ?? fallbackY);
  };

  const clampToViewport = () => {
    const rect = root.getBoundingClientRect();
    setPosition(rect.left, rect.top);
    savePosition();
  };

  const setDropTarget = (target) => {
    if (activeDropTarget === target) return;
    if (activeDropTarget) activeDropTarget.classList.remove('pet-drop-target');
    activeDropTarget = target;
    if (activeDropTarget) activeDropTarget.classList.add('pet-drop-target');
  };

  const findDropTarget = (clientX, clientY) => {
    const rect = root.getBoundingClientRect();
    const points = [
      [clientX, clientY],
      [rect.left + rect.width / 2, rect.top + rect.height / 2]
    ];

    for (const [x, y] of points) {
      const target = document
        .elementsFromPoint(x, y)
        .map((el) => el.closest?.('.link-tile, .artwork-card'))
        .find(Boolean);
      if (target) return target;
    }

    return null;
  };

  const openDropTarget = (target) => {
    if (target?.classList?.contains('artwork-card')) {
      window.dispatchEvent(new CustomEvent('artwork:toggle-shiba'));
      return;
    }

    const href = target?.href;
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  root.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = root.getBoundingClientRect();
    dragging = true;
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    lastClientX = event.clientX;
    root.classList.add('dragging');
    root.setPointerCapture(event.pointerId);
    player.play(animations.moving ? 'moving' : 'running');
    event.preventDefault();
  });

  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastClientX;
    lastClientX = event.clientX;
    setPosition(event.clientX - offsetX, event.clientY - offsetY);
    setDropTarget(findDropTarget(event.clientX, event.clientY));
    player.play(animationForDrag(dx, animations));
    event.preventDefault();
  });

  const stopDragging = (event) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('dragging');
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    const dropTarget = activeDropTarget || findDropTarget(event.clientX, event.clientY);
    setDropTarget(null);
    savePosition();
    player.play('idle');
    openDropTarget(dropTarget);
  };

  root.addEventListener('pointerup', stopDragging);
  root.addEventListener('pointercancel', stopDragging);

  return { restorePosition, clampToViewport };
}

function animationForDrag(dx, animations) {
  if (dx > 1 && animations['running-right']) return 'running-right';
  if (dx < -1 && animations['running-left']) return 'running-left';
  if (animations.moving) return 'moving';
  if (animations.running) return 'running';
  return 'idle';
}

function clampPosition(x, y, width, height) {
  const padding = 8;
  const maxX = Math.max(padding, window.innerWidth - width - padding);
  const maxY = Math.max(padding, window.innerHeight - height - padding);
  return {
    x: Math.min(Math.max(x, padding), maxX),
    y: Math.min(Math.max(y, padding), maxY)
  };
}

function readSavedPosition() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return value;
  } catch {
    return null;
  }
}
