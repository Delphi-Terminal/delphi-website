import { API_BASE, authHeaders, getToken, clearToken } from './auth-helpers.js';

const errorEl = document.getElementById('auth-error');
const infoEl = document.getElementById('account-info');
const emailEl = document.getElementById('account-email');
const nameDisplayEl = document.getElementById('account-name-display');
const createdEl = document.getElementById('account-created');
const editToggle = document.getElementById('btn-edit-toggle');
const editSection = document.getElementById('edit-section');
const editNameInput = document.getElementById('edit-name');
const saveNameBtn = document.getElementById('btn-save-name');
const nameFeedback = document.getElementById('name-feedback');
const currentPwInput = document.getElementById('current-password');
const newPwInput = document.getElementById('new-password');
const changePwBtn = document.getElementById('btn-change-pw');
const pwFeedback = document.getElementById('pw-feedback');
const manageBtn = document.getElementById('btn-manage-sub');
const subStatus = document.getElementById('sub-status');
const logoutBtn = document.getElementById('btn-logout');

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(ts) {
  if (!ts) return 'N/A';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return dateFormatter.format(d);
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('auth__hidden');
}

function showFeedback(el, msg, success) {
  el.textContent = msg;
  el.style.color = success ? '#27ae60' : '#b42318';
  el.classList.remove('auth__hidden');
}

function redirectToLogin() {
  clearToken();
  window.location.href = '/login';
}

let editOpen = false;

editToggle.addEventListener('click', () => {
  editOpen = !editOpen;
  editSection.classList.toggle('auth__hidden', !editOpen);
  editToggle.textContent = editOpen ? 'Done' : 'Edit Account';
});

async function loadUser() {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() });
    if (!res.ok) {
      redirectToLogin();
      return;
    }

    const user = await res.json();
    emailEl.textContent = user.email || 'N/A';
    nameDisplayEl.textContent = user.name || 'Not set';
    editNameInput.value = user.name || '';
    createdEl.textContent = formatDate(user.created_at);
    infoEl.style.display = '';
  } catch {
    showError('Failed to load account info. Try again.');
  }
}

saveNameBtn.addEventListener('click', async () => {
  saveNameBtn.disabled = true;
  nameFeedback.classList.add('auth__hidden');

  const name = editNameInput.value.trim();
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showFeedback(nameFeedback, data.error || 'Failed to update name.', false);
    } else {
      showFeedback(nameFeedback, 'Name updated.', true);
      nameDisplayEl.textContent = name || 'Not set';
    }
  } catch {
    showFeedback(nameFeedback, 'Network error. Try again.', false);
  }
  saveNameBtn.disabled = false;
});

changePwBtn.addEventListener('click', async () => {
  changePwBtn.disabled = true;
  pwFeedback.classList.add('auth__hidden');

  const currentPassword = currentPwInput.value;
  const newPassword = newPwInput.value;

  if (newPassword.length < 8) {
    showFeedback(pwFeedback, 'New password must be at least 8 characters.', false);
    changePwBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showFeedback(pwFeedback, data.error || 'Failed to update password.', false);
    } else {
      showFeedback(pwFeedback, 'Password updated successfully.', true);
      currentPwInput.value = '';
      newPwInput.value = '';
    }
  } catch {
    showFeedback(pwFeedback, 'Network error. Try again.', false);
  }
  changePwBtn.disabled = false;
});

manageBtn.addEventListener('click', async () => {
  manageBtn.disabled = true;
  subStatus.classList.add('auth__hidden');

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/billing-portal`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 || res.status === 400) {
        subStatus.textContent = 'No subscription found.';
        subStatus.classList.remove('auth__hidden');
        manageBtn.textContent = 'View Plans';
        manageBtn.disabled = false;
        manageBtn.onclick = () => { window.location.href = '/data'; };
        return;
      }
      showError(data.error || 'Unable to open billing portal.');
      manageBtn.disabled = false;
      return;
    }

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      showError('Invalid response from billing portal.');
      manageBtn.disabled = false;
    }
  } catch {
    showError('Network error. Try again.');
    manageBtn.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch { /* ignore */ }
  clearToken();
  redirectToLogin();
});

loadUser();
