#!/usr/bin/env python3
"""
Delphi News — Article Build Script
==========================================
Reads Markdown files from content/articles/*.md, parses YAML frontmatter,
converts body to HTML, injects into a shared template, and writes to articles/*.html.
Also generates articles.json for news/homepage listings.

Usage:
  python scripts/build_articles.py

Requires: markdown, pyyaml (see scripts/requirements.txt)
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

import markdown
import yaml

# Paths (relative to repo root)
REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = REPO_ROOT / "content" / "articles"
OUTPUT_DIR = REPO_ROOT / "articles"
TEMPLATE_PATH = REPO_ROOT / "scripts" / "templates" / "article.html"
ARTICLES_JSON = REPO_ROOT / "articles.json"

# Image placeholder in Markdown body; replaced with figure HTML from frontmatter
IMAGE_PLACEHOLDER = "[[IMAGE]]"


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Split frontmatter and body. Return (frontmatter_dict, body_str)."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if not match:
        raise ValueError("Missing or invalid YAML frontmatter (expected --- ... ---)")
    fm_raw, body = match.group(1), match.group(2)
    fm = yaml.safe_load(fm_raw)
    if not isinstance(fm, dict):
        raise ValueError("Frontmatter must be a YAML object")
    return fm, body.strip()


def format_date(d) -> tuple[str, str]:
    """Return (iso_date, display_date) e.g. ('2026-03-17', 'Mar 17, 2026')."""
    if d is None:
        return "", ""
    if hasattr(d, "strftime"):  # date or datetime
        return d.strftime("%Y-%m-%d"), d.strftime("%b %d, %Y")
    s = str(d).strip()
    try:
        dt = datetime.strptime(s, "%Y-%m-%d")
        return s, dt.strftime("%b %d, %Y")
    except ValueError:
        return s, s


def build_figure_html(image: str, alt: str, caption: str) -> str:
    """Build figure block for article body."""
    return (
        f'<figure class="article__figure">\n'
        f'  <img src="{image}" alt="{alt}" class="article__figure-img" />\n'
        f'  <figcaption class="article__figure-caption">{caption}</figcaption>\n'
        f"</figure>"
    )


def process_article(md_path: Path, template: str) -> tuple[str, dict]:
    """
    Process one .md file. Return (html_content, metadata_dict for articles.json).
    """
    raw = md_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)

    slug = fm.get("slug") or md_path.stem
    title = fm["title"]
    category = fm.get("category", "News")
    author = fm.get("author", "")
    date_str = fm.get("date", "")
    excerpt = fm.get("excerpt", "")
    image = fm.get("image", "")
    image_alt = fm.get("imageAlt", title)
    image_caption = fm.get("imageCaption", "")

    date_iso, date_display = format_date(date_str) if date_str else ("", "")

    # Convert Markdown to HTML
    md_extensions = ["extra", "nl2br"]
    html_body = markdown.markdown(body, extensions=md_extensions)

    # Replace [[IMAGE]] with figure HTML (markdown may wrap it in <p>)
    if image and IMAGE_PLACEHOLDER in html_body:
        fig_html = build_figure_html(image, image_alt, image_caption)
        html_body = html_body.replace(IMAGE_PLACEHOLDER, fig_html)
        html_body = re.sub(r"<p>\s*</p>", "", html_body)  # remove empty <p> left behind
        html_body = re.sub(r"<p>\s*<figure", "<figure", html_body)  # fix <p><figure>
        html_body = re.sub(r"</figure>\s*</p>", "</figure>", html_body)

    # Apply template
    page_title = f"{title} — Delphi News"
    html = template.replace("{{ PAGE_TITLE }}", page_title)
    html = html.replace("{{ KICKER }}", category)
    html = html.replace("{{ HEADLINE }}", title)
    html = html.replace("{{ DEK }}", excerpt)
    html = html.replace("{{ AUTHOR }}", author)
    html = html.replace("{{ DATE_ISO }}", date_iso)
    html = html.replace("{{ DATE_DISPLAY }}", date_display)
    html = html.replace("{{ BODY }}", html_body)

    date_short = date_display.split(",")[0].strip() if date_display else ""
    meta = {
        "slug": slug,
        "title": title,
        "category": category,
        "author": author,
        "date": date_display,
        "dateShort": date_short,
        "excerpt": excerpt,
        "image": image,
        "url": f"articles/{slug}.html",
    }
    return html, meta


def main() -> None:
    if not CONTENT_DIR.exists():
        print(f"Content dir not found: {CONTENT_DIR}")
        return

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    articles_meta = []
    for md_path in sorted(CONTENT_DIR.glob("*.md")):
        try:
            html, meta = process_article(md_path, template)
            out_path = OUTPUT_DIR / f"{meta['slug']}.html"
            out_path.write_text(html, encoding="utf-8")
            articles_meta.append(meta)
            print(f"Built: {out_path.name}")
        except Exception as e:
            print(f"Error processing {md_path.name}: {e}")
            raise

    # Write articles.json
    ARTICLES_JSON.write_text(json.dumps(articles_meta, indent=2), encoding="utf-8")
    print(f"Wrote: {ARTICLES_JSON}")


if __name__ == "__main__":
    main()
