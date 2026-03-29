import gsap from 'gsap';

export class MagneticButton {
  constructor(el) {
    this.el = el;
    this.child = el.querySelector('a, button') || el.firstElementChild;
    this.strength = 0.3;
    this.bound = { x: 0, y: 0, width: 0, height: 0 };

    this.init();
  }

  init() {
    this.el.addEventListener('mouseenter', () => this.updateBounds());
    this.el.addEventListener('mousemove', (e) => this.onMove(e));
    this.el.addEventListener('mouseleave', () => this.onLeave());
  }

  updateBounds() {
    const rect = this.el.getBoundingClientRect();
    this.bound = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  onMove(e) {
    const x = (e.clientX - this.bound.x - this.bound.width / 2) * this.strength;
    const y = (e.clientY - this.bound.y - this.bound.height / 2) * this.strength;

    gsap.to(this.child || this.el, {
      x,
      y,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  onLeave() {
    gsap.to(this.child || this.el, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: 'elastic.out(1, 0.3)'
    });
  }
}
