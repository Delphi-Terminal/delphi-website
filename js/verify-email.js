import { disableButton, getCsrf, getParam, showMessage, setText } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');
const resendBtn = document.getElementById('auth-resend');
const emailInput = document.getElementById('email');

const initialEmail = getParam('email');
if (emailInput && initialEmail) emailInput.value = initialEmail;
setText('verify-email-copy', initialEmail || 'your email');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);

  try {
    const csrfToken = await getCsrf();
    const email = emailInput.value.trim();
    const code = document.getElementById('code').value.trim();
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, csrfToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage('error', data.error || 'Verification failed.');
      disableButton(submitBtn, false);
      return;
    }

    window.location.href = '/login?verified=1';
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});

resendBtn?.addEventListener('click', async () => {
  disableButton(resendBtn, true);
  try {
    const csrfToken = await getCsrf();
    const email = emailInput.value.trim();
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, csrfToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage('error', data.error || 'Could not resend code.');
      disableButton(resendBtn, false);
      return;
    }
    showMessage('success', 'A fresh verification code has been sent.');
    disableButton(resendBtn, false);
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(resendBtn, false);
  }
});
