console.log("⏳ script.js loaded");

// your worker URL here
const workerURL = 'https://my-inventory-worker.shubhambalgude226.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
  console.log("🔌 attaching authForm listener");
  // ─── AUTH ELEMENTS ─────────────────────────────────────────────────────────
  const authContainer = document.getElementById('authContainer');
  const authTitle     = document.getElementById('authTitle');
  const authForm      = document.getElementById('authForm');
  const authUsername  = document.getElementById('authUsername');
  const authPassword  = document.getElementById('authPassword');
  const authSubmit    = document.getElementById('authSubmit');
  const switchLink    = document.getElementById('switchLink');
  const switchPrompt  = document.getElementById('switchPrompt');
  let isLogin = true;

  // ─── DASHBOARD ELEMENTS ─────────────────────────────────────────────────────
  const dashboard        = document.getElementById('dashboard');
  const logoutBtn        = document.getElementById('logoutBtn');
  const fileInput        = document.getElementById('fileInput');
  const uploadBtn        = document.getElementById('uploadBtn');
  const searchInput      = document.getElementById('searchInput');
  const inventoryTableBody = document.querySelector('#inventoryTable tbody');

  // ─── MANUAL CARD ELEMENTS (NEW) ────────────────────────────────────────────
  const manualForm           = document.getElementById('manualForm');
  const manualAction         = document.getElementById('manualAction');
  const newFieldContainer    = document.getElementById('newFieldContainer');
  const fieldSelectContainer = document.getElementById('fieldSelectContainer');
  const newFieldNameInput    = document.getElementById('newFieldName');
  const manualFieldSelect    = document.getElementById('manualFieldSelect');
  const manualSubmit         = document.getElementById('manualSubmit');

  // ─── TOAST ─────────────────────────────────────────────────────────────────
  const toast = document.getElementById('toast');
  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.style.background = isError
      ? 'rgba(200,0,0,0.8)'
      : 'rgba(0,0,0,0.7)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ─── SWITCH LOGIN / REGISTER ───────────────────────────────────────────────
  switchLink.addEventListener('click', e => {
    e.preventDefault();
    isLogin = !isLogin;
    authTitle.textContent   = isLogin ? 'Login'    : 'Register';
    authSubmit.textContent  = isLogin ? 'Login'    : 'Register';
    switchPrompt.textContent= isLogin
      ? "Don't have an account?"
      : 'Already have an account?';
    switchLink.textContent  = isLogin ? 'Register' : 'Login';
  });

  // ─── AUTH SUBMIT ───────────────────────────────────────────────────────────
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(workerURL + endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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
        switchLink.click();  // auto-switch to login
      }
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // ─── SHOW DASHBOARD ────────────────────────────────────────────────────────
  function showDashboard() {
    authContainer.classList.add('hidden');
    dashboard.classList.remove('hidden');
    fetchInventory();
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    dashboard.classList.add('hidden');
    authContainer.classList.remove('hidden');
    authUsername.value = authPassword.value = '';
  });

  // ─── UPLOAD FILE ───────────────────────────────────────────────────────────
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
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (e) {
      showToast(e.message, true);
    }
  });

  // ─── MANUAL CARD LOGIC ─────────────────────────────────────────────────────
  // repopulate field dropdown from current table headers
  function updateFieldSelect() {
    manualFieldSelect.innerHTML =
      `<option value="" disabled selected>Select field to add</option>`;
    document.querySelectorAll('#inventoryTable thead th').forEach(th => {
      const name = th.textContent.trim();
      if (name !== 'Actions') {
        const opt = document.createElement('option');
        opt.value   = name;
        opt.textContent = name;
        manualFieldSelect.append(opt);
      }
    });
  }

  manualAction.addEventListener('change', () => {
    newFieldContainer.classList.add('hidden');
    fieldSelectContainer.classList.add('hidden');
    manualSubmit.classList.add('hidden');

    if (manualAction.value === 'addField') {
      newFieldContainer.classList.remove('hidden');
      manualSubmit.textContent = 'Add Field';
      manualSubmit.classList.remove('hidden');
    } else if (manualAction.value === 'addEntry') {
      updateFieldSelect();
      fieldSelectContainer.classList.remove('hidden');
      manualSubmit.textContent = 'Add Entry';
      manualSubmit.classList.remove('hidden');
    }
  });

  manualForm.addEventListener('submit', async e => {
    e.preventDefault();
    const action = manualAction.value;
    const token  = localStorage.getItem('token');

    // —— Add New Field (column) ——
    if (action === 'addField') {
      const fieldName = newFieldNameInput.value.trim();
      if (!fieldName) return showToast('Enter a field name', true);

      // 1. Insert new <th> before Actions
      const headerRow = document.querySelector('#inventoryTable thead tr');
      const actionsTh = headerRow.querySelector('th:last-child');
      const newTh     = document.createElement('th');
      newTh.textContent = fieldName;
      headerRow.insertBefore(newTh, actionsTh);

      // 2. Add empty <td> to each existing row
      document
        .querySelectorAll('#inventoryTable tbody tr')
        .forEach(tr => {
          const lastTd = tr.querySelector('td:last-child');
          const td = document.createElement('td');
          tr.insertBefore(td, lastTd);
        });

      showToast(`Field "${fieldName}" added.`);
      manualForm.reset();
      newFieldContainer.classList.add('hidden');
      manualSubmit.classList.add('hidden');
    }

    // —— Add New Entry (row) ——
    else if (action === 'addEntry') {
      const field = manualFieldSelect.value;
      if (!field) return showToast('Select a field', true);

      // Build new row with inputs under each header
      const tr = document.createElement('tr');
      const headers = Array.from(
        document.querySelectorAll('#inventoryTable thead th')
      ).map(th => th.textContent.trim());

      headers.forEach(hdr => {
        const td = document.createElement('td');
        if (hdr === 'Actions') {
          // Save + Delete buttons
          const saveBtn = document.createElement('button');
          saveBtn.textContent = 'Save';
          saveBtn.className = 'btn-action';
          saveBtn.addEventListener('click', async () => {
            // gather record
            const record = {};
            tr.querySelectorAll('td').forEach((cell, idx) => {
              const key = headers[idx];
              if (key !== 'Actions') {
                const inp = cell.querySelector('input');
                record[key] = inp ? inp.value : '';
              }
            });
            // post to worker
            try {
              const res = await fetch(workerURL, {
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer ' + token,
                  'Content-Type':  'application/json'
                },
                body: JSON.stringify(record)
              });
              const msg = await res.text();
              showToast(msg);
              fetchInventory();
            } catch (err) {
              showToast(err.message, true);
            }
          });

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.className = 'btn-delete';
          deleteBtn.addEventListener('click', () => tr.remove());

          td.append(saveBtn, deleteBtn);
        } else {
          const input = document.createElement('input');
          input.type     = 'text';
          input.placeholder = hdr;
          td.appendChild(input);
        }
        tr.appendChild(td);
      });

      inventoryTableBody.appendChild(tr);
      manualForm.reset();
      fieldSelectContainer.classList.add('hidden');
      manualSubmit.classList.add('hidden');
    }
  });

  // ─── SEARCH ────────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () =>
    fetchInventory(searchInput.value)
  );

  // ─── FETCH & RENDER ───────────────────────────────────────────────────────
  async function fetchInventory(q = '') {
    const token = localStorage.getItem('token');
    try {
      let url = workerURL + (q ? '?q=' + encodeURIComponent(q) : '');
      const res = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      renderTable(data);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderTable(items) {
    inventoryTableBody.innerHTML = '';
    if (!items.length) {
      const colCount = document.querySelectorAll('#inventoryTable th').length;
      inventoryTableBody.innerHTML =
        `<tr><td colspan="${colCount}" class="empty">No inventory data available.</td></tr>`;
      return;
    }
    items.forEach(item => {
      const tr = document.createElement('tr');
      // populate cells
      Object.entries(item).forEach(([key, val]) => {
        if (key === 'key') return;
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      // actions cell
      const actionTd = document.createElement('td');
      const editBtn   = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className   = 'btn-action';
      editBtn.addEventListener('click', () => editRecord(item.key));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className   = 'btn-delete';
      deleteBtn.addEventListener('click', () => {
        tr.remove();
        showToast('Row removed');
      });

      actionTd.append(editBtn, deleteBtn);
      tr.appendChild(actionTd);
      inventoryTableBody.appendChild(tr);
    });
  }
  window.renderTable = renderTable; // override if used globally

  // ─── EDIT RECORD (global fn, unchanged) ──────────────────────────────────
  window.editRecord = async function(key) {
    const token = localStorage.getItem('token');
    const json  = prompt('Enter valid JSON to update:');
    if (!json) return;
    try {
      const res = await fetch(workerURL + '?key=' + encodeURIComponent(key), {
        method: 'PUT',
        headers: {
          'Authorization':'Bearer ' + token,
          'Content-Type':'application/json'
        },
        body: json
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (e) {
      showToast(e.message, true);
    }
  };

  // ─── AUTO‑LOGIN ───────────────────────────────────────────────────────────
  if (localStorage.getItem('token')) {
    showDashboard();
  }
});
