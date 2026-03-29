import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class DataPageAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.navOnLoad();
    this.sectionReveal('.dp-pricing', ['.dp-pricing__eyebrow', '.dp-pricing__headline', '.dp-pricing__card']);
    this.sectionReveal('.dp-why', ['.dp-why__eyebrow', '.dp-why__item']);
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

  sectionReveal(trigger, selectors) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });

    selectors.forEach((selector, index) => {
      tl.to(selector, {
        opacity: 1,
        y: 0,
        duration: selector.includes('__card') || selector.includes('__item') ? 0.85 : 0.65,
        stagger: selector.includes('__card') || selector.includes('__item') ? 0.1 : 0,
        ease: 'power3.out'
      }, index === 0 ? 0 : 0.1 + (index * 0.05));
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
      }
    });
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
      y: 0,
      duration: 0.6,
      ease: 'power3.out'
    });
  }
}
