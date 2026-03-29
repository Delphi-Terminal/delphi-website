import { disableButton, getCsrf, redirectForUser, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');

(async () => {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) {
      const { user } = await res.json();
      redirectForUser(user);
      return;
    }
  } catch { /* not logged in */ }
})();

const flash = new URLSearchParams(window.location.search);
if (flash.get('verified') === '1') {
  showMessage('success', 'Your email is verified. You can sign in now.');
}
if (flash.get('reset') === '1') {
  showMessage('success', 'Your password has been updated. Sign in with your new password.');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);
  showMessage('error', '');

  try {
    const csrfToken = await getCsrf();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, csrfToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.needs_verification && data.next) {
        window.location.href = data.next;
        return;
      }
      showMessage('error', data.error || 'Sign in failed.');
      disableButton(submitBtn, false);
      return;
    }

    redirectForUser(data.user);
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});
