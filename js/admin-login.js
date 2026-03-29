const form = document.getElementById('login-form');
const errEl = document.getElementById('login-error');
const submitBtn = document.getElementById('login-submit');

(async () => {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) {
      const { user } = await res.json();
      if (user?.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
        return;
      }
      window.location.href = '/news';
    }
  } catch { /* not logged in */ }
})();

async function getCsrf() {
  const r = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!r.ok) throw new Error('CSRF unavailable');
  const data = await r.json();
  return data.csrfToken;
}

function showError(msg) {
  errEl.textContent = msg;
  errEl.classList.remove('admin__hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.classList.add('admin__hidden');
  submitBtn.disabled = true;

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
      showError(data.error || 'Sign in failed');
      submitBtn.disabled = false;
      return;
    }

    window.location.href = '/admin/dashboard.html';
  } catch {
    showError('Network error. Try again.');
    submitBtn.disabled = false;
  }
});
