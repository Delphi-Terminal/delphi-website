import { API_BASE, authHeaders, getToken, clearToken } from './auth-helpers.js';

const ADMIN_LOGIN_URL = '/admin/login';

const tbody = document.getElementById('articles-body');
const articlesCount = document.getElementById('articles-count');
const usersCount = document.getElementById('users-count');
const tabEditorCount = document.getElementById('tab-editor-count');
const tabUsersCount = document.getElementById('tab-users-count');
const usersList = document.getElementById('users-list');
const userForm = document.getElementById('user-form');
const userFeedback = document.getElementById('user-feedback');
const dashError = document.getElementById('dash-error');
const modal = document.getElementById('modal');
const modalError = document.getElementById('modal-error');
const articleForm = document.getElementById('article-form');
const modalTitle = document.getElementById('modal-title');
const tabButtons = Array.from(document.querySelectorAll('[data-tab-target]'));
const tabPanels = Array.from(document.querySelectorAll('[data-tab-panel]'));

const coverZone = document.getElementById('cover-upload-zone');
const coverPreview = document.getElementById('cover-preview');
const coverPlaceholder = document.getElementById('cover-placeholder');
const coverFileInput = document.getElementById('cover-file-input');
const coverField = document.getElementById('f-cover-image');
const btnRemoveCover = document.getElementById('btn-remove-cover');

let cachedArticles = [];
let cachedUsers = [];
let currentUser = null;
let quill = null;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function redirectToLogin() {
  clearToken();
  window.location.href = ADMIN_LOGIN_URL;
}

function formatDate(ts) {
  if (!ts) return 'Just now';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return dateTimeFormatter.format(d);
}

function showError(msg) {
  dashError.textContent = msg;
  dashError.classList.remove('admin__hidden');
}

function clearError() {
  dashError.textContent = '';
  dashError.classList.add('admin__hidden');
}

function showModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.remove('admin__hidden');
}

function clearModalError() {
  modalError.textContent = '';
  modalError.classList.add('admin__hidden');
}

function showUserFeedback(msg, tone = 'default') {
  userFeedback.textContent = msg;
  userFeedback.classList.remove('admin__hidden');
  userFeedback.style.color =
    tone === 'error' ? '#b42318' : 'rgba(21, 44, 74, 0.68)';
}

function setCounts() {
  articlesCount.textContent = `${cachedArticles.length} article${cachedArticles.length === 1 ? '' : 's'}`;
  usersCount.textContent = `${cachedUsers.length} user${cachedUsers.length === 1 ? '' : 's'}`;
  tabEditorCount.textContent = String(cachedArticles.length);
  tabUsersCount.textContent = String(cachedUsers.length);
}

function setActiveTab(name) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === name;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === name;
    panel.classList.toggle('admin__hidden', !isActive);
  });
}

function initQuill() {
  if (quill) return;
  quill = new Quill('#f-body', {
    theme: 'snow',
    placeholder: 'Write your article…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: { image: imageHandler },
      },
    },
  });
}

async function imageHandler() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'image', url);
      quill.setSelection(range.index + 1);
    }
  };
  input.click();
}

async function api(path, opts = {}) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return null;
  }

  const headers = { ...authHeaders(), ...opts.headers };

  if (opts.body && typeof opts.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401 || res.status === 403) {
    redirectToLogin();
    return null;
  }

  return res;
}

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/images/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Upload failed');
    }
    const data = await res.json();
    return data.url;
  } catch (err) {
    showModalError(err.message);
    return null;
  }
}

async function requireAuthCheck() {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return false;
  }

  const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() });
  if (!res || !res.ok) {
    redirectToLogin();
    return false;
  }

  const data = await res.json().catch(() => ({}));
  if (data?.role !== 'admin') {
    redirectToLogin();
    return false;
  }

  currentUser = data;
  return true;
}

function setCoverImage(url) {
  coverField.value = url || '';
  if (url) {
    coverPreview.src = url;
    coverPreview.classList.remove('admin__hidden');
    coverPlaceholder.classList.add('admin__hidden');
    btnRemoveCover.classList.remove('admin__hidden');
  } else {
    coverPreview.src = '';
    coverPreview.classList.add('admin__hidden');
    coverPlaceholder.classList.remove('admin__hidden');
    btnRemoveCover.classList.add('admin__hidden');
  }
}

async function handleCoverFile(file) {
  coverZone.classList.add('is-uploading');
  const url = await uploadImage(file);
  coverZone.classList.remove('is-uploading');
  if (url) setCoverImage(url);
}

function renderRows(articles) {
  cachedArticles = articles;
  setCounts();

  tbody.innerHTML = articles
    .map(
      (a) => `
        <tr data-id="${a.id}">
          <td data-label="Order">${a.sort_order}</td>
          <td data-label="Title">
            <strong>${escapeHtml(a.title)}</strong>
            <span class="admin__meta-text">${escapeHtml(a.card_variant)}</span>
          </td>
          <td data-label="Author">${escapeHtml(a.author)}</td>
          <td data-label="Category">${escapeHtml(a.category)}</td>
          <td data-label="Updated">${formatDate(a.updated_at)}</td>
          <td data-label="Actions">
            <div class="admin__table-actions">
              <button type="button" class="admin__btn admin__btn--ghost" data-action="edit" data-id="${a.id}">Edit</button>
              <button type="button" class="admin__btn admin__btn--ghost admin__btn--danger" data-action="del" data-id="${a.id}">Delete</button>
            </div>
          </td>
        </tr>`
    )
    .join('');
}

function renderUsers(users) {
  cachedUsers = users;
  setCounts();

  if (!users.length) {
    usersList.innerHTML = '<p class="admin__empty">No users yet.</p>';
    return;
  }

  usersList.innerHTML = users
    .map((user) => {
      const isSelf = currentUser && currentUser.id === user.id;
      return `
        <article class="admin__user-card" data-user-id="${user.id}">
          <div>
            <p class="admin__user-email">${escapeHtml(user.email)}</p>
            <p class="admin__user-meta">
              <span class="admin__badge">${escapeHtml(user.role)}</span><br>
              Created ${formatDate(user.created_at)}<br>
              ${user.email_verified_at ? `Verified ${formatDate(user.email_verified_at)}` : 'Not verified'}
            </p>
          </div>
          <div class="admin__actions">
            <button type="button" class="admin__btn admin__btn--ghost" data-user-action="toggle-role" data-id="${user.id}" data-current-role="${user.role}" ${isSelf ? 'disabled' : ''}>
              ${isSelf ? 'You' : user.role === 'admin' ? 'Make Customer' : 'Make Admin'}
            </button>
            <button type="button" class="admin__btn admin__btn--ghost admin__btn--danger" data-user-action="delete" data-id="${user.id}" ${isSelf ? 'disabled' : ''}>
              ${isSelf ? 'Current admin' : 'Delete'}
            </button>
          </div>
        </article>`;
    })
    .join('');
}

async function loadArticles() {
  const res = await api('/api/v1/admin/news');
  if (!res) return;
  const data = await res.json().catch(() => ({ articles: [] }));
  renderRows(data.articles || []);
}

async function loadUsers() {
  const res = await api('/api/v1/admin/users');
  if (!res) return;
  if (!res.ok) {
    console.error('[dashboard] loadUsers failed', res.status);
    return;
  }
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.users)) {
    console.error('[dashboard] loadUsers: unexpected response', data);
    return;
  }
  renderUsers(data.users);
}

function openModal(isNew, article) {
  clearError();
  clearModalError();
  initQuill();
  modalTitle.textContent = isNew ? 'New article' : 'Edit article';
  document.getElementById('edit-id').value = isNew ? '' : String(article.id);
  document.getElementById('f-title').value = article?.title || '';
  document.getElementById('f-excerpt').value = article?.excerpt || '';
  document.getElementById('f-category').value = article?.category || 'world';
  document.getElementById('f-author').value = article?.author || '';
  document.getElementById('f-variant').value = article?.card_variant || 'default';
  document.getElementById('f-order').value = article?.sort_order ?? 0;
  quill.root.innerHTML = article?.body || '';
  setCoverImage(article?.cover_image || null);
  modal.classList.remove('admin__hidden');
}

function closeModal() {
  modal.classList.add('admin__hidden');
}

coverZone.addEventListener('click', () => coverFileInput.click());
coverZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  coverZone.classList.add('is-dragover');
});
coverZone.addEventListener('dragleave', () => coverZone.classList.remove('is-dragover'));
coverZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  coverZone.classList.remove('is-dragover');
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith('image/')) await handleCoverFile(file);
});
coverFileInput.addEventListener('change', async () => {
  const file = coverFileInput.files?.[0];
  if (file) await handleCoverFile(file);
  coverFileInput.value = '';
});
btnRemoveCover.addEventListener('click', () => setCoverImage(null));

document.getElementById('btn-new').addEventListener('click', () => openModal(true, null));
document.getElementById('btn-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tabTarget));
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

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'edit') {
    const article = cachedArticles.find((a) => a.id === id);
    if (article) openModal(false, article);
    return;
  }

  if (action === 'del') {
    if (!confirm('Delete this article?')) return;
    const res = await api(`/api/v1/admin/news/${id}`, { method: 'DELETE' });
    if (res?.ok) await loadArticles();
  }
});

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showUserFeedback('Creating user...');

  const payload = {
    email: document.getElementById('user-email').value.trim(),
    password: document.getElementById('user-password').value,
    role: document.getElementById('user-role').value,
  };

  const res = await api('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showUserFeedback(err.error || 'Could not create user.', 'error');
    return;
  }

  userForm.reset();
  showUserFeedback('User created successfully.');
  await loadUsers();
});

usersList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-user-action="delete"]');
  if (!btn || btn.disabled) return;

  const id = btn.dataset.id;
  const user = cachedUsers.find((row) => String(row.id) === id);
  if (!user) return;

  if (!confirm(`Delete ${user.email}?`)) return;

  const res = await api(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
  if (!res) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showUserFeedback(err.error || 'Could not delete user.', 'error');
    return;
  }

  showUserFeedback('User deleted.');
  await loadUsers();
});

usersList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-user-action="toggle-role"]');
  if (!btn || btn.disabled) return;

  const id = btn.dataset.id;
  const currentRole = btn.dataset.currentRole;
  const user = cachedUsers.find((row) => String(row.id) === id);
  if (!user) return;

  const newRole = currentRole === 'admin' ? 'customer' : 'admin';
  if (!confirm(`Change ${user.email} from ${currentRole} to ${newRole}?`)) return;

  const res = await api(`/api/v1/admin/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role: newRole }),
  });
  if (!res) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showUserFeedback(err.error || 'Could not update role.', 'error');
    return;
  }

  showUserFeedback(`${user.email} is now ${newRole}.`);
  await loadUsers();
});

articleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const editId = document.getElementById('edit-id').value;

  const bodyHtml = quill ? quill.root.innerHTML : '';
  const isEmpty = bodyHtml === '<p><br></p>' || bodyHtml.trim() === '';

  const payload = {
    title: document.getElementById('f-title').value.trim(),
    excerpt: document.getElementById('f-excerpt').value.trim(),
    body: isEmpty ? '' : bodyHtml,
    cover_image: coverField.value || null,
    category: document.getElementById('f-category').value,
    author: document.getElementById('f-author').value.trim(),
    card_variant: document.getElementById('f-variant').value,
    sort_order: Number(document.getElementById('f-order').value) || 0,
  };

  const res = await api(
    editId ? `/api/v1/admin/news/${editId}` : '/api/v1/admin/news',
    {
      method: editId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }
  );

  if (!res) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showModalError(err.error || 'Save failed');
    return;
  }

  closeModal();
  await loadArticles();
});

(async function init() {
  const ok = await requireAuthCheck();
  if (!ok) return;
  await Promise.all([loadArticles(), loadUsers()]);
})();
