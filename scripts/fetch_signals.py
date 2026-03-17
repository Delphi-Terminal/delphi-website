#!/usr/bin/env python3
"""
Delphi Intelligence — Market Signals Fetcher
=============================================
Fetches real-time finance signal data from two sources:
  1. Google Trends (via pytrends) — search interest for finance keywords
  2. Reddit public JSON API       — social conversation volume as a proxy

Writes signals.json to the repo root, consumed by news/index.html.
Runs on a 6-hour cron via GitHub Actions.
"""

import json
import time
import datetime
import requests

# ── Configuration ──────────────────────────────────────────────────────────────

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


# ── Helpers ─────────────────────────────────────────────────────────────────

def _fallback(term):
    return {"term": term, "value": 50, "change": "—", "direction": "nt"}


def _pct_to_display(pct, threshold=5):
    if pct > threshold:
        return f"+{round(pct)}%", "up"
    elif pct < -threshold:
        return f"−{abs(round(pct))}%", "dn"
    return "flat", "nt"


# ── Google Trends ────────────────────────────────────────────────────────────

def fetch_google_trends(keywords, retries=3):
    """
    Fetch 90-day Google Trends interest for each keyword.
    Compares last-7-days average vs prior-7-days to derive % change.
    """
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("pytrends not installed — skipping Google Trends fetch.")
        return [_fallback(kw) for kw in keywords]

    pytrends = TrendReq(hl="en-US", tz=360, timeout=(10, 30))
    results = []

    for i in range(0, len(keywords), 5):
        batch = keywords[i : i + 5]
        for attempt in range(retries):
            try:
                pytrends.build_payload(batch, cat=0, timeframe="today 3-m", geo="US")
                df = pytrends.interest_over_time()

                if df.empty:
                    results.extend(_fallback(kw) for kw in batch)
                    break

                if "isPartial" in df.columns:
                    df = df.drop(columns=["isPartial"])

                for kw in batch:
                    if kw not in df.columns or len(df[kw].dropna()) < 14:
                        results.append(_fallback(kw))
                        continue

                    series = df[kw].dropna()
                    recent  = float(series.iloc[-7:].mean())
                    prior   = float(series.iloc[-14:-7].mean())
                    current = int(series.iloc[-1])

                    pct = ((recent - prior) / prior * 100) if prior > 0 else 0
                    change_str, direction = _pct_to_display(pct)

                    results.append({
                        "term":      kw,
                        "value":     current,
                        "change":    change_str,
                        "direction": direction,
                    })

                time.sleep(2)
                break

            except Exception as e:
                print(f"  Attempt {attempt + 1} failed for {batch}: {e}")
                if attempt < retries - 1:
                    time.sleep(6 * (attempt + 1))
                else:
                    results.extend(_fallback(kw) for kw in batch)

    return results


# ── Reddit Signals ────────────────────────────────────────────────────────────

def fetch_reddit_signals(topics):
    """
    Fetch Reddit post counts for each topic across finance subreddits.
    Compares this-week post count to monthly baseline for trend direction.
    Bar value is derived from engagement score (upvotes).
    """
    base = f"https://www.reddit.com/r/{REDDIT_SUBS}/search.json"
    results = []

    for display_term, query in topics:
        try:
            # This week
            r_week = requests.get(
                base,
                params={"q": query, "sort": "relevance", "t": "week",
                        "limit": 100, "restrict_sr": "on"},
                headers=REDDIT_HEADERS,
                timeout=12,
            )
            r_week.raise_for_status()
            week_children = r_week.json().get("data", {}).get("children", [])
            week_count    = len(week_children)
            week_score    = sum(p["data"].get("score", 0) for p in week_children)
            time.sleep(1)

            # Past month (for baseline)
            r_month = requests.get(
                base,
                params={"q": query, "sort": "relevance", "t": "month",
                        "limit": 100, "restrict_sr": "on"},
                headers=REDDIT_HEADERS,
                timeout=12,
            )
            r_month.raise_for_status()
            month_count = len(r_month.json().get("data", {}).get("children", []))
            time.sleep(1)

            expected_weekly = (month_count / 4) if month_count > 0 else 1
            pct = ((week_count - expected_weekly) / expected_weekly) * 100

            # Clamp value 10–100 based on engagement score
            value = max(10, min(100, int(week_score / 400)))

            change_str, direction = _pct_to_display(pct, threshold=10)

            results.append({
                "term":      display_term,
                "value":     value,
                "change":    change_str,
                "direction": direction,
            })

        except Exception as e:
            print(f"  Reddit error for '{query}': {e}")
            results.append(_fallback(display_term))

    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("── Delphi Signal Fetcher ──────────────────────────")
    print(f"  Started at {datetime.datetime.utcnow().isoformat()}Z\n")

    print("Fetching Google Trends (search terms)...")
    search_trends = fetch_google_trends(SEARCH_TERMS)
    print(f"  Got {len(search_trends)} items.\n")

    print("Fetching Reddit signals (market conversations)...")
    market_conversations = fetch_reddit_signals(REDDIT_TOPICS)
    print(f"  Got {len(market_conversations)} items.\n")

    output = {
        "updated":               datetime.datetime.utcnow().isoformat() + "Z",
        "search_trends":         search_trends,
        "market_conversations":  market_conversations,
    }

    with open("signals.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written signals.json at {output['updated']}")
    print("──────────────────────────────────────────────────")


if __name__ == "__main__":
    main()
