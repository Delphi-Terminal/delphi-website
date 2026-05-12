export class WaitlistDialog {
  constructor() {
    this.overlay = null;
    this.panel = null;
    this.form = null;
    this.steps = [];
    this.currentStep = 0;
    this.isOpen = false;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  init() {
    this.mount();
    this.cache();
    this.bind();
  }

  mount() {
    if (document.getElementById('waitlist-overlay')) {
      this.overlay = document.getElementById('waitlist-overlay');
      return;
    }

    const el = document.createElement('div');
    el.id = 'waitlist-overlay';
    el.className = 'cd-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="cd-backdrop"></div>
      <div class="cd-shell">
        <div class="cd-panel cd-panel--single">
          <button type="button" class="cd-close" data-waitlist-close aria-label="Close">Close</button>
          <div class="cd-content">
            <div class="cd-wordmark cd-wordmark--header" aria-hidden="true">
              <span class="cd-wordmark__brand">Delphi</span>
            </div>
            <form class="cd-form" id="wl-form">
              <div class="cd-step" data-step="0">
                <div class="cd-header">
                  <div class="cd-eyebrow">( join the waitlist )</div>
                  <h2 class="cd-title">Be first in line.</h2>
                </div>

                <label class="cd-field">
                  <span>Email</span>
                  <input type="email" name="email" autocomplete="email" placeholder="you@company.com" required>
                </label>

                <div class="cd-actions">
                  <button type="submit" class="cd-btn-next">Join</button>
                </div>
              </div>

              <div class="cd-step cd-confirm" data-step="1">
                <div class="cd-confirm__icon">
                  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="25" stroke="currentColor" stroke-width="1.5"/>
                    <path class="cd-confirm__check" d="M15 27l7 7 15-15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h2 class="cd-confirm__title">You’re on the list.</h2>
                <p class="cd-confirm__body">Thanks — we’ll be in touch when Delphi opens up.</p>
                <button type="button" class="cd-btn-next" data-waitlist-done>Done</button>
              </div>

              <p class="cd-status" role="status" hidden></p>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;
  }

  cache() {
    this.panel = this.overlay.querySelector('.cd-panel');
    this.backdrop = this.overlay.querySelector('.cd-backdrop');
    this.form = this.overlay.querySelector('#wl-form');
    this.steps = Array.from(this.overlay.querySelectorAll('.cd-step'));
    this.doneBtn = this.overlay.querySelector('[data-waitlist-done]');
  }

  bind() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('a[href="#waitlist"], [data-waitlist-open]');
      if (!trigger) return;
      e.preventDefault();
      this.open();
    });

    this.backdrop.addEventListener('click', () => this.close());

    this.overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-waitlist-close]')) this.close();
    });

    this.panel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    this.panel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

    this.doneBtn.addEventListener('click', () => this.close());

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.goToStep(1);
    });
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  goToStep(index) {
    const outgoing = this.steps[this.currentStep];
    const incoming = this.steps[index];
    if (!outgoing || !incoming || outgoing === incoming) return;
    outgoing.classList.remove('is-active');
    this.currentStep = index;
    incoming.classList.add('is-active');
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this.form.reset();
    this.currentStep = 0;
    this.steps.forEach((s) => s.classList.remove('is-active'));

    document.body.classList.add('has-contact-dialog');
    document.documentElement.classList.add('has-contact-dialog');
    document.addEventListener('keydown', this._onKeyDown);
    document.dispatchEvent(new CustomEvent('contact-dialog:toggle', { detail: { open: true } }));

    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-visible');

    setTimeout(() => {
      this.steps[0].classList.add('is-active');
      const firstInput = this.steps[0].querySelector('input');
      if (firstInput) firstInput.focus();
    }, 200);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.overlay.classList.add('is-leaving');
    this.overlay.classList.remove('is-visible');
    document.removeEventListener('keydown', this._onKeyDown);

    const onDone = () => {
      this.overlay.classList.remove('is-leaving');
      this.overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('has-contact-dialog');
      document.documentElement.classList.remove('has-contact-dialog');
      document.dispatchEvent(new CustomEvent('contact-dialog:toggle', { detail: { open: false } }));
    };

    this.panel.addEventListener('animationend', onDone, { once: true });
    setTimeout(onDone, 550);
  }
}
