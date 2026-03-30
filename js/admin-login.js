import { API_BASE, authHeaders, setToken, getToken, clearToken } from './auth-helpers.js';

const form = document.getElementById('login-form');
const errEl = document.getElementById('login-error');
const submitBtn = document.getElementById('login-submit');

(async () => {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() });
    if (res.ok) {
      const user = await res.json();
      if (user?.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
        return;
      }
      window.location.href = '/news';
    }
  } catch { /* not logged in */ }
})();

function showError(msg) {
  errEl.textContent = msg;
  errEl.classList.remove('admin__hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.classList.add('admin__hidden');
  submitBtn.disabled = true;

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
      showError(data.error || 'Sign in failed');
      submitBtn.disabled = false;
      return;
    }

    setToken(data.token);
    window.location.href = '/admin/dashboard.html';
  } catch {
    showError('Network error. Try again.');
    submitBtn.disabled = false;
  }
});
