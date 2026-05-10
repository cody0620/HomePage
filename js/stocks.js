import { createChart, ColorType } from 'lightweight-charts';

// API base: in dev/local point to Vercel deploy, else use relative for same-origin Vercel,
// or set window.STOCK_API_BASE in production page.
const API_BASE = (typeof window !== 'undefined' && window.STOCK_API_BASE) || '';

let chart = null;
let series = null;
let volumeSeries = null;
let activeSymbol = null;
let mode = 'intraday'; // 'intraday' | 'candle'

async function fetchStock(symbol, range, interval) {
  const url = `${API_BASE}/api/stock?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('stock api error');
  return r.json();
}

function buildChart(container) {
  if (chart) {
    chart.remove();
    chart = null;
  }
  chart = createChart(container, {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: 'rgba(255,255,255,0.7)',
      fontSize: 11
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.05)' },
      horzLines: { color: 'rgba(255,255,255,0.05)' }
    },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    timeScale: {
      borderColor: 'rgba(255,255,255,0.1)',
      timeVisible: true,
      secondsVisible: false
    },
    crosshair: {
      mode: 1,
      vertLine: { color: 'rgba(255,255,255,0.3)', labelBackgroundColor: '#222' },
      horzLine: { color: 'rgba(255,255,255,0.3)', labelBackgroundColor: '#222' }
    },
    width: container.clientWidth,
    height: container.clientHeight
  });

  const ro = new ResizeObserver(() => {
    chart && chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  ro.observe(container);
}

function setIntraday(data) {
  if (volumeSeries) { chart.removeSeries(volumeSeries); volumeSeries = null; }
  if (series) chart.removeSeries(series);
  series = chart.addAreaSeries({
    lineColor: 'rgba(255,255,255,0.95)',
    topColor: 'rgba(255,255,255,0.25)',
    bottomColor: 'rgba(255,255,255,0)',
    lineWidth: 2,
    priceLineVisible: false
  });
  series.setData(data);
  chart.timeScale().fitContent();
}

function setCandle(candles, volumes) {
  if (series) { chart.removeSeries(series); series = null; }
  if (volumeSeries) { chart.removeSeries(volumeSeries); volumeSeries = null; }

  series = chart.addCandlestickSeries({
    upColor: '#26a69a', downColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    borderVisible: false
  });
  series.setData(candles);

  volumeSeries = chart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    color: 'rgba(255,255,255,0.3)'
  });
  volumeSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.8, bottom: 0 }
  });
  volumeSeries.setData(volumes);
  chart.timeScale().fitContent();
}

export async function renderStocks(card, settings) {
  if (!settings.stocks.show) {
    card.innerHTML = '';
    card.style.display = 'none';
    return;
  }
  card.style.display = '';

  card.innerHTML = `
    <div class="stocks-tabs" id="stocks-tabs"></div>
    <div class="stock-header">
      <div>
        <div class="stock-symbol" id="stock-symbol">—</div>
        <div class="stock-price" id="stock-price">—</div>
        <div class="stock-change" id="stock-change">—</div>
      </div>
      <div class="stock-mode-toggle" id="stock-mode-toggle">Switch to candlesticks</div>
    </div>
    <div id="stock-chart"></div>
  `;

  const tabsEl = card.querySelector('#stocks-tabs');
  const symbols = settings.stocks.symbols;
  if (!symbols.length) {
    card.innerHTML = '<div class="card-loading">Add stock symbols in settings.</div>';
    return;
  }

  tabsEl.innerHTML = '';
  symbols.forEach((sym) => {
    const b = document.createElement('button');
    b.className = 'stock-tab';
    b.textContent = sym;
    b.addEventListener('click', () => {
      activeSymbol = sym;
      tabsEl.querySelectorAll('.stock-tab').forEach((x) => x.classList.toggle('active', x === b));
      loadAndRender();
    });
    tabsEl.appendChild(b);
  });

  if (!activeSymbol || !symbols.includes(activeSymbol)) activeSymbol = symbols[0];
  tabsEl.querySelectorAll('.stock-tab').forEach((x) => x.classList.toggle('active', x.textContent === activeSymbol));

  const chartEl = card.querySelector('#stock-chart');
  buildChart(chartEl);

  const toggleBtn = card.querySelector('#stock-mode-toggle');
  toggleBtn.addEventListener('click', () => {
    mode = mode === 'intraday' ? 'candle' : 'intraday';
    toggleBtn.textContent = mode === 'intraday' ? 'Switch to candlesticks' : 'Switch to line chart';
    loadAndRender();
  });

  async function loadAndRender() {
    const symEl = card.querySelector('#stock-symbol');
    const priceEl = card.querySelector('#stock-price');
    const changeEl = card.querySelector('#stock-change');
    symEl.textContent = activeSymbol;
    priceEl.textContent = '—';
    changeEl.textContent = 'Loading...';
    changeEl.className = 'stock-change';

    try {
      let data;
      if (mode === 'intraday') {
        data = await fetchStock(activeSymbol, '1d', '5m');
        const points = (data.timestamps || []).map((t, i) => ({
          time: t,
          value: data.close[i]
        })).filter((p) => p.value != null);
        setIntraday(points);
      } else {
        const range = settings.stocks.defaultRange === 'W' ? '5y' : '1y';
        const interval = settings.stocks.defaultRange === 'W' ? '1wk' : '1d';
        data = await fetchStock(activeSymbol, range, interval);
        const candles = [];
        const volumes = [];
        (data.timestamps || []).forEach((t, i) => {
          if (data.open[i] == null || data.close[i] == null) return;
          candles.push({
            time: t,
            open: data.open[i], high: data.high[i],
            low: data.low[i], close: data.close[i]
          });
          volumes.push({
            time: t,
            value: data.volume[i] || 0,
            color: data.close[i] >= data.open[i] ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)'
          });
        });
        setCandle(candles, volumes);
      }

      const meta = data.meta || {};
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      if (price != null) priceEl.textContent = price.toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (price != null && prev != null) {
        const diff = price - prev;
        const pct = (diff / prev) * 100;
        changeEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pct.toFixed(2)}%)`;
        changeEl.className = 'stock-change ' + (diff >= 0 ? 'up' : 'down');
      } else {
        changeEl.textContent = '';
      }
    } catch (e) {
      changeEl.textContent = 'Failed to load';
      changeEl.className = 'stock-change';
    }
  }

  loadAndRender();
}
