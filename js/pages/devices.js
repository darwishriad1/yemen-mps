// =================================================================
// pages/devices.js — إدارة الأجهزة
// =================================================================
import { listCollection, getSession, fmtDateTime, maskImei, createOne, updateOne, logAudit }
  from "../firebase.js";
import { deviceStatusBadge, emptyState, skeletonRows, icon, toast, openModal, fmtRelative } from "../ui.js";
import { can, PERMISSIONS, ROLE_LABELS } from "../permissions.js";

const STATUSES = ["ACTIVE","UNREGISTERED","UNDER_VERIFICATION","LOST","STOLEN","RECOVERED","SUSPICIOUS","BLOCKED"];

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title">
        <h1>إدارة الأجهزة</h1>
        <span class="page-head__sub">سجل الأجهزة المسجّلة في النظام</span>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--gold" href="#/imei">${icon("search")} فحص IMEI</a>
        ${can(user, PERMISSIONS.DEVICE_CREATE) ? `<button class="btn btn--primary" id="addBtn">${icon("plus")} تسجيل جهاز</button>` : ""}
      </div>
    </div>

    <div class="toolbar">
      <input class="input" id="q" placeholder="بحث برقم IMEI أو الشركة أو الموديل..." />
      <select class="select" id="fStatus">
        <option value="">كل الحالات</option>
        ${STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
      <span class="spacer"></span>
      <span class="small muted" id="count">—</span>
    </div>

    <div id="tbl">${skeletonRows(6, 6)}</div>
  `;

  let all = [];
  try {
    all = await listCollection("devices", { lim: 200 });
  } catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  const q = document.getElementById("q");
  const fStatus = document.getElementById("fStatus");
  const render = () => {
    const term = q.value.trim().toLowerCase();
    const st = fStatus.value;
    const list = all.filter(d => {
      if (st && d.status !== st) return false;
      if (!term) return true;
      return [d.imei1, d.imei2, d.brand, d.model, d.serialNumber].some(v => (v||"").toLowerCase().includes(term));
    });
    document.getElementById("count").textContent = `${list.length} جهاز`;
    if (!list.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد بيانات حالياً", desc: "لم يتم العثور على أجهزة مطابقة." }); return; }
    document.getElementById("tbl").innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>IMEI</th><th>الشركة / الموديل</th><th>النوع</th>
            <th>الحالة</th><th>المديرية</th><th>آخر تحديث</th><th></th>
          </tr></thead>
          <tbody>
            ${list.map(d => `
              <tr>
                <td class="mono">${maskImei(d.imei1 || d.id)}</td>
                <td>${d.brand || "—"} <span class="muted">/</span> ${d.model || "—"}</td>
                <td>${d.deviceType || "—"}</td>
                <td>${deviceStatusBadge(d.status)}</td>
                <td>${d.districtName || "—"}</td>
                <td>${fmtRelative(d.lastUpdated || d.updatedAt)}</td>
                <td><button class="btn btn--ghost btn--sm" data-view="${d.id}">${icon("eye")}</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
    document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showDevice(b.dataset.view, all)));
  };
  q.addEventListener("input", render);
  fStatus.addEventListener("change", render);
  render();

  document.getElementById("addBtn")?.addEventListener("click", () => showAdd());
}

function showDevice(id, all) {
  const d = all.find(x => x.id === id) || {};
  openModal({
    title: "تفاصيل الجهاز",
    body: `
      <dl class="kv">
        <dt>IMEI 1</dt><dd class="mono">${d.imei1 || "—"}</dd>
        <dt>IMEI 2</dt><dd class="mono">${d.imei2 || "—"}</dd>
        <dt>Serial</dt><dd class="mono">${d.serialNumber || "—"}</dd>
        <dt>الشركة</dt><dd>${d.brand || "—"}</dd>
        <dt>الموديل</dt><dd>${d.model || "—"}</dd>
        <dt>النوع</dt><dd>${d.deviceType || "—"}</dd>
        <dt>الحالة</dt><dd>${deviceStatusBadge(d.status)}</dd>
        <dt>المديرية</dt><dd>${d.districtName || "—"}</dd>
        <dt>تاريخ التسجيل</dt><dd>${fmtDateTime(d.registeredAt || d.createdAt)}</dd>
        <dt>آخر تحديث</dt><dd>${fmtDateTime(d.lastUpdated || d.updatedAt)}</dd>
      </dl>`,
    confirmText: "إغلاق",
    onConfirm: () => true
  });
}

function showAdd() {
  openModal({
    title: "تسجيل جهاز جديد",
    body: `
      <div class="field"><label class="field__label">IMEI</label>
        <input class="input input--mono" id="dImei" maxlength="17" placeholder="356938035643809" required /></div>
      <div class="field"><label class="field__label">الشركة</label>
        <input class="input" id="dBrand" placeholder="مثال: Samsung" /></div>
      <div class="field"><label class="field__label">الموديل</label>
        <input class="input" id="dModel" placeholder="مثال: Galaxy A14" /></div>
      <div class="field"><label class="field__label">نوع الجهاز</label>
        <select class="select" id="dType">
          <option value="PHONE">هاتف</option>
          <option value="TABLET">جهاز لوحي</option>
          <option value="WATCH">ساعة</option>
        </select></div>
      <p class="small muted">سيتم تسجيل الجهاز بحالة <b>ACTIVE</b> ومصدر "إدخال يدوي".</p>`,
    confirmText: "حفظ",
    onConfirm: async () => {
      const imei = document.getElementById("dImei").value.trim();
      if (!/^\d{14,16}$/.test(imei)) { toast("رقم IMEI غير صالح", "warn"); return false; }
      try {
        await createOne("devices", imei, {
          imei1: imei, brand: document.getElementById("dBrand").value.trim(),
          model: document.getElementById("dModel").value.trim(),
          deviceType: document.getElementById("dType").value,
          status: "ACTIVE", registeredAt: new Date()
        });
        await logAudit("DEVICE_CREATE", { imei });
        toast("تم تسجيل الجهاز بنجاح", "success");
        setTimeout(() => location.reload(), 600);
      } catch (e) { toast("تعذر الحفظ: " + (e?.message || ""), "danger"); return false; }
    }
  });
}
