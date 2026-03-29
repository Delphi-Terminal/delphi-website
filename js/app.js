import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import barba from '@barba/core';
import { CustomCursor } from './cursor.js';
import { MagneticButton } from './magnetic.js';
import { Loader } from './loader.js';
import { SmoothScroll } from './smooth-scroll.js';
import { ScrollAnimations } from './animations.js';
import { AboutPageAnimations } from './about-animations.js';
import { DataPageAnimations } from './data-animations.js';
import { NewsPageAnimations, ArticlePageAnimations } from './news-animations.js';
import { loadNewsGallery } from './news-feed.js';
import { ContactDialog } from './contact-dialog.js';

gsap.registerPlugin(ScrollTrigger);

let smoothScroll = null;
let animationsInstance = null;
let contactDialog = null;
let contactDialogScrollBound = false;

function showGenericPageChrome(barbaEnter) {
  if (barbaEnter) {
    gsap.set('.nav', { opacity: 1, y: 0 });
  } else {
    gsap.to('.nav', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });
  }

  const footerTargets = [
    '.footer__eyebrow',
    '.footer__headline',
    '.footer__text',
    '.footer__btn',
    '.footer__nav-col',
    '.footer__letter',
    '.footer__bottom',
  ];

  gsap.set(footerTargets, { opacity: 1, y: 0, clearProps: 'transform' });
}

function cleanupPage() {
  ScrollTrigger.getAll().forEach((st) => st.kill());
  ScrollTrigger.clearScrollMemory();
  if (smoothScroll) {
    smoothScroll.destroy();
    smoothScroll = null;
  }
  animationsInstance = null;
  document.body.classList.remove('marquee-lock');
  const nav = document.getElementById('nav');
  if (nav) {
    nav.classList.remove('nav--hero', 'nav--scrolled', 'nav--hidden', 'nav--open', 'nav--dark');
  }
  const burger = document.getElementById('nav-burger');
  if (burger) {
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

function initPageAnimations(namespace, barbaEnter) {
  if (namespace === 'home') {
    animationsInstance = new ScrollAnimations();
    animationsInstance.init({ barbaEnter });
  } else if (namespace === 'about') {
    animationsInstance = new AboutPageAnimations();
    animationsInstance.init({ barbaEnter });
  } else if (namespace === 'data') {
    animationsInstance = new DataPageAnimations();
    animationsInstance.init({ barbaEnter });
  } else if (namespace === 'news') {
    animationsInstance = new NewsPageAnimations();
    animationsInstance.init({ barbaEnter });
  } else if (namespace === 'article') {
    animationsInstance = new ArticlePageAnimations();
    animationsInstance.init({ barbaEnter });
  } else {
    showGenericPageChrome(barbaEnter);
  }
}

function syncNavActive(namespace) {
  const aboutLink = document.querySelector('.nav__links a[href="/about"]');
  const dataLink = document.querySelector('.nav__links a[href="/data"]');
  const newsLink = document.querySelector('.nav__links a[href="/news"]');
  if (aboutLink) {
    if (namespace === 'about') aboutLink.classList.add('nav__link--active');
    else aboutLink.classList.remove('nav__link--active');
  }
  if (dataLink) {
    if (namespace === 'data') dataLink.classList.add('nav__link--active');
    else dataLink.classList.remove('nav__link--active');
  }
  if (newsLink) {
    if (namespace === 'news' || namespace === 'article') newsLink.classList.add('nav__link--active');
    else newsLink.classList.remove('nav__link--active');
  }
}

function bindMagnetic() {
  document.querySelectorAll('.magnetic:not([data-magnetic-bound])').forEach((el) => {
    el.setAttribute('data-magnetic-bound', '1');
    new MagneticButton(el);
  });
}

let hashLinksBound = false;

function bindHashLinks() {
  if (hashLinksBound) return;
  hashLinksBound = true;
  document.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      if (href === '#contact') return;
      const target = document.querySelector(href);
      if (!target || !smoothScroll?.lenis) return;
      e.preventDefault();
      e.stopPropagation();
      smoothScroll.lenis.scrollTo(target, { offset: -80, duration: 1.5 });
    },
    true
  );
}

let crossPageHashBound = false;

function bindCrossPageHashLinks() {
  if (crossPageHashBound) return;
  crossPageHashBound = true;
  document.body.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/#"]');
    if (!a || a.hasAttribute('data-barba-prevent')) return;
    e.preventDefault();
    const raw = a.getAttribute('href');
    const hash = raw.includes('#') ? `#${raw.split('#')[1]}` : '';
    if (hash) sessionStorage.setItem('scrollToHash', hash);
    barba.go('/');
  });
}

function transitionLeave(container, isBack) {
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    const overlay = document.getElementById('page-transition');
    const letters = overlay?.querySelectorAll('.page-transition__letter');
    const numberEl = overlay?.querySelector('.page-transition__number');

    if (overlay) {
      const from = isBack ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)';
      const to = 'inset(0% 0 0% 0)';
      tl.set(overlay, { display: 'block', clipPath: from });
      if (letters?.length) {
        tl.set(letters, { opacity: 0, y: 30 });
      }
      if (numberEl) tl.set(numberEl, { opacity: 0 });
      tl.to(overlay, { clipPath: to, duration: 0.7, ease: 'power3.inOut' }, 0);
      if (letters?.length) {
        tl.to(
          letters,
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' },
          0.35,
        );
      }
      if (numberEl) {
        tl.to(numberEl, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.4);
      }
    }

    const dir = isBack ? 30 : -30;
    tl.to(container, { opacity: 0, y: dir, duration: 0.5, ease: 'power2.in' }, 0);
  });
}

function transitionEnter(container, isBack) {
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(container, { clearProps: 'transform,opacity' });
        ScrollTrigger.refresh();
        resolve();
      },
    });
    const overlay = document.getElementById('page-transition');
    const letters = overlay?.querySelectorAll('.page-transition__letter');
    const numberEl = overlay?.querySelector('.page-transition__number');

    const dir = isBack ? -40 : 40;
    tl.set(container, { opacity: 0, y: dir });

    if (letters?.length) {
      tl.to(
        letters,
        { opacity: 0, y: -12, duration: 0.32, stagger: { each: 0.02, from: 'end' }, ease: 'power2.in' },
        0,
      );
    }
    if (numberEl) tl.to(numberEl, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);

    tl.to(container, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.3);

    if (overlay) {
      const to = isBack ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
      tl.to(overlay, { clipPath: to, duration: 0.7, ease: 'power3.inOut' }, 0.2);
      tl.set(overlay, { display: 'none' }, 1.0);
    }

    tl.to('.nav', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.4);
  });
}

function bootBarba() {
  barba.init({
    preventRunning: true,
    transitions: [
      {
        name: 'cinematic',
        async leave(data) {
          const isBack = data.trigger === 'popstate' || data.trigger === 'back';
          await transitionLeave(data.current.container, isBack);
          cleanupPage();
          data.current.container.remove();
        },
        async enter(data) {
          const isBack = data.trigger === 'popstate' || data.trigger === 'back';

          const pendingHash = sessionStorage.getItem('scrollToHash');
          if (pendingHash) sessionStorage.removeItem('scrollToHash');

          window.scrollTo(0, 0);

          try {
            const doc = new DOMParser().parseFromString(data.next.html, 'text/html');
            if (doc.title) document.title = doc.title;

            const currentHrefs = new Set(
              Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .map(l => l.getAttribute('href'))
            );
            const loadPromises = [];
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
              const href = link.getAttribute('href');
              if (href && !currentHrefs.has(href)) {
                const el = document.createElement('link');
                el.rel = 'stylesheet';
                el.href = href;
                loadPromises.push(new Promise(r => { el.onload = r; el.onerror = r; }));
                document.head.appendChild(el);
              }
            });
            if (loadPromises.length) await Promise.all(loadPromises);
          } catch (_) {}

          const nav = document.getElementById('nav');
          const ns = data.next.namespace;
          if (nav) nav.classList.toggle('nav--dark', ns === 'about' || ns === 'news' || ns === 'article');
          syncNavActive(ns);

          smoothScroll = new SmoothScroll();
          smoothScroll.init();

          gsap.set(data.next.container, { opacity: 0, y: isBack ? -40 : 40 });

          if (ns === 'home') {
            try {
              await loadNewsGallery();
            } catch {}
          }

          initPageAnimations(ns, true);

          await transitionEnter(data.next.container, isBack);

          if (pendingHash) {
            const el = document.querySelector(pendingHash);
            if (el && smoothScroll.lenis) {
              requestAnimationFrame(() => {
                smoothScroll.lenis.scrollTo(el, { offset: -80, duration: 1.2 });
              });
            }
          }

          bindMagnetic();
        },
      },
    ],
  });
}

function bindContactDialogScrollLock() {
  if (contactDialogScrollBound) return;
  contactDialogScrollBound = true;
  document.addEventListener('contact-dialog:toggle', (e) => {
    if (!smoothScroll) return;
    if (e.detail?.open) smoothScroll.stop();
    else smoothScroll.start();
  });
}

function initBurgerMenu() {
  const burger = document.getElementById('nav-burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  function closeMenu() {
    burger.classList.remove('is-open');
    nav.classList.remove('nav--open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('nav--open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  new CustomCursor();
  contactDialog = new ContactDialog();
  contactDialog.init();
  initBurgerMenu();

  const namespace = document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace;

  smoothScroll = new SmoothScroll();
  smoothScroll.init();

  if (smoothScroll.lenis) {
    smoothScroll.lenis.scrollTo(0, { immediate: true });
  }

  const loader = new Loader(async () => {
    if (namespace === 'home') {
      try {
        await loadNewsGallery();
      } catch {}
    }
    initPageAnimations(namespace, false);
    syncNavActive(namespace);
    bindMagnetic();
    bindHashLinks();
    bootBarba();
    bindCrossPageHashLinks();
    bindContactDialogScrollLock();
  });

  loader.start();
  loader.modelReady();
});
