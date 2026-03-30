import { API_BASE, disableButton, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  disableButton(submitBtn, true);

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    showMessage('error', 'Passwords do not match.');
    disableButton(submitBtn, false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage('error', data.error || 'Account creation failed.');
      disableButton(submitBtn, false);
      return;
    }

    window.location.href = data.next || `/verify?email=${encodeURIComponent(email)}`;
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});
