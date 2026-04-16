import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initTicker } from './ticker.js';
import { API_BASE } from './auth-helpers.js';

gsap.registerPlugin(ScrollTrigger);

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildLeadCard(a) {
  const href = `/news/article?id=${a.id}`;
  const coverHtml = a.cover_image
    ? `<div class="np-lead__cover"><img src="${escapeHtml(a.cover_image)}" alt="" loading="lazy"></div>`
    : '';
  return `<a href="${escapeHtml(href)}" class="np-lead${a.cover_image ? ' np-lead--has-cover' : ''}" data-category="${escapeHtml(a.category)}">
    <div class="np-lead__accent"></div>
    <div class="np-lead__body">
      <div>
        <span class="np-lead__tag">${escapeHtml(capitalize(a.category))}</span>
        <span class="np-lead__badge">The Lead</span>
      </div>
      <h2 class="np-lead__title">${escapeHtml(a.title)}</h2>
      <p class="np-lead__excerpt">${escapeHtml(a.excerpt)}</p>
      <div class="np-lead__meta">
        <span class="np-lead__author">${escapeHtml(a.author)}</span>
        <span class="np-lead__date">${formatDate(a.published_at)}</span>
      </div>
    </div>
    ${coverHtml}
  </a>`;
}

function buildFeaturedCard(a) {
  const href = `/news/article?id=${a.id}`;
  const coverHtml = a.cover_image
    ? `<div class="np-feat__cover"><img src="${escapeHtml(a.cover_image)}" alt="" loading="lazy"></div>`
    : '';
  return `<a href="${escapeHtml(href)}" class="np-feat" data-category="${escapeHtml(a.category)}">
    ${coverHtml}
    <div class="np-feat__body">
      <span class="np-feat__tag">${escapeHtml(capitalize(a.category))}</span>
      <h3 class="np-feat__title">${escapeHtml(a.title)}</h3>
      <p class="np-feat__excerpt">${escapeHtml(a.excerpt)}</p>
      <div class="np-feat__meta">
        <span class="np-feat__author">${escapeHtml(a.author)}</span>
        <span class="np-feat__date">${formatDate(a.published_at)}</span>
      </div>
    </div>
  </a>`;
}

function buildStreamCard(a) {
  const href = `/news/article?id=${a.id}`;
  const coverHtml = a.cover_image
    ? `<div class="np-stream__cover"><img src="${escapeHtml(a.cover_image)}" alt="" loading="lazy"></div>`
    : '';
  return `<a href="${escapeHtml(href)}" class="np-stream__item${a.cover_image ? ' np-stream__item--has-cover' : ''}" data-category="${escapeHtml(a.category)}">
    ${coverHtml}
    <div class="np-stream__body">
      <div class="np-stream__top">
        <span class="np-stream__tag">${escapeHtml(capitalize(a.category))}</span>
      </div>
      <h3 class="np-stream__title">${escapeHtml(a.title)}</h3>
      <p class="np-stream__excerpt">${escapeHtml(a.excerpt)}</p>
      <div class="np-stream__meta">
        <span class="np-stream__author">${escapeHtml(a.author)}</span>
        <span class="np-stream__date">${formatDate(a.published_at)}</span>
      </div>
    </div>
  </a>`;
}

export class NewsPageAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.articles = [];
    this.activeFilter = 'all';

    this.navOnLoad();
    this.heroReveal();
    this.loadArticles();
    this.signalsAnimations();
    this.footerAnimations();
    this.navAnimations();
    initTicker();
  }

  navOnLoad() {
    if (this.barbaEnter) {
      gsap.set('.nav', { opacity: 1, y: 0 });
    } else {
      gsap.fromTo('.nav',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.1 }
      );
    }
  }

  heroReveal() {
    const tl = gsap.timeline({ delay: this.barbaEnter ? 0.1 : 0.3 });
    tl.to('.np-hero__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.np-hero__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('.np-hero__sub', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.25)
      .to('.np-feed__filters', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.35);
  }

  async loadArticles() {
    this.containers = {
      lead: document.getElementById('news-lead'),
      featured: document.getElementById('news-featured'),
      stream: document.getElementById('news-stream'),
      empty: document.getElementById('news-empty'),
    };
    if (!this.containers.stream) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/news`);
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      this.articles = data.articles || [];
    } catch {
      this.articles = [];
    }

    if (!this.articles.length) {
      if (this.containers.empty) this.containers.empty.hidden = false;
      return;
    }

    this.renderArticles();
    this.initFilters();
    this.initFilterLine();
  }

  renderArticles(filter = 'all') {
    const { lead, featured, stream, empty } = this.containers;
    const filtered = filter === 'all'
      ? this.articles
      : this.articles.filter(a => a.category === filter);

    if (!filtered.length) {
      lead.innerHTML = '';
      featured.innerHTML = '';
      stream.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    const heroArticle = filtered.find(a => a.card_variant === 'hero') || filtered[0];
    const rest = filtered.filter(a => a !== heroArticle);

    const featuredArticles = rest.slice(0, 2);
    const streamArticles = rest.slice(2);

    lead.innerHTML = buildLeadCard(heroArticle);
    featured.innerHTML = featuredArticles.map((a) => buildFeaturedCard(a)).join('');
    stream.innerHTML = streamArticles.map((a) => buildStreamCard(a)).join('');

    gsap.fromTo(lead.children,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
    );

    const featCards = featured.querySelectorAll('.np-feat');
    if (featCards.length) {
      gsap.fromTo(featCards,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }
      );
    }

    const streamItems = stream.querySelectorAll('.np-stream__item');
    if (streamItems.length) {
      gsap.fromTo(streamItems,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08 }
      );
    }
  }

  initFilters() {
    const { lead, featured, stream, empty } = this.containers;
    const filtersContainer = document.getElementById('news-filters');
    if (!filtersContainer) return;

    filtersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.np-feed__filter');
      if (!btn) return;

      const filter = btn.dataset.filter;
      if (filter === this.activeFilter) return;

      this.activeFilter = filter;

      filtersContainer.querySelectorAll('.np-feed__filter').forEach(b => {
        b.classList.toggle('is-active', b === btn);
      });

      this.moveFilterLine(btn);

      gsap.to([lead, featured, stream], {
        opacity: 0, y: 10, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
          gsap.set([lead, featured, stream], { opacity: 1, y: 0 });
          this.renderArticles(filter);
        }
      });
    });
  }

  initFilterLine() {
    const line = document.getElementById('filter-line');
    const active = document.querySelector('.np-feed__filter.is-active');
    if (!line || !active) return;

    const container = active.parentElement;
    const cRect = container.getBoundingClientRect();
    const bRect = active.getBoundingClientRect();
    line.style.left = `${bRect.left - cRect.left}px`;
    line.style.width = `${bRect.width}px`;
  }

  moveFilterLine(btn) {
    const line = document.getElementById('filter-line');
    if (!line || !btn) return;

    const container = btn.parentElement;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    gsap.to(line, {
      left: bRect.left - cRect.left,
      width: bRect.width,
      duration: 0.4,
      ease: 'power3.out'
    });
  }

  signalsAnimations() {
    const header = document.querySelector('.np-signals__header');
    const panels = document.querySelectorAll('.np-signals__panel');
    if (!header) return;

    gsap.to(header, {
      scrollTrigger: { trigger: header, start: 'top 88%', toggleActions: 'play none none none' },
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out'
    });

    if (panels.length) {
      gsap.to(panels, {
        scrollTrigger: { trigger: panels[0], start: 'top 85%', toggleActions: 'play none none none' },
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15
      });
    }

    const bars = document.querySelectorAll('.np-signals__bar-fill');
    if (bars.length) {
      ScrollTrigger.create({
        trigger: '.np-signals__panel--dark',
        start: 'top 80%',
        toggleActions: 'play none none none',
        onEnter: () => bars.forEach(b => b.classList.add('is-animated'))
      });
    }
  }

  footerAnimations() {
    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    footerTl
      .to('.footer__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.footer__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('.footer__text', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.2)
      .to('.footer__btn', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
      .to('.footer__nav-col', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.15);

    gsap.to('.footer__letter', {
      scrollTrigger: {
        trigger: '.footer__brand',
        start: 'top 92%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.04
    });

    gsap.to('.footer__bottom', {
      scrollTrigger: {
        trigger: '.footer__bottom',
        start: 'top 95%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out'
    });
  }

  navAnimations() {
    ScrollTrigger.create({
      trigger: '.np-hero',
      start: 'bottom top+=72',
      onEnter: () => {
        const nav = document.getElementById('nav');
        if (nav) nav.classList.remove('nav--dark');
      },
      onLeaveBack: () => {
        const nav = document.getElementById('nav');
        if (nav) nav.classList.add('nav--dark');
      }
    });
  }
}

export class ArticlePageAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.navOnLoad();
    this.loadArticle();
    this.footerAnimations();
  }

  navOnLoad() {
    if (this.barbaEnter) {
      gsap.set('.nav', { opacity: 1, y: 0 });
    } else {
      gsap.fromTo('.nav',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.1 }
      );
    }
  }

  async loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/news/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const a = data.article;
      if (!a) throw new Error('empty');

      document.title = `${a.title} - Delphi News`;

      const tagEl = document.getElementById('ar-tag');
      const titleEl = document.getElementById('ar-title');
      const authorEl = document.getElementById('ar-author');
      const dateEl = document.getElementById('ar-date');
      const coverEl = document.getElementById('ar-cover');
      const excerptEl = document.getElementById('ar-excerpt');
      const contentEl = document.getElementById('ar-content');
      const previewEl = document.getElementById('ar-preview');
      const gateEl = document.getElementById('ar-gate');
      const fadeEl = document.getElementById('ar-fade');

      if (tagEl) tagEl.textContent = capitalize(a.category);
      if (titleEl) titleEl.textContent = a.title;
      if (authorEl) authorEl.textContent = a.author;
      if (dateEl) dateEl.textContent = formatDate(a.published_at);
      if (excerptEl) excerptEl.textContent = a.excerpt;

      if (coverEl && a.cover_image) {
        coverEl.src = a.cover_image;
        coverEl.alt = a.title;
        coverEl.hidden = false;
      }

      if (contentEl && a.body) {
        contentEl.innerHTML = a.body;
      }

      if (previewEl) {
        previewEl.style.maxHeight = 'none';
        previewEl.style.overflow = 'visible';
      }
      if (fadeEl) fadeEl.style.display = 'none';
      if (gateEl) gateEl.style.display = 'none';

      this.revealContent(!!a.cover_image);
    } catch {
      const titleEl = document.getElementById('ar-title');
      if (titleEl) titleEl.textContent = 'Article not found';
      this.revealContent(false);
    }
  }

  revealContent(hasCover) {
    const delay = this.barbaEnter ? 0.1 : 0.3;
    const tl = gsap.timeline({ delay });
    tl.to('.ar-hero__back', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
      .to('.ar-hero__tag', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.06)
      .to('.ar-hero__title', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.12)
      .to('.ar-hero__meta', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.25);

    if (hasCover) {
      tl.to('.ar-hero__cover-wrap', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.3);
    }

    tl.to('.ar-body__container', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.4);
  }

  footerAnimations() {
    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    footerTl
      .to('.footer__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.footer__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('.footer__text', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.2)
      .to('.footer__btn', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3)
      .to('.footer__nav-col', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, 0.15);

    gsap.to('.footer__letter', {
      scrollTrigger: {
        trigger: '.footer__brand',
        start: 'top 92%',
        toggleActions: 'play none none none'
      },
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04
    });

    gsap.to('.footer__bottom', {
      scrollTrigger: {
        trigger: '.footer__bottom',
        start: 'top 95%',
        toggleActions: 'play none none none'
      },
      opacity: 1, duration: 0.8, ease: 'power2.out'
    });
  }
}
