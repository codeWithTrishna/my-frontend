// Update with your actual Worker URL
const workerURL = 'https://my-inventory-worker.shubhambalgude226.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById("authSection");
  const registerDiv = document.getElementById("registerDiv");
  const loginDiv = document.getElementById("loginDiv");
  const inventorySection = document.getElementById("inventorySection");

  // Toggle views between registration and login
  document.getElementById("showLogin").addEventListener("click", (e) => {
    e.preventDefault();
    registerDiv.style.display = "none";
    loginDiv.style.display = "block";
  });
  document.getElementById("showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    loginDiv.style.display = "none";
    registerDiv.style.display = "block";
  });

  // Toggle password visibility in registration form
  document.getElementById("registerShowPassword").addEventListener("change", function() {
    const passwordInput = document.getElementById("registerPassword");
    passwordInput.type = this.checked ? "text" : "password";
  });

  // Toggle password visibility in login form
  document.getElementById("loginShowPassword").addEventListener("change", function() {
    const passwordInput = document.getElementById("loginPassword");
    passwordInput.type = this.checked ? "text" : "password";
  });

  // Registration
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("registerUsername").value;
    const password = document.getElementById("registerPassword").value;
    try {
      const res = await fetch(workerURL + '/register', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const msg = await res.text();
      showToast(msg);
    } catch (err) {
      showToast("Registration error: " + err.message, true);
    }
  });

  // Login
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const res = await fetch(workerURL + '/login', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        authSection.style.display = "none";
        inventorySection.style.display = "block";
        fetchInventory();
      } else {
        showToast("Login failed. Please check your credentials.", true);
      }
    } catch (err) {
      showToast("Login error: " + err.message, true);
    }
  });
});


  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    authSection.style.display = "block";
    inventorySection.style.display = "none";
  });

  // File upload (CSV and XLSX)
  document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
      showToast("Please select a file to upload.", true);
      return;
    }
    const file = fileInput.files[0];
    const token = localStorage.getItem("token");
    try {
      const fileData = await file.arrayBuffer();
      let contentType = file.type;
      // Fallback for XLS extensions
      if (!contentType && file.name.endsWith(".xls")) {
        contentType = "application/vnd.ms-excel";
      }
      const res = await fetch(workerURL, {
        method: 'POST',
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": contentType
        },
        body: fileData
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (err) {
      showToast("Upload error: " + err.message, true);
    }
  });

  // Manual addition
  document.getElementById("manualForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const record = {
      itemName: document.getElementById("itemName").value,
      quantity: document.getElementById("quantity").value,
      description: document.getElementById("description").value
    };
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(workerURL, {
        method: 'POST',
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(record)
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (err) {
      showToast("Error adding record: " + err.message, true);
    }
  });

  // Refresh inventory
  document.getElementById("refreshBtn").addEventListener("click", () => {
    fetchInventory();
  });

  // Clear inventory
  document.getElementById("clearBtn").addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(workerURL, {
        method: 'DELETE',
        headers: {
          "Authorization": "Bearer " + token
        }
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (err) {
      showToast("Error clearing inventory: " + err.message, true);
    }
  });

  // Search inventory
  document.getElementById("searchBtn").addEventListener("click", () => {
    const query = document.getElementById("searchInput").value;
    fetchInventory(query);
  });

  // Fetch inventory (with optional search)
  async function fetchInventory(searchQuery = "") {
    const token = localStorage.getItem("token");
    let url = workerURL;
    if (searchQuery) url += "?q=" + encodeURIComponent(searchQuery);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) throw new Error("Failed to fetch inventory.");
      const data = await res.json();
      displayInventory(data);
      showToast("Inventory refreshed.");
    } catch (err) {
      showToast("Fetch error: " + err.message, true);
    }
  }

  // Display inventory table with an edit button for each record
  window.editRecord = async function(key) {
    const token = localStorage.getItem("token");
    const currentData = prompt("Enter new JSON data for record with key " + key + " (must be valid JSON):");
    if (!currentData) return;
    try {
      const updatedData = JSON.parse(currentData);
      const res = await fetch(workerURL + "?key=" + encodeURIComponent(key), {
        method: 'PUT',
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });
      const msg = await res.text();
      showToast(msg);
      fetchInventory();
    } catch (err) {
      showToast("Update error: " + err.message, true);
    }
  };

  function displayInventory(inventory) {
    const container = document.getElementById("inventoryContainer");
    if (!inventory.length) {
      container.innerHTML = "<p>No inventory data available.</p>";
      return;
    }
    const headers = Object.keys(inventory[0]);
    headers.push("Actions");
    let table = `<table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
      </thead>
      <tbody>`;
    inventory.forEach(item => {
      table += `<tr>`;
      headers.slice(0, -1).forEach(h => {
        table += `<td>${item[h] || "N/A"}</td>`;
      });
      table += `<td><button onclick="editRecord('${item.key}')">Edit</button></td>`;
      table += `</tr>`;
    });
    table += `</tbody></table>`;
    container.innerHTML = table;
  }

  // Toast notifications
  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'red' : '#28a745';
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
});
