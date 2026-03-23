# Delphi Website — Detailed Summary of Each Webpage

**A comprehensive breakdown of every page on the Delphi site: structure, content, functionality, and purpose.**

---

## 1. Homepage (`index.html`)

**URL:** `/`  
**Title:** Delphi Terminal

### Overview
The homepage is the main landing page for Delphi. It uses a preloader animation (logo + curtain slide) before revealing the content, then presents a hero section, company statement, benchmarks block, and news intro.

### Structure

**Preloader (first ~2 seconds):**
- White background with centered Delphi logo
- Curtain animation slides right to reveal content
- Logo fades out; body becomes scrollable

**Header:**
- Fixed top bar with Delphi logo (links to `/`)
- Nav: Markets, News, About, Contact
- Mobile: hamburger menu, slide-out nav drawer

**Hero Section:**
- Full-width background image: `flip sketc nyc.png` (NYC skyline sketch)
- Two animated "shimmer" gradient orbs that bounce around the screen (DVD-style)
- Overlay text:
  - **Tagline:** "Wisdom of the Crowds"
  - **Subtitle:** "Delphi created the first benchmark for anything. Indices for everything. Our data grasps the unseen, connecting markets to global events."

**Below Hero — Section Row:**
- **Left column:** "Prediction markets are juvenile"
- **Right column (wider):** Company description:
  - Delphi Markets, Inc is the infrastructure layer for prediction markets
  - Owns and operates the largest, most granular aggregated dataset across prediction markets
  - Approach across 10+ exchanges creates a **unified view** of fragmented liquidity and price discrepancies in real time
  - Structured products reveal latent connections between global events and the macro world
  - Used to hedge exposures across every asset class or express standalone speculative views
  - **Delphi News** is the first news platform backed by prediction market data
  - Tagline: "We turn noise into signal."

**Benchmarks Block:**
- Dark blue background (#0a1f44)
- Large block (~720px height on desktop)
- Title: "The widest range of benchmarks. Globally."

**News Intro Block:**
- **Left:** "Delphi News ›" with links to "News ›" and "Research ›"
- **Center:** "News backed by you." + "And Everyone. Unfiltered News, Backed By The Crowd."

**Footer:**
- Dark blue background
- Links: Markets, News, About, Contact
- © Delphi Markets Inc. 2026

### Functionality
- Preloader runs on load
- Shimmer orbs animate continuously via `requestAnimationFrame`
- Mobile menu toggles nav drawer
- No form submissions or dynamic data

### Purpose
Introduce Delphi as the infrastructure layer for prediction markets, highlight benchmarks and news, and drive users to Markets, News, About, and Contact.

---

## 2. News Page (`news/index.html`)

**URL:** `/news/`  
**Title:** Delphi Intelligence — News & Analysis

### Overview
The news hub for Delphi Intelligence. Editorial-style layout with a live market ticker, category navigation, lead story, Latest sidebar, and Signals From Search section. Content is driven by a JavaScript `articles` array and `signals.json`.

### Structure

**Header:**
- Same as site-wide: logo, Markets, News (active), About, Contact
- White background, bottom border

**Masthead:**
- "Delphi Intelligence"
- Tagline: "Prediction Markets · Data · Research"

**Category Nav (sticky):**
- Horizontal tabs: All, Economy, U.S., World, Markets, Crypto, Tech, Politics, Research
- Clicking a category filters articles (except All, which shows default layout)
- "All" shows the default news layout; others show a filtered list in `cat-view`

**Live Market Ticker:**
- Full-width TradingView ticker tape
- Symbols: S&P 500, Bitcoin, NVIDIA, Microsoft, Alphabet, Meta, Amazon, Apple, Tesla, JPMorgan, Crude Oil, Gold, Nasdaq 100
- Scrolls continuously; spans edge-to-edge

**Default Layout (when "All" selected):**

*Hero Grid (2 columns):*
- **Left (268px):** "Latest" sidebar
  - List of article previews (excludes lead story)
  - Each: category kicker, headline, excerpt, author, date
  - Currently shows: Recession article, AI Equities article, Fed Rates article
- **Right (flex):** Lead story
  - Large image: crude oil chart (`crude-oil-past-month.png`)
  - Kicker: "The Lead · World"
  - Headline: "Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium"
  - Subhead: "Oil markets surge on Strait of Hormuz risk. WTI near $95, Brent above $102."
  - Link to full article

**Signals From Search Section:**
- Two columns:
  - **Trending Search Terms — Finance:** Federal Reserve rate cut (+34%), Bitcoin ETF (+21%), Gold price forecast (+15%), Recession 2026 (−8%), S&P 500 earnings (flat)
  - **Market Conversations — Reddit & Social:** Inflation/CPI (+47%), Bitcoin price (+29%), SEC crypto (+18%), AI stocks (−5%), Geopolitical risk (flat)
- Each item: term, horizontal bar (width = value), trend (up/dn/nt)
- "Updated Xh ago" timestamp (from `signals.json`)

**Category Filtered View (when category clicked):**
- Replaces default layout
- Shows filtered articles in same card format (kicker, title, excerpt, meta)
- Categories with articles: Economy (Recession), World (Crude Oil), Tech (AI Equities), Research (Fed Rates)
- Other categories (U.S., Markets, Crypto, Politics) show empty or no articles

**Footer:**
- Markets, News, About, Contact
- © Delphi Markets Inc. 2026

### Data Sources
- **Articles:** Hardcoded in JS `articles` array (4 articles)
- **Signals:** Fetched from `../signals.json` (Google Trends + Reddit data, updated by GitHub Actions)

### Functionality
- Category nav filters articles client-side
- `signals.json` fetched on load; fallback to static HTML if fetch fails
- Mobile: ticker full width; hero grid stacks (Latest above main); signals stack

### Purpose
Serve as the news hub: lead story, latest articles, and market signals. Drive traffic to full articles and position Delphi as a data-backed news source.

---

## 3. Markets Page (`markets/index.html`)

**URL:** `/markets/`  
**Title:** Markets – Delphi Terminal

### Overview
Placeholder page for the Markets section. Minimal content: title and "Coming soon."

### Structure

**Header:**
- Logo, Markets (active), News, About, Contact
- Transparent header

**Main Content:**
- Large title: "Markets"
- Subtitle: "Coming soon."

**Footer:**
- Same dark footer as other pages

### Functionality
- Standard header/footer
- Mobile menu
- No dynamic content

### Purpose
Reserve the Markets URL for future product (prediction market data, benchmarks, etc.). Currently a placeholder.

---

## 4. About Page (`about/index.html`)

**URL:** `/about/`  
**Title:** About – Delphi Terminal

### Overview
Company story and history of prediction markets. Hero image, intro copy, and an interactive timeline from 1790 to 2025.

### Structure

**Header:**
- Logo, Markets, News, About (active), Contact

**Hero:**
- Background image: `empire flip.png` (Empire State Building / NYC)
- Shimmer orbs (same animation as homepage)
- Tagline: "We are building the infrastructure for prediction markets."
- Underline/border

**Intro:**
- "All asset classes start with markets and exchanges. The next domino that falls is infrastructure."
- "Enter Delphi."

**Interactive Timeline:**
Horizontal timeline with clickable points. Each point has a year, label, and expandable detail.

| Year | Label | Brief |
|------|-------|-------|
| 1790 | Bond Markets | Hamilton's funding plan; federal securities; tradable government debt |
| 1792 | Equity Exchanges | Buttonwood Agreement; NYSE foundation; organized secondary markets |
| 1860 | S&P Global | Henry Varnum Poor; railroad/canal data; standardized company comparison |
| 1909 | Moody's Analytics | John Moody; bond ratings; standardized credit opinion |
| 1988 | Iowa Electronic Markets | First modern real-money prediction market; election forecasting |
| 2001 | Intrade | Dublin-based; brought prediction markets to public; shut down 2013 |
| 2010 | Box Office Futures | CFTC approved; Congress banned in Dodd-Frank |
| 2014 | PredictIt | Academic project; CFTC no-action; U.S. political prediction market |
| 2020 | Kalshi & Polymarket | Kalshi = CFTC-regulated; Polymarket = crypto-native, offshore |
| 2025 | Delphi | "You know why you're here." |

**Footer:**
- Standard site footer

### Functionality
- Click timeline point → expand detail box below with title and text
- Shimmer orbs animate
- Mobile: timeline becomes vertical stack; points as cards

### Purpose
Explain Delphi's role in the history of prediction markets and position the company as the next infrastructure layer.

---

## 5. Contact Page (`contact/index.html`)

**URL:** `/contact/`  
**Title:** Contact – Delphi Terminal

### Overview
Simple contact form. Two fields: email and message. No backend—form does not submit (onsubmit="return false").

### Structure

**Header:**
- Logo, Markets, News, About, Contact (active)

**Main Content:**
- **Left column:** "Contact" heading, line, "Get in touch with Delphi"
- **Right column:** Form
  - **Your Email** — input, placeholder "name@email.com"
  - **Your Message** — textarea, placeholder "How can we help?"
  - **Send message** — button (no submit action)

**Footer:**
- Standard site footer

### Functionality
- Form is presentational only
- No validation, no API call, no backend
- Button is type="submit" but form prevents submission

### Purpose
Provide a contact entry point. Backend integration would be needed for actual submission.

---

## 6. Article: Crude Oil (`articles/crude-oil-top-market-mover.html`)

**URL:** `/articles/crude-oil-top-market-mover.html`  
**Title:** Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium — Delphi Intelligence  
**Category:** World

### Overview
Full article on the oil rally driven by Strait of Hormuz geopolitical risk. WSJ-style layout.

### Structure

**Header:**
- Logo, Markets, News, About, Contact
- "← Back to News" link

**Article:**
- Kicker: World
- Headline: Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium
- Dek: Oil markets have surged over the past month, driven by geopolitical risk centered on the Strait of Hormuz. WTI near $95, Brent above $102.
- Meta: By Sahana Lydia · Mar 17, 2026

**Body:**
- Para 1: Oil up 50%; WTI $95.40, Brent $102.90; move driven by geopolitical risk, not demand
- Figure: Crude oil chart (`crude-oil-past-month.png`)
- Para 2: Strait of Hormuz focus; traders paying up because downside of being wrong is severe
- Para 3: Brent–WTI spread widening; Brent more sensitive to international routes
- H2: What This Means
- Para 4: Oil trades on what could happen; one event could change everything quickly
- Para 5: Market waiting for one event to possibly change everything, and that very quickly

**Footer:**
- Standard site footer

### Purpose
Explain the oil rally and its geopolitical drivers, with a clear "what it means" framing.

---

## 7. Article: Recession (`articles/recession-yield-curve-normalizes.html`)

**URL:** `/articles/recession-yield-curve-normalizes.html`  
**Title:** Recession Fears Recede as Yield Curve Normalizes — Delphi Intelligence  
**Category:** Economy

### Overview
Macro article on the yield curve normalization and recession signals. Covers yield curve, VIX, and credit.

### Structure

**Header:**
- Same as other articles

**Article:**
- Kicker: Economy
- Headline: Recession Fears Recede as Yield Curve Normalizes
- Dek: Recession risks have subsided in recent months, as key economic indicators point to a slowdown rather than an immediate downturn.
- Meta: By Sahana Lydia · Mar 17, 2026

**Body:**
- Para 1: Yield curve (10Y–3M) as recession indicator; spread positive at 0.62%
- Para 2: Removes recession signal; 10Y at 4.22%; positive curve not bullish—shift in expectations
- Para 3: Positive curve not bullish; points to shift in expectations, not stronger economy
- Figure: Recession risk indicators chart (`recession-risk-indicators.png`)
- H2: Volatility and Credit
- Para 4: VIX at 23.5; uncertainty but not crisis (VIX >30 in past crises)
- Para 5: Credit stable; HY at 79.45; no financial stress
- H2: What This Means
- Para 6: Tightening cycle, not recession; depends on whether pressure continues
- Para 7: If rates stay high + vol persists → tightening; if credit stable + vol eases → expansion

**Footer:**
- Standard site footer

### Purpose
Explain the macro regime: recession signal fading, tightening cycle, and what to watch next.

---

## 8. Article: AI Equities (`articles/third.html`)

**URL:** `/articles/third.html`  
**Title:** AI Driven Equities Significantly Outperformed Broad Markets Over the Past 12 Months, Delphi Intelligence  
**Category:** Tech

### Overview
Article on AI-driven market concentration: AMD, Google, Palantir, Nvidia vs. broad indices. Discusses capital shift and concentration risk.

### Structure

**Article:**
- Kicker: Tech
- Headline: AI Driven Equities Significantly Outperformed Broad Markets Over the Past 12 Months
- Dek: AMD, Google, Palantir, and Nvidia led gains while broad indices and sectors lagged.
- Meta: By Sahana Lydia · Mar 17, 2026

**Body:**
- Para 1: AI names driving market; AMD +88%, Google +87%, Palantir +75%, Nvidia +53% vs. S&P 19%, Nasdaq 25%; Healthcare 5%, Financials 2%
- Para 2: Capital shift into infrastructure, chips, software/data
- Para 3: AI as primary growth driver; valuations reflect future dominance; internet/cloud parallel
- Para 4: Semiconductors/infrastructure lead; software/data follow; rest of market lags
- Figure: AI equities vs. broad market chart (`ai-equities-outperform.png`)
- Para 5: Market structure risk; index dependent on few names
- Para 6: Turning point from leaders; if they stop outperforming, everything adjusts
- Para 7: As long as AI drives returns, stability holds; if not, fragility shows quickly

**Footer:**
- Standard site footer

### Purpose
Explain AI concentration, capital flow, and the risk that turning points come from leaders themselves.

---

## 9. Article: Fed Rates (`articles/fourth.html`)

**URL:** `/articles/fourth.html`  
**Title:** Trump Pushes for Fed Rate Cuts. Markets Bet It Won't. — Delphi Intelligence  
**Category:** Research

### Overview
Article on political pressure for Fed cuts vs. market pricing. Prediction markets assign ~95% no cut.

### Structure

**Article:**
- Kicker: Research
- Headline: Trump Pushes for Fed Rate Cuts. Markets Bet It Won't.
- Dek: President Trump called for a special Fed meeting to cut rates. Prediction markets assign near certainty the Fed will hold steady.
- Meta: By Sahana Lydia · Mar 17, 2026

**Body:**
- Para 1: Trump wants special meeting; cut rates now; growth risks rising
- Figure: Institutional buildings image (`fed-institutions.png`), credit: Unsplash.com
- Para 2: Markets not buying it; prediction markets ~95% no cut; probability of cut effectively zero
- Para 3: Case for cuts vs. market pricing; three reasons:
  - Inflation above target
  - Labor market not materially weakened
  - Financial conditions tightened but not restrictive enough
- Para 4: Cutting would risk undoing inflation progress; Fed has no clear reason to act
- Para 5: Market has decided Fed won't move; rate cuts are narrative until data shifts

**Footer:**
- Standard site footer

### Purpose
Explain the gap between political pressure and market pricing, and why prediction markets price no cut.

---

## 10. Other HTML Files (Legacy / Unused)

| File | Purpose |
|------|---------|
| `firstnewsletter.html` | Old newsletter-style HTML; likely superseded by articles |
| `second.html` | Old HTML; likely superseded by crude-oil article |
| `third.html` | In root; duplicate or old version of `articles/third.html` |
| `google23950fba7dcf03fe.html` | Google site verification file |

---

## Summary Table

| Page | URL | Primary Purpose |
|------|-----|-----------------|
| Homepage | `/` | Introduce Delphi; benchmarks; news |
| News | `/news/` | News hub; lead story; articles; signals |
| Markets | `/markets/` | Placeholder; "Coming soon" |
| About | `/about/` | Company story; prediction market history |
| Contact | `/contact/` | Contact form (no backend) |
| Crude Oil | `/articles/crude-oil-top-market-mover.html` | Article: oil, Hormuz risk |
| Recession | `/articles/recession-yield-curve-normalizes.html` | Article: yield curve, macro |
| AI Equities | `/articles/third.html` | Article: AI concentration |
| Fed Rates | `/articles/fourth.html` | Article: Fed, prediction markets |
