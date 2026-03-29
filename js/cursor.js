export class CustomCursor {
  constructor() {
    this.cursor = document.getElementById('cursor');
    if (!this.cursor) return;

    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.isVisible = false;
    this.isRunning = false;
    this.speed = 0.15;

    this.init();
  }

  init() {
    if (window.matchMedia('(pointer: coarse)').matches) {
      this.cursor.style.display = 'none';
      return;
    }

    this.cursor.style.willChange = 'transform';

    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      if (!this.isVisible) {
        this.isVisible = true;
        this.cursor.style.opacity = '1';
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
      }
      if (!this.isRunning) {
        this.isRunning = true;
        requestAnimationFrame(() => this.render());
      }
    });

    document.addEventListener('mouseleave', () => {
      this.cursor.classList.add('cursor--hidden');
    });

    document.addEventListener('mouseenter', () => {
      this.cursor.classList.remove('cursor--hidden');
    });

    const hoverTargets = 'a, button, .magnetic, .news-card';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        this.cursor.classList.add('cursor--hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        this.cursor.classList.remove('cursor--hover');
      }
    });
  }

  render() {
    this.pos.x += (this.target.x - this.pos.x) * this.speed;
    this.pos.y += (this.target.y - this.pos.y) * this.speed;
    this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;

    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      requestAnimationFrame(() => this.render());
    } else {
      this.isRunning = false;
    }
  }
}
