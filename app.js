const API_URL = "https://api.pkportfolio.pl/tasksapi";
let token = localStorage.getItem("token") || "";

// --- Helper ---
const headers = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

const authSection = document.getElementById("auth-section");
const tasksSection = document.getElementById("tasks-section");
const authMsg = document.getElementById("auth-msg");
const userInfo = document.getElementById("user-info");

const showMsg = (msg, error = false) => {
  authMsg.textContent = msg;
  authMsg.style.color = error ? "red" : "green";
};

// --- Rejestracja ---
document.getElementById("register").addEventListener("click", async () => {
  const user = {
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    confirm_password: document.getElementById("confirm_password").value.trim()
  };

  if (!user.first_name || !user.last_name || !user.email || !user.password || !user.confirm_password) {
    showMsg("Wszystkie pola są wymagane!", true);
    return;
  }

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });

  const data = await res.json();
  if (res.ok) showMsg("Zarejestrowano pomyślnie!");
  else showMsg(data.detail || "Błąd rejestracji", true);
});

// --- Logowanie ---
document.getElementById("login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });

  const data = await res.json();
  if (res.ok) {
    token = data.access_token;
    localStorage.setItem("token", token);
    await loadUserData();
  } else showMsg(data.detail || "Błąd logowania", true);
});

// --- Wylogowanie ---
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("token");
  token = "";
  authSection.classList.remove("hidden");
  tasksSection.classList.add("hidden");
  document.getElementById("logout-btn").classList.add("hidden");
  document.getElementById("login-btn").classList.remove("hidden");
  showMsg("Wylogowano");
});

// --- Wczytanie użytkownika ---
async function loadUserData() {
  const res = await fetch(`${API_URL}/whoami`, { headers: headers() });
  if (!res.ok) {
    showMsg("Sesja wygasła. Zaloguj się ponownie.", true);
    localStorage.removeItem("token");
    return;
  }

  const user = await res.json();
  userInfo.textContent = `${user.first_name} ${user.last_name}`;
  userInfo.classList.remove("hidden");

  authSection.classList.add("hidden");
  tasksSection.classList.remove("hidden");
  document.getElementById("login-btn").classList.add("hidden");
  document.getElementById("logout-btn").classList.remove("hidden");

  loadSubjects();
  loadTasks();
}

// --- Przedmioty ---
async function loadSubjects() {
  const res = await fetch(`${API_URL}/subjects`, { headers: headers() });
  const data = await res.json();
  const list = document.getElementById("subjects");
  const select = document.getElementById("subject-select");

  list.innerHTML = "";
  select.innerHTML = '<option value="">Wybierz przedmiot</option>';

  data.forEach(sub => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${sub.name}</strong> - ${sub.description || "Brak opisu"}
      <button data-id="${sub.id}" class="delete-subject">Usuń</button>`;
    list.appendChild(li);

    const opt = document.createElement("option");
    opt.value = sub.name;
    opt.textContent = sub.name;
    select.appendChild(opt);
  });

  document.querySelectorAll(".delete-subject").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await fetch(`${API_URL}/subjects/${id}`, { method: "DELETE", headers: headers() });
      loadSubjects();
    });
  });
}

document.getElementById("add-subject").addEventListener("click", async () => {
  const name = document.getElementById("new-subject-name").value.trim();
  const desc = document.getElementById("new-subject-desc").value.trim();
  if (!name) return alert("Podaj nazwę przedmiotu!");

  await fetch(`${API_URL}/subjects`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name, description: desc })
  });
  document.getElementById("new-subject-name").value = "";
  document.getElementById("new-subject-desc").value = "";
  loadSubjects();
});

// --- Zadania ---
async function loadTasks() {
  const res = await fetch(`${API_URL}/tasks`, { headers: headers() });
  const data = await res.json();
  const list = document.getElementById("tasks");
  list.innerHTML = "";

  data.forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${t.title}</strong> [${t.subject}] 
      - Priorytet: ${t.priority}, termin: ${t.due_date}, dodano: ${new Date(t.created_at).toLocaleString()}
      <button data-id="${t.id}" class="delete-task">❌</button>`;
    list.appendChild(li);
  });

  document.querySelectorAll(".delete-task").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE", headers: headers() });
      loadTasks();
    });
  });
}

document.getElementById("add-task").addEventListener("click", async () => {
  const task = {
    title: document.getElementById("task-title").value.trim(),
    subject: document.getElementById("subject-select").value.trim(),
    priority: document.getElementById("priority").value,
    due_date: document.getElementById("due_date").value
  };

  if (!task.title || !task.subject || !task.due_date) return alert("Wypełnij wszystkie pola!");

  await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(task)
  });

  document.getElementById("task-title").value = "";
  document.getElementById("due_date").value = "";
  loadTasks();
});

// --- Tabs ---
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");
  });
});

// --- Autologin jeśli token istnieje ---
if (token) loadUserData();
