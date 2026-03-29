export async function getCsrf() {
  const r = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!r.ok) throw new Error('CSRF unavailable');
  const data = await r.json();
  return data.csrfToken;
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function showMessage(type, msg) {
  const errEl = document.getElementById('auth-error');
  const okEl = document.getElementById('auth-success');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.add('auth__hidden');
  }
  if (okEl) {
    okEl.textContent = '';
    okEl.classList.add('auth__hidden');
  }
  const target = type === 'success' ? okEl : errEl;
  if (target) {
    target.textContent = msg;
    target.classList.remove('auth__hidden');
  }
}

export function disableButton(btn, disabled) {
  if (btn) btn.disabled = disabled;
}

export function redirectForUser(user, fallback = '/news') {
  const next = getParam('next');
  if (user?.role === 'admin') {
    window.location.href = '/admin/dashboard.html';
    return;
  }
  window.location.href = next || fallback;
}
