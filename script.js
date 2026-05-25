// =========================
// CONFIGURAÇÃO SUPABASE
// Substitua pela sua chave anon real do painel do Supabase
// =========================
const SUPABASE_URL = "https://fwplhmwuyjedihnylzli.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cGxobXd1eWplZGlobnlsemxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODM1NTcsImV4cCI6MjA5NTI1OTU1N30.hKEJaAc5b1-B9_iXaG1XFgr3E3uEIUKfkQyhPnSk7ts"; // ⚠️ Troque aqui

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================
// ESTADO GLOBAL
// =========================
let currentUser = null;

// =========================
// UTILITÁRIOS
// =========================

/** Pega um elemento do DOM com segurança (sem lançar erro) */
function el(id) {
  return document.getElementById(id);
}

/** Exibe uma mensagem de feedback no elemento #alertMsg (login/cadastro) */
function showAlert(msg, type = "error") {
  const alertEl = el("alertMsg");
  if (!alertEl) return;

  const styles = {
    error:   "bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
    success: "bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300",
    info:    "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
  };

  alertEl.className = `text-sm px-4 py-3 rounded-xl ${styles[type] || styles.error}`;
  alertEl.textContent = msg;
  alertEl.classList.remove("hidden");
}

function hideAlert() {
  el("alertMsg")?.classList.add("hidden");
}

// =========================
// DARK MODE
// =========================
function initDarkMode() {
  const btnDark = el("btnDark");
  if (!btnDark) return;

  // Persiste a preferência no localStorage
  const saved = localStorage.getItem("darkMode");
  if (saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
    btnDark.textContent = "☀️";
  }

  btnDark.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    btnDark.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("darkMode", isDark);
  });
}

// =========================
// SESSÃO — usado em index.html
// =========================
async function initSession() {
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;
  updateUI();

  if (currentUser) loadTasks();
}

/** Atualiza o header: mostra links de auth ou área do usuário logado */
function updateUI() {
  const authLinks = el("authLinks");
  const userArea  = el("userArea");
  const userEmail = el("userEmail");
  const alertLogin = el("alertLogin");

  if (!authLinks || !userArea) return;

  if (currentUser) {
    authLinks.classList.add("hidden");
    userArea.classList.remove("hidden");
    userArea.classList.add("flex");
    if (userEmail) userEmail.textContent = currentUser.email;
    alertLogin?.classList.add("hidden");
  } else {
    authLinks.classList.remove("hidden");
    userArea.classList.add("hidden");
    userArea.classList.remove("flex");
    alertLogin?.classList.remove("hidden");
  }
}

// Reage a mudanças de sessão em tempo real (ex: logout em outra aba)
db.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;

  if (event === "SIGNED_IN") {
    updateUI();
    loadTasks();
  }

  if (event === "SIGNED_OUT") {
    updateUI();
    const taskList = el("taskList");
    if (taskList) taskList.innerHTML = "";
    checkEmpty();
  }
});

// =========================
// LOGOUT — index.html
// =========================
function initLogout() {
  const btnLogout = el("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", async () => {
    await db.auth.signOut();
    currentUser = null;
  });
}

// =========================
// LOGIN — login.html
// =========================
function initLoginPage() {
  const btnLogin = el("btnLogin");
  if (!btnLogin) return;

  // Redireciona se já estiver logado
  db.auth.getSession().then(({ data }) => {
    if (data.session?.user) window.location.href = "index.html";
  });

  btnLogin.addEventListener("click", async () => {
    hideAlert();
    const emailVal = el("email")?.value.trim();
    const passVal  = el("password")?.value;

    if (!emailVal || !passVal) {
      showAlert("Preencha todos os campos.");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    const { error } = await db.auth.signInWithPassword({
      email: emailVal,
      password: passVal,
    });

    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";

    if (error) {
      showAlert("E-mail ou senha inválidos.");
      return;
    }

    window.location.href = "index.html";
  });

  // Submit com Enter
  el("password")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnLogin.click();
  });
}

// =========================
// CADASTRO — cadastro.html
// =========================
function initCadastroPage() {
  const btnRegister = el("btnRegister");
  if (!btnRegister) return;

  // Redireciona se já estiver logado
  db.auth.getSession().then(({ data }) => {
    if (data.session?.user) window.location.href = "index.html";
  });

  btnRegister.addEventListener("click", async () => {
    hideAlert();
    const emailVal   = el("email")?.value.trim();
    const passVal    = el("password")?.value;
    const confirmVal = el("confirmPassword")?.value;

    if (!emailVal || !passVal || !confirmVal) {
      showAlert("Preencha todos os campos.");
      return;
    }

    if (passVal.length < 6) {
      showAlert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (passVal !== confirmVal) {
      showAlert("As senhas não coincidem.");
      return;
    }

    btnRegister.disabled = true;
    btnRegister.textContent = "Criando conta...";

    const { error } = await db.auth.signUp({ email: emailVal, password: passVal });

    btnRegister.disabled = false;
    btnRegister.textContent = "Criar Conta";

    if (error) {
      showAlert(error.message);
      return;
    }

    showAlert("Conta criada! Verifique seu e-mail para confirmar.", "success");
  });
}

// =========================
// TAREFAS — index.html
// =========================

function checkEmpty() {
  const taskList   = el("taskList");
  const emptyState = el("emptyState");
  if (!taskList || !emptyState) return;

  if (taskList.children.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
  } else {
    emptyState.classList.add("hidden");
    emptyState.classList.remove("flex");
  }
}

async function loadTasks() {
  if (!currentUser) return;

  const taskList = el("taskList");
  if (!taskList) return;

  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("id");

  if (error) {
    console.error("Erro ao carregar tarefas:", error);
    return;
  }

  taskList.innerHTML = "";
  data.forEach(renderTask);
  checkEmpty();
}

function renderTask(task) {
  const taskList = el("taskList");
  if (!taskList) return;

  const taskDiv = document.createElement("div");
  taskDiv.dataset.id = task.id;

  // Classes base do card
  taskDiv.className = [
    "animate-fadeIn",
    "flex flex-col justify-between gap-4 p-4 rounded-2xl shadow-sm",
    "bg-white dark:bg-slate-800 transition-all duration-300",
    "hover:-translate-y-1 hover:shadow-md",
    task.completed ? "task-done" : "",
  ].join(" ");

  // Texto da tarefa
  const taskName = document.createElement("span");
  taskName.textContent = task.text;
  taskName.className = "text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words";

  // Botões
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "flex gap-2 justify-end";

  // Botão Completar
  const btnComplete = document.createElement("button");
  btnComplete.textContent = task.completed ? "↩ Reabrir" : "✓ Concluir";
  btnComplete.className = [
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
    task.completed
      ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60",
  ].join(" ");

  btnComplete.addEventListener("click", async () => {
    const { data, error } = await db
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();

    if (error) { console.error(error); return; }

    task.completed = data.completed;

    // Re-renderiza o card atualizado
    const newDiv = document.createElement("div");
    taskList.insertBefore(newDiv, taskDiv);
    taskDiv.remove();
    renderTaskInPlace(task, newDiv);
    checkEmpty();
  });

  // Botão Excluir
  const btnDelete = document.createElement("button");
  btnDelete.textContent = "✕ Excluir";
  btnDelete.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95";

  btnDelete.addEventListener("click", async () => {
    taskDiv.classList.add("opacity-0", "scale-95");

    const { error } = await db.from("tasks").delete().eq("id", task.id);

    if (error) {
      console.error(error);
      taskDiv.classList.remove("opacity-0", "scale-95");
      return;
    }

    setTimeout(() => {
      taskDiv.remove();
      checkEmpty();
    }, 200);
  });

  buttonsDiv.appendChild(btnComplete);
  buttonsDiv.appendChild(btnDelete);
  taskDiv.appendChild(taskName);
  taskDiv.appendChild(buttonsDiv);
  taskList.appendChild(taskDiv);
}

/** Reaplica o renderTask num placeholder (para atualização sem reload) */
function renderTaskInPlace(task, placeholder) {
  const taskList = el("taskList");
  if (!taskList) return;

  // Constrói e insere no lugar do placeholder
  const tempList = document.createElement("div");
  // Reutiliza a lógica de renderTask de forma simplificada
  placeholder.className = [
    "animate-fadeIn",
    "flex flex-col justify-between gap-4 p-4 rounded-2xl shadow-sm",
    "bg-white dark:bg-slate-800 transition-all duration-300",
    "hover:-translate-y-1 hover:shadow-md",
    task.completed ? "task-done" : "",
  ].join(" ");

  const taskName = document.createElement("span");
  taskName.textContent = task.text;
  taskName.className = "text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words";

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "flex gap-2 justify-end";

  const btnComplete = document.createElement("button");
  btnComplete.textContent = task.completed ? "↩ Reabrir" : "✓ Concluir";
  btnComplete.className = [
    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95",
    task.completed
      ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200",
  ].join(" ");

  btnComplete.addEventListener("click", async () => {
    const { data, error } = await db
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .select()
      .single();

    if (error) return;
    task.completed = data.completed;
    const newNode = document.createElement("div");
    taskList.insertBefore(newNode, placeholder);
    placeholder.remove();
    renderTaskInPlace(task, newNode);
    checkEmpty();
  });

  const btnDelete = document.createElement("button");
  btnDelete.textContent = "✕ Excluir";
  btnDelete.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition-all active:scale-95";

  btnDelete.addEventListener("click", async () => {
    placeholder.classList.add("opacity-0", "scale-95");
    const { error } = await db.from("tasks").delete().eq("id", task.id);
    if (error) { placeholder.classList.remove("opacity-0", "scale-95"); return; }
    setTimeout(() => { placeholder.remove(); checkEmpty(); }, 200);
  });

  buttonsDiv.appendChild(btnComplete);
  buttonsDiv.appendChild(btnDelete);
  placeholder.appendChild(taskName);
  placeholder.appendChild(buttonsDiv);
}

async function addTask() {
  const taskInput = el("taskInput");
  if (!taskInput) return;

  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    taskInput.classList.add("ring-2", "ring-red-400");
    setTimeout(() => taskInput.classList.remove("ring-2", "ring-red-400"), 1500);
    return;
  }

  if (!currentUser) {
    el("alertLogin")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const btnAdd = el("btnAdd");
  if (btnAdd) { btnAdd.disabled = true; btnAdd.textContent = "Adicionando..."; }

  const { data, error } = await db
    .from("tasks")
    .insert([{ text, user_id: currentUser.id }])
    .select();

  if (btnAdd) { btnAdd.disabled = false; btnAdd.textContent = "+ Adicionar"; }

  if (error) { console.error(error); return; }

  if (data?.length > 0) renderTask(data[0]);

  taskInput.value = "";
  taskInput.focus();
  checkEmpty();
}

// =========================
// INICIALIZAÇÃO
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();

  // Determina qual página está ativa pelo que existe no DOM
  if (el("taskList"))   { initSession(); initLogout(); initTaskEvents(); }
  if (el("btnLogin"))   { initLoginPage(); }
  if (el("btnRegister")){ initCadastroPage(); }
});

function initTaskEvents() {
  el("btnAdd")?.addEventListener("click", addTask);

  el("taskInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });
}