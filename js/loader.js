import gsap from 'gsap';

export class Loader {
  constructor(onComplete) {
    this.preloader = document.getElementById('preloader');
    this.numberEl = document.getElementById('preloader-number');
    this.letters = this.preloader?.querySelectorAll('.preloader__letter');
    this.onComplete = onComplete;
    this.progress = 0;
    this.displayProgress = 0;
    this.isModelLoaded = false;
    this.rafId = null;
    this.totalLetters = this.letters ? this.letters.length : 0;
    this.litCount = 0;
  }

  start() {
    gsap.to(this.letters, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      stagger: 0.04,
      onComplete: () => {
        this.tickProgress();
      }
    });

    gsap.fromTo(this.numberEl, { opacity: 0 }, {
      opacity: 1,
      duration: 0.5,
      delay: 0.3,
      ease: 'power2.out'
    });
  }

  setProgress(val) {
    this.progress = Math.min(val, 100);
  }

  tickProgress() {
    this.rafId = requestAnimationFrame(() => this.tickProgress());

    const target = this.isModelLoaded ? 100 : Math.min(this.progress, 95);
    this.displayProgress += (target - this.displayProgress) * 0.2;

    const rounded = Math.round(this.displayProgress);
    this.numberEl.textContent = rounded;

    const shouldLight = Math.floor((this.displayProgress / 100) * this.totalLetters);
    while (this.litCount < shouldLight && this.litCount < this.totalLetters) {
      this.letters[this.litCount].classList.add('is-lit');
      this.litCount++;
    }

    if (rounded >= 100 && this.isModelLoaded) {
      cancelAnimationFrame(this.rafId);
      for (let i = this.litCount; i < this.totalLetters; i++) {
        this.letters[i].classList.add('is-lit');
      }

      if (this.onComplete) {
        const fn = this.onComplete;
        this.onComplete = null;
        Promise.resolve(fn()).then(() => {
          setTimeout(() => this.reveal(), 500);
        });
        return;
      }

      setTimeout(() => this.reveal(), 500);
    }
  }

  modelReady() {
    this.isModelLoaded = true;
    this.progress = 100;
  }

  reveal() {
    const heroBrand = document.getElementById('hero-brand');
    const heroLetters = heroBrand?.querySelectorAll('.hero__brand-letter');
    const bg = document.getElementById('preloader-bg');
    const veil = document.getElementById('preloader-veil');

    const brandHidden = !heroBrand || !heroLetters?.length || heroBrand.offsetParent === null;
    if (brandHidden) {
      const tl = gsap.timeline({
        onComplete: () => {
          this.preloader.style.display = 'none';
          document.documentElement.classList.add('is-loader-complete');
          if (this.onComplete) this.onComplete();
        }
      });
      tl.to(this.preloader, { opacity: 0, duration: 0.5 });
      return;
    }

    const heroRect = heroBrand.getBoundingClientRect();
    const preloaderRect = this.preloader.querySelector('.preloader__brand').getBoundingClientRect();

    const heroLetterStyle = window.getComputedStyle(heroLetters[0]);
    const targetFontSize = parseFloat(heroLetterStyle.fontSize);
    const currentFontSize = parseFloat(window.getComputedStyle(this.letters[0]).fontSize);
    const scaleRatio = targetFontSize / currentFontSize;

    const deltaY = heroRect.top + heroRect.height / 2 - (preloaderRect.top + preloaderRect.height / 2);
    const deltaX = heroRect.left + heroRect.width / 2 - (preloaderRect.left + preloaderRect.width / 2);

    const preloader = this.preloader;

    const tl = gsap.timeline({
      onComplete: () => {
        preloader.style.display = 'none';
        document.documentElement.classList.add('is-loader-complete');
        heroLetters.forEach(l => {
          l.style.opacity = 1;
          l.style.transform = 'none';
        });
      }
    });

    tl.to(this.numberEl, {
      opacity: 0, duration: 0.3, ease: 'power2.in'
    }, 0)

    .to('.preloader__letter', {
      color: '#f4f5f8',
      '-webkit-text-stroke-color': '#f4f5f8',
      duration: 0.8,
      ease: 'power2.inOut'
    }, 0.2)

    .to(this.preloader, {
      backgroundColor: 'transparent', duration: 1.0, ease: 'power2.inOut'
    }, 0.6)

    .to('.preloader__brand', {
      x: deltaX, y: deltaY, scale: scaleRatio,
      duration: 1.3, ease: 'power3.inOut'
    }, 0.9)

    .call(() => {
      preloader.style.display = 'none';
      document.documentElement.classList.add('is-loader-complete');
      heroLetters.forEach(l => {
        l.style.opacity = 1;
        l.style.transform = 'none';
      });
    }, null, 2.2);
  }
}
