// =================================================================
// app.js — نقطة الدخول الموحدة (Single Entry Point)
// يحوي: Bootstrap + Router + Sidenav + Login عرض
// =================================================================
import { getSession, watchAuth, isDemoMode, setDemoMode, clearSession,
         listDemoUsers, isFirebaseConfigured }
  from "./firebase.js";

// ---------- Sidenav state ----------
function showSidenavFor(user) {
  const appbar = document.getElementById("appbar");
  const sidenav = document.getElementById("sidenav");
  const backdrop = document.getElementById("backdrop");
  if (appbar) appbar.style.display = "";
  if (sidenav) sidenav.style.display = "";
  if (window.innerWidth > 900) {
    sidenav?.classList.remove("is-closed");
  } else {
    sidenav?.classList.add("is-closed");
  }
  if (backdrop) backdrop.hidden = true;
  const main = document.getElementById("main");
  if (main) main.style.marginInlineStart = "";
}
function hideChromeForLogin() {
  const appbar = document.getElementById("appbar");
  const sidenav = document.getElementById("sidenav");
  const backdrop = document.getElementById("backdrop");
  if (appbar) appbar.style.display = "none";
  if (sidenav) sidenav.style.display = "none";
  if (backdrop) backdrop.hidden = true;
  const main = document.getElementById("main");
  if (main) main.style.marginInlineStart = "0";
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

// ---------- Build Sidenav ----------
async function buildSidenav(user) {
  const nav = document.getElementById("sidenavNav");
  if (!nav || !user) return;
  const { navItemsFor, can, PERMISSIONS } = await import("./permissions.js");
  const { icon } = await import("./ui.js");
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
    const { isDemoMode: isD, setDemoMode: setD, clearSession: cS } = await import("./firebase.js");
    if (isD()) { setD(false); cS(); location.hash = "#/login"; return; }
    try {
      const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
      await signOut(getAuth());
      location.hash = "#/login";
    } catch (e) { console.warn("logout", e); }
  });
}

// ---------- Page rendering ----------
async function renderPage(path, main) {
  // Map path -> module
  const map = {
    "/dashboard":   "dashboard",
    "/imei":        "imei",
    "/devices":     "devices",
    "/reports":     "reports",
    "/shops":       "shops",
    "/users":       "users",
    "/alerts":      "alerts",
    "/audit":       "audit",
    "/settings":    "settings",
    "/sales":       "sales",
    "/sales/new":   "sales",
    "/used/new":    "used",
    "/shop-panel":  "shop-panel",
    "/police-panel":"police-panel",
    "/profile":     "profile"
  };
  const moduleName = map[path] || "dashboard";
  try {
    const mod = await import(`./pages/${moduleName}.js`);
    await mod.render(main);
  } catch (e) {
    console.error("Page render error:", e);
    main.innerHTML = `<div class="card" style="margin:20px">تعذر تحميل الصفحة: ${e.message}</div>`;
  }
}

// ---------- Main router ----------
async function route() {
  const main = document.getElementById("main");
  if (!main) return;
  const hash = (location.hash || "#/dashboard").replace(/^#/, "");
  const path = hash.split("?")[0] || "/dashboard";

  // صفحة Login
  if (path === "/login" || (!getSession() && !isDemoMode())) {
    hideChromeForLogin();
    try {
      const login = await import("./pages/login.js");
      await login.render(main);
    } catch (e) {
      console.error("Login render error:", e);
      main.innerHTML = `<div class="auth-wrap"><div class="auth-card">
        <h1>خطأ في التحميل</h1>
        <p>${e.message}</p>
      </div></div>`;
    }
    return;
  }

  const session = getSession();
  if (!session) { location.hash = "#/login"; return; }

  showSidenavFor(session);
  renderUserChip(session);

  // tabil active link
  document.querySelectorAll(".navlink").forEach(a => a.classList.remove("is-active"));
  const active = document.querySelector(`.navlink[data-route="${path}"]`);
  if (active) active.classList.add("is-active");

  main.innerHTML = `<div class="card center" style="margin:20px"><span class="spinner"></span> &nbsp; جاري التحميل...</div>`;
  await renderPage(path, main);
}

// ---------- Boot ----------
async function boot() {
  // menu toggle
  document.getElementById("btnMenu")?.addEventListener("click", () => {
    document.getElementById("sidenav")?.classList.toggle("is-open");
    document.getElementById("backdrop")?.classList.toggle("is-open");
  });
  document.getElementById("backdrop")?.addEventListener("click", () => {
    document.getElementById("sidenav")?.classList.remove("is-open");
    document.getElementById("backdrop")?.classList.remove("is-open");
  });

  // close mobile menu on nav click
  document.addEventListener("click", (e) => {
    if (e.target.closest(".navlink") && window.innerWidth <= 900) {
      document.getElementById("sidenav")?.classList.remove("is-open");
      document.getElementById("backdrop")?.classList.remove("is-open");
    }
  });

  // Auth watcher
  watchAuth(async (user) => {
    if (user) {
      await buildSidenav(user);
      renderUserChip(user);
    } else {
      renderUserChip(null);
    }
    // بعد تغيير الحالة: أعد الـ routing
    route();
  });

  // Initial route
  await route();

  // listen hash changes
  window.addEventListener("hashchange", route);
}

boot().catch(e => {
  console.error("Boot error:", e);
  const main = document.getElementById("main");
  if (main) main.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h1>⚠️ خطأ في تشغيل النظام</h1>
    <p>${e.message}</p>
    <p style="font-size:12px;color:#888">افتح Console (F12) للمزيد من التفاصيل.</p>
  </div></div>`;
});
