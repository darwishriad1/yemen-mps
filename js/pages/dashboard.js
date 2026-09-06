// =================================================================
// pages/dashboard.js — لوحة الإدارة المركزية
// =================================================================
import { getSession, listCollection, isFirebaseConfigured, fmtDateTime } from "../firebase.js";
import { icon, deviceStatusBadge, emptyState, skeletonRows, toast } from "../ui.js";
import { ROLE_LABELS, can, PERMISSIONS } from "../permissions.js";
import { go } from "../router.js";

export async function render(main) {
  const user = getSession();
  if (!user) return;
  const isShop = ["SHOP_OWNER","SHOP_EMPLOYEE"].includes(user.role);
  const isPolice = ["POLICE_ADMIN","POLICE_STATION_ADMIN","POLICE_OFFICER","INVESTIGATOR"].includes(user.role);

  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title">
        <h1>${isShop ? "لوحة المحل" : isPolice ? "لوحة الشرطة" : "الإدارة المركزية"}</h1>
        <span class="page-head__sub">مرحباً ${user.fullName || ""} — ${ROLE_LABELS[user.role] || ""}</span>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--gold" href="#/imei">${icon("search")} فحص IMEI</a>
        ${isShop ? `<a class="btn btn--primary" href="#/sales/new">${icon("cash")} تسجيل بيع</a>` : ""}
      </div>
    </div>

    <div class="hero">
      <div class="hero__main">
        <h1>نظام حماية وتتبع الهواتف</h1>
        <p>منظومة رقمية متكاملة لإدارة الأجهزة المحمولة في الجمهورية اليمنية — فحص IMEI، تسجيل الأجهزة، إدارة البلاغات، المحلات المعتمدة، والصلاحيات، ضمن بنية آمنة موحّدة.</p>
        <div class="row" style="margin-top:12px">
          <span class="tag">YER · الريال اليمني</span>
          <span class="tag">Asia/Aden</span>
          <span class="tag">DD/MM/YYYY</span>
          <span class="tag">RTL · العربية</span>
        </div>
      </div>
      <div class="hero__side">
        <div class="clock" id="clock">
          <div class="clock__icon">🕐</div>
          <div>
            <div class="clock__time">--:--:--</div>
            <div class="clock__date">--/--/----</div>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><h2>نطاقك</h2></div>
          <div class="kv">
            <dt>الدور</dt><dd>${ROLE_LABELS[user.role] || "—"}</dd>
            <dt>المحافظة</dt><dd>${user.governorateName || "—"}</dd>
            <dt>المديرية</dt><dd>${user.districtName || "—"}</dd>
            ${user.policeStationName ? `<dt>قسم الشرطة</dt><dd>${user.policeStationName}</dd>` : ""}
            ${user.shopName ? `<dt>المحل</dt><dd>${user.shopName}</dd>` : ""}
          </div>
        </div>
      </div>
    </div>

    ${!isFirebaseConfigured() ? `
      <div class="notice">
        <span>${icon("warn")}</span>
        <div>
          <b>Firebase غير مُهيأ.</b>
          الإحصائيات أدناه لن تعمل حتى يتم ضبط <span class="kbd">js/firebase.js</span> بمشروعك.
        </div>
      </div>` : ""}

    <div id="statsArea">${skeletonRows(4, 2)}</div>

    <div class="grid grid--2" style="margin-top:18px">
      <div class="card">
        <div class="card__head">
          <h2>${icon("alert")} آخر البلاغات</h2>
          ${can(user, PERMISSIONS.REPORT_VIEW) ? `<a class="btn btn--ghost btn--sm" href="#/reports">عرض الكل</a>` : ""}
        </div>
        <div id="latestReports">${skeletonRows(3, 3)}</div>
      </div>
      <div class="card">
        <div class="card__head">
          <h2>${icon("bell")} آخر التنبيهات</h2>
          <a class="btn btn--ghost btn--sm" href="#/alerts">عرض الكل</a>
        </div>
        <div id="latestAlerts">${skeletonRows(3, 3)}</div>
      </div>
    </div>
  `;

  loadStats(user, isShop, isPolice);
  loadLatest();
}

async function loadStats(user, isShop, isPolice) {
  const area = document.getElementById("statsArea");
  try {
    // إحصائيات حقيقية من Firestore
    const [devices, reports, shops, alerts] = await Promise.all([
      safeCount("devices"),
      safeCount("policeReports"),
      safeCount("shops"),
      safeCount("alerts", { where: [{ field: "read", op: "==", value: false }] })
    ]);

    // إحصاءات حالة الأجهزة
    const statusCounts = await countByField("devices", "status");

    const tiles = [];

    if (!isShop) {
      tiles.push({ cls: "stat--blue",   label: "إجمالي الأجهزة", value: devices, hint: "في قاعدة البيانات" });
      tiles.push({ cls: "stat--green",  label: "أجهزة نشطة",     value: statusCounts.ACTIVE || 0 });
      tiles.push({ cls: "stat--red",    label: "أجهزة مسروقة",   value: statusCounts.STOLEN || 0 });
      tiles.push({ cls: "stat--red",    label: "أجهزة مفقودة",   value: statusCounts.LOST || 0 });
      tiles.push({ cls: "stat--orange", label: "قيد التحقق",      value: statusCounts.UNDER_VERIFICATION || 0 });
      tiles.push({ cls: "stat--purple", label: "محل اشتباه",      value: statusCounts.SUSPICIOUS || 0 });
      tiles.push({ cls: "stat--red",    label: "محظورة",         value: statusCounts.BLOCKED || 0 });
      tiles.push({ cls: "",            label: "غير مسجلة",      value: statusCounts.UNREGISTERED || 0, hint: "تقريبي" });
    }
    if (isShop) {
      tiles.push({ cls: "stat--blue",   label: "عملياتي اليوم",   value: 0, hint: "بحسب الصلاحيات" });
      tiles.push({ cls: "stat--green",  label: "فحوصات ناجحة",    value: 0 });
      tiles.push({ cls: "stat--red",    label: "حالات تم إيقافها", value: 0 });
      tiles.push({ cls: "stat--orange", label: "تنبيهات المحل",    value: alerts });
    }
    if (isPolice) {
      tiles.push({ cls: "stat--blue",   label: "البلاغات النشطة",  value: reports });
      tiles.push({ cls: "stat--red",    label: "أجهزة مسروقة",     value: statusCounts.STOLEN || 0 });
      tiles.push({ cls: "stat--orange", label: "أجهزة مفقودة",     value: statusCounts.LOST || 0 });
      tiles.push({ cls: "stat--green",  label: "أجهزة مسترجعة",    value: statusCounts.RECOVERED || 0 });
    }

    area.innerHTML = `<div class="stats-grid">${tiles.map(t => `
      <div class="stat ${t.cls||''}">
        <span class="stat__label">${t.label}</span>
        <span class="stat__value">${t.value}</span>
        ${t.hint ? `<span class="stat__hint">${t.hint}</span>` : ""}
      </div>`).join("")}</div>`;
  } catch (e) {
    console.error(e);
    area.innerHTML = `<div class="empty">تعذر تحميل الإحصائيات. تحقق من الاتصال.</div>`;
  }
}

async function loadLatest() {
  const rEl = document.getElementById("latestReports");
  const aEl = document.getElementById("latestAlerts");
  try {
    const [reports, alerts] = await Promise.all([
      safeList("policeReports", { lim: 5 }),
      safeList("alerts", { lim: 5 })
    ]);
    rEl.innerHTML = reports.length ? `<div class="list">${reports.map(r => `
      <div class="list__item">
        ${icon("alert")}
        <div class="meta">
          <b>${r.type || "بلاغ"}</b>
          <span>${r.imei || ""} · ${fmtDateTime(r.createdAt)}</span>
        </div>
        <span class="badge ${r.status === "ACTIVE" ? "badge--danger" : "badge--muted"} right">${r.status || "—"}</span>
      </div>`).join("")}</div>` : emptyState({ title: "لا توجد بلاغات حالياً" });

    aEl.innerHTML = alerts.length ? `<div class="list">${alerts.map(a => `
      <div class="list__item">
        ${icon("bell")}
        <div class="meta">
          <b>${a.title || a.type || "تنبيه"}</b>
          <span>${a.message || ""}</span>
        </div>
        <span class="badge ${a.severity === "high" ? "badge--danger" : "badge--info"} right">${a.severity || "info"}</span>
      </div>`).join("")}</div>` : emptyState({ title: "لا توجد تنبيهات حالياً" });
  } catch (e) {
    rEl.innerHTML = aEl.innerHTML = emptyState({ title: "تعذر التحميل", desc: "حاول لاحقاً" });
  }
}

// ---------- helpers ----------
async function safeCount(name, { where = [] } = {}) {
  try {
    const items = await safeList(name, { where, lim: 1000 });
    return items.length;
  } catch { return 0; }
}
async function countByField(name, field) {
  try {
    const items = await safeList(name, { lim: 5000 });
    const m = {};
    for (const it of items) m[it[field]] = (m[it[field]] || 0) + 1;
    return m;
  } catch { return {}; }
}
async function safeList(name, { where = [], lim = 50 } = {}) {
  const { listCollection } = await import("../firebase.js");
  return listCollection(name, { where: where.map(w => ({ field: w.field, op: w.op || "==", value: w.value })), lim });
}
