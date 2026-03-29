import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export class SmoothScroll {
  constructor() {
    this.lenis = null;
    this._raf = null;
  }

  init() {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    this.lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    this._raf = (time) => {
      if (this.lenis) this.lenis.raf(time * 1000);
    };
    gsap.ticker.add(this._raf);
    gsap.ticker.lagSmoothing(0);
  }

  destroy() {
    if (this._raf) {
      gsap.ticker.remove(this._raf);
      this._raf = null;
    }
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
  }

  stop() {
    if (this.lenis) this.lenis.stop();
  }

  start() {
    if (this.lenis) this.lenis.start();
  }
}
