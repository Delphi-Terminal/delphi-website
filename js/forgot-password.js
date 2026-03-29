import { disableButton, getCsrf, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);

  try {
    const email = document.getElementById('email').value.trim();
    const csrfToken = await getCsrf();
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, csrfToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage('error', data.error || 'Unable to send reset code.');
      disableButton(submitBtn, false);
      return;
    }

    window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});
