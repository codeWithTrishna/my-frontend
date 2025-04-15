// Update with your actual Worker URL
const workerURL = 'https://my-inventory-worker.shubhambalgude226.workers.dev';

// ---- STATE ----
let currentUser = null;
let inventory = [];     // array of { id, ...fields }
let headers = [];       // current field names

// ---- UTILITIES ----
async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function byId(id){ return document.getElementById(id); }

// ---- AUTH FLOW ----
byId('show-register').onclick = e => {
  e.preventDefault();
  hide(byId('login-form')); show(byId('register-form'));
};
byId('show-login').onclick = e => {
  e.preventDefault();
  hide(byId('register-form')); show(byId('login-form'));
};

async function login(email, password) {
  const hash = await hashPassword(password);
  const res = await fetch('${WORKER_URL}/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email, hash })
  });
  return res.ok ? res.json() : null;
}
async function register(email, password) {
  const hash = await hashPassword(password);
  const res = await fetch('${WORKER_URL}/api/auth/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email, hash })
  });
  return res.ok;
}

byId('login-form').onsubmit = async e => {
  e.preventDefault();
  const user = await login(
    byId('login-email').value, byId('login-password').value
  );
  if (user) startDashboard(user);
  else alert('Login failed');
};
byId('register-form').onsubmit = async e => {
  e.preventDefault();
  const ok = await register(
    byId('reg-email').value, byId('reg-password').value
  );
  if (ok) { alert('Registered! Please log in.'); show(byId('login-form')); hide(byId('register-form')); }
  else alert('Registration failed');
};

// toggle password visibility
for (const [btnId, inputId] of [['toggleLoginPwd','login-password'],['toggleRegPwd','reg-password']]) {
  byId(btnId).onclick = () => {
    const inp = byId(inputId);
    inp.type = inp.type==='password'?'text':'password';
  };
}

// ---- DASHBOARD ----
byId('logout').onclick = () => location.reload();

async function fetchInventory() {
  const res = await fetch('${WORKER_URL}/api/inventory', {
    headers: { 'Authorization': `Bearer ${currentUser.token}` }
  });
  const data = await res.json();
  inventory = data.entries;
  headers = data.fields;
  renderTable(inventory, headers);
}

function renderTable(entries, cols) {
  // headers
  const thRow = byId('table-headers');
  thRow.innerHTML = cols.map(c => `<th>${c}</th>`).join('') + '<th>Actions</th>';
  // body
  const body = byId('table-body');
  body.innerHTML = entries.map(e => {
    const cells = cols.map(c => `<td>${e[c]||''}</td>`).join('');
    return `<tr data-id="${e.id}">${cells}
      <td>
        <button class="edit">✏️</button>
        <button class="delete">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  // attach action handlers
  body.querySelectorAll('.delete').forEach(btn => {
    btn.onclick = e => deleteEntry(e.target.closest('tr').dataset.id);
  });
  body.querySelectorAll('.edit').forEach(btn => {
    btn.onclick = e => editEntry(e.target.closest('tr').dataset.id);
  });
}

// search
byId('search-bar').oninput = e => {
  const q = e.target.value.toLowerCase();
  const filtered = inventory.filter(item =>
    headers.some(h => (item[h]||'').toLowerCase().includes(q))
  );
  renderTable(filtered, headers);
};

// add entry
byId('add-entry-btn').onclick = () => {
  const newObj = { id: Date.now().toString() };
  headers.forEach(h => newObj[h]='');
  inventory.push(newObj);
  renderTable(inventory, headers);
  saveInventory();
};

// delete & edit
async function deleteEntry(id) {
  inventory = inventory.filter(e => e.id!==id);
  renderTable(inventory, headers);
  await saveInventory();
}
function editEntry(id) {
  const row = [...byId('table-body').rows]
    .find(r => r.dataset.id===id);
  headers.forEach((h,i) => {
    const cell = row.cells[i];
    const val = cell.textContent;
    cell.innerHTML = `<input value="${val}">`;
    cell.firstChild.onblur = () => {
      inventory.find(e=>e.id===id)[h] = cell.firstChild.value;
      saveInventory();
      renderTable(inventory, headers);
    };
  });
}

// save to KV
async function saveInventory() {
  await fetch('${WORKER_URL}/api/inventory', {
    method:'PUT',
    headers:{
      'Content-Type':'application/json',
      'Authorization': `Bearer ${currentUser.token}`
    },
    body: JSON.stringify({ fields: headers, entries: inventory })
  });
}

// file upload & parse
byId('upload-btn').onclick = () => {
  const file = byId('file-input').files[0];
  if (!file) return alert('Select a file');
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext==='csv') {
    Papa.parse(file, {
      header: true, complete: r => applyUpload(r.data, Object.keys(r.data[0]||{}))
    });
  } else {
    const reader = new FileReader();
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval:'' });
      applyUpload(data, Object.keys(data[0]||{}));
    };
    reader.readAsArrayBuffer(file);
  }
};
function applyUpload(data, cols) {
  headers = cols;
  inventory = data.map((row,i)=>({ id: Date.now()+i+'', ...row }));
  renderTable(inventory, headers);
  saveInventory();
}

// start dashboard
function startDashboard(user) {
  currentUser = user;
  hide(byId('auth-container'));
  show(byId('dashboard'));
  fetchInventory();
}

