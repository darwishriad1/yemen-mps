// =================================================================
// router.js — Hash router بسيط مع Guard للصلاحيات
// =================================================================
import { getSession } from "./firebase.js";
import { can, PERMISSIONS } from "./permissions.js";
import { toast, icon } from "./ui.js";

const routes = {
  "/login":       { render: () => import("./pages/login.js").then(m => m.render), public: true },
  "/dashboard":   { render: () => import("./pages/dashboard.js").then(m => m.render) },
  "/imei":        { render: () => import("./pages/imei.js").then(m => m.render) },
  "/devices":     { render: () => import("./pages/devices.js").then(m => m.render), perm: PERMISSIONS.DEVICE_VIEW },
  "/reports":     { render: () => import("./pages/reports.js").then(m => m.render), perm: PERMISSIONS.REPORT_VIEW },
  "/shops":       { render: () => import("./pages/shops.js").then(m => m.render), perm: PERMISSIONS.SHOP_VIEW },
  "/users":       { render: () => import("./pages/users.js").then(m => m.render), perm: PERMISSIONS.USER_VIEW },
  "/alerts":      { render: () => import("./pages/alerts.js").then(m => m.render) },
  "/audit":       { render: () => import("./pages/audit.js").then(m => m.render), perm: PERMISSIONS.AUDIT_VIEW },
  "/settings":    { render: () => import("./pages/settings.js").then(m => m.render), perm: PERMISSIONS.SETTINGS_VIEW },
  "/sales":       { render: () => import("./pages/sales.js").then(m => m.render), perm: PERMISSIONS.SALE_VIEW },
  "/sales/new":   { render: () => import("./pages/sales.js").then(m => m.render), perm: PERMISSIONS.SALE_CREATE },
  "/used/new":    { render: () => import("./pages/used.js").then(m => m.render), perm: PERMISSIONS.USED_PURCHASE_CREATE },
  "/shop-panel":  { render: () => import("./pages/shop-panel.js").then(m => m.render) },
  "/police-panel":{ render: () => import("./pages/police-panel.js").then(m => m.render) },
  "/profile":     { render: () => import("./pages/profile.js").then(m => m.render) }
};

export async function router() {
  const main = document.getElementById("main");
  if (!main) return;
  const hash = (location.hash || "#/dashboard").replace(/^#/, "");
  const path = hash.split("?")[0] || "/dashboard";

  // الصفحات العامة (login)
  if (routes[path]?.public) {
    document.getElementById("sidenav").classList.add("is-closed");
    document.getElementById("appbar").style.display = "none";
    main.innerHTML = "";
    try { await routes[path].render(main); } catch (e) { console.error(e); main.innerHTML = `<div class="card">تعذر تحميل الصفحة.</div>`; }
    return;
  }

  const session = getSession();
  if (!session) { location.hash = "#/login"; return; }

  // Guard
  const route = routes[path] || routes["/dashboard"];
  if (route.perm && !can(session, route.perm)) {
    main.innerHTML = `
      <div class="page-head"><div class="page-head__title"><h1>غير مصرح</h1>
      <span class="page-head__sub">ليست لديك صلاحية للوصول إلى هذه الصفحة</span></div></div>
      <div class="card"><div class="banner banner--warn">
        <span>${icon("shield")}</span>
        <div>إذا كنت تعتقد أن هذا خطأ، تواصل مع مسؤول النظام في نطاقك.</div>
      </div></div>`;
    return;
  }

  // إظهار الواجهة الرئيسية
  document.getElementById("appbar").style.display = "";
  // تحديث حالة الـ sidenav
  if (window.innerWidth > 900) {
    document.getElementById("sidenav").classList.remove("is-closed");
  }

  // تمييز الرابط النشط
  document.querySelectorAll(".navlink").forEach(a => a.classList.remove("is-active"));
  const active = document.querySelector(`.navlink[data-route="${path}"]`);
  if (active) active.classList.add("is-active");

  // عرض حالة تحميل
  main.innerHTML = `<div class="card center"><span class="spinner"></span> &nbsp; جاري التحميل...</div>`;

  try {
    await route.render(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card">تعذر تحميل هذه الصفحة. تحقق من الاتصال ثم أعد المحاولة.</div>`;
    toast("تعذر تحميل الصفحة. تحقق من الاتصال.", "danger");
  }
}

export function go(path) { location.hash = path.startsWith("#") ? path : "#" + path; }
export function startRouter() {
  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
  // تشغيل فوري إذا كانت الصفحة محمّلة
  if (document.readyState !== "loading") router();
}
