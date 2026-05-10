// Vercel Edge Function: proxy Yahoo Finance chart endpoint to bypass CORS.
// GET /api/stock?symbol=^TWII&range=1d&interval=5m
//
// Response shape (simplified):
// {
//   meta: { regularMarketPrice, chartPreviousClose, previousClose, currency, symbol, ... },
//   timestamps: number[],   // unix seconds
//   open: number[], high: number[], low: number[], close: number[], volume: number[]
// }

export const config = { runtime: 'edge' };

const ALLOWED_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']);
const ALLOWED_INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=30, s-maxage=30'
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol');
  const range = url.searchParams.get('range') || '1d';
  const interval = url.searchParams.get('interval') || '5m';

  if (!symbol || !/^[\w\-^.=]+$/.test(symbol)) {
    return json({ error: 'invalid symbol' }, 400);
  }
  if (!ALLOWED_RANGES.has(range)) return json({ error: 'invalid range' }, 400);
  if (!ALLOWED_INTERVALS.has(interval)) return json({ error: 'invalid interval' }, 400);

  const upstream = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div,split`;

  try {
    const r = await fetch(upstream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HomepageBot/1.0)',
        'Accept': 'application/json'
      }
    });
    if (!r.ok) return json({ error: 'upstream error', status: r.status }, 502);
    const data = await r.json();

    const result = data?.chart?.result?.[0];
    if (!result) return json({ error: 'no data' }, 404);

    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    return json({
      meta: result.meta || {},
      timestamps: ts,
      open: q.open || [],
      high: q.high || [],
      low: q.low || [],
      close: q.close || [],
      volume: q.volume || []
    });
  } catch (e) {
    return json({ error: 'fetch failed', message: String(e) }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}
