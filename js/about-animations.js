import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const isMobile = window.matchMedia('(max-width: 768px)').matches;

export class AboutPageAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.heroReveal();
    this.scrollProgress();
    this.navAnimations();
    this.pageFlowAnimations();
    this.storyAndOfferingsAnimations();
    this.communityAnimations();
    this.footerAnimations();
  }

  heroReveal() {
    if (this.barbaEnter) {
      gsap.set('.nav', { opacity: 1, y: 0 });
    }

    const tl = gsap.timeline({ delay: 0.06 });

    if (!this.barbaEnter) {
      tl.to('.nav', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.12);
    }

    const name      = document.querySelector('.ab-hero__name');
    const statement = document.querySelector('.ab-hero__statement');

    if (statement) {
      tl.fromTo(statement, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, 0.1);
    }
    if (name) {
      tl.fromTo(name, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.35);
    }
  }

  storyAndOfferingsAnimations() {
    // Story
    const storyEyebrow  = document.querySelector('.ab-story__eyebrow');
    const storyHeadline = document.querySelector('.ab-story__headline');
    const storyCols     = document.querySelectorAll('.ab-story__bodycol');

    if (storyEyebrow) {
      gsap.fromTo(storyEyebrow,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
          scrollTrigger: { trigger: storyEyebrow, start: 'top 88%', once: true } }
      );
    }
    if (storyHeadline) {
      gsap.fromTo(storyHeadline,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: storyHeadline, start: 'top 88%', once: true } }
      );
    }
    if (storyCols.length) {
      gsap.fromTo(storyCols,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: storyCols[0], start: 'top 88%', once: true } }
      );
    }

    // Offerings
    const offItems = document.querySelectorAll('.ab-offerings__item');

    if (offItems.length) {
      gsap.fromTo(offItems,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: offItems[0], start: 'top 88%', once: true } }
      );
    }
  }

  scrollProgress() {
    if (isMobile) return;
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    gsap.to(bar, {
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.1,
      },
      scaleX: 1,
      ease: 'none',
    });
  }

  navAnimations() {
    if (isMobile) return;
    const nav = document.getElementById('nav');
    const threshold = 50;

    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: (self) => {
        const scrollY = self.scroll();
        if (scrollY > threshold) {
          nav.classList.add('nav--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
        }
      },
    });
  }

  pageFlowAnimations() {
    // ab-lux header reveal
    const luxHeader = document.querySelector('.ab-lux__header');
    if (luxHeader) {
      const brand    = luxHeader.querySelector('.ab-lux__eyebrow-brand');
      const title    = luxHeader.querySelector('.ab-lux__title');
      const subtitle = luxHeader.querySelector('.ab-lux__subtitle');
      const rule     = luxHeader.querySelector('.ab-lux__rule');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: luxHeader, start: 'top 88%', once: true }
      });
      if (brand)    tl.fromTo(brand,    { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, 0);
      if (title)    tl.fromTo(title,    { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' }, 0.1);
      if (subtitle) tl.fromTo(subtitle, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5,  ease: 'power3.out' }, 0.2);
      if (rule)     tl.fromTo(rule,     { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power2.inOut', transformOrigin: 'center' }, 0.28);
    }

    const firstRow = document.querySelector('.ab-lux__flow > .ab-lux__row:first-of-type');

    document.querySelectorAll('.ab-lux__profile').forEach((el) => {
      if (firstRow && el.closest('.ab-lux__row') === firstRow) return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 40 },
        {
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 48%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    });

    document.querySelectorAll('.ab-lux__text').forEach((el) => {
      if (firstRow && el.closest('.ab-lux__row') === firstRow) return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 52%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    });

    const badges = document.querySelector('.ab-lux__badges');
    if (badges) {
      gsap.fromTo(
        badges,
        { opacity: 0, y: 28 },
        {
          scrollTrigger: { trigger: badges, start: 'top 88%', end: 'top 42%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    }

    const studioHead = document.querySelector('.ab-lux__studio-head');
    if (studioHead) {
      gsap.fromTo(
        studioHead,
        { opacity: 0, y: 26 },
        {
          scrollTrigger: { trigger: studioHead, start: 'top 90%', end: 'top 55%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    }

    const studioLede = document.querySelector('.ab-lux__studio-lede');
    if (studioLede) {
      gsap.fromTo(
        studioLede,
        { opacity: 0, y: 18 },
        {
          scrollTrigger: { trigger: studioLede, start: 'top 92%', end: 'top 60%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    }

    document.querySelectorAll('.ab-lux__team-member').forEach((member) => {
      gsap.fromTo(
        member,
        { opacity: 0, y: 28 },
        {
          scrollTrigger: { trigger: member, start: 'top 92%', end: 'top 58%', scrub: 1 },
          opacity: 1,
          y: 0,
          ease: 'none',
        },
      );
    });
  }

  communityAnimations() {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.ab-community',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });

    tl.to('.ab-community__copy', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    }    ).to(
      '.ab-community__socials .social-pill',
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: 'power3.out',
      },
      0.12,
    ).to(
      '.ab-community__cta',
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
      },
      '>0.1',
    );
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
      duration: 0.8,
      ease: 'power2.out',
    });
  }
}
