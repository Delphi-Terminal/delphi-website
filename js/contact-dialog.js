const CONTACT_COPY = {
  general: {
    eyebrow: '( get in touch )',
    title: 'Tell us what you\u2019re building.',
    placeholder:
      'What are you building, and where could Delphi fit into your workflow?',
  },
  enterprise: {
    eyebrow: '( enterprise access )',
    title: 'Tell us about your needs.',
    placeholder:
      'Tell us about data coverage, expected throughput, support needs, and how Delphi would fit into your stack.',
  },
};


export class ContactDialog {
  constructor() {
    this.overlay = null;
    this.panel = null;
    this.form = null;
    this.contextInput = null;
    this.eyebrow = null;
    this.title = null;
    this.message = null;
    this.status = null;
    this.scrollY = 0;
    this.currentStep = 0;
    this.steps = [];
    this.isOpen = false;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  init() {
    this.mount();
    this.cache();
    this.bind();
    this.setContext('general');
  }

  mount() {
    if (document.getElementById('contact-overlay')) {
      this.overlay = document.getElementById('contact-overlay');
      return;
    }

    const el = document.createElement('div');
    el.id = 'contact-overlay';
    el.className = 'cd-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="cd-backdrop"></div>
      <div class="cd-shell">
        <div class="cd-panel">
          <button type="button" class="cd-close" data-contact-close aria-label="Close">Close</button>
          <div class="cd-visual" aria-hidden="true">
            <div class="cd-wordmark">
              <span class="cd-wordmark__brand">Delphi</span>
            </div>
            <div class="cd-signal">Benchmark anything. Price everything.</div>
          </div>

          <div class="cd-content">
            <form class="cd-form" id="cd-form">
              <input type="hidden" name="context" value="general">

              <div class="cd-step" data-step="0">
                <div class="cd-header">
                  <div class="cd-eyebrow" id="cd-eyebrow"></div>
                  <h2 class="cd-title" id="cd-title"></h2>
                </div>

                <label class="cd-field">
                  <span>Email</span>
                  <input type="email" name="email" autocomplete="email" placeholder="you@company.com" required>
                </label>

                <label class="cd-field">
                  <span>Company <em>(optional)</em></span>
                  <input type="text" name="company" autocomplete="organization" placeholder="Delphi partner, fund, desk...">
                </label>

                <label class="cd-field">
                  <span>What are you working on?</span>
                  <input type="text" name="useCase" placeholder="API integration, enterprise analytics, research workflow...">
                </label>

                <div class="cd-actions">
                  <button type="button" class="cd-btn-next" id="cd-next">Next</button>
                </div>
              </div>

              <div class="cd-step" data-step="1">
                <div class="cd-header">
                  <div class="cd-eyebrow">( your message )</div>
                  <h2 class="cd-title">Almost there.</h2>
                </div>

                <label class="cd-field">
                  <span>Message</span>
                  <textarea name="message" rows="6" required></textarea>
                </label>

                <div class="cd-actions">
                  <button type="button" class="cd-btn-back" id="cd-back">Back</button>
                  <button type="submit" class="cd-btn-next" id="cd-submit">Submit</button>
                </div>
              </div>

              <div class="cd-step cd-confirm" data-step="2">
                <div class="cd-confirm__icon">
                  <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="25" stroke="currentColor" stroke-width="1.5"/>
                    <path class="cd-confirm__check" d="M15 27l7 7 15-15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h2 class="cd-confirm__title">We've got your message.</h2>
                <p class="cd-confirm__body">Thanks for reaching out - our team will be in touch shortly.</p>
                <button type="button" class="cd-btn-next" id="cd-done">Done</button>
              </div>

              <p class="cd-status" id="cd-status" role="status" hidden></p>
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
    this.form = this.overlay.querySelector('#cd-form');
    this.contextInput = this.form.elements.context;
    this.eyebrow = this.overlay.querySelector('#cd-eyebrow');
    this.title = this.overlay.querySelector('#cd-title');
    this.message = this.form.elements.message;
    this.status = this.overlay.querySelector('#cd-status');
    this.steps = Array.from(this.overlay.querySelectorAll('.cd-step'));
    this.nextBtn = this.overlay.querySelector('#cd-next');
    this.backBtn = this.overlay.querySelector('#cd-back');
    this.doneBtn = this.overlay.querySelector('#cd-done');
  }

  bind() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest(
        'a[href="#contact"], a.footer__btn[href*="/contact"], a.footer__link[href*="/contact"], a.dp-pricing__link--featured[href*="/contact"]'
      );
      if (!trigger) return;

      e.preventDefault();
      const href = trigger.getAttribute('href') || '';
      const context = href.includes('ref=enterprise') || trigger.classList.contains('dp-pricing__link--featured')
        ? 'enterprise'
        : 'general';
      this.open(context);
    });

    this.backdrop.addEventListener('click', () => this.close());

    this.overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-contact-close]')) this.close();
    });

    this.panel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    this.panel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });

    this.nextBtn.addEventListener('click', () => {
      const emailInput = this.form.elements.email;
      if (!emailInput.reportValidity()) return;
      this.goToStep(1);
    });

    this.backBtn.addEventListener('click', () => this.goToStep(0));

    this.doneBtn.addEventListener('click', () => this.close());

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.goToStep(2);
    });
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  setContext(context) {
    const copy = CONTACT_COPY[context] || CONTACT_COPY.general;
    this.contextInput.value = context;
    this.eyebrow.textContent = copy.eyebrow;
    this.title.textContent = copy.title;
    this.message.placeholder = copy.placeholder;
    this.status.hidden = true;
    this.status.textContent = '';
  }

  goToStep(index) {
    const outgoing = this.steps[this.currentStep];
    const incoming = this.steps[index];
    if (!outgoing || !incoming || outgoing === incoming) return;

    outgoing.classList.remove('is-active');
    this.currentStep = index;
    incoming.classList.add('is-active');

    const firstInput = incoming.querySelector('input, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  }

  open(context = 'general') {
    if (this.isOpen) return;
    this.isOpen = true;

    this.form.reset();
    this.setContext(context);
    this.currentStep = 0;
    this.steps.forEach((s) => s.classList.remove('is-active'));

    document.body.classList.add('has-contact-dialog');
    document.documentElement.classList.add('has-contact-dialog');
    document.addEventListener('keydown', this._onKeyDown);
    document.dispatchEvent(new CustomEvent('contact-dialog:toggle', { detail: { open: true } }));

    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.classList.add('is-visible');

    setTimeout(() => this.steps[0].classList.add('is-active'), 200);
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
