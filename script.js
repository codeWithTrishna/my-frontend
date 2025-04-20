console.log("⏳ script.js loaded");
const workerURL = 'https://my-inventory-worker.trishnajaiswar226.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
  // AUTH elements
  const authContainer      = document.getElementById('authContainer');
  const authTitle          = document.getElementById('authTitle');
  const authForm           = document.getElementById('authForm');
  const authUsername       = document.getElementById('authUsername');
  const authPassword       = document.getElementById('authPassword');
  const authSubmit         = document.getElementById('authSubmit');
  const switchLink         = document.getElementById('switchLink');
  const switchPrompt       = document.getElementById('switchPrompt');
  let isLogin = true;

  // DASHBOARD elements
  const dashboard          = document.getElementById('dashboard');
  const logoutBtn          = document.getElementById('logoutBtn');
  const fileInput          = document.getElementById('fileInput');
  const uploadBtn          = document.getElementById('uploadBtn');
  const searchInput        = document.getElementById('searchInput');
  const clearInventoryBtn  = document.getElementById('clearInventoryBtn');

  // Uploaded files display
  const uploadedFilesDiv   = document.getElementById('uploadedFiles');
  const uploadedFilesList  = document.getElementById('uploadedFilesList');

  // MANUAL entry elements
  const manualForm         = document.getElementById('manualForm');
  const manualAction       = document.getElementById('manualAction');
  const newFieldContainer  = document.getElementById('newFieldContainer');
  const addEntryContainer  = document.getElementById('addEntryContainer');
  const newFieldNameInput  = document.getElementById('newFieldName');
  const addEntryBtn        = document.getElementById('addEntryBtn');

  // Toast helper
  function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast ' + (isError ? 'error' : 'success');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // SWITCH LOGIN / REGISTER
  switchLink.addEventListener('click', e => {
    e.preventDefault();
    isLogin = !isLogin;
    authTitle.textContent    = isLogin ? 'Login'    : 'Register';
    authSubmit.textContent   = isLogin ? 'Login'    : 'Register';
    switchPrompt.textContent = isLogin
      ? "Don't have an account?"
      : 'Already have an account?';
    switchLink.textContent   = isLogin ? 'Register' : 'Login';
  });

  // AUTH SUBMIT
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(workerURL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.value,
          password: authPassword.value
        })
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      if (isLogin) {
        const { token } = JSON.parse(text);
        localStorage.setItem('token', token);
        showDashboard();
      } else {
        showToast(text);
        switchLink.click();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // SHOW DASHBOARD
  function showDashboard() {
    authContainer.classList.add('hidden');
    dashboard.classList.remove('hidden');
    fetchInventory();
  }

  // LOGOUT
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    dashboard.classList.add('hidden');
    authContainer.classList.remove('hidden');
    authUsername.value = authPassword.value = '';
  });

  // DISPLAY UPLOADED FILE NAME
  fileInput.addEventListener('change', () => {
    const names = Array.from(fileInput.files).map(f => f.name);
    if (names.length) {
      uploadedFilesDiv.classList.remove('hidden');
      const li = document.createElement('li');
      li.textContent = names.join(', ');
      uploadedFilesList.appendChild(li);
    }
  });

  // UPLOAD FILE
  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files.length)
      return showToast('Select a file first', true);
    const token = localStorage.getItem('token');
    const data  = await fileInput.files[0].arrayBuffer();
    const ct    = fileInput.files[0].name.endsWith('.csv')
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    try {
      const res = await fetch(workerURL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type':  ct
        },
        body: data
      });
      showToast(await res.text());
      fetchInventory();
    } catch (e) {
      showToast(e.message, true);
    }
  });

  // CLEAR INVENTORY
  clearInventoryBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all inventory?')) return;
    try {
      const res = await fetch(workerURL, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        cache: 'no-store'
      });
      showToast(await res.text());
      fetchInventory();
    } catch (e) {
      showToast(e.message, true);
    }
  });

  // MANUAL CARD LOGIC
  manualAction.addEventListener('change', () => {
    newFieldContainer.classList.add('hidden');
    addEntryContainer.classList.add('hidden');
    if (manualAction.value === 'addField') {
      newFieldContainer.classList.remove('hidden');
    } else if (manualAction.value === 'addEntry') {
      addEntryContainer.classList.remove('hidden');
    }
  });

  manualForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (manualAction.value !== 'addField') return;
    const fieldName = newFieldNameInput.value.trim();
    if (!fieldName) return showToast('Please enter a field name', true);
    const headerRow = document.querySelector('#inventoryTable thead tr');
    const actionsTh = headerRow.querySelector('th:last-child');
    const newTh = document.createElement('th');
    newTh.textContent = fieldName;
    headerRow.insertBefore(newTh, actionsTh);
    document.querySelectorAll('#inventoryTable tbody tr').forEach(tr => {
      const lastTd = tr.querySelector('td:last-child');
      const td = document.createElement('td');
      tr.insertBefore(td, lastTd);
    });
    showToast(`Field "${fieldName}" added.`);
    manualForm.reset();
    newFieldContainer.classList.add('hidden');
  });

  addEntryBtn.addEventListener('click', () => {
    const headers = Array.from(
      document.querySelectorAll('#inventoryTable thead th')
    ).map(th => th.textContent.trim());
    const tr = document.createElement('tr');
    headers.forEach(hdr => {
      const td = document.createElement('td');
      if (hdr === 'Actions') {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className   = 'btn-action';
        saveBtn.addEventListener('click', async () => {
          const record = {};
          tr.querySelectorAll('td').forEach((cell, idx) => {
            const key = headers[idx];
            if (key !== 'Actions') {
              const inp = cell.querySelector('input');
              record[key] = inp ? inp.value : '';
            }
          });
          try {
            const res = await fetch(workerURL, {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type':  'application/json'
              },
              body: JSON.stringify(record)
            });
            showToast(await res.text());
            fetchInventory();
          } catch (err) {
            showToast(err.message, true);
          }
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className   = 'btn-delete';
        deleteBtn.addEventListener('click', () => tr.remove());
        td.append(saveBtn, deleteBtn);
      } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = hdr;
        td.appendChild(inp);
      }
      tr.appendChild(td);
    });
    document.querySelector('#inventoryTable tbody').appendChild(tr);
    manualForm.reset();
    addEntryContainer.classList.add('hidden');
  });

  // SEARCH with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => fetchInventory(searchInput.value), 300);
  });

  // FETCH & RENDER
  async function fetchInventory(q = '') {
    try {
      const url = workerURL + (q ? '?q=' + encodeURIComponent(q) : '');
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(await res.text());
      const items = await res.json();
      renderTable(items);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  // BUILD TABLE & INLINE EDITING
  function renderTable(items) {
    const table = document.getElementById('inventoryTable');
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const cols = items.length
      ? Object.keys(items[0]).filter(k => k !== 'key')
      : [];
    cols.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    headerRow.insertAdjacentHTML('beforeend','<th>Actions</th>');
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (!items.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="${cols.length+1}" class="empty">
                        No inventory data available.
                      </td>`;
      tbody.appendChild(tr);
    } else {
      items.forEach(item => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
          const td = document.createElement('td');
          td.textContent = item[col] || '';
          tr.appendChild(td);
        });
        const actionTd = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn-action';
        editBtn.onclick = () => makeRowEditable(tr, item.key, item);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => {
          if (!confirm('Remove this record?')) return;
          tr.remove();
          fetch(workerURL + '?key=' + encodeURIComponent(item.key), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            cache: 'no-store'
          })
          .then(r => r.text())
          .then(msg => showToast(msg))
          .catch(err => showToast(err.message, true))
          .finally(() => fetchInventory());
        };
        actionTd.append(editBtn, deleteBtn);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
  }

  // INLINE-EDIT HELPER
  function makeRowEditable(tr, key, original) {
    const headers = [...document.querySelectorAll('#inventoryTable thead th')]
      .map(th => th.textContent)
      .filter(h => h !== 'Actions');
    tr.querySelectorAll('td').forEach((td, i) => {
      if (i < headers.length) {
        const field = headers[i];
        const val = original[field] || '';
        td.innerHTML = `<input class="editable-input" data-key="${field}" value="${val}">`;
      }
    });
    const actionTd = tr.lastElementChild;
    actionTd.innerHTML = `
      <button class="btn-action save-btn">Save</button>
      <button class="btn-delete cancel-btn">Cancel</button>
    `;
    actionTd.querySelector('.save-btn').onclick = async () => {
      const updated = {};
      tr.querySelectorAll('input').forEach(inp => {
        updated[inp.dataset.key] = inp.value;
      });
      try {
        const res = await fetch(workerURL + '?key=' + encodeURIComponent(key), {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updated)
        });
        showToast(await res.text());
        fetchInventory();
      } catch (e) {
        showToast(e.message, true);
      }
    };
    actionTd.querySelector('.cancel-btn').onclick = () => fetchInventory();
  }

  // AUTO-REFRESH on tab focus
  window.addEventListener('focus', () => {
    if (!dashboard.classList.contains('hidden')) {
      fetchInventory(searchInput.value || '');
    }
  });

  // AUTO-LOGIN
  if (localStorage.getItem('token')) {
    showDashboard();
  }
});
