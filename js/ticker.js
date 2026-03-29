const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY ?? '';
const FINNHUB_QUOTE = 'https://finnhub.io/api/v1/quote';
const GECKO_PRICE   = 'https://api.coingecko.com/api/v3/simple/price';
const FRANKFURTER   = 'https://api.frankfurter.app';

// All free-tier confirmed working symbols
const FINNHUB_FEEDS = [
  { id: 'SPY', label: 'S&P 500'  },
  { id: 'QQQ', label: 'Nasdaq'   },
  { id: 'DIA', label: 'Dow'      },
  { id: 'GLD', label: 'Gold'     },
  { id: 'USO', label: 'Oil'      },
  { id: 'TLT', label: '20Y Bond' },
];

const COINGECKO_IDS = ['bitcoin', 'ethereum'];

function formatPrice(price, forex = false) {
  if (forex)         return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

function formatChange(dp) {
  const sign = dp >= 0 ? '+' : '';
  return `${sign}${dp.toFixed(2)}%`;
}

function applyToDOM(id, price, dp, forex = false) {
  document.querySelectorAll(`[data-ticker="${CSS.escape(id)}"]`).forEach(el => {
    const priceEl  = el.querySelector('[data-ticker-price]');
    const changeEl = el.querySelector('[data-ticker-change]');
    if (!priceEl) return;
    priceEl.textContent = formatPrice(price, forex);
    priceEl.className   = `np-ticker__price ${dp >= 0 ? 'np-ticker__price--up' : 'np-ticker__price--down'}`;
    if (changeEl) {
      changeEl.textContent = formatChange(dp);
      changeEl.className   = `np-ticker__change ${dp >= 0 ? 'np-ticker__change--up' : 'np-ticker__change--down'}`;
    }
  });
}

async function fetchFinnhub(symbol) {
  if (!FINNHUB_KEY || FINNHUB_KEY === 'your_finnhub_api_key_here') return null;
  try {
    const res = await fetch(`${FINNHUB_QUOTE}?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.c ? d : null;
  } catch { return null; }
}

async function fetchCoinGecko() {
  try {
    const res = await fetch(
      `${GECKO_PRICE}?ids=${COINGECKO_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

async function fetchEurUsd() {
  try {
    // get today and yesterday dates
    const today = new Date();
    const prev  = new Date(today);
    prev.setDate(prev.getDate() - 1);
    const fmt = d => d.toISOString().slice(0, 10);

    const [latestRes, prevRes] = await Promise.all([
      fetch(`${FRANKFURTER}/latest?from=EUR&to=USD`),
      fetch(`${FRANKFURTER}/${fmt(prev)}?from=EUR&to=USD`),
    ]);
    if (!latestRes.ok || !prevRes.ok) return null;

    const [latest, prevDay] = await Promise.all([latestRes.json(), prevRes.json()]);
    const current  = latest.rates.USD;
    const previous = prevDay.rates.USD;
    const dp = ((current - previous) / previous) * 100;
    return { c: current, dp };
  } catch { return null; }
}

async function refresh() {
  // Finnhub ETFs
  for (const feed of FINNHUB_FEEDS) {
    const data = await fetchFinnhub(feed.id);
    if (data) applyToDOM(feed.id, data.c, data.dp ?? 0);
  }

  // EUR/USD via Frankfurter (free, no key)
  const fx = await fetchEurUsd();
  if (fx) applyToDOM('EUR_USD', fx.c, fx.dp, true);

  // CoinGecko — single batch call
  const gecko = await fetchCoinGecko();
  if (gecko) {
    for (const id of COINGECKO_IDS) {
      const d = gecko[id];
      if (d) applyToDOM(id, d.usd, d.usd_24h_change ?? 0);
    }
  }
}

export async function initTicker() {
  if (!document.querySelector('.np-ticker')) return;
  await refresh();
  setInterval(refresh, 60_000);
}
