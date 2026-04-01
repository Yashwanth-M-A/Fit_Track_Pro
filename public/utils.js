// ─── FitTrack Pro — Shared Utilities ──────────────────────────────────────────
const API = "/api";

// ─── Token helpers ────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token") || "";
}

// ─── Authenticated fetch ───────────────────────────────────────────────────────
async function authFetch(url, method = "GET", body = null) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  const opts = { method, headers };

  if (body instanceof FormData) {
    opts.body = body;
    // Let browser set Content-Type with boundary
  } else if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, opts);
    if (res.status === 401) {
      logout();
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "An error occurred");
      return null;
    }
    return data;
  } catch (err) {
    toast("Network error — please check your connection");
    return null;
  }
}

// ─── Toast Notification ────────────────────────────────────────────────────────
let _toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

// ─── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/index.html";
}

function guardAuth() {
  if (!getToken()) {
    window.location.href = "/index.html";
  }
}

// ─── Sidebar user info ─────────────────────────────────────────────────────────
async function loadSidebarUser() {
  const data = await authFetch(`${API}/auth/profile`);
  if (!data) return;

  const nameEl   = document.getElementById("sidebar-name");
  const avatarEl = document.getElementById("sidebar-avatar");

  if (nameEl)   nameEl.textContent = data.name || "User";
  if (avatarEl) {
    if (data.avatar) {
      avatarEl.innerHTML = `<img src="${escapeHtml(data.avatar)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.textContent = (data.name || "U")[0].toUpperCase();
    }
  }
}

// ─── HTML Sanitizer ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ─── Date Formatter ───────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Close modal on overlay click ─────────────────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

// ─── Mobile Sidebar Toggle ────────────────────────────────────────────────────
function openSidebar() {
  const sidebar  = document.querySelector(".sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  if (sidebar)  sidebar.classList.add("open");
  if (overlay)  overlay.classList.add("open");
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  const sidebar  = document.querySelector(".sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  if (sidebar)  sidebar.classList.remove("open");
  if (overlay)  overlay.classList.remove("open");
  document.body.classList.remove("sidebar-open");
}

document.addEventListener("DOMContentLoaded", () => {
  // Wire hamburger button
  const hamburger = document.getElementById("hamburger-btn");
  if (hamburger) hamburger.addEventListener("click", openSidebar);

  // Wire overlay click to close
  const overlay = document.getElementById("sidebar-overlay");
  if (overlay) overlay.addEventListener("click", closeSidebar);

  // Wire sidebar close button
  const closeBtn = document.getElementById("sidebar-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

  // Close sidebar on nav link click (mobile UX)
  document.querySelectorAll(".sidebar .nav-item").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
});
