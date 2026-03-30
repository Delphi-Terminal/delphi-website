import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { API_BASE } from './auth-helpers.js';

gsap.registerPlugin(ScrollTrigger);

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function cardClasses(variant) {
  const base = 'news__card';
  const map = {
    hero: `${base} ${base}--hero`,
    tall: `${base} ${base}--tall`,
    wide: `${base} ${base}--wide`,
    default: base,
  };
  return map[variant] || map.default;
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildCard(a) {
  const href = `/news/article?id=${a.id}`;
  const img = a.cover_image
    ? `<div class="news__card-cover"><img src="${escapeHtml(a.cover_image)}" alt="" loading="lazy"></div>`
    : '';
  const hasCover = a.cover_image ? ' has-cover' : '';
  return `<a href="${escapeHtml(href)}" class="${cardClasses(a.card_variant)}${hasCover}" data-category="${escapeHtml(
    a.category
  )}">
      ${img}
      <div class="news__card-inner">
        <span class="news__card-tag">${escapeHtml(capitalize(a.category))}</span>
        <h3 class="news__card-title">${escapeHtml(a.title)}</h3>
        <p class="news__card-excerpt">${escapeHtml(a.excerpt)}</p>
        <div class="news__card-meta">
          <span class="news__card-author">${escapeHtml(a.author)}</span>
          <span class="news__card-date">${formatDate(a.published_at)}</span>
        </div>
      </div>
    </a>`;
}

const MAX_HOME_CARDS = 7;

export async function loadNewsGallery() {
  const gallery = document.getElementById('news-gallery');
  if (!gallery) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/news`);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    const articles = data.articles || [];
    if (!articles.length) {
      gallery.innerHTML =
        '<p class="news__intro" style="grid-column:1/-1;">No articles yet.</p>';
      return;
    }
    const limited = articles.slice(0, MAX_HOME_CARDS);
    gallery.innerHTML = limited.map((a) => buildCard(a)).join('');
    animateGallery(gallery);
  } catch {
    gallery.innerHTML =
      '<p class="news__intro" style="grid-column:1/-1;">News feed unavailable.</p>';
  }
}

function animateGallery(gallery) {
  const cards = gallery.querySelectorAll('.news__card');
  if (!cards.length) return;

  // Set all cards to their initial hidden state
  gsap.set(cards, { opacity: 0, y: 32 });

  ScrollTrigger.create({
    trigger: gallery,
    start: 'top 88%',
    once: true,
    onEnter: () => {
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.045,
      });
    },
  });
}
