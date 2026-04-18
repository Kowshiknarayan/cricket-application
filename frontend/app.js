/**
 * app.js — Cricket Team Manager Frontend
 * TypeScript-flavoured JavaScript (JSDoc typed, strict-mode, modular)
 * Connects to Flask backend at API_BASE.
 */

"use strict";

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════
const API_BASE = "/api";

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
/** @type {{ user: Object|null, players: Array, sortKey: string|null, sortAsc: boolean }} */
const state = {
  user: null,
  players: [],
  sortKey: null,
  sortAsc: true,
};

// ═══════════════════════════════════════════════════
// TOKEN HELPERS
// ═══════════════════════════════════════════════════
function getToken() {
  return sessionStorage.getItem("jwt_token");
}

function setToken(token) {
  sessionStorage.setItem("jwt_token", token);
}

function clearToken() {
  sessionStorage.removeItem("jwt_token");
}

// ═══════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════
/**
 * @param {string} path
 * @param {{ method?: string, body?: any }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
async function api(path, opts = {}) {
  try {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOpts = {
      method: opts.method || "GET",
      headers,
    };

    if (opts.body !== undefined) {
      fetchOpts.body = JSON.stringify(opts.body);
    }

    const res = await fetch(API_BASE + path, fetchOpts);

    // Token expired or invalid → force logout
    if (res.status === 401) {
      clearToken();
      state.user = null;
      localStorage.removeItem("ct_user");
      showScreen("screen-auth");
      toast("Session expired. Please log in again.", "error");
      return { ok: false, status: 401, data: {} };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { error: "Cannot reach backend. Is Flask running on port 5000?" },
    };
  }
}

// ═══════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════
/**
 * @param {string} msg
 * @param {'success'|'error'|'warn'} [type]
 */
function toast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast t-${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity 0.3s, transform 0.3s";
    el.style.opacity = "0";
    el.style.transform = "translateX(12px)";
    setTimeout(() => el.remove(), 350);
  }, 3200);
}

// ═══════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════
/** @type {Function|null} */
let confirmCb = null;

/**
 * @param {string} title
 * @param {string} msg
 * @param {Function} cb
 */
function confirm(title, msg, cb) {
  qs("#confirm-title").textContent = title;
  qs("#confirm-msg").textContent = msg;
  confirmCb = cb;
  qs(".confirm-overlay").classList.add("open");
}

function closeConfirm() {
  qs(".confirm-overlay").classList.remove("open");
  confirmCb = null;
}

// ═══════════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════════
/** @param {string} sel @returns {HTMLElement} */
function qs(sel) {
  return document.querySelector(sel);
}

/** @param {string} id @returns {HTMLInputElement} */
function inp(id) {
  return document.getElementById(id);
}

function val(id) {
  return inp(id)?.value?.trim() ?? "";
}

function setVal(id, v) {
  const el = inp(id);
  if (el) el.value = v;
}

function show(id) {
  const el = inp(id) || qs(`#${id}`);
  if (el) el.style.display = "";
}

function hide(id) {
  const el = inp(id) || qs(`#${id}`);
  if (el) el.style.display = "none";
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function setNavActive(navId) {
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById(navId)?.classList.add("active");
}

// ═══════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════

/** Switch between login / register tabs */
function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".auth-panel").forEach((p) => p.classList.remove("active"));
  qs(`.auth-tab[data-tab="${tab}"]`).classList.add("active");
  qs(`.auth-panel[data-panel="${tab}"]`).classList.add("active");
  qs(`#err-${tab}`).style.display = "none";
  qs(`#suc-${tab}`) && (qs(`#suc-${tab}`).style.display = "none");
}

/** Show auth error */
function authErr(panel, msg) {
  const el = qs(`#err-${panel}`);
  el.textContent = msg;
  el.style.display = "block";
}

function authSuc(panel, msg) {
  const el = qs(`#suc-${panel}`);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

async function doLogin() {
  qs("#err-login").style.display = "none";
  const btn = qs("#btn-login");
  btn.disabled = true;
  btn.textContent = "LOGGING IN…";

  const { ok, data } = await api("/auth/login", {
    method: "POST",
    body: {
      username_or_email: val("login-id"),
      password: val("login-pw"),
    },
  });

  btn.disabled = false;
  btn.textContent = "LOGIN";

  if (ok) {
    // Save JWT token
    setToken(data.token);

    state.user = data;
    if (inp("login-remember").checked) {
      localStorage.setItem("ct_user", JSON.stringify(data));
    }
    enterApp();
  } else {
    authErr("login", data.error || "Login failed");
  }
}

async function doRegister() {
  qs("#err-register").style.display = "none";
  qs("#suc-register").style.display = "none";

  const btn = qs("#btn-register");
  btn.disabled = true;
  btn.textContent = "CREATING…";

  const pw = val("reg-pw");
  const pw2 = val("reg-pw2");
  if (pw !== pw2) {
    btn.disabled = false;
    btn.textContent = "CREATE ACCOUNT";
    authErr("register", "Passwords do not match");
    return;
  }

  const { ok, data } = await api("/auth/register", {
    method: "POST",
    body: {
      username: val("reg-username"),
      email: val("reg-email"),
      password: pw,
      role: "user",
    },
  });

  btn.disabled = false;
  btn.textContent = "CREATE ACCOUNT";

  if (ok) {
    // Save JWT token and enter app directly — no need to log in again
    setToken(data.token);
    state.user = data;
    enterApp();
  } else {
    authErr("register", data.error || "Registration failed");
  }
}

function enterApp() {
  const u = state.user;
  qs(".user-name").textContent = u.username;
  qs(".user-role").textContent = u.role;
  qs(".user-avatar").textContent = u.username[0].toUpperCase();
  showScreen("screen-app");
  navigate("page-dashboard", "nav-dashboard");
  loadDashboard();
  loadPlayers();
}

function doLogout() {
  state.user = null;
  clearToken();                          // clear JWT
  localStorage.removeItem("ct_user");
  showScreen("screen-auth");
  inp("login-pw").value = "";
  qs("#err-login").style.display = "none";
}

function togglePw(inputId, btn) {
  const el = inp(inputId);
  if (el.type === "password") {
    el.type = "text";
    btn.textContent = "Hide";
  } else {
    el.type = "password";
    btn.textContent = "Show";
  }
}

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function navigate(pageId, navId) {
  showPage(pageId);
  setNavActive(navId);
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
async function loadDashboard() {
  const [{ ok: okP, data: players }, { ok: okT, data: teams }] = await Promise.all([
    api("/get_Players"),
    api("/teams"),
  ]);

  if (okP) {
    qs("#stat-players").textContent = players.length;
    const avg =
      players.length === 0
        ? 0
        : Math.round(
            players.reduce((s, p) => {
              return (
                s +
                ((p.batting_rating || 0) +
                  (p.bowling_rating || 0) +
                  (p.fielding_rating || 0) +
                  (p.wicket_keeping_rating || 0)) /
                  4
              );
            }, 0) / players.length
          );
    qs("#stat-avg").textContent = avg;

    // recent table
    const tbody = qs("#dash-tbody");
    tbody.innerHTML =
      players.length === 0
        ? `<tr><td colspan="7" class="cell-center"><div class="empty-state"><div class="empty-icon">🧑</div><div class="empty-text">No players yet</div></div></td></tr>`
        : players
            .slice(0, 8)
            .map(
              (p) => `
        <tr>
          <td><span class="badge badge-green">${p.player_code}</span></td>
          <td>${p.name || "—"}</td>
          <td>${p.age || "—"}</td>
          <td>${ratingCell(p.batting_rating)}</td>
          <td>${ratingCell(p.bowling_rating)}</td>
          <td>${ratingCell(p.fielding_rating)}</td>
          <td>${ratingCell(p.wicket_keeping_rating)}</td>
        </tr>`
            )
            .join("");
  }

  if (okT) {
    qs("#stat-teams").textContent = Array.isArray(teams) ? teams.length : 0;
  }
}

// ═══════════════════════════════════════════════════
// PLAYERS
// ═══════════════════════════════════════════════════
async function loadPlayers() {
  const tbody = qs("#players-tbody");
  tbody.innerHTML = `<tr><td colspan="9" class="cell-center"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

  const { ok, data } = await api("/get_Players");
  if (!ok) {
    toast(data.error || "Failed to load players", "error");
    tbody.innerHTML = `<tr><td colspan="9" class="cell-center"><div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">${data.error || "Error"}</div></div></td></tr>`;
    return;
  }

  state.players = data;
  renderPlayers(state.players);
}

/** @param {Array} players */
function renderPlayers(players) {
  const tbody = qs("#players-tbody");

  if (!players.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="cell-center">
      <div class="empty-state"><div class="empty-icon">🧑</div>
      <div class="empty-text">No players found. Add one!</div></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = players
    .map(
      (p) => `
    <tr>
      <td><span class="badge badge-green">${p.player_code}</span></td>
      <td><strong>${p.name || "—"}</strong></td>
      <td>${p.age || "—"}</td>
      <td>${ratingCell(p.batting_rating)}</td>
      <td>${ratingCell(p.bowling_rating)}</td>
      <td>${ratingCell(p.fielding_rating)}</td>
      <td>${ratingCell(p.wicket_keeping_rating)}</td>
      <td><span class="badge badge-teal">${totalScore(p)}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openEditPlayer('${p.player_code}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePlayer('${p.player_code}','${p.name || p.player_code}')">Del</button>
      </td>
    </tr>`
    )
    .join("");
}

function filterPlayers() {
  const q = val("player-search").toLowerCase();
  const filtered = state.players.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.player_code || "").toLowerCase().includes(q)
  );
  renderPlayers(filtered);
}

/** @param {string} key */
function sortPlayers(key) {
  const th = qs(`#th-${key}`);
  if (state.sortKey === key) {
    state.sortAsc = !state.sortAsc;
  } else {
    state.sortKey = key;
    state.sortAsc = true;
  }

  document.querySelectorAll(".th-sort").forEach((t) => t.classList.remove("asc", "desc"));
  if (th) th.classList.add(state.sortAsc ? "asc" : "desc");

  const sorted = [...state.players].sort((a, b) => {
    const va = a[key] ?? 0,
      vb = b[key] ?? 0;
    if (typeof va === "string") return state.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return state.sortAsc ? va - vb : vb - va;
  });

  renderPlayers(sorted);
}

// ── Player modal ──
function openAddPlayer() {
  qs("#modal-player-title").textContent = "Add Player";
  setVal("edit-code", "");
  ["name", "age"].forEach((f) => setVal(`f-${f}`, ""));
  ["batting", "bowling", "fielding", "wk"].forEach((f) => {
    setVal(`f-${f}`, "50");
    qs(`#val-${f}`).textContent = "50";
  });
  qs("#save-player-btn").textContent = "Save Player";
  qs("#overlay-player").classList.add("open");
}

/** @param {string} code */
function openEditPlayer(code) {
  const p = state.players.find((x) => x.player_code === code);
  if (!p) return;
  qs("#modal-player-title").textContent = "Edit Player";
  setVal("edit-code", code);
  setVal("f-name", p.name || "");
  setVal("f-age", p.age || "");
  const map = {
    batting: p.batting_rating,
    bowling: p.bowling_rating,
    fielding: p.fielding_rating,
    wk: p.wicket_keeping_rating,
  };
  for (const [k, v] of Object.entries(map)) {
    const val = v ?? 50;
    setVal(`f-${k}`, val);
    qs(`#val-${k}`).textContent = val;
  }
  qs("#save-player-btn").textContent = "Update Player";
  qs("#overlay-player").classList.add("open");
}

function closePlayerModal() {
  qs("#overlay-player").classList.remove("open");
}

async function savePlayer() {
  const code = val("edit-code");
  const name = val("f-name");
  const age = val("f-age");

  if (!name) {
    toast("Name is required", "error");
    return;
  }

  if (!age || isNaN(age) || age <= 0) {
    toast("Valid age is required", "error");
    return;
  }

  const body = {
    name: val("f-name"),
    age: parseInt(val("f-age")),
    batting_rating: parseInt(val("f-batting")),
    bowling_rating: parseInt(val("f-bowling")),
    fielding_rating: parseInt(val("f-fielding")),
    wicket_keeping_rating: parseInt(val("f-wk")),
  };

  const btn = qs("#save-player-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  let result;
  if (code) {
    result = await api(`/update_player/${code}`, { method: "PUT", body });
  } else {
    result = await api("/add_Player", { method: "POST", body });
  }

  btn.disabled = false;
  btn.textContent = code ? "Update Player" : "Save Player";

  if (result.ok) {
    toast(code ? "Player updated!" : "Player added!", "success");
    closePlayerModal();
    await loadPlayers();
    loadDashboard();
  } else {
    toast(result.data.error || "Error saving player", "error");
  }
}

/** @param {string} code @param {string} name */
function deletePlayer(code, name) {
  confirm("Delete Player", `Delete "${name}"? This cannot be undone.`, async () => {
    const { ok, data } = await api(`/delete_player/${code}`, { method: "DELETE" });
    if (ok) {
      toast("Player deleted", "success");
      await loadPlayers();
      loadDashboard();
    } else {
      toast(data.error || data.message || "Failed to delete", "error");
    }
  });
}

// ═══════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════
async function generateTeams() {
  const count = parseInt(val("team-count"));
  if (!count || count < 2) {
    toast("Enter at least 2 teams", "warn");
    return;
  }

  const btn = qs("#btn-gen-teams");
  btn.disabled = true;
  btn.textContent = "⏳ Generating…";

  const { ok, data } = await api("/teams", {
    method: "POST",
    body: { team_count: count },
  });

  btn.disabled = false;
  btn.textContent = "⚡ Generate Teams";

  if (ok) {
    toast(`${data.teams.length} teams created!`, "success");
    renderTeams(data.teams);
    loadDashboard();
  } else {
    toast(data.error || "Failed to generate teams", "error");
  }
}

async function loadSavedTeams() {
  const { ok, data } = await api("/teams");
  if (!ok) { toast("Failed to load teams", "error"); return; }
  const teams = Array.isArray(data) ? data : [];
  if (!teams.length) { toast("No saved teams found", "warn"); return; }
  renderTeams(teams);
  toast(`Loaded ${teams.length} teams`, "success");
}

/** @param {Array} teams */
function renderTeams(teams) {
  const container = qs("#teams-container");
  if (!teams || !teams.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">No teams to display</div></div>`;
    return;
  }

  container.innerHTML = `<div class="teams-grid">${teams
    .map(
      (team, idx) => `
      <div class="team-card" style="animation-delay:${idx * 55}ms">
        <div class="team-card-head">
          <div class="team-card-name">🏏 Team ${idx + 1}</div>
          <div class="team-card-meta">
            <span class="badge badge-teal">${team.team_code}</span>
            <span class="badge badge-green">${team.players?.length || 0} players</span>
            <button class="btn btn-danger btn-sm" onclick="deleteTeam('${team.team_code}')">Del</button>
          </div>
        </div>
        <div class="team-players-list">
          ${(team.players || [])
            .map(
              (p, i) => `
            <div class="team-player-row">
              <span class="team-player-num">${i + 1}</span>
              <span class="team-player-name">${p.name || "—"}</span>
              <span class="team-player-code">${p.player_code}</span>
              <span class="team-player-score">${totalScore(p)}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("")}</div>`;
}

/** @param {string} code */
function deleteTeam(code) {
  confirm("Delete Team", `Delete team ${code}?`, async () => {
    const { ok, data } = await api(`/teams/${code}`, { method: "DELETE" });
    if (ok) {
      toast("Team deleted", "success");
      loadSavedTeams();
      loadDashboard();
    } else {
      toast(data.error || data.message || "Failed", "error");
    }
  });
}

function deleteAllTeams() {
  confirm("Delete All Teams", "This will permanently delete ALL saved teams.", async () => {
    const { ok: okL, data: teams } = await api("/teams");
    if (!okL || !teams.length) { toast("No teams to delete", "warn"); return; }
    const codes = teams.map((t) => t.team_code);
    const { ok, data } = await api("/teams", { method: "DELETE", body: codes });
    if (ok) {
      toast(data.message || "All teams deleted", "success");
      qs("#teams-container").innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-text">All teams deleted</div></div>`;
      loadDashboard();
    } else {
      toast(data.error || "Failed", "error");
    }
  });
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════
function ratingCell(v) {
  const n = v ?? 0;
  return `<div class="rating-bar-wrap">
    <div class="rating-bar"><div class="rating-bar-fill" style="width:${n}%"></div></div>
    <span class="rating-val">${n}</span>
  </div>`;
}

function totalScore(p) {
  return (
    (p.batting_rating || 0) +
    (p.bowling_rating || 0) +
    (p.fielding_rating || 0) +
    (p.wicket_keeping_rating || 0)
  );
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {

  // Restore session — only if both user data AND a token exist
  const saved = localStorage.getItem("ct_user");
  const token = getToken();
  if (saved && token) {
    try {
      state.user = JSON.parse(saved);
      enterApp();
    } catch {
      localStorage.removeItem("ct_user");
      clearToken();
      showScreen("screen-auth");
    }
  } else {
    // Clear any stale data
    localStorage.removeItem("ct_user");
    clearToken();
    showScreen("screen-auth");
  }

  // Auth tab clicks
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
  });

  // Enter key on login
  ["login-id", "login-pw"].forEach((id) => {
    inp(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  });

  // Confirm dialog
  qs("#confirm-yes").addEventListener("click", () => {
    if (confirmCb) confirmCb();
    closeConfirm();
  });

  qs(".confirm-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });

  // Close modals on backdrop click
  qs("#overlay-player").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closePlayerModal();
  });

  // Rating slider live update
  ["batting", "bowling", "fielding", "wk"].forEach((key) => {
    inp(`f-${key}`)?.addEventListener("input", function () {
      qs(`#val-${key}`).textContent = this.value;
    });
  });
});