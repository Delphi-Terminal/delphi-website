# Signals From Search — Technical Overview

**Prepared for:** Internal review  
**Feature:** Market signals displayed on the Delphi News page  
**Last updated:** March 2026

---

## Executive Summary

The "Signals From Search" section on the news page shows two columns of market sentiment data:

1. **Trending Search Terms — Finance** — Search interest from Google Trends  
2. **Market Conversations — Reddit & Social** — Conversation volume from Reddit finance subreddits  

Data is fetched by a Python script, written to `signals.json`, and displayed by the news page. A GitHub Actions workflow runs the script every 6 hours to keep the data fresh.

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Actions     │     │  signals.json    │     │  news/index.html │
│  (every 6 hours)    │────▶│  (data file)     │◀────│  (frontend)     │
│  runs fetch_signals │     │                  │     │  fetches &      │
└─────────────────────┘     └──────────────────┘     │  renders        │
         │                            ▲               └─────────────────┘
         │                            │
         ▼                            │
┌─────────────────────┐               │
│  Python script      │───────────────┘
│  fetch_signals.py   │  writes
└─────────────────────┘
         │
         ├──▶ Google Trends API (pytrends)
         └──▶ Reddit public JSON API
```

---

## Part 1: Python Data Fetcher (`scripts/fetch_signals.py`)

### Configuration (Lines 19–41)

```python
# Column 1: Finance search terms tracked on Google Trends
SEARCH_TERMS = [
    "Federal Reserve rate cut",
    "Bitcoin ETF",
    "gold price forecast",
    "recession 2026",
    "S&P 500 earnings",
]

# Column 2: Market conversation topics tracked on Reddit
REDDIT_TOPICS = [
    ("Inflation / CPI narrative",      "inflation CPI"),
    ("Bitcoin price action",           "bitcoin price"),
    ("SEC crypto regulation",          "SEC crypto regulation"),
    ("AI stocks & semiconductors",     "AI chips semiconductors"),
    ("Geopolitical risk premium",      "geopolitical risk"),
]

REDDIT_SUBS   = "finance+investing+economics+wallstreetbets+stocks"
REDDIT_HEADERS = {"User-Agent": "DelphiSignalBot/1.0 (news signal aggregator; contact delphi)"}
```

**Explanation:**  
- `SEARCH_TERMS` — Keywords sent to Google Trends for the left column.  
- `REDDIT_TOPICS` — Pairs of (display label, search query) for Reddit.  
- `REDDIT_SUBS` — Subreddits queried (finance, investing, economics, wallstreetbets, stocks).  
- `REDDIT_HEADERS` — User-Agent required by Reddit’s API.

---

### Helper Functions (Lines 46–55)

```python
def _fallback(term):
    return {"term": term, "value": 50, "change": "—", "direction": "nt"}

def _pct_to_display(pct, threshold=5):
    if pct > threshold:
        return f"+{round(pct)}%", "up"
    elif pct < -threshold:
        return f"−{abs(round(pct))}%", "dn"
    return "flat", "nt"
```

**Explanation:**  
- `_fallback` — Returns a default object when API calls fail.  
- `_pct_to_display` — Converts a numeric percentage into a display string (e.g. `+34%`) and a direction (`up`, `dn`, `nt`).

---

### Google Trends Fetch (Lines 59–117)

```python
def fetch_google_trends(keywords, retries=3):
    from pytrends.request import TrendReq
    pytrends = TrendReq(hl="en-US", tz=360, timeout=(10, 30))
    # ...
    pytrends.build_payload(batch, cat=0, timeframe="today 3-m", geo="US")
    df = pytrends.interest_over_time()
    # ...
    recent  = float(series.iloc[-7:].mean())
    prior   = float(series.iloc[-14:-7].mean())
    pct = ((recent - prior) / prior * 100) if prior > 0 else 0
```

**Explanation:**  
- Uses `pytrends` library to call Google Trends.  
- Requests 90-day US data (`today 3-m`, `geo="US"`).  
- Compares last 7 days vs. prior 7 days to compute % change.  
- Returns `term`, `value` (0–100), `change` (e.g. `+34%`), `direction`.

---

### Reddit Fetch (Lines 121–177)

```python
def fetch_reddit_signals(topics):
    base = f"https://www.reddit.com/r/{REDDIT_SUBS}/search.json"
    # ...
    r_week = requests.get(base, params={"q": query, "sort": "relevance", "t": "week", ...})
    r_month = requests.get(base, params={"q": query, "t": "month", ...})
    week_count = len(week_children)
    expected_weekly = (month_count / 4) if month_count > 0 else 1
    pct = ((week_count - expected_weekly) / expected_weekly) * 100
    value = max(10, min(100, int(week_score / 400)))
```

**Explanation:**  
- Calls Reddit’s public JSON search API.  
- Fetches posts for this week and this month.  
- Computes % change vs. expected weekly volume from monthly baseline.  
- Bar value = engagement score (upvotes) scaled to 10–100.

---

### Output (Lines 194–202)

```python
output = {
    "updated":               datetime.datetime.utcnow().isoformat() + "Z",
    "search_trends":         search_trends,
    "market_conversations":  market_conversations,
}
with open("signals.json", "w") as f:
    json.dump(output, f, indent=2)
```

**Explanation:**  
- `updated` — ISO timestamp for the “Updated Xh ago” label.  
- `search_trends` — Google Trends results.  
- `market_conversations` — Reddit results.  
- Writes JSON to `signals.json` in the repo root.

---

## Part 2: GitHub Actions Workflow (`.github/workflows/fetch-signals.yml`)

```yaml
name: Fetch Market Signals

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  fetch-signals:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install pytrends requests

      - name: Run signal fetcher
        run: python scripts/fetch_signals.py

      - name: Commit and push signals.json
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add signals.json
          git diff --staged --quiet || git commit -m "chore: update market signals [skip ci]"
          git push
```

**Explanation:**  
- `schedule` — Runs every 6 hours (00:00, 06:00, 12:00, 18:00 UTC).  
- `workflow_dispatch` — Enables manual runs from the Actions tab.  
- `contents: write` — Enables committing and pushing.  
- Steps: checkout repo, install Python, install `pytrends` and `requests`, run `fetch_signals.py`, commit and push `signals.json` if changed.

---

## Part 3: Data Format (`signals.json`)

```json
{
  "updated": "2026-03-17T00:00:00Z",
  "search_trends": [
    { "term": "Federal Reserve rate cut", "value": 88, "change": "+34%", "direction": "up" },
    { "term": "Bitcoin ETF",               "value": 74, "change": "+21%", "direction": "up" }
  ],
  "market_conversations": [
    { "term": "Inflation / CPI narrative", "value": 91, "change": "+47%", "direction": "up" }
  ]
}
```

**Explanation:**  
- `term` — Display label.  
- `value` — Bar width (0–100).  
- `change` — Display string (e.g. `+34%`, `flat`).  
- `direction` — `up`, `dn`, or `nt` for styling.

---

## Part 4: Frontend Display (`news/index.html`)

### HTML Structure

```html
<div class="news-section" id="signals-section">
  <div class="news-section__hd">
    <span class="news-section__label">Signals From Search</span>
    <span class="signals-updated" id="signals-updated"></span>
  </div>
  <div class="signals-grid" id="signals-grid">
    <div class="signals-col">
      <p class="signals-col__label">Trending Search Terms — Finance</p>
      <div id="signals-search"></div>
    </div>
    <div class="signals-col">
      <p class="signals-col__label">Market Conversations — Reddit & Social</p>
      <div id="signals-conversations"></div>
    </div>
  </div>
</div>
```

**Explanation:**  
- Static HTML shows the section layout and labels.  
- `signals-search` and `signals-conversations` are filled by JavaScript.  
- `signals-updated` shows the “Updated Xh ago” text.

---

### JavaScript: Fetch and Render

```javascript
function buildSignalItem(item) {
  var dirClass = item.direction || 'nt';
  var el = document.createElement('div');
  el.className = 'signal-item';
  el.innerHTML =
    '<span class="signal-item__term">' + item.term + '</span>' +
    '<div class="signal-item__bar-wrap">' +
      '<div class="signal-item__bar" style="width:' + (item.value || 50) + '%"></div>' +
    '</div>' +
    '<span class="signal-item__trend ' + dirClass + '">' + (item.change || '—') + '</span>';
  return el;
}

function renderSignals(data) {
  var searchEl = document.getElementById('signals-search');
  var convEl   = document.getElementById('signals-conversations');
  var updEl    = document.getElementById('signals-updated');

  if (searchEl && data.search_trends) {
    searchEl.innerHTML = '';
    data.search_trends.forEach(function(item) {
      searchEl.appendChild(buildSignalItem(item));
    });
  }

  if (convEl && data.market_conversations) {
    convEl.innerHTML = '';
    data.market_conversations.forEach(function(item) {
      convEl.appendChild(buildSignalItem(item));
    });
  }

  if (updEl && data.updated) {
    var d = new Date(data.updated);
    var now = new Date();
    var diffMins = Math.round((now - d) / 60000);
    var label = diffMins < 60
      ? 'Updated ' + diffMins + 'm ago'
      : 'Updated ' + Math.round(diffMins / 60) + 'h ago';
    updEl.textContent = label;
  }
}

fetch('../signals.json?v=' + Date.now())
  .then(function(r) { return r.json(); })
  .then(function(data) { renderSignals(data); })
  .catch(function() {
    var els = document.querySelectorAll('.signals-loading');
    els.forEach(function(el) { el.textContent = 'Data unavailable.'; });
  });
```

**Explanation:**  
- `buildSignalItem` — Builds one row (term, bar, change).  
- `renderSignals` — Clears containers, populates `signals-search` and `signals-conversations`, and sets “Updated Xh ago” from `data.updated`.  
- `fetch` — Loads `signals.json` and renders the data.  
- `?v=` + `Date.now()` — Cache-busting so the latest file is used.

---

## Dependencies

| Component | Purpose |
|-----------|---------|
| `pytrends` | Google Trends API |
| `requests` | HTTP calls for Reddit API |
| Python 3.11 | Run environment |

---

## Files Involved

| File | Role |
|------|------|
| `scripts/fetch_signals.py` | Fetches data and writes `signals.json` |
| `.github/workflows/fetch-signals.yml` | Runs every 6 hours |
| `signals.json` | Stored data |
| `news/index.html` | Fetches and displays data |

---

## Optional Enhancements

1. **More sources** — News APIs, Bloomberg, etc.  
2. **Caching** — Serve `signals.json` via CDN for faster loads.  
3. **Fallback** — Keep static HTML rows when API fails.
