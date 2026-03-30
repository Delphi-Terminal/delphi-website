import { API_BASE, authHeaders, setToken, getToken, disableButton, redirectForUser, showMessage } from './auth-helpers.js';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('auth-submit');

(async () => {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() });
    if (res.ok) {
      const user = await res.json();
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
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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

    setToken(data.token);

    const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const user = meRes.ok ? await meRes.json() : {};
    redirectForUser(user);
  } catch {
    showMessage('error', 'Network error. Try again.');
    disableButton(submitBtn, false);
  }
});
