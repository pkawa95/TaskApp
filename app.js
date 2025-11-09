const API_URL = "https://api.pkportfolio.pl/tasksapi";
let token = localStorage.getItem("token");

// === AUTH ===
document.getElementById("login").onclick = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);

  const res = await fetch(`${API_URL}/login`, { method: "POST", body: form });
  const data = await res.json();
  if (res.ok) {
    token = data.access_token;
    localStorage.setItem("token", token);
    showTasksSection();
  } else {
    document.getElementById("auth-msg").innerText = data.detail || "Błąd logowania";
  }
};

document.getElementById("register").onclick = async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  document.getElementById("auth-msg").innerText = data.message || data.detail;
};

// === UI ===
function showTasksSection() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("tasks-section").classList.remove("hidden");
  loadTasks();
}

document.getElementById("logout-btn").onclick = () => {
  token = null;
  localStorage.removeItem("token");
  location.reload();
};

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", e => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");
  });
});

// === TASKS ===
async function loadTasks() {
  const res = await fetch(`${API_URL}/tasks`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const ul = document.getElementById("tasks");
  ul.innerHTML = "";
  data.forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${task.title}</strong><br>
        <small>${task.subject} • ${task.priority} • ${task.due_date}</small>
      </div>
      <div>
        <button onclick="deleteTask(${task.id})">🗑️</button>
      </div>`;
    ul.appendChild(li);
  });
}

async function deleteTask(id) {
  if (!confirm("Usunąć to zadanie?")) return;
  await fetch(`${API_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadTasks();
}

document.getElementById("add-task").onclick = async () => {
  const subject = document.getElementById("new-subject").value || document.getElementById("subject").value;
  const priority = document.getElementById("priority").value;
  const title = document.getElementById("title").value;
  const due_date = document.getElementById("due_date").value;

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ subject, priority, title, due_date })
  });
  if (res.ok) {
    alert("Dodano zadanie!");
    loadTasks();
  } else {
    alert("Błąd dodawania zadania");
  }
};

// === AUTOLOGIN ===
if (token) showTasksSection();

// === REGISTER SW ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
