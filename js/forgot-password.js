import { API_BASE, disableButton, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);

  try {
    const email = document.getElementById('email').value.trim();
    const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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
