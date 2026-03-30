import { API_BASE, authHeaders, getToken, clearToken } from './auth-helpers.js';

const ADMIN_LOGIN_URL = '/admin/login';

const emailEl = document.getElementById('user-email');
const roleEl = document.getElementById('user-role');
const createdEl = document.getElementById('user-created');
const pwForm = document.getElementById('password-form');
const pwFeedback = document.getElementById('pw-feedback');
const savePwBtn = document.getElementById('btn-save-pw');

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function redirectToLogin() {
  clearToken();
  window.location.href = ADMIN_LOGIN_URL;
}

function showFeedback(msg, tone = 'default') {
  pwFeedback.textContent = msg;
  pwFeedback.style.color =
    tone === 'error' ? 'var(--color-error, #c0392b)' :
    tone === 'success' ? 'var(--color-success, #27ae60)' :
    'var(--color-text-secondary)';
  pwFeedback.classList.remove('admin__hidden');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return dateFormatter.format(d);
}

async function loadUser() {
  try {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() });
    if (!res.ok) { redirectToLogin(); return; }
    const user = await res.json();
    if (!user) { redirectToLogin(); return; }

    emailEl.textContent = user.email;
    roleEl.textContent = user.role;

    if (user.created_at) {
      createdEl.textContent = formatDate(user.created_at);
    } else if (user.email_verified_at) {
      createdEl.textContent = formatDate(user.email_verified_at);
    }
  } catch {
    redirectToLogin();
  }
}

pwForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  pwFeedback.classList.add('admin__hidden');
  savePwBtn.disabled = true;

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;

  if (newPassword.length < 12) {
    showFeedback('New password must be at least 12 characters.', 'error');
    savePwBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showFeedback(data.error || 'Failed to update password.', 'error');
      savePwBtn.disabled = false;
      return;
    }

    showFeedback('Password updated successfully.', 'success');
    pwForm.reset();
    savePwBtn.disabled = false;
  } catch {
    showFeedback('Network error. Try again.', 'error');
    savePwBtn.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch { /* ignore logout errors */ }
  clearToken();
  redirectToLogin();
});

loadUser();
