# Delphi Website

Static marketing site for Delphi Markets.

## Running on localhost

You need a local HTTP server so that paths like `/markets/` and `/news/` resolve correctly (opening `index.html` as a file won’t work for those links).

**Option A – Python (no install if you have Python):**

```bash
cd /Users/prakashshekhar/development/delphi/delphi-website
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

**Option B – Node (if you have npm):**

```bash
cd /Users/prakashshekhar/development/delphi/delphi-website
npx serve -l 8000
```

Then open **http://localhost:8000**.

To test mobile layout: use Chrome DevTools (F12 → device toolbar) or resize the window below 768px width.

## Mobile

The site is responsive:

- **≤768px:** Hamburger menu, stacked sections, reduced padding, flexible hero text.
- **≤480px:** Tighter padding and typography for small phones.

No build step or extra dependencies are required for mobile.
