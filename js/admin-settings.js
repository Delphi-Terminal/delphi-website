const ADMIN_LOGIN_URL = '/admin/login';

const emailEl = document.getElementById('user-email');
const roleEl = document.getElementById('user-role');
const createdEl = document.getElementById('user-created');
const pwForm = document.getElementById('password-form');
const pwFeedback = document.getElementById('pw-feedback');
const savePwBtn = document.getElementById('btn-save-pw');

let csrfToken = null;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function redirectToLogin() {
  window.location.href = ADMIN_LOGIN_URL;
}

async function getCsrf() {
  const r = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!r.ok) throw new Error('CSRF unavailable');
  const data = await r.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

function showFeedback(msg, tone = 'default') {
  pwFeedback.textContent = msg;
  pwFeedback.style.color =
    tone === 'error' ? 'var(--color-error, #c0392b)' :
    tone === 'success' ? 'var(--color-success, #27ae60)' :
    'var(--color-text-secondary)';
  pwFeedback.classList.remove('admin__hidden');
}

async function loadUser() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) { redirectToLogin(); return; }
    const { user } = await res.json();
    if (!user) { redirectToLogin(); return; }

    emailEl.textContent = user.email;
    roleEl.textContent = user.role;

    if (user.created_at) {
      createdEl.textContent = dateFormatter.format(new Date(user.created_at * 1000));
    } else if (user.email_verified_at) {
      createdEl.textContent = dateFormatter.format(new Date(user.email_verified_at * 1000));
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
    await getCsrf();
    const res = await fetch('/api/auth/me/password', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
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
  await getCsrf();
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csrfToken }),
  });
  redirectToLogin();
});

loadUser();
