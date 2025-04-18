console.log("⏳ script.js loaded");


// your worker URL here
const workerURL = 'https://my-inventory-worker.shubhambalgude226.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
  // auth elements
  const authContainer = document.getElementById('authContainer');
  const authTitle = document.getElementById('authTitle');
  const authForm = document.getElementById('authForm');
  const authUsername = document.getElementById('authUsername');
  const authPassword = document.getElementById('authPassword');
  const authSubmit = document.getElementById('authSubmit');
  const switchLink = document.getElementById('switchLink');
  const switchPrompt = document.getElementById('switchPrompt');
  let isLogin = true;

  // dashboard elements
  const dashboard = document.getElementById('dashboard');
  const logoutBtn = document.getElementById('logoutBtn');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const manualForm = document.getElementById('manualForm');
  const searchInput = document.getElementById('searchInput');
  const inventoryTable = document.getElementById('inventoryTable').querySelector('tbody');

  // toast
  const toast = document.getElementById('toast');
  function showToast(msg, isError=false) {
    toast.textContent = msg;
    toast.style.background = isError ? 'rgba(200,0,0,0.8)' : 'rgba(0,0,0,0.7)';
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 3000);
  }

  // SWITCH LOGIN / REGISTER
  switchLink.addEventListener('click', e => {
    e.preventDefault();
    isLogin = !isLogin;
    authTitle.textContent = isLogin ? 'Login' : 'Register';
    authSubmit.textContent = isLogin ? 'Login' : 'Register';
    switchPrompt.textContent = isLogin
      ? "Don't have an account?"
      : 'Already have an account?';
    switchLink.textContent = isLogin ? 'Register' : 'Login';
  });

  // AUTH SUBMIT
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/register';
    try {
      const res = await fetch(workerURL + endpoint, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
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
        // auto‑switch to login
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

  // UPLOAD
  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) return showToast('Select a file first', true);
    const token = localStorage.getItem('token');
    const data = await fileInput.files[0].arrayBuffer();
    const ct = fileInput.files[0].name.endsWith('.csv')
      ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    try {
      const res = await fetch(workerURL, {
        method: 'POST',
        headers: {
          'Authorization':'Bearer '+token,
          'Content-Type': ct
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

  // MANUAL ADD
  manualForm.addEventListener('submit', async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const rec = {
      itemName: document.getElementById('itemName').value,
      quantity: document.getElementById('quantity').value,
      description: document.getElementById('description').value
    };
    try {
      const res = await fetch(workerURL, {
        method:'POST',
        headers:{
          'Authorization':'Bearer '+token,
          'Content-Type':'application/json'
        },
        body: JSON.stringify(rec)
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
      manualForm.reset();
    } catch (e) {
      showToast(e.message, true);
    }
  });

  // SEARCH
  searchInput.addEventListener('input', () => fetchInventory(searchInput.value));

  // FETCH & RENDER INVENTORY
  async function fetchInventory(q='') {
    const token = localStorage.getItem('token');
    try {
      let url = workerURL + (q ? '?q='+encodeURIComponent(q) : '');
      const res = await fetch(url, {
        headers:{ 'Authorization':'Bearer '+token }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      renderTable(data);
    } catch (e) {
      showToast(e.message, true);
    }
  }

  function renderTable(items) {
    inventoryTable.innerHTML = '';
    if (!items.length) {
      inventoryTable.innerHTML = '<tr><td colspan="4" class="empty">No inventory data available.</td></tr>';
      return;
    }
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.itemName||''}</td>
        <td>${item.quantity||''}</td>
        <td>${item.description||''}</td>
        <td>
          <button class="btn-action" onclick="editRecord('${item.key}')">Edit</button>
        </td>`;
      inventoryTable.appendChild(tr);
    });
  }

  // EDIT RECORD (global fn)
  window.editRecord = async function(key) {
    const token = localStorage.getItem('token');
    const json = prompt('Enter valid JSON to update:');
    if (!json) return;
    try {
      const res = await fetch(workerURL+'?key='+encodeURIComponent(key), {
        method:'PUT',
        headers:{
          'Authorization':'Bearer '+token,
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

  // auto‑login if token exists
  if (localStorage.getItem('token')) showDashboard();
});
