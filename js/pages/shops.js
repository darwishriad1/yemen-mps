// =================================================================
// pages/shops.js — المحلات المعتمدة
// =================================================================
import { listCollection, fmtDateTime, createOne, logAudit, getSession } from "../firebase.js";
import { emptyState, icon, openModal, toast, skeletonRows, fmtRelative } from "../ui.js";
import { can, PERMISSIONS } from "../permissions.js";

const SHOP_STATES = ["ACTIVE","PENDING","SUSPENDED","CLOSED"];

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>المحلات المعتمدة</h1>
        <span class="page-head__sub">قائمة المحلات المرخّصة لبيع وشراء الأجهزة</span></div>
      <div class="page-head__actions">
        ${can(user, PERMISSIONS.SHOP_CREATE) ? `<button class="btn btn--primary" id="addBtn">${icon("plus")} إضافة محل</button>` : ""}
      </div>
    </div>

    <div class="toolbar">
      <input class="input" id="q" placeholder="بحث باسم المحل أو المالك أو رقم الاعتماد..." />
      <select class="select" id="fSt">
        <option value="">كل الحالات</option>
        ${SHOP_STATES.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
      <span class="spacer"></span>
      <span class="small muted" id="count">—</span>
    </div>

    <div id="tbl">${skeletonRows(6,4)}</div>
  `;

  let all = [];
  try { all = await listCollection("shops", { lim: 200 }); }
  catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  const render = () => {
    const term = document.getElementById("q").value.trim().toLowerCase();
    const st = document.getElementById("fSt").value;
    const list = all.filter(s => {
      if (st && s.status !== st) return false;
      if (!term) return true;
      return [s.name, s.ownerName, s.licenseNumber, s.phone].some(v => (v||"").toLowerCase().includes(term));
    });
    document.getElementById("count").textContent = `${list.length} محل`;
    if (!list.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد بيانات حالياً" }); return; }
    document.getElementById("tbl").innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>اسم المحل</th><th>رقم الاعتماد</th><th>المالك</th><th>المديرية</th><th>الحالة</th><th>اعتُمد</th><th></th></tr></thead>
        <tbody>${list.map(s => `
          <tr>
            <td><b>${s.name||"—"}</b></td>
            <td class="mono">${s.licenseNumber||"—"}</td>
            <td>${s.ownerName||"—"}</td>
            <td>${s.districtName||"—"}</td>
            <td>${shopBadge(s.status)}</td>
            <td>${fmtRelative(s.approvedAt)}</td>
            <td><button class="btn btn--ghost btn--sm" data-v="${s.id}">${icon("eye")}</button></td>
          </tr>`).join("")}
        </tbody>
      </table></div>`;
    document.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => view(b.dataset.v, all)));
  };

  document.getElementById("q").addEventListener("input", render);
  document.getElementById("fSt").addEventListener("change", render);
  render();

  document.getElementById("addBtn")?.addEventListener("click", () => addShop());
}

function shopBadge(s) {
  const m = { ACTIVE: "badge--success", PENDING: "badge--pending", SUSPENDED: "badge--warn", CLOSED: "badge--muted" };
  return `<span class="badge ${m[s]||"badge--muted"}">${s||"—"}</span>`;
}

function view(id, all) {
  const s = all.find(x => x.id === id); if (!s) return;
  openModal({
    title: "تفاصيل المحل",
    body: `<dl class="kv">
      <dt>الاسم</dt><dd>${s.name||"—"}</dd>
      <dt>رقم الاعتماد</dt><dd class="mono">${s.licenseNumber||"—"}</dd>
      <dt>المالك</dt><dd>${s.ownerName||"—"}</dd>
      <dt>الهاتف</dt><dd>${s.phone||"—"}</dd>
      <dt>المحافظة</dt><dd>${s.governorateName||"—"}</dd>
      <dt>المديرية</dt><dd>${s.districtName||"—"}</dd>
      <dt>قسم الشرطة</dt><dd>${s.policeStationName||"—"}</dd>
      <dt>العنوان</dt><dd>${s.address||"—"}</dd>
      <dt>الحالة</dt><dd>${shopBadge(s.status)}</dd>
      <dt>تاريخ الاعتماد</dt><dd>${fmtDateTime(s.approvedAt)}</dd>
    </dl>`,
    confirmText: "إغلاق", onConfirm: () => true
  });
}

function addShop() {
  openModal({
    title: "إضافة محل جديد",
    body: `
      <div class="field"><label class="field__label">اسم المحل</label><input class="input" id="sName" required /></div>
      <div class="field"><label class="field__label">رقم الاعتماد</label><input class="input" id="sLic" /></div>
      <div class="field"><label class="field__label">اسم المالك</label><input class="input" id="sOwner" /></div>
      <div class="field"><label class="field__label">الهاتف</label><input class="input" id="sPhone" inputmode="tel" /></div>
      <div class="grid grid--2">
        <div class="field"><label class="field__label">المحافظة</label><input class="input" id="sGov" placeholder="مثال: صنعاء" /></div>
        <div class="field"><label class="field__label">المديرية</label><input class="input" id="sDist" placeholder="مثال: التحرير" /></div>
      </div>
      <div class="field"><label class="field__label">العنوان</label><input class="input" id="sAddr" /></div>`,
    confirmText: "حفظ",
    onConfirm: async () => {
      const name = document.getElementById("sName").value.trim();
      if (!name) { toast("أدخل اسم المحل", "warn"); return false; }
      try {
        await createOne("shops", null, {
          name, licenseNumber: document.getElementById("sLic").value.trim(),
          ownerName: document.getElementById("sOwner").value.trim(),
          phone: document.getElementById("sPhone").value.trim(),
          governorateName: document.getElementById("sGov").value.trim(),
          districtName: document.getElementById("sDist").value.trim(),
          address: document.getElementById("sAddr").value.trim(),
          status: "PENDING"
        });
        await logAudit("SHOP_CREATE", { name });
        toast("تم إضافة المحل (بانتظار الاعتماد)", "success");
        setTimeout(() => location.reload(), 500);
      } catch (e) { toast("تعذر الحفظ", "danger"); return false; }
    }
  });
}
