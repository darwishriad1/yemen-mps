// =================================================================
// app.js — App bootstrap: sidenav, user chip, alerts, router start
// =================================================================
import { getSession, watchAuth } from "./firebase.js";
import { navItemsFor, can, PERMISSIONS } from "./permissions.js";
import { icon, toast } from "./ui.js";
import { startRouter, go } from "./router.js";

// ---------- Sidenav render ----------
function renderNav(user) {
  const nav = document.getElementById("sidenavNav");
  if (!nav) return;
  if (!user) { nav.innerHTML = ""; return; }

  const items = navItemsFor(user).filter(it => !it.perm || can(user, it.perm));

  const html = items.map(it => {
    if (it.group) return `<div class="sidenav__group">${it.group}</div>`;
    return `<a class="navlink" data-route="${it.href.replace(/^#/, "")}" href="${it.href}">
      ${icon(it.icon)} <span>${it.label}</span>
    </a>`;
  }).join("");

  nav.innerHTML = html + `
    <div class="sidenav__group">الحساب</div>
    <a class="navlink" data-route="/profile" href="#/profile">${icon("user")} <span>الملف الشخصي</span></a>
    <a class="navlink" id="logoutBtn" href="javascript:void(0)">${icon("logout")} <span>تسجيل الخروج</span></a>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    const { fbSignOut } = await import("./firebase.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
    try { await fbSignOut(getAuth()); toast("تم تسجيل الخروج", "success"); }
    catch (e) { toast("تعذر تسجيل الخروج", "danger"); }
  });
}

// ---------- User chip ----------
function renderUserChip(user) {
  const chip = document.getElementById("userChip");
  const av = document.getElementById("userAvatar");
  const nm = document.getElementById("userName");
  if (!chip) return;
  if (!user) { chip.hidden = true; return; }
  chip.hidden = false;
  nm.textContent = user.fullName || user.email || "مستخدم";
  av.textContent = (user.fullName || user.email || "؟").trim().charAt(0);
}

// ---------- Mobile menu toggle ----------
function setupMenu() {
  const btn = document.getElementById("btnMenu");
  const sidenav = document.getElementById("sidenav");
  const backdrop = document.getElementById("backdrop");
  if (!btn) return;
  btn.addEventListener("click", () => {
    sidenav.classList.toggle("is-open");
    backdrop.hidden = !sidenav.classList.contains("is-open");
  });
  backdrop.addEventListener("click", () => {
    sidenav.classList.remove("is-open");
    backdrop.hidden = true;
  });
}

// ---------- Alerts dot ----------
async function refreshAlertsDot(user) {
  const dot = document.getElementById("alertsDot");
  if (!dot) return;
  if (!user) { dot.hidden = true; return; }
  // في حال فُقد الاتصال لا نظهر النقطة
  try {
    const { getDb, collection, query, where, getDocs, limit } = await import("./firebase.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    const db = getFirestore();
    const q = query(collection(db, "alerts"), where("read", "==", false), limit(20));
    const snap = await getDocs(q);
    dot.hidden = snap.empty;
  } catch { dot.hidden = true; }
}

// ---------- Clock ----------
function startClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  const update = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const date = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
    const tEl = clock.querySelector(".clock__time");
    const dEl = clock.querySelector(".clock__date");
    if (tEl) tEl.textContent = time;
    if (dEl) dEl.textContent = date;
  };
  update();
  setInterval(update, 1000);
}

// ---------- Boot ----------
function boot() {
  setupMenu();
  startClock();
  startRouter();

  watchAuth((user) => {
    renderUserChip(user);
    renderNav(user);
    refreshAlertsDot(user);
    renderDemoBanner(user);
    if (!user && !location.hash.startsWith("#/login")) location.hash = "#/login";
    if (user && (location.hash === "" || location.hash === "#" || location.hash === "#/login")) {
      location.hash = "#/dashboard";
    }
  });
}

// ---------- Demo Mode banner ----------
function renderDemoBanner(user) {
  // إزالة أي banner قديم
  const old = document.getElementById("demoBanner");
  if (old) old.remove();
  if (!user) return;
  // هل هو demo mode؟
  const isDemo = user.uid && String(user.uid).startsWith("demo_");
  if (!isDemo) return;
  const banner = document.createElement("div");
  banner.id = "demoBanner";
  banner.style.cssText = `
    position: sticky; top: var(--appbar-h); z-index: 30;
    background: linear-gradient(90deg, #d4af37, #b48a18);
    color: #1a1500; font-weight: 700; font-size: 12.5px;
    padding: 8px 14px; text-align: center;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
  `;
  banner.innerHTML = `
    <span>🚀</span>
    <span>وضع تجريبي — البيانات وهمية وتختفي عند إعادة التحميل</span>
    <button id="exitDemoBtn" style="background:rgba(0,0,0,.18); border:none; color:#1a1500; padding:3px 10px; border-radius:5px; cursor:pointer; font:inherit; font-weight:700">إنهاء والخروج</button>
  `;
  const main = document.getElementById("main");
  if (main && main.parentNode) main.parentNode.insertBefore(banner, main);
  document.getElementById("exitDemoBtn").addEventListener("click", async () => {
    const { setDemoMode, clearSession } = await import("./firebase.js");
    setDemoMode(false);
    clearSession();
    location.hash = "#/login";
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", boot);
