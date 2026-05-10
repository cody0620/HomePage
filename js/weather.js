const WEATHER_CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail'
};

async function geolocate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}

async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const r = await fetch(url);
  const d = await r.json();
  if (!d.results || !d.results.length) return null;
  const x = d.results[0];
  return { lat: x.latitude, lon: x.longitude, name: x.name };
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.results && d.results.length) return d.results[0].name;
  } catch {}
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

async function fetchWeather(lat, lon, unit) {
  const tempUnit = unit === 'F' ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,uv_index&daily=sunrise,sunset&temperature_unit=${tempUnit}&timezone=auto&past_days=1&forecast_days=2`;
  const r = await fetch(url);
  return r.json();
}

function formatTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function parseLocalTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesUntil(target, now = new Date()) {
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function pointForTime(now, yesterdaySunset, sunrise, sunset, nextSunrise) {
  const arcStart = 15;
  const arcEnd = 85;
  const nightStart = 4;
  const nightEnd = 96;
  const axisY = 72;
  const nightDepth = 16;
  const arcHeight = 52;
  const nowMs = now.getTime();

  if (nowMs < sunrise.getTime()) {
    const start = yesterdaySunset || new Date(sunrise.getTime() - 12 * 60 * 60 * 1000);
    const ratio = clamp01((nowMs - start.getTime()) / (sunrise.getTime() - start.getTime()));
    return {
      x: lerp(nightStart, arcStart, ratio),
      y: axisY + Math.sin(Math.PI * ratio) * nightDepth,
      phase: 'night'
    };
  }
  if (nowMs > sunset.getTime()) {
    const end = nextSunrise || new Date(sunset.getTime() + 12 * 60 * 60 * 1000);
    const ratio = clamp01((nowMs - sunset.getTime()) / (end.getTime() - sunset.getTime()));
    return {
      x: lerp(arcEnd, nightEnd, ratio),
      y: axisY + Math.sin(Math.PI * ratio) * nightDepth,
      phase: 'night'
    };
  }

  const ratio = clamp01((nowMs - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime()));
  return {
    x: lerp(arcStart, arcEnd, ratio),
    y: axisY - Math.sin(Math.PI * ratio) * arcHeight,
    phase: 'day'
  };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createSunPaths() {
  const points = [];
  const leftNight = [];
  const rightNight = [];
  const samples = 48;
  for (let i = 0; i <= samples; i += 1) {
    const ratio = i / samples;
    const x = lerp(15, 85, ratio);
    const y = 72 - Math.sin(Math.PI * ratio) * 52;
    points.push([x, y]);

    const nightY = 72 + Math.sin(Math.PI * ratio) * 16;
    leftNight.push([lerp(4, 15, ratio), nightY]);
    rightNight.push([lerp(85, 96, ratio), nightY]);
  }
  const toPath = (pathPoints) => pathPoints.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const arc = toPath(points);
  const area = `${arc} L85 72 L15 72 Z`;
  return { arc, area, leftNight: toPath(leftNight), rightNight: toPath(rightNight) };
}

function buildSunWidget(sunriseValue, sunsetValue, nextSunriseValue, yesterdaySunsetValue) {
  const yesterdaySunset = parseLocalTime(yesterdaySunsetValue);
  const sunrise = parseLocalTime(sunriseValue);
  const sunset = parseLocalTime(sunsetValue);
  const nextSunrise = parseLocalTime(nextSunriseValue);
  const sunriseText = formatTime(sunriseValue);
  const sunsetText = formatTime(sunsetValue);
  if (!sunrise || !sunset || !sunriseText || !sunsetText) return null;

  const paths = createSunPaths();
  const widget = document.createElement('div');
  widget.className = 'sun-widget';
  widget.innerHTML = `
    <div class="sun-orbit" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sun-day-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffd274" stop-opacity="0.14" />
            <stop offset="100%" stop-color="#ffd274" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="sun-day-area" d="${paths.area}" />
        <path class="sun-night-line" d="M4 72 H96" />
        <path class="sun-night-arc" d="${paths.leftNight}" />
        <path class="sun-night-arc" d="${paths.rightNight}" />
        <path class="sun-day-arc" d="${paths.arc}" />
      </svg>
      <div class="sun-dot"></div>
      <div class="sun-countdown"></div>
    </div>
    <div class="sun-times">
      <span>Sunrise <strong>${sunriseText}</strong></span>
      <span>Sunset <strong>${sunsetText}</strong></span>
    </div>
  `;

  const dot = widget.querySelector('.sun-dot');
  const countdown = widget.querySelector('.sun-countdown');

  function update() {
    const now = new Date();
    const point = pointForTime(now, yesterdaySunset, sunrise, sunset, nextSunrise);
    dot.style.left = `${point.x}%`;
    dot.style.top = `${point.y}%`;
    dot.classList.toggle('night', point.phase === 'night');
    countdown.style.left = `${point.x}%`;
    countdown.style.top = `${point.y}%`;
    countdown.classList.toggle('night', point.phase === 'night');
    countdown.classList.toggle('align-right', point.x > 72);

    let target = sunset;
    let label = 'Until sunset';
    if (now.getTime() < sunrise.getTime()) {
      target = sunrise;
      label = 'Until sunrise';
    } else if (now.getTime() > sunset.getTime()) {
      target = nextSunrise || new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
      label = 'Until sunrise';
    }

    countdown.textContent = `${label} ${formatDuration(minutesUntil(target, now))}`;
  }

  update();
  widget._sunTimer = window.setInterval(update, 60000);
  return widget;
}

async function fetchAirQuality(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
    const r = await fetch(url);
    return r.json();
  } catch {
    return null;
  }
}

export async function renderWeather(card, settings) {
  const s = settings.weather;
  if (card._sunTimer) {
    window.clearInterval(card._sunTimer);
    card._sunTimer = null;
  }
  card.innerHTML = '<div class="card-loading">Loading weather...</div>';

  let coords = null;
  let cityName = '';

  if (s.manualCity) {
    const g = await geocodeCity(s.manualCity);
    if (g) { coords = { lat: g.lat, lon: g.lon }; cityName = g.name; }
  }
  if (!coords) {
    coords = await geolocate();
    if (coords) cityName = await reverseGeocode(coords.lat, coords.lon);
  }
  if (!coords) {
    card.innerHTML = '<div class="card-loading">Location unavailable. Set a city in settings.</div>';
    return;
  }

  try {
    const [w, aq] = await Promise.all([
      fetchWeather(coords.lat, coords.lon, s.unit),
      s.showAQI ? fetchAirQuality(coords.lat, coords.lon) : Promise.resolve(null)
    ]);

    const cur = w.current || {};
    const desc = WEATHER_CODES[cur.weather_code] || '—';
    const aqi = aq && aq.current ? aq.current.us_aqi : null;
    const uv = cur.uv_index;
    const sunWidget = buildSunWidget(w.daily?.sunrise?.[1], w.daily?.sunset?.[1], w.daily?.sunrise?.[2], w.daily?.sunset?.[0]);

    card.innerHTML = '';
    const city = document.createElement('div');
    city.className = 'weather-city';
    city.textContent = cityName || 'Current location';
    card.appendChild(city);

    const temp = document.createElement('div');
    temp.className = 'weather-temp';
    temp.textContent = `${Math.round(cur.temperature_2m)}°${s.unit}`;
    card.appendChild(temp);

    const dEl = document.createElement('div');
    dEl.className = 'weather-desc';
    dEl.textContent = desc;
    card.appendChild(dEl);

    const meta = document.createElement('div');
    meta.className = 'weather-meta';
    if (s.showAQI && aqi != null) {
      const sp = document.createElement('span');
      sp.innerHTML = `AQI <strong>${Math.round(aqi)}</strong>`;
      meta.appendChild(sp);
    }
    if (s.showUV && uv != null) {
      const sp = document.createElement('span');
      sp.innerHTML = `UV <strong>${uv.toFixed(1)}</strong>`;
      meta.appendChild(sp);
    }
    card.appendChild(meta);
    if (sunWidget) {
      card._sunTimer = sunWidget._sunTimer;
      card.appendChild(sunWidget);
    }

    card.onclick = () => {
      const q = encodeURIComponent(`${cityName || ''} weather`);
      window.open(`https://www.google.com/search?q=${q}`, '_blank');
    };
  } catch (e) {
    card.innerHTML = '<div class="card-loading">Weather data failed to load.</div>';
  }
}
