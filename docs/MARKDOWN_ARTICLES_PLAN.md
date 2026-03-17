# Markdown-Based Articles — Implementation Plan

## Goal

Writers write articles in **Markdown only**. They add metadata (category, author, date) via frontmatter. They push Markdown files to a folder in the repo. A build step converts Markdown → HTML, and the site displays everything with consistent styling.

---

## 1. Writer Workflow (What They Do)

### Step 1: Create a Markdown file

Create a new file in `content/articles/` (or `articles/` if we keep it simple). Example: `content/articles/crude-oil-surges.md`

### Step 2: Add frontmatter (metadata at the top)

```yaml
---
title: "Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium"
category: World
author: Sahana Lydia
date: 2026-03-17
excerpt: "Oil markets have surged over the past month, driven by geopolitical risk centered on the Strait of Hormuz. WTI near $95, Brent above $102."
image: images/crude-oil-past-month.png
imageAlt: "Crude Oil — Past Month: WTI and Brent price performance, USD per barrel"
imageCaption: "Crude Oil — Past Month. USD per barrel · March 17, 2026. Source: Yahoo Finance."
---
```

**Metadata fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Article headline |
| `category` | Yes | One of: `World`, `Economy`, `Tech`, `Research` |
| `author` | Yes | Byline |
| `date` | Yes | ISO date (YYYY-MM-DD) |
| `excerpt` | Yes | Short summary for listings |
| `image` | No | Path to image (relative to article) |
| `imageAlt` | No | Alt text for image |
| `imageCaption` | No | Figure caption |

### Step 3: Write the body in Markdown

```markdown
Crude oil has climbed more than 50% in recent weeks with WTI trading near $95.40 per barrel and Brent above $102.90, showing the market is pricing geopolitical risk and not stronger demand.

![Crude Oil chart](images/crude-oil-past-month.png)

*Crude Oil — Past Month. USD per barrel · March 17, 2026. Source: Yahoo Finance.*

The center of the repricing is the Strait of Hormuz, where a fifth of the world's oil supply passes...

## What This Means

Oil markets move not on what has happened but on what could happen...
```

**Supported Markdown:**
- Paragraphs, **bold**, *italic*
- Headings: `##`, `###`
- Links: `[text](url)`
- Images: `![alt](path)` — we'll map these to `<figure>` with caption if needed
- Lists (bulleted, numbered)
- Blockquotes

No HTML required. If they need something special (e.g. a custom embed), we can add a convention later.

### Step 4: Add images to `content/articles/images/`

Drop image files in the same folder or a subfolder. Reference them by path in the Markdown.

### Step 5: Push to GitHub

- Commit the `.md` file and images
- Push to the repo
- Build runs (GitHub Actions or local) and generates HTML

---

## 2. Folder Structure

```
delphi-website/
├── content/
│   └── articles/
│       ├── crude-oil-surges.md
│       ├── recession-yield-curve.md
│       ├── ai-equities-outperform.md
│       ├── trump-fed-rate-cuts.md
│       └── images/
│           ├── crude-oil-past-month.png
│           ├── recession-risk-indicators.png
│           └── ...
├── articles/                    # Generated HTML (or build output)
│   ├── crude-oil-surges.html
│   ├── recession-yield-curve.html
│   └── images/                  # Copied or symlinked
├── scripts/
│   └── build_articles.py        # MD → HTML converter
└── ...
```

**Alternative:** Keep `articles/` as the source folder and put `.md` files there. Build outputs to `dist/articles/` or overwrites `.html` next to `.md`. Simpler for a small team.

---

## 3. Build Process Options

### Option A: Custom Python script (recommended for simplicity)

- **Tool:** Python + `markdown` library (or `mistune`, `markdown-it-py`)
- **Input:** `content/articles/*.md`
- **Output:** `articles/*.html`
- **Template:** One HTML template with placeholders for title, body, meta, etc.
- **Run:** `python scripts/build_articles.py` (manually or in CI)

**Pros:** No new framework, full control, easy to understand  
**Cons:** You maintain the script

### Option B: 11ty (Eleventy)

- **Tool:** Static site generator
- **Input:** Markdown + layouts
- **Output:** Full site or just articles
- **Run:** `npx @11ty/eleventy`

**Pros:** Mature, good Markdown + frontmatter support, many plugins  
**Cons:** Adds a build step and config; might be overkill if you only need articles

### Option C: GitHub Actions only

- **Tool:** A workflow that runs on push to `main` (or a `content/` path)
- **Script:** Python or Node script that reads MD, outputs HTML, commits back
- **Flow:** Writer pushes MD → Action runs → HTML generated and committed (or deployed)

**Pros:** Fully automated; writers never run a build locally  
**Cons:** Slightly slower feedback loop (push → wait for Action)

---

## 4. Article HTML Template

The build script uses a single template. It injects:

- `{{ title }}`, `{{ category }}`, `{{ author }}`, `{{ date }}`, `{{ excerpt }}`
- `{{ body }}` — HTML rendered from Markdown
- `{{ image }}`, `{{ imageAlt }}`, `{{ imageCaption }}` (optional)

The template is the current article layout (header, styles, footer) with these placeholders. No writer ever touches it.

---

## 5. Article Index / Listing

**Current state:** `news/index.html` and `index.html` have hardcoded `articles` arrays.

**New state:** The build script also outputs `articles.json` (or `articles/index.json`) with:

```json
[
  {
    "slug": "crude-oil-surges",
    "title": "Crude Oil Surges 50% as Strait of Hormuz Tensions Rewrite Risk Premium",
    "category": "World",
    "author": "Sahana Lydia",
    "date": "Mar 17, 2026",
    "excerpt": "Oil markets have surged over the past month...",
    "url": "articles/crude-oil-surges.html"
  },
  ...
]
```

The news page and homepage **fetch** `articles.json` and render the list dynamically. No more manual array updates when new articles are added.

---

## 6. Implementation Phases

### Phase 1: Build script + one article (proof of concept)

1. Create `content/articles/` and `scripts/build_articles.py`
2. Add one Markdown file with frontmatter (e.g. migrate crude-oil)
3. Script: parse frontmatter, convert MD → HTML, inject into template
4. Output: `articles/crude-oil-surges.html`
5. Verify it looks correct and links work

### Phase 2: Migrate existing articles

1. Convert all 4 HTML articles to Markdown
2. Move images to `content/articles/images/`
3. Run build; confirm all articles render correctly
4. Remove or archive old HTML sources

### Phase 3: Dynamic article listing

1. Build script outputs `articles.json`
2. Update `news/index.html` to fetch and render from `articles.json`
3. Update `index.html` to fetch and render from `articles.json`
4. Remove hardcoded `articles` arrays

### Phase 4: Automation (optional)

1. Add GitHub Action: on push to `content/articles/`, run build
2. Commit generated HTML + `articles.json` back to repo (or deploy to hosting)
3. Document writer workflow in README

---

## 7. Writer-Facing README

A short `content/articles/README.md` for writers:

```markdown
# Writing Articles for Delphi News

1. Create a new `.md` file in this folder.
2. Add YAML frontmatter at the top (see existing articles for examples).
3. Write your article in Markdown. Use `##` for headings, `**bold**`, `[links](url)`.
4. Put images in `images/` and reference them: `![alt text](images/filename.png)`.
5. Push to GitHub. The site will update automatically.
```

---

## 8. Open Questions

1. **Slug generation:** Use filename (`crude-oil-surges.md` → `crude-oil-surges.html`) or a `slug` field in frontmatter?
2. **Image handling:** Keep images in `content/articles/images/` and copy to output, or reference directly?
3. **Build trigger:** Run on every push, or only when `content/articles/` or `scripts/` changes?
4. **Preview:** Do writers need a local preview (e.g. `npm run build && open articles/...`), or is push-to-GitHub enough?

---

## 9. Recommended Next Step

**Start with Phase 1:** Implement `scripts/build_articles.py` that:

1. Reads `content/articles/*.md`
2. Parses YAML frontmatter (e.g. `python -c "import yaml"` or use `frontmatter` library)
3. Converts Markdown body to HTML (`markdown` or `mistune`)
4. Loads an HTML template (copy of current `crude-oil-top-market-mover.html` with placeholders)
5. Injects metadata + body
6. Writes `articles/{slug}.html`

Once that works for one article, expand to all articles and add `articles.json` generation.
