const STORAGE_KEY = 'homepage.settings.v1';
const LINK_DEFAULTS_VERSION = 2;
const LEGACY_DEFAULT_LINK_URLS = [
  'https://github.com',
  'https://youtube.com',
  'https://mail.google.com',
  'https://x.com',
  'https://reddit.com',
  'https://chat.openai.com'
];

export const DEFAULTS = {
  bg: {
    starDensity: 200,
    starBrightness: 1,
    starMaxSize: 1.6,
    meteorFrequency: 6,
    meteorLength: 220,
    meteorSpeed: 8,
    nebulaTheme: 'bluepurple'
  },
  search: {
    engine: 'google',
    width: 560,
    show: true
  },
  links: {
    items: [
      { name: 'AI Chat', url: 'https://ai-chat-mu-self.vercel.app/', icon: 'https://ai-chat-mu-self.vercel.app/favicon.png' },
      { name: 'Nanami Site', url: 'https://cody0620.github.io/Nanami-s-Site/', icon: 'https://cody0620.github.io/Nanami-s-Site/favicon.png' },
      { name: 'My FCU', url: 'https://myfcu.fcu.edu.tw/main/InfoMyFcuLogin.aspx#!/prog/home' },
      { name: 'YouTube', url: 'https://www.youtube.com/' },
      { name: 'Bilibili', url: 'https://www.bilibili.com/?spm_id_from=333.788.0.0' },
      { name: 'Google Earth', url: 'https://earth.google.com/web/@23.8922517,120.23230366,54.20412019a,1171503.89038101d,35y,-0h,0t,0r/data=CgRCAggBOgMKATBCAggASg0I____________ARAA?authuser=0' }
    ],
    perRow: 6,
    defaultsVersion: LINK_DEFAULTS_VERSION,
    edited: false
  },
  topActions: {
    logoUrl: 'https://ilearn.fcu.edu.tw/'
  },
  weather: {
    unit: 'C',
    showAQI: true,
    showUV: true,
    manualCity: ''
  },
  stocks: {
    symbols: ['^TWII', '2330.TW', 'BTC-USD'],
    defaultRange: 'D',
    show: true
  },
  art: {
    show: true
  },
  appearance: {
    blur: 16,
    cardAlpha: 0.06,
    borderAlpha: 0.27,
    fontSize: 16,
    theme: 'black'
  }
};

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      out[k] = deepMerge(a[k] || {}, b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    return migrateSettings(deepMerge(DEFAULTS, saved), saved);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function migrateSettings(settings, saved) {
  if (shouldRefreshDefaultLinks(settings.links, saved?.links)) {
    settings.links.items = structuredClone(DEFAULTS.links.items);
    settings.links.defaultsVersion = LINK_DEFAULTS_VERSION;
    settings.links.edited = false;
  }
  return settings;
}

function shouldRefreshDefaultLinks(links, savedLinks) {
  if (!links || links.edited) return false;
  if (savedLinks?.defaultsVersion === LINK_DEFAULTS_VERSION) return false;
  const currentUrls = DEFAULTS.links.items.map((item) => normalizeUrlForCompare(item.url));
  const existingUrls = (links.items || []).map((item) => normalizeUrlForCompare(item.url));
  const legacyUrls = LEGACY_DEFAULT_LINK_URLS.map(normalizeUrlForCompare);
  return sameUrls(existingUrls, currentUrls) || sameUrls(existingUrls, legacyUrls);
}

function normalizeUrlForCompare(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return String(value || '').replace(/\/$/, '');
  }
}

function sameUrls(a, b) {
  return a.length === b.length && a.every((url, index) => url === b[index]);
}

const listeners = new Set();
export function onSettingsChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emitSettingsChange(s, scope) { listeners.forEach((fn) => fn(s, scope)); }

export function applyAppearance(s) {
  const root = document.documentElement;
  root.style.setProperty('--card-blur', `${s.appearance.blur}px`);
  root.style.setProperty('--card-alpha', s.appearance.cardAlpha);
  root.style.setProperty('--border-alpha', s.appearance.borderAlpha);
  root.style.setProperty('--font-base', `${s.appearance.fontSize}px`);
  root.style.setProperty('--search-width', `${s.search.width}px`);
  root.style.setProperty('--links-per-row', s.links.perRow);

  document.body.classList.remove('theme-black', 'theme-deepblue', 'theme-deepforest', 'theme-pinkromance');
  if (s.appearance.theme === 'black') document.body.classList.add('theme-black');
  if (s.appearance.theme === 'deepblue') document.body.classList.add('theme-deepblue');
  if (s.appearance.theme === 'deepforest') document.body.classList.add('theme-deepforest');
  if (s.appearance.theme === 'pinkromance') document.body.classList.add('theme-pinkromance');

  const nebula = document.getElementById('nebula-layer');
  if (nebula) {
    nebula.className = 'nebula-layer theme-' + s.bg.nebulaTheme;
  }
}

export function buildSettingsUI(state, onChange) {
  const content = document.getElementById('settings-content');
  const tabs = document.querySelectorAll('.tab-btn');
  let currentTab = 'background';

  function render() {
    content.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'tab-page active';
    page.appendChild(buildPage(currentTab, state, (scope) => {
      saveSettings(state);
      applyAppearance(state);
      onChange(state, scope);
    }));
    content.appendChild(page);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      render();
    });
  });

  render();
}

function range(label, value, min, max, step, onInput) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-item';
  const lab = document.createElement('label');
  const val = document.createElement('span');
  val.className = 'range-value';
  val.textContent = value;
  lab.textContent = label;
  lab.appendChild(val);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.step = step; input.value = value;
  input.addEventListener('input', () => {
    val.textContent = input.value;
    onInput(parseFloat(input.value));
  });
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return wrap;
}

function toggle(label, checked, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-item toggle-switch';
  const lab = document.createElement('label');
  lab.textContent = label;
  lab.style.marginBottom = '0';
  const sw = document.createElement('label');
  sw.className = 'switch';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = !!checked;
  inp.addEventListener('change', () => onChange(inp.checked));
  const sl = document.createElement('span');
  sl.className = 'slider-toggle';
  sw.appendChild(inp); sw.appendChild(sl);
  wrap.appendChild(lab); wrap.appendChild(sw);
  return wrap;
}

function select(label, value, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-item';
  const lab = document.createElement('label');
  lab.textContent = label;
  const sel = document.createElement('select');
  options.forEach(([v, t]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = t;
    if (v === value) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.appendChild(lab); wrap.appendChild(sel);
  return wrap;
}

function textInput(label, value, placeholder, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-item';
  const lab = document.createElement('label');
  lab.textContent = label;
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = value || '';
  inp.placeholder = placeholder || '';
  inp.addEventListener('change', () => onChange(inp.value.trim()));
  wrap.appendChild(lab); wrap.appendChild(inp);
  return wrap;
}

function buildPage(tab, s, save) {
  const frag = document.createDocumentFragment();

  if (tab === 'background') {
    frag.appendChild(range('星星密度', s.bg.starDensity, 50, 500, 10, (v) => { s.bg.starDensity = v; save('bg'); }));
    frag.appendChild(range('星星亮度', s.bg.starBrightness, 0.2, 1, 0.05, (v) => { s.bg.starBrightness = v; save('bg'); }));
    frag.appendChild(range('星星大小上限', s.bg.starMaxSize, 0.5, 4, 0.1, (v) => { s.bg.starMaxSize = v; save('bg'); }));
    frag.appendChild(range('流星頻率（秒）', s.bg.meteorFrequency, 1, 20, 1, (v) => { s.bg.meteorFrequency = v; save('bg'); }));
    frag.appendChild(range('流星長度', s.bg.meteorLength, 80, 500, 10, (v) => { s.bg.meteorLength = v; save('bg'); }));
    frag.appendChild(range('流星速度', s.bg.meteorSpeed, 2, 20, 1, (v) => { s.bg.meteorSpeed = v; save('bg'); }));
    frag.appendChild(select('星雲色調', s.bg.nebulaTheme, [
      ['bluepurple', '藍紫'],
      ['cyan', '冷青'],
      ['warm', '暖橘'],
      ['off', '關閉']
    ], (v) => { s.bg.nebulaTheme = v; save('bg'); }));
  }

  if (tab === 'search') {
    frag.appendChild(select('預設搜尋引擎', s.search.engine, [
      ['google', 'Google'],
      ['bing', 'Bing'],
      ['duckduckgo', 'DuckDuckGo']
    ], (v) => { s.search.engine = v; save('search'); }));
    frag.appendChild(range('搜尋列寬度', s.search.width, 320, 900, 10, (v) => { s.search.width = v; save('search'); }));
    frag.appendChild(toggle('顯示搜尋列', s.search.show, (v) => { s.search.show = v; save('search'); }));
  }

  if (tab === 'links') {
    frag.appendChild(range('每行顯示幾個', s.links.perRow, 3, 8, 1, (v) => { s.links.perRow = v; save('links'); }));
    frag.appendChild(textInput('LOGO 按鈕網址', s.topActions.logoUrl, 'https://ilearn.fcu.edu.tw/', (v) => {
      let url = v || 'https://ilearn.fcu.edu.tw/';
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      try { new URL(url); } catch { url = 'https://ilearn.fcu.edu.tw/'; }
      s.topActions.logoUrl = url;
      save('topActions');
    }));

    const list = document.createElement('div');
    list.className = 'setting-item';
    const lab = document.createElement('label');
    lab.textContent = '連結（拖曳排序）';
    list.appendChild(lab);

    s.links.items.forEach((item, idx) => {
      const li = document.createElement('div');
      li.className = 'list-item';
      li.draggable = true;
      li.dataset.idx = idx;
      const img = document.createElement('img');
      img.src = item.icon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(item.url).hostname)}&sz=32`;
      img.onerror = () => { img.style.display = 'none'; };
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = `${item.name}`;
      name.title = item.url;
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        s.links.items.splice(idx, 1);
        s.links.edited = true;
        save('links');
      });
      li.appendChild(img); li.appendChild(name); li.appendChild(rm);

      li.addEventListener('dragstart', () => li.classList.add('dragging'));
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        const newOrder = [...list.querySelectorAll('.list-item')].map((el) => parseInt(el.dataset.idx));
        s.links.items = newOrder.map((i) => s.links.items[i]);
        s.links.edited = true;
        save('links');
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = list.querySelector('.dragging');
        if (!dragging || dragging === li) return;
        const rect = li.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        list.insertBefore(dragging, after ? li.nextSibling : li);
      });

      list.appendChild(li);
    });

    const addWrap = document.createElement('div');
    addWrap.className = 'row';
    addWrap.style.marginTop = '10px';
    const nameInp = document.createElement('input');
    nameInp.type = 'text'; nameInp.placeholder = '名稱';
    const urlInp = document.createElement('input');
    urlInp.type = 'text'; urlInp.placeholder = 'https://...';
    const addBtn = document.createElement('button');
    addBtn.textContent = '新增';
    addBtn.addEventListener('click', () => {
      let url = urlInp.value.trim();
      const nm = nameInp.value.trim();
      if (!url || !nm) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      try { new URL(url); } catch { return; }
      s.links.items.push({ name: nm, url });
      s.links.edited = true;
      save('links');
    });
    addWrap.appendChild(nameInp); addWrap.appendChild(urlInp); addWrap.appendChild(addBtn);
    list.appendChild(addWrap);

    frag.appendChild(list);
  }

  if (tab === 'weather') {
    frag.appendChild(select('溫度單位', s.weather.unit, [['C', '°C'], ['F', '°F']],
      (v) => { s.weather.unit = v; save('weather'); }));
    frag.appendChild(toggle('顯示空氣品質 (AQI)', s.weather.showAQI, (v) => { s.weather.showAQI = v; save('weather'); }));
    frag.appendChild(toggle('顯示紫外線指數', s.weather.showUV, (v) => { s.weather.showUV = v; save('weather'); }));
    frag.appendChild(textInput('手動指定城市', s.weather.manualCity, '留空則自動定位', (v) => { s.weather.manualCity = v; save('weather'); }));
  }

  if (tab === 'stocks') {
    frag.appendChild(toggle('顯示股市模組', s.stocks.show, (v) => { s.stocks.show = v; save('stocks'); }));
    frag.appendChild(select('預設範圍', s.stocks.defaultRange, [['D', '日線'], ['W', '週線']],
      (v) => { s.stocks.defaultRange = v; save('stocks'); }));

    const list = document.createElement('div');
    list.className = 'setting-item';
    const lab = document.createElement('label');
    lab.textContent = '追蹤清單';
    list.appendChild(lab);

    s.stocks.symbols.forEach((sym, idx) => {
      const li = document.createElement('div');
      li.className = 'list-item';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = sym;
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        s.stocks.symbols.splice(idx, 1);
        save('stocks');
      });
      li.appendChild(name); li.appendChild(rm);
      list.appendChild(li);
    });

    const addWrap = document.createElement('div');
    addWrap.className = 'row';
    addWrap.style.marginTop = '10px';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.placeholder = '如 ^TWII、2330.TW、BTC-USD';
    const addBtn = document.createElement('button');
    addBtn.textContent = '新增';
    addBtn.addEventListener('click', () => {
      const v = inp.value.trim();
      if (!v) return;
      if (!s.stocks.symbols.includes(v)) s.stocks.symbols.push(v);
      save('stocks');
    });
    addWrap.appendChild(inp); addWrap.appendChild(addBtn);
    list.appendChild(addWrap);

    frag.appendChild(list);
  }

  if (tab === 'art') {
    frag.appendChild(toggle('顯示每日名畫模組', s.art.show, (v) => { s.art.show = v; save('art'); }));
  }

  if (tab === 'appearance') {
    frag.appendChild(range('卡片模糊強度', s.appearance.blur, 0, 40, 1, (v) => { s.appearance.blur = v; save('appearance'); }));
    frag.appendChild(range('卡片透明度', s.appearance.cardAlpha, 0, 0.3, 0.01, (v) => { s.appearance.cardAlpha = v; save('appearance'); }));
    frag.appendChild(range('卡片邊框亮度', s.appearance.borderAlpha, 0, 0.5, 0.01, (v) => { s.appearance.borderAlpha = v; save('appearance'); }));
    frag.appendChild(range('字體大小', s.appearance.fontSize, 12, 22, 1, (v) => { s.appearance.fontSize = v; save('appearance'); }));
    frag.appendChild(select('主題色調', s.appearance.theme, [
      ['black', '純黑星空'],
      ['deepblue', '深海藍'],
      ['deepforest', '深森林綠'],
      ['pinkromance', '浪漫小粉紅']
    ], (v) => { s.appearance.theme = v; save('appearance'); }));
  }

  return frag;
}
