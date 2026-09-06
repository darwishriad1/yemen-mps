// =================================================================
// pages/police-panel.js — لوحة الشرطة
// =================================================================
import { getSession, listCollection, fmtDateTime, deviceStatusBadge, maskImei } from "../firebase.js";
import { icon, emptyState, skeletonRows, fmtRelative } from "../ui.js";

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>لوحة الشرطة</h1>
        <span class="page-head__sub">${user?.policeStationName || "قسم الشرطة"}</span></div>
      <div class="page-head__actions">
        <a class="btn btn--gold" href="#/imei">${icon("search")} بحث عن جهاز</a>
        <a class="btn btn--primary" href="#/reports">${icon("alert")} البلاغات</a>
      </div>
    </div>

    <div id="stats">${skeletonRows(4,2)}</div>

    <div class="grid grid--2" style="margin-top:18px">
      <div class="card">
        <div class="card__head"><h2>${icon("alert")} بلاغات نشطة</h2>
          <a class="btn btn--ghost btn--sm" href="#/reports">عرض الكل</a></div>
        <div id="active">${skeletonRows(3,3)}</div>
      </div>
      <div class="card">
        <div class="card__head"><h2>${icon("phone")} أجهزة مطلوبة</h2></div>
        <div id="wanted">${skeletonRows(3,3)}</div>
      </div>
    </div>
  `;

  let reports = [], devices = [];
  try {
    [reports, devices] = await Promise.all([
      listCollection("policeReports", { lim: 100 }),
      listCollection("devices", { lim: 300 })
    ]);
  } catch {}

  const active = reports.filter(r => ["SUBMITTED","UNDER_REVIEW","ACTIVE"].includes(r.status));
  const wanted = devices.filter(d => ["LOST","STOLEN"].includes(d.status));

  document.getElementById("stats").innerHTML = `
    <div class="stats-grid">
      <div class="stat stat--red"><span class="stat__label">بلاغات نشطة</span><span class="stat__value">${active.length}</span></div>
      <div class="stat stat--orange"><span class="stat__label">أجهزة مفقودة</span><span class="stat__value">${wanted.filter(w=>w.status==="LOST").length}</span></div>
      <div class="stat stat--red"><span class="stat__label">أجهزة مسروقة</span><span class="stat__value">${wanted.filter(w=>w.status==="STOLEN").length}</span></div>
      <div class="stat stat--green"><span class="stat__label">مسترجعة</span><span class="stat__value">${devices.filter(d=>d.status==="RECOVERED").length}</span></div>
    </div>`;

  document.getElementById("active").innerHTML = active.length ? `<div class="list">${active.slice(0,6).map(r => `
    <div class="list__item">
      ${icon("alert")}
      <div class="meta"><b>${r.type||"بلاغ"}</b><span>${maskImei(r.imei)} · ${fmtRelative(r.createdAt)}</span></div>
      <span class="badge badge--danger right">${r.status}</span>
    </div>`).join("")}</div>` : emptyState({ title: "لا توجد بلاغات نشطة" });

  document.getElementById("wanted").innerHTML = wanted.length ? `<div class="list">${wanted.slice(0,6).map(d => `
    <div class="list__item">
      ${icon("phone")}
      <div class="meta"><b>${d.brand||"—"} ${d.model||""}</b><span class="mono">${maskImei(d.imei1)}</span></div>
      ${deviceStatusBadge(d.status)}
    </div>`).join("")}</div>` : emptyState({ title: "لا توجد أجهزة مطلوبة حالياً" });
}
