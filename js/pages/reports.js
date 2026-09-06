// =================================================================
// pages/reports.js — البلاغات
// =================================================================
import { listCollection, getSession, createOne, logAudit, fmtDateTime } from "../firebase.js";
import { emptyState, icon, openModal, toast, skeletonRows, fmtRelative } from "../ui.js";
import { can, PERMISSIONS } from "../permissions.js";

const REPORT_TYPES = [
  { v: "LOST",            l: "جهاز مفقود" },
  { v: "STOLEN",          l: "جهاز مسروق" },
  { v: "OWNERSHIP_DISPUTE", l: "نزاع ملكية" }
];
const STATUSES = ["DRAFT","SUBMITTED","UNDER_REVIEW","ACTIVE","RECOVERED","CLOSED","CANCELLED"];

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title">
        <h1>البلاغات</h1>
        <span class="page-head__sub">بلاغات الأجهزة المفقودة والمسروقة ونزاعات الملكية</span>
      </div>
      <div class="page-head__actions">
        ${can(user, PERMISSIONS.REPORT_CREATE) ? `<button class="btn btn--primary" id="addBtn">${icon("plus")} بلاغ جديد</button>` : ""}
      </div>
    </div>

    <div class="tabs" id="tabs">
      <button class="tab is-active" data-st="">الكل</button>
      ${REPORT_TYPES.map(t => `<button class="tab" data-st="${t.v}">${t.l}</button>`).join("")}
    </div>

    <div id="tbl">${skeletonRows(6, 4)}</div>
  `;

  let all = [];
  try { all = await listCollection("policeReports", { lim: 200 }); }
  catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  const tabs = document.getElementById("tabs");
  let cur = "";
  const render = () => {
    const list = cur ? all.filter(r => r.type === cur) : all;
    if (!list.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد بلاغات حالياً" }); return; }
    document.getElementById("tbl").innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>رقم البلاغ</th><th>النوع</th><th>IMEI</th><th>الحالة</th><th>أُنشئ</th><th></th>
          </tr></thead>
          <tbody>${list.map(r => `
            <tr>
              <td class="mono">${r.id}</td>
              <td>${labelOf(r.type)}</td>
              <td class="mono">${r.imei || "—"}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${fmtRelative(r.createdAt)}</td>
              <td><button class="btn btn--ghost btn--sm" data-v="${r.id}">${icon("eye")}</button></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    document.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => view(b.dataset.v, all)));
  };
  tabs.addEventListener("click", (e) => {
    const t = e.target.closest(".tab"); if (!t) return;
    [...tabs.querySelectorAll(".tab")].forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active");
    cur = t.dataset.st || ""; render();
  });
  render();

  document.getElementById("addBtn")?.addEventListener("click", () => addNew());
}

function labelOf(t) { return REPORT_TYPES.find(x => x.v === t)?.l || t || "—"; }
function statusBadge(s) {
  const m = {
    DRAFT: "badge--muted", SUBMITTED: "badge--info", UNDER_REVIEW: "badge--pending",
    ACTIVE: "badge--danger", RECOVERED: "badge--success", CLOSED: "badge--muted", CANCELLED: "badge--muted"
  };
  return `<span class="badge ${m[s] || "badge--muted"}">${s || "—"}</span>`;
}

function view(id, all) {
  const r = all.find(x => x.id === id);
  if (!r) return;
  openModal({
    title: "تفاصيل البلاغ",
    body: `
      <dl class="kv">
        <dt>رقم البلاغ</dt><dd class="mono">${r.id}</dd>
        <dt>النوع</dt><dd>${labelOf(r.type)}</dd>
        <dt>IMEI</dt><dd class="mono">${r.imei || "—"}</dd>
        <dt>الحالة</dt><dd>${statusBadge(r.status)}</dd>
        <dt>الوصف</dt><dd>${r.description || "—"}</dd>
        <dt>المُبلِّغ</dt><dd>${r.reporterName || "—"} ${r.reporterPhone ? `(${r.reporterPhone})` : ""}</dd>
        <dt>التاريخ</dt><dd>${fmtDateTime(r.createdAt)}</dd>
      </dl>`,
    confirmText: "إغلاق",
    onConfirm: () => true
  });
}

function addNew() {
  openModal({
    title: "إنشاء بلاغ جديد",
    body: `
      <div class="field"><label class="field__label">نوع البلاغ</label>
        <select class="select" id="rType">${REPORT_TYPES.map(t => `<option value="${t.v}">${t.l}</option>`).join("")}</select></div>
      <div class="field"><label class="field__label">IMEI</label>
        <input class="input input--mono" id="rImei" maxlength="17" /></div>
      <div class="field"><label class="field__label">اسم المُبلِّغ</label>
        <input class="input" id="rName" /></div>
      <div class="field"><label class="field__label">رقم الهاتف</label>
        <input class="input" id="rPhone" inputmode="tel" /></div>
      <div class="field"><label class="field__label">الوصف</label>
        <textarea class="textarea" id="rDesc" placeholder="تفاصيل البلاغ..."></textarea></div>`,
    confirmText: "إرسال البلاغ",
    onConfirm: async () => {
      const imei = document.getElementById("rImei").value.trim();
      if (imei && !/^\d{14,16}$/.test(imei)) { toast("رقم IMEI غير صالح", "warn"); return false; }
      try {
        await createOne("policeReports", null, {
          type: document.getElementById("rType").value,
          imei, reporterName: document.getElementById("rName").value.trim(),
          reporterPhone: document.getElementById("rPhone").value.trim(),
          description: document.getElementById("rDesc").value.trim(),
          status: "SUBMITTED"
        });
        await logAudit("REPORT_CREATE", { imei });
        toast("تم إرسال البلاغ", "success");
        setTimeout(() => location.reload(), 500);
      } catch (e) { toast("تعذر الحفظ", "danger"); return false; }
    }
  });
}
