const API_URL = "https://api.pkportfolio.pl/tasksapi";

// =====================
// Pomocnicze funkcje
// =====================
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function msg(text, color = "white") {
  const el = document.getElementById("auth-msg");
  el.style.color = color;
  el.textContent = text;
}
function base64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =====================
// Sprawdzanie zalogowania
// =====================
async function checkLogin() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  const res = await fetch(`${API_URL}/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const user = await res.json();
    show(document.getElementById("tasks-section"));
    hide(document.getElementById("auth-section"));
    show(document.getElementById("logout-btn"));
    hide(document.getElementById("login-btn"));

    const info = document.getElementById("user-info");
    info.textContent = `${user.first_name} ${user.last_name} (${user.email})`;
    show(info);

    await loadSubjects();
    await loadTasks();
    await loadHistory();
    return true;
  } else {
    localStorage.removeItem("token");
    return false;
  }
}

// =====================
// Rejestracja
// =====================
document.getElementById("register").onclick = async () => {
  const first_name = document.getElementById("first_name").value.trim();
  const last_name = document.getElementById("last_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm_password = document.getElementById("confirm_password").value;

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name, last_name, email, password, confirm_password }),
  });

  if (res.ok) {
    msg("✅ Rejestracja zakończona sukcesem. Możesz się zalogować.", "lightgreen");
  } else {
    const data = await res.json().catch(() => ({}));
    msg(`❌ ${data.detail || "Błąd rejestracji"}`, "red");
  }
};

// =====================
// Logowanie
// =====================
document.getElementById("login").onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (res.ok) {
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    msg("");
    await checkLogin();
  } else {
    msg("❌ Błędny email lub hasło", "red");
  }
};

// =====================
// Wylogowanie
// =====================
document.getElementById("logout-btn").onclick = () => {
  localStorage.removeItem("token");
  hide(document.getElementById("tasks-section"));
  show(document.getElementById("auth-section"));
  hide(document.getElementById("logout-btn"));
  show(document.getElementById("login-btn"));
  hide(document.getElementById("user-info"));
};

// =====================
// Zakładki
// =====================
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add("active");

    if (tab.dataset.tab === "history") loadHistory();
  });
});

// =====================
// SUBJECTS
// =====================
async function loadSubjects() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/subjects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;
  const subjects = await res.json();

  const list = document.getElementById("subjects");
  const select = document.getElementById("subject-select");
  list.innerHTML = "";
  select.innerHTML = `<option value="">Wybierz przedmiot</option>`;

  subjects.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="subject-header">
        <span class="subject-badge" style="background:${s.color};color:${getTextColor(s.color)}">${s.name}</span>
        ${s.teacher ? `<small>👨‍🏫 ${s.teacher}</small>` : ""}
      </div>
      ${s.description ? `<small>${s.description}</small>` : ""}
    `;

    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.className = "delete-btn";
    del.onclick = async () => {
      if (confirm(`Usunąć przedmiot "${s.name}"?`)) {
        await fetch(`${API_URL}/subjects/${s.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        loadSubjects();
        loadTasks();
      }
    };
    li.appendChild(del);
    list.appendChild(li);

    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// Dodawanie nowego przedmiotu
document.getElementById("add-subject").onclick = async () => {
  const name = document.getElementById("new-subject-name").value.trim();
  const description = document.getElementById("new-subject-desc").value.trim();
  const teacher = document.getElementById("new-subject-teacher").value.trim();
  const color = document.getElementById("new-subject-color").value;
  if (!name) return alert("Podaj nazwę przedmiotu");

  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description, teacher, color }),
  });

  if (res.ok) {
    document.getElementById("new-subject-name").value = "";
    document.getElementById("new-subject-teacher").value = "";
    document.getElementById("new-subject-desc").value = "";
    loadSubjects();
  } else {
    alert("❌ Błąd podczas dodawania przedmiotu");
  }
};

// =====================
// TASKS
// =====================
async function loadTasks() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const tasks = await res.json();

  const subjRes = await fetch(`${API_URL}/subjects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const subjects = subjRes.ok ? await subjRes.json() : [];

  const activeList = document.getElementById("tasks");
  const doneList = document.getElementById("completed-tasks");
  activeList.innerHTML = "";
  doneList.innerHTML = "";

  tasks.forEach((t) => {
    const subj = subjects.find((s) => s.id === t.subject_id);
    const subjName = subj ? subj.name : "Brak";
    const subjColor = subj ? subj.color : "#475569";
    const subjTeacher = subj && subj.teacher ? subj.teacher : "";

    const li = document.createElement("li");
    li.dataset.priority = t.priority;
    li.innerHTML = `
      <div class="task-header">
        <strong class="task-title">${t.title}</strong>
        <span class="subject-badge" style="background:${subjColor};color:${getTextColor(subjColor)}">
          ${subjName}${subjTeacher ? ` <small>(${subjTeacher})</small>` : ""}
        </span>
      </div>
      ${t.description ? `<p>${t.description}</p>` : ""}
      ${t.image ? `<img src="data:image/png;base64,${t.image}" alt="obrazek" style="max-width:100%;border-radius:8px;margin-top:8px;">` : ""}
      <div class="task-meta">
        ⚡ ${t.priority} • 🗓️ ${t.due_date}
      </div>
      <small>🕒 ${new Date(t.created_at).toLocaleString()}</small>
    `;

    const btnDone = document.createElement("button");
    btnDone.textContent = "✅ Ukończone";
    btnDone.className = "done-btn";
    btnDone.onclick = async () => {
      await fetch(`${API_URL}/tasks/${t.id}/done`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadTasks();
      loadHistory();
    };

    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.className = "delete-btn";
    del.onclick = async () => {
      if (confirm("Usunąć to zadanie?")) {
        await fetch(`${API_URL}/tasks/${t.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        li.classList.add("task-fadeout");
        setTimeout(() => li.remove(), 400);
        loadTasks();
        loadHistory();
      }
    };

    li.appendChild(del);
    if (!t.completed) li.appendChild(btnDone);
    (t.completed ? doneList : activeList).appendChild(li);
  });
}

// =====================
// Dodawanie zadania
// =====================
document.getElementById("add-task").onclick = async () => {
  const title = document.getElementById("task-title").value.trim();
  const priority = document.getElementById("priority").value;
  const due_date = document.getElementById("due_date").value;
  const subject_id = document.getElementById("subject-select").value || null;
  const description = document.getElementById("task-desc").value.trim();
  const imageFile = document.getElementById("task-image").files[0];

  if (!title || !due_date) return alert("Uzupełnij wymagane pola");

  const formData = new FormData();
  formData.append("title", title);
  formData.append("priority", priority);
  formData.append("due_date", due_date);
  if (subject_id) formData.append("subject_id", subject_id);
  if (description) formData.append("description", description);
  if (imageFile) formData.append("image", imageFile);

  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (res.ok) {
    document.getElementById("task-form").reset();
    loadTasks();
    loadHistory();
  } else {
    const err = await res.json().catch(() => ({}));
    alert(`❌ ${err.detail || "Błąd podczas dodawania zadania"}`);
  }
};

// =====================
// HISTORIA
// =====================
async function loadHistory() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/history?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;
  const history = await res.json();
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  if (history.length === 0) {
    list.innerHTML = `<li><small>Brak historii działań</small></li>`;
    return;
  }

  history.forEach((h) => {
    const li = document.createElement("li");
    const time = new Date(h.timestamp).toLocaleString();
    li.innerHTML = `
      <span class="action">${h.action.toUpperCase()}</span> —
      <strong>${h.task_title}</strong><br>
      <span class="time">${time}</span>
    `;
    list.appendChild(li);
  });
}

// =====================
// Narzędzie: kolor tekstu do tła
// =====================
function getTextColor(hex) {
  const c = hex.replace("#", "");
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 160 ? "#0f172a" : "#f8fafc";
}

// =====================
// Start
// =====================
checkLogin();
