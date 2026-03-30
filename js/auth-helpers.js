export const API_BASE = 'https://api.delphiterminal.co';

const TOKEN_KEY = 'dm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
