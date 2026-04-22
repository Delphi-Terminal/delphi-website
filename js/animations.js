import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextSplit } from './text-split.js';

gsap.registerPlugin(ScrollTrigger);

const isMobile = window.matchMedia('(max-width: 768px)').matches;

export class ScrollAnimations {
  init(options = {}) {
    this.barbaEnter = options.barbaEnter === true;
    this.heroReveal();

    if (isMobile) {
      this.heroMobileReveal();
    } else {
      this.heroParallax();
    }

    this.postHeroTransition();
    this.scrollProgress();
    this.navAnimations();
    this.aboutAnimations();

    this.timelineReveal();
    this.timelineAnimations();
    this.newsAnimations();
    this.footerAnimations();
  }

  heroReveal() {
    if (this.barbaEnter) {
      gsap.to('.nav', { opacity: 1, y: 0, duration: 1, ease: 'power4.out', delay: 0.2 });
    } else {
      gsap.to('.nav', { opacity: 1, y: 0, duration: 1.8, ease: 'power4.out', delay: 1.6 });
    }

    const heroLetters = document.querySelectorAll('.hero__brand-letter');
    if (heroLetters.length) {
      if (this.barbaEnter) {
        gsap.fromTo(heroLetters,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.04, delay: 0.3 }
        );
      }
    }

    const scrollHint = document.getElementById('hero-scroll-hint');
    if (scrollHint) {
      const hintDelay = this.barbaEnter ? 1.0 : 2.8;
      const hintDur = this.barbaEnter ? 0.9 : 1.2;
      gsap.fromTo(scrollHint,
        { opacity: 0 },
        { opacity: 1, duration: hintDur, ease: 'power3.out', delay: hintDelay }
      );
    }
  }

  heroParallax() {
    const VIDEO_SRC = '/assets/hero.mp4';

    const canvas = document.getElementById('hero-canvas');
    const hero = document.getElementById('hero');
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const DPR = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const video = document.createElement('video');
    video.src = VIDEO_SRC;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');

    let videoReady = false;
    let videoDuration = 0;
    let lastSeekTime = -1;
    let contextLost = false;
    let hasRVFC = typeof video.requestVideoFrameCallback === 'function';
    let coverDx = 0, coverDy = 0, coverDw = 0, coverDh = 0;

    canvas.addEventListener('contextlost', (e) => {
      e.preventDefault();
      contextLost = true;
    });
    canvas.addEventListener('contextrestored', () => {
      contextLost = false;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      drawVideoFrame();
    });

    function updateCoverMetrics() {
      const cw = canvas.width;
      const ch = canvas.height;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const scale = Math.max(cw / vw, ch / vh);
      coverDw = vw * scale;
      coverDh = vh * scale;
      coverDx = (cw - coverDw) / 2;
      coverDy = (ch - coverDh) / 2;
    }

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      updateCoverMetrics();
      drawVideoFrame();
    }

    function drawVideoFrame() {
      if (contextLost || !videoReady) return;
      if (video.readyState < 2) return;
      if (!coverDw) return;
      ctx.drawImage(video, coverDx, coverDy, coverDw, coverDh);
    }

    function scheduleRVFC() {
      if (!hasRVFC) return;
      video.requestVideoFrameCallback(() => {
        drawVideoFrame();
        scheduleRVFC();
      });
    }

    function seekTo(time, force = false) {
      if (!videoReady) return;
      const t = Math.max(0, Math.min(time, videoDuration));
      if (!force && Math.abs(t - lastSeekTime) < 0.005) return;
      lastSeekTime = t;
      video.currentTime = t;
    }

    video.addEventListener('seeked', drawVideoFrame);

    video.addEventListener('loadeddata', () => {
      videoDuration = video.duration;
      videoReady = true;
      video.currentTime = 0;
      updateCoverMetrics();
      resize();
      scheduleRVFC();
    });

    window.addEventListener('resize', resize);
    resize();

    const brand = document.getElementById('hero-brand');
    const brandLetters = brand ? Array.from(brand.querySelectorAll('.hero__brand-letter')) : [];
    const p1 = document.getElementById('hero-p1');
    const p2 = document.getElementById('hero-p2');
    const p3 = document.getElementById('hero-p3');
    const p4 = document.getElementById('hero-p4');
    const veil = document.getElementById('hero-veil');

    let lastHeroProgress = 0;
    let idleTimer = null;
    let idleMotionTl = null;
    const IDLE_DEBOUNCE_MS = 320;

    function stopHeroIdleMotion() {
      if (!idleMotionTl) return;
      idleMotionTl.kill();
      idleMotionTl = null;
      gsap.to(canvas, {
        scale: 1, rotation: 0, xPercent: 0, yPercent: 0,
        duration: 0.5, ease: 'power2.out', overwrite: true,
      });
    }

    function startHeroIdleMotion() {
      if (!canvas?.isConnected) return;
      if (lastHeroProgress >= 0.998) return;
      if (idleMotionTl) return;
      gsap.set(canvas, { transformOrigin: '50% 50%' });
      idleMotionTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
      idleMotionTl.fromTo(canvas,
        { scale: 1, rotation: 0, xPercent: 0, yPercent: 0 },
        { scale: 1.06, rotation: 0.6, xPercent: -0.2, yPercent: 0.1, duration: 8 }
      );
    }

    function scheduleIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { idleTimer = null; startHeroIdleMotion(); }, IDLE_DEBOUNCE_MS);
    }

    scheduleIdle();

    const scatterVecs = brandLetters.map((_, i) => {
      const angle = (Math.PI * 2 * i) / (brandLetters.length || 1) + (Math.random() - 0.5) * 0.9;
      const dist = 100 + Math.random() * 180;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 50,
        r: (Math.random() - 0.5) * 100,
        s: 0.3 + Math.random() * 0.35,
      };
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=500%',
        pin: true,
        scrub: 0.3,
        onUpdate: (self) => {
          const p = self.progress;
          lastHeroProgress = p;
          seekTo(p * videoDuration);

          if (idleMotionTl) stopHeroIdleMotion();
          clearTimeout(idleTimer);
          idleTimer = null;
          scheduleIdle();

          const scatterIn = 0.02;
          const scatterOut = 0.09;
          const loaderComplete = document.documentElement.classList.contains('is-loader-complete');
          if (loaderComplete) {
            if (p <= scatterIn) {
              brandLetters.forEach(l => {
                l.style.opacity = '1';
                l.style.transform = '';
              });
            } else if (p >= scatterOut) {
              brandLetters.forEach(l => {
                l.style.opacity = '0';
              });
            } else {
              const t = (p - scatterIn) / (scatterOut - scatterIn);
              const ease = t * t * t;
              brandLetters.forEach((l, i) => {
                const sv = scatterVecs[i];
                l.style.opacity = String(1 - ease);
                l.style.transform =
                  `translate(${sv.x * ease}px, ${sv.y * ease}px) rotate(${sv.r * ease}deg) scale(${1 - (1 - sv.s) * ease})`;
              });
            }
          }

        }
      }
    });

    const p1Chars = p1 ? p1.querySelectorAll('.hero__p1-char') : [];
    const p1Label = p1?.querySelector('.hero__p1-label');
    const p1Sub = p1?.querySelector('.hero__p1-sub');

    if (p1) {
      tl.set(p1, { opacity: 1 }, 0.10);

      p1Chars.forEach((ch, i) => {
        gsap.set(ch, { clipPath: 'inset(0 100% 0 0)', opacity: 0 });
        tl.to(ch, {
          clipPath: 'inset(0 0% 0 0)', opacity: 1,
          duration: 0.04, ease: 'power2.out',
        }, 0.105 + i * 0.018);
      });

      if (p1Label) {
        gsap.set(p1Label, { x: -40, opacity: 0 });
        tl.to(p1Label, { x: 0, opacity: 1, duration: 0.04, ease: 'power3.out' }, 0.11);
      }

      if (p1Sub) {
        gsap.set(p1Sub, { x: 50, opacity: 0 });
        tl.to(p1Sub, { x: 0, opacity: 1, duration: 0.05, ease: 'power3.out' }, 0.14);
      }

      tl.to(p1Chars, {
        scale: 0.6, opacity: 0, stagger: 0.008, duration: 0.04, ease: 'power2.in'
      }, 0.24);
      if (p1Label) tl.to(p1Label, { x: 40, opacity: 0, duration: 0.03, ease: 'power2.in' }, 0.24);
      if (p1Sub) tl.to(p1Sub, { x: -40, opacity: 0, duration: 0.03, ease: 'power2.in' }, 0.24);
      tl.set(p1, { opacity: 0 }, 0.29);
    }

    const p2Rule = p2?.querySelector('.hero__p2-rule');
    const p2Label = p2?.querySelector('.hero__p2-label');
    const p2Main = p2?.querySelector('.hero__p2-main');
    const p2Em = p2?.querySelector('.hero__p2-main em');
    const p2Strong = p2?.querySelector('.hero__p2-main strong');

    if (p2) {
      tl.set(p2, { opacity: 1 }, 0.30);

      if (p2Rule) {
        tl.to(p2Rule, { scaleY: 1, duration: 0.05, ease: 'power2.out' }, 0.305);
      }
      if (p2Label) {
        gsap.set(p2Label, { opacity: 0, y: 20 });
        tl.to(p2Label, { opacity: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.33);
      }
      if (p2Em) {
        gsap.set(p2Em, { opacity: 0, x: 50 });
        tl.to(p2Em, { opacity: 1, x: 0, duration: 0.05, ease: 'power3.out' }, 0.32);
      }
      if (p2Strong) {
        gsap.set(p2Strong, { opacity: 0, x: -40 });
        tl.to(p2Strong, { opacity: 1, x: 0, duration: 0.05, ease: 'power3.out' }, 0.34);
      }

      tl.to(p2, {
        opacity: 0, scale: 1.04, filter: 'blur(10px)',
        duration: 0.04, ease: 'power2.in'
      }, 0.45);
      tl.set(p2, { clearProps: 'filter,scale' }, 0.50);
    }

    const p3Divider = p3?.querySelector('.hero__p3-divider');
    const p3Cols = p3 ? p3.querySelectorAll('.hero__p3-col') : [];

    if (p3) {
      tl.set(p3, { opacity: 1 }, 0.52);

      if (p3Divider) {
        tl.to(p3Divider, { scaleY: 1, duration: 0.04, ease: 'power2.out' }, 0.525);
      }

      if (p3Cols.length >= 2) {
        gsap.set(p3Cols[0], { opacity: 0, x: 60 });
        gsap.set(p3Cols[1], { opacity: 0, x: -60 });
        tl.to(p3Cols[0], { opacity: 1, x: 0, duration: 0.05, ease: 'power3.out' }, 0.54);
        tl.to(p3Cols[1], { opacity: 1, x: 0, duration: 0.05, ease: 'power3.out' }, 0.56);
      }

      if (p3Cols.length >= 2) {
        tl.to(p3Cols[0], { x: 40, opacity: 0, duration: 0.03, ease: 'power2.in' }, 0.65);
        tl.to(p3Cols[1], { x: -40, opacity: 0, duration: 0.03, ease: 'power2.in' }, 0.65);
      }
      if (p3Divider) tl.to(p3Divider, { scaleY: 0, duration: 0.03, ease: 'power2.in' }, 0.66);
      tl.set(p3, { opacity: 0 }, 0.69);
    }

    const p4Eyebrow = p4?.querySelector('.hero__p4-eyebrow');
    const p4Num = p4?.querySelector('.hero__p4-num');
    const p4Words = p4 ? p4.querySelectorAll('.hero__p4-word') : [];
    const p4Sub = p4?.querySelector('.hero__p4-sub');
    const p4Rule = p4?.querySelector('.hero__p4-rule');
    const p4Btn = p4?.querySelector('.hero__cta-btn');

    if (p4) {
      tl.set(p4, { opacity: 1 }, 0.72);

      if (p4Eyebrow) {
        gsap.set(p4Eyebrow, { opacity: 0, y: 15 });
        tl.to(p4Eyebrow, { opacity: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.73);
      }

      if (p4Num) {
        gsap.set(p4Num, { opacity: 0, scale: 0.7 });
        tl.to(p4Num, { opacity: 1, scale: 1, duration: 0.06, ease: 'power3.out' }, 0.735);
      }

      p4Words.forEach((word, i) => {
        gsap.set(word, { opacity: 0, y: 20 });
        tl.to(word, { opacity: 1, y: 0, duration: 0.05, ease: 'power3.out' }, 0.75 + i * 0.02);
      });

      if (p4Sub) {
        gsap.set(p4Sub, { opacity: 0, y: 12 });
        tl.to(p4Sub, { opacity: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.80);
      }

      if (p4Rule) {
        tl.to(p4Rule, { scaleX: 1, duration: 0.05, ease: 'power2.out' }, 0.82);
      }

      if (p4Btn) {
        gsap.set(p4Btn, { opacity: 0, y: 15 });
        tl.to(p4Btn, { opacity: 1, y: 0, duration: 0.04, ease: 'power3.out' }, 0.84);
      }

      tl.to(p4, { opacity: 0, y: -30, duration: 0.04, ease: 'power2.in' }, 0.92);
    }

    const heroFade = document.getElementById('hero-fade');
    if (heroFade) {
      tl.to(heroFade, { opacity: 1, duration: 0.08, ease: 'power2.inOut' }, 0.92);
    }

  }

  heroMobileReveal() {
    const mobileBlock = document.getElementById('hero-mobile');
    if (!mobileBlock) return;

    const eyebrow = mobileBlock.querySelector('.hero__mobile-eyebrow');
    const headline = mobileBlock.querySelector('.hero__mobile-headline');
    const sub = mobileBlock.querySelector('.hero__mobile-sub');
    const cta = mobileBlock.querySelector('.hero__cta-btn');

    const targets = [eyebrow, headline, sub, cta].filter(Boolean);
    gsap.set(targets, { opacity: 0, y: 20 });

    const delay = this.barbaEnter ? 0.3 : 1.4;

    targets.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0,
        duration: 0.7,
        delay: delay + i * 0.12,
        ease: 'power3.out',
      });
    });
  }

  postHeroTransition() {
    const marquee = document.querySelector('.marquee');
    const marqueeInner = document.getElementById('marquee-inner');
    const aboutEyebrow = document.querySelector('.about__eyebrow');
    const aboutHeadline = document.querySelector('.about__headline');
    const aboutBody = document.querySelector('.about__body');

    if (!marquee) return;

    const scatterTargets = [
      marqueeInner || marquee,
      aboutEyebrow,
      aboutHeadline,
      aboutBody,
    ].filter(Boolean);

    if (isMobile) {
      scatterTargets.forEach(el => gsap.set(el, { opacity: 0, y: 30 }));

      ScrollTrigger.create({
        trigger: marquee,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          scatterTargets.forEach((el, i) => {
            gsap.to(el, {
              opacity: 1, y: 0,
              duration: 0.8,
              delay: i * 0.1,
              ease: 'power3.out',
            });
          });
        },
      });
    } else {
      scatterTargets.forEach((el, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 150;

        gsap.set(el, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist + 50,
          rotation: (Math.random() - 0.5) * 20,
          scale: 0.55 + Math.random() * 0.2,
          opacity: 0,
          filter: 'blur(10px)',
        });
      });

      ScrollTrigger.create({
        trigger: marquee,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          scatterTargets.forEach((el, i) => {
            gsap.to(el, {
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              opacity: 1,
              filter: 'blur(0px)',
              duration: 1.4,
              delay: i * 0.15,
              ease: 'power4.out',
            });
          });
        },
      });
    }
  }

  scrollProgress() {
    if (isMobile) return;
    const pulse = document.getElementById('hero-scroll-hint');
    const dot = pulse?.querySelector('.hero__pulse-dot');
    if (!pulse || !dot) return;

    let introActive = true;
    let introTl = null;
    const dotPos = { value: 0 };

    function startIntroLoop() {
      introTl = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } });
      introTl.fromTo(dot,
        { top: '0%', opacity: 0 },
        { top: '100%', opacity: 1, duration: 2.2, ease: 'power1.inOut' }
      )
      .to(dot, { opacity: 0, duration: 0.4 }, 1.8)
      .set(dot, { top: '0%', opacity: 0 }, 2.4);
    }

    startIntroLoop();

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const target = self.progress * 100;

        if (introActive && self.progress > 0.001) {
          introActive = false;
          if (introTl) {
            introTl.kill();
            introTl = null;
          }
          dotPos.value = parseFloat(dot.style.top) || 0;
          gsap.to(dot, { opacity: 1, duration: 0.4, ease: 'power2.out' });
        }

        if (!introActive) {
          gsap.to(dotPos, {
            value: target,
            duration: 0.8,
            ease: 'power3.out',
            overwrite: true,
            onUpdate: () => {
              dot.style.top = `${dotPos.value}%`;
            }
          });
        }
      }
    });

    const lightSections = ['#about', '#news'];

    lightSections.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => pulse.classList.add('hero__pulse--dark'),
        onLeave: () => pulse.classList.remove('hero__pulse--dark'),
        onEnterBack: () => pulse.classList.add('hero__pulse--dark'),
        onLeaveBack: () => pulse.classList.remove('hero__pulse--dark'),
      });
    });
  }

  navAnimations() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const marqueeEl = document.getElementById('marquee');
    const marqueeTracks = marqueeEl ? marqueeEl.querySelectorAll('.marquee__track') : [];
    const marqueeRows = marqueeEl ? marqueeEl.querySelectorAll('.marquee__row') : [];
    let marqueeSpeedResetTimer = null;
    const marqueeRate = { value: 1 };

    const getMarqueeAnimations = () =>
      marqueeTracks.length ? Array.from(marqueeTracks).flatMap((track) => track.getAnimations()) : [];

    const applyMarqueeRate = (rate) => {
      getMarqueeAnimations().forEach((animation) => {
        animation.playbackRate = rate;
      });
    };

    requestAnimationFrame(() => applyMarqueeRate(1));

    const setNavH = () => {
      document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
    };

    const setMarqueeH = () => {
      if (marqueeEl) {
        document.documentElement.style.setProperty('--marquee-h', `${marqueeEl.offsetHeight}px`);
      }
    };

    const setLayoutVars = () => {
      setNavH();
      setMarqueeH();
    };

    setLayoutVars();

    if (!isMobile) {
      window.addEventListener('resize', () => {
        setLayoutVars();
        ScrollTrigger.refresh();
      });
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(setLayoutVars).observe(nav);
        if (marqueeEl) {
          new ResizeObserver(setLayoutVars).observe(marqueeEl);
        }
      }
    }

    const hero = document.getElementById('hero');
    if (hero) {
      nav.classList.add('nav--hero');
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        onLeave: () => nav.classList.remove('nav--hero'),
        onEnterBack: () => nav.classList.add('nav--hero'),
      });
    }

    if (!isMobile) {
      const threshold = 50;
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top -80',
        onUpdate: (self) => {
          const scrollY = self.scroll();

          if (marqueeTracks.length) {
            const velocity = Math.abs(self.getVelocity());
            const clampedVelocity = gsap.utils.clamp(0, 2800, velocity);
            const targetRate = gsap.utils.mapRange(0, 2800, 1, 1.85, clampedVelocity);
            const rowBoost = gsap.utils.mapRange(0, 2800, 0, 56, clampedVelocity);

            gsap.to(marqueeRate, {
              value: targetRate,
              duration: 0.16,
              ease: 'power2.out',
              overwrite: true,
              onUpdate: () => applyMarqueeRate(marqueeRate.value),
            });

            if (marqueeRows.length >= 2) {
              gsap.to(marqueeRows[0], {
                x: -rowBoost,
                duration: 0.16,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(marqueeRows[1], {
                x: rowBoost,
                duration: 0.16,
                ease: 'power2.out',
                overwrite: true,
              });
            }

            clearTimeout(marqueeSpeedResetTimer);
            marqueeSpeedResetTimer = setTimeout(() => {
              gsap.to(marqueeRate, {
                value: 1,
                duration: 0.8,
                ease: 'power3.out',
                overwrite: true,
                onUpdate: () => applyMarqueeRate(marqueeRate.value),
              });
              if (marqueeRows.length) {
                gsap.to(marqueeRows, {
                  x: 0,
                  duration: 0.7,
                  ease: 'power3.out',
                  overwrite: true,
                });
              }
            }, 120);
          }

          if (scrollY > threshold) {
            nav.classList.add('nav--scrolled');
          } else {
            nav.classList.remove('nav--scrolled');
          }
        }
      });

      const marqueeStickyRegion = document.getElementById('marquee-sticky-region');
      if (marqueeEl && marqueeStickyRegion) {
        ScrollTrigger.create({
          trigger: marqueeEl,
          start: () => `top ${nav.offsetHeight}px`,
          endTrigger: marqueeStickyRegion,
          end: 'bottom top',
          invalidateOnRefresh: true,
          onToggle: (self) => {
            const on = self.isActive;
            marqueeEl.classList.toggle('marquee--stuck', on);
            document.body.classList.toggle('marquee-lock', on);
          },
        });
      }
    }
  }

  aboutAnimations() {
    const textEl = document.getElementById('about-text');
    if (textEl) {
      if (isMobile) {
        gsap.set(textEl, { opacity: 0, y: 24 });
        ScrollTrigger.create({
          trigger: '.about__body',
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(textEl, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
          },
        });
      } else {
        const paragraphs = textEl.querySelectorAll('p');
        const allWords = [];

        paragraphs.forEach(p => {
          const split = new TextSplit(p, { type: 'words' });
          allWords.push(...split.words);
        });

        let maxIdx = 0;
        ScrollTrigger.create({
          trigger: '.about__body',
          start: 'top 150%',
          end: 'center center',
          scrub: true,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * allWords.length);
            if (idx <= maxIdx) return;
            for (let i = maxIdx; i < idx; i++) {
              allWords[i].classList.add('is-active');
            }
            maxIdx = idx;
          }
        });
      }
    }

    gsap.to('.about__closing', {
      scrollTrigger: {
        trigger: '.about__closing',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out'
    });
  }

  timelineReveal() {
    const period = document.getElementById('about-period');
    const timeline = document.querySelector('.timeline');
    const bg = document.getElementById('timeline-bg');
    const closing = document.querySelector('.about__closing');
    if (!period || !timeline || !bg || !closing) return;

    if (isMobile) {
      gsap.set(period, { display: 'none' });
      gsap.set(bg, { display: 'none' });
      return;
    }

    let maxProg = 0;
    let landed = false;
    let landProg = 0;

    ScrollTrigger.create({
      trigger: closing,
      start: 'top 60%',
      endTrigger: timeline,
      end: 'top 15%',
      scrub: 0.5,
      onUpdate: (self) => {
        if (self.progress <= maxProg) return;
        maxProg = self.progress;

        if (!landed) {
          const dropRaw = Math.min(1, maxProg * 2);
          const dropEase = gsap.parseEase('power3.in')(dropRaw);
          gsap.set(period, {
            y: `${28 * dropEase}em`,
            scale: 1 + 3 * dropEase,
          });

          const pRect = period.getBoundingClientRect();
          const tRect = timeline.getBoundingClientRect();
          if (pRect.top + pRect.height / 2 >= tRect.top) {
            landed = true;
            landProg = maxProg;

            const cx = pRect.left + pRect.width / 2 - tRect.left;
            bg.style.left = `${cx}px`;
          }
        }

        if (landed) {
          const revealProg = Math.min(1, (maxProg - landProg) / (1 - landProg));
          const size = revealProg * Math.max(timeline.offsetWidth, timeline.offsetHeight) * 3;
          gsap.set(bg, { scale: size });
        }
      }
    });
  }

  timelineAnimations() {
    const headerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.timeline__header',
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });

    headerTl
      .to('.timeline__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.timeline__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1);

    const dataItems = document.querySelectorAll('.timeline__data > div');
    if (!dataItems.length) return;

    const milestones = Array.from(dataItems).map(el => ({
      year: el.dataset.year,
      title: el.dataset.title,
      detail: el.dataset.detail,
      isActive: el.hasAttribute('data-active')
    }));

    const stageYear = document.getElementById('timeline-stage-year');
    const stageLabel = document.getElementById('timeline-stage-label');
    const stageText = document.getElementById('timeline-stage-text');
    const pipsContainer = document.getElementById('timeline-pips');
    const prevBtn = document.getElementById('timeline-prev');
    const nextBtn = document.getElementById('timeline-next');
    const counterEl = document.getElementById('timeline-counter');

    const track = document.createElement('div');
    track.className = 'timeline__pips-track';
    const fill = document.createElement('div');
    fill.className = 'timeline__pips-fill';
    track.appendChild(fill);
    pipsContainer.appendChild(track);

    milestones.forEach((_, i) => {
      const pip = document.createElement('span');
      pip.className = 'timeline__pip';
      pip.addEventListener('click', () => goTo(i));
      pipsContainer.appendChild(pip);
    });

    const pips = pipsContainer.querySelectorAll('.timeline__pip');
    let current = milestones.length - 1;
    let animating = false;

    function pad(n) { return String(n).padStart(2, '0'); }

    function extractLabel(title) {
      return title.replace(/\s*\(.*?\)\s*$/, '');
    }

    function buildDigits(year) {
      stageYear.innerHTML = '';
      String(year).split('').forEach(d => {
        const wrap = document.createElement('span');
        wrap.className = 'timeline__digit';
        const inner = document.createElement('span');
        inner.textContent = d;
        wrap.appendChild(inner);
        stageYear.appendChild(wrap);
      });
    }

    function animateDigits(oldYear, newYear, direction) {
      const oldChars = String(oldYear).split('');
      const newChars = String(newYear).split('');
      const digitEls = stageYear.querySelectorAll('.timeline__digit');
      const yDir = direction > 0 ? -1 : 1;

      oldChars.forEach((d, i) => {
        if (d !== newChars[i]) {
          const container = digitEls[i];
          const oldSpan = container.querySelector('span');
          const newSpan = document.createElement('span');
          newSpan.textContent = newChars[i];
          gsap.set(newSpan, { opacity: 0, y: `${-yDir * 110}%` });
          container.appendChild(newSpan);

          gsap.to(oldSpan, {
            y: `${yDir * 110}%`, opacity: 0, duration: 0.4, ease: 'power3.in',
            onComplete() { oldSpan.remove(); }
          });
          gsap.to(newSpan, {
            y: '0%', opacity: 1, duration: 0.45, ease: 'power3.out', delay: 0.1,
            clearProps: 'transform'
          });
        }
      });
    }

    function goTo(index) {
      if (index < 0 || index >= milestones.length || animating) return;

      const direction = index > current ? 1 : -1;
      const oldYear = milestones[current].year;
      current = index;
      const ms = milestones[current];

      animating = true;

      animateDigits(oldYear, ms.year, direction);

      stageYear.classList.toggle('is-filled', !!ms.isActive);

      const ySlide = direction * 12;

      gsap.to(stageLabel, {
        opacity: 0, y: -ySlide, duration: 0.22, ease: 'power2.in',
        onComplete() {
          stageLabel.textContent = extractLabel(ms.title);
          gsap.fromTo(stageLabel,
            { opacity: 0, y: ySlide },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
          );
        }
      });

      gsap.to(stageText, {
        opacity: 0, y: -ySlide, duration: 0.22, ease: 'power2.in', delay: 0.04,
        onComplete() {
          stageText.textContent = ms.detail;
          gsap.fromTo(stageText,
            { opacity: 0, y: ySlide },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out',
              onComplete() { animating = false; }
            }
          );
        }
      });

      pips.forEach((pip, i) => {
        pip.classList.toggle('is-active', i === current);
        pip.classList.toggle('is-passed', i < current);
      });

      const fillPct = milestones.length > 1 ? current / (milestones.length - 1) : 0;
      gsap.to(fill, { scaleX: fillPct, duration: 0.5, ease: 'power3.out' });

      if (counterEl) counterEl.textContent = `${pad(current + 1)} / ${pad(milestones.length)}`;
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === milestones.length - 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

    document.addEventListener('keydown', (e) => {
      if (!stageYear) return;
      const rect = stageYear.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(current - 1); }
    });

    buildDigits(milestones[current].year);
    stageLabel.textContent = extractLabel(milestones[current].title);
    stageText.textContent = milestones[current].detail;
    stageYear.classList.toggle('is-filled', !!milestones[current].isActive);
    pips.forEach((pip, i) => {
      pip.classList.toggle('is-active', i === current);
      pip.classList.toggle('is-passed', i < current);
    });
    gsap.set(fill, { scaleX: milestones.length > 1 ? current / (milestones.length - 1) : 0 });
    if (counterEl) counterEl.textContent = `${pad(current + 1)} / ${pad(milestones.length)}`;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === milestones.length - 1;

    gsap.to('.timeline__stage', {
      scrollTrigger: {
        trigger: '.timeline__stage',
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out'
    });

    gsap.to('.timeline__controls', {
      scrollTrigger: {
        trigger: '.timeline__controls',
        start: 'top 92%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      delay: 0.15
    });
  }

  newsAnimations() {
    const headerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.news__header',
        start: 'top 92%',
        toggleActions: 'play none none none'
      }
    });

    headerTl
      .to('.news__eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to('.news__headline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('.news__intro', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.2)
      .to('.news__view-all', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3);


    gsap.to('.news__gallery-cta .news__view-all', {
      scrollTrigger: {
        trigger: '.news__gallery-cta',
        start: 'top 95%',
        toggleActions: 'play none none none'
      },
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out'
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
      duration: 0.8,
      ease: 'power2.out'
    });
  }
}
