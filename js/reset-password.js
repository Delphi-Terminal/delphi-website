import { API_BASE, disableButton, getParam, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');
const emailInput = document.getElementById('email');

const initialEmail = getParam('email');
if (emailInput && initialEmail) emailInput.value = initialEmail;

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  if (password !== confirmPassword) {
    showMessage('error', 'Passwords do not match.');
    disableButton(submitBtn, false);
    return;
  }

  try {
    const email = emailInput.value.trim();
    const code = document.getElementById('code').value.trim();
    const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage('error', data.error || 'Could not reset password.');
      disableButton(submitBtn, false);
      return;
    }

    window.location.href = '/login?reset=1';
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});
