import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class AgentsPageAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.navOnLoad();
    this.heroReveal();
    this.sectionReveal('.ag-trust', ['.ag-trust__eyebrow', '.ag-trust__row']);
    this.sectionReveal('.ag-variants', [
      '.ag-variants__eyebrow',
      '.ag-variants__headline',
      '.ag-variants__sub',
      '.ag-variants__tabs',
      '.ag-variants__panel.is-active',
    ]);
    this.bindCopyButtons();
    this.bindTabs();
    this.footerAnimations();
    this.navAnimations();
  }

  navOnLoad() {
    if (this.barbaEnter) {
      gsap.set('.nav', { opacity: 1, y: 0 });
    } else {
      gsap.fromTo(
        '.nav',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.1 },
      );
    }
  }

  heroReveal() {
    const tl = gsap.timeline({ delay: this.barbaEnter ? 0.1 : 0.3 });
    tl.to('.ag-hero__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.ag-hero__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('.ag-hero__sub', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.25)
      .to('#ag-main-prompt', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.35)
      .to('.ag-hero__footnote', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.5);
  }

  sectionReveal(trigger, selectors) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });

    selectors.forEach((selector, index) => {
      tl.to(
        selector,
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: 'power3.out',
        },
        index === 0 ? 0 : 0.08 + index * 0.04,
      );
    });
  }

  bindCopyButtons() {
    const buttons = document.querySelectorAll('.ag-prompt__copy');
    buttons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetId = btn.dataset.copyTarget;
        const codeEl = document.getElementById(targetId);
        if (!codeEl) return;

        const text = codeEl.textContent.trim();
        const label = btn.querySelector('.ag-prompt__copy-label');
        const originalLabel = label ? label.textContent : 'Copy';

        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const range = document.createRange();
          range.selectNodeContents(codeEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try { document.execCommand('copy'); } catch { /* noop */ }
          sel.removeAllRanges();
        }

        btn.classList.add('is-copied');
        if (label) label.textContent = 'Copied';

        clearTimeout(btn._copyTimeout);
        btn._copyTimeout = setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label) label.textContent = originalLabel;
        }, 1600);
      });
    });
  }

  bindTabs() {
    const tabs = document.querySelectorAll('.ag-variants__tab');
    const panels = document.querySelectorAll('.ag-variants__panel');
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.variant;

        tabs.forEach((t) => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.panel === target;
          if (isActive) {
            panel.classList.add('is-active');
            gsap.fromTo(
              panel,
              { opacity: 0, y: 12 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' },
            );
          } else {
            panel.classList.remove('is-active');
          }
        });
      });
    });
  }

  navAnimations() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const nav = document.getElementById('nav');
    if (!nav) return;

    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: (self) => {
        if (self.scroll() > 50) nav.classList.add('nav--scrolled');
        else nav.classList.remove('nav--scrolled');
      },
    });
  }

  footerAnimations() {
    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.footer',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
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
        toggleActions: 'play none none none',
      },
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.04,
    });

    gsap.to('.footer__bottom', {
      scrollTrigger: {
        trigger: '.footer__bottom',
        start: 'top 95%',
        toggleActions: 'play none none none',
      },
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
    });
  }
}
