// =================================================================
// pages/users.js — المستخدمون
// =================================================================
import { listCollection, getSession, createOne, updateOne, logAudit, fmtDateTime } from "../firebase.js";
import { emptyState, icon, openModal, toast, skeletonRows, fmtRelative } from "../ui.js";
import { can, PERMISSIONS, ROLES, ROLE_LABELS } from "../permissions.js";

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>المستخدمون</h1>
        <span class="page-head__sub">إدارة الحسابات والصلاحيات ضمن النطاق</span></div>
      <div class="page-head__actions">
        ${can(user, PERMISSIONS.USER_CREATE) ? `<button class="btn btn--primary" id="addBtn">${icon("plus")} مستخدم جديد</button>` : ""}
      </div>
    </div>

    <div class="toolbar">
      <input class="input" id="q" placeholder="بحث بالاسم أو البريد أو الدور..." />
      <select class="select" id="fSt">
        <option value="">كل الحالات</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="PENDING">PENDING</option>
        <option value="SUSPENDED">SUSPENDED</option>
      </select>
      <span class="spacer"></span>
      <span class="small muted" id="count">—</span>
    </div>

    <div id="tbl">${skeletonRows(6,4)}</div>
  `;

  let all = [];
  try { all = await listCollection("users", { lim: 200 }); }
  catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  const render = () => {
    const term = document.getElementById("q").value.trim().toLowerCase();
    const st = document.getElementById("fSt").value;
    const list = all.filter(u => {
      if (st && u.status !== st) return false;
      if (!term) return true;
      return [u.fullName, u.email, u.role, u.districtName].some(v => (v||"").toLowerCase().includes(term));
    });
    document.getElementById("count").textContent = `${list.length} مستخدم`;
    if (!list.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد بيانات حالياً" }); return; }
    document.getElementById("tbl").innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>المديرية</th><th>الحالة</th><th>آخر دخول</th><th></th></tr></thead>
        <tbody>${list.map(u => `
          <tr>
            <td><b>${u.fullName||"—"}</b> ${u.isMainAccount?'<span class="pill">رئيسي</span>':''}</td>
            <td class="mono small">${u.email||"—"}</td>
            <td>${ROLE_LABELS[u.role]||u.role||"—"}</td>
            <td>${u.districtName||"—"}</td>
            <td>${u.status === "ACTIVE" ? '<span class="badge badge--success">نشط</span>' : u.status === "SUSPENDED" ? '<span class="badge badge--warn">موقوف</span>' : '<span class="badge badge--muted">'+(u.status||"—")+'</span>'}</td>
            <td>${fmtRelative(u.lastLoginAt)}</td>
            <td>${can(user, PERMISSIONS.USER_UPDATE) ? `<button class="btn btn--ghost btn--sm" data-sus="${u.id}" data-cur="${u.status}">${u.status==="SUSPENDED"?"تفعيد":"تعليق"}</button>` : ""}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>`;
    document.querySelectorAll("[data-sus]").forEach(b => b.addEventListener("click", () => toggleStatus(b.dataset.sus, b.dataset.cur, all, render)));
  };
  document.getElementById("q").addEventListener("input", render);
  document.getElementById("fSt").addEventListener("change", render);
  render();

  document.getElementById("addBtn")?.addEventListener("click", () => addUser());
}

async function toggleStatus(id, cur, all, refresh) {
  const next = cur === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  try {
    await updateOne("users", id, { status: next });
    await logAudit("USER_UPDATE", { id, status: next });
    toast("تم تحديث حالة المستخدم", "success");
    const u = all.find(x => x.id === id); if (u) u.status = next; refresh();
  } catch (e) { toast("تعذر التحديث", "danger"); }
}

function addUser() {
  openModal({
    title: "إضافة مستخدم",
    body: `
      <div class="field"><label class="field__label">الاسم الكامل</label><input class="input" id="uName" /></div>
      <div class="field"><label class="field__label">البريد الإلكتروني</label><input class="input" id="uEmail" type="email" /></div>
      <div class="field"><label class="field__label">رقم الهاتف</label><input class="input" id="uPhone" inputmode="tel" /></div>
      <div class="field"><label class="field__label">الدور</label>
        <select class="select" id="uRole">${Object.entries(ROLES).map(([k,v]) => `<option value="${v}">${ROLE_LABELS[v]}</option>`).join("")}</select></div>
      <div class="grid grid--2">
        <div class="field"><label class="field__label">المحافظة</label><input class="input" id="uGov" /></div>
        <div class="field"><label class="field__label">المديرية</label><input class="input" id="uDist" /></div>
      </div>
      <p class="small muted">ملاحظة: يجب إنشاء المستخدم في Firebase Auth أولاً (وحدة التحكم)، ثم ربط ملفه في <span class="kbd">users/&#123;uid&#125;</span>.</p>`,
    confirmText: "حفظ",
    onConfirm: async () => {
      const email = document.getElementById("uEmail").value.trim();
      if (!email) { toast("أدخل البريد", "warn"); return false; }
      try {
        await createOne("users", null, {
          fullName: document.getElementById("uName").value.trim(),
          email, phone: document.getElementById("uPhone").value.trim(),
          role: document.getElementById("uRole").value,
          governorateName: document.getElementById("uGov").value.trim(),
          districtName: document.getElementById("uDist").value.trim(),
          status: "PENDING", isMainAccount: false
        });
        await logAudit("USER_CREATE", { email });
        toast("تم إنشاء الملف (PENDING). أكمل من Firebase Auth.", "success", { timeout: 5000 });
        setTimeout(() => location.reload(), 700);
      } catch (e) { toast("تعذر الحفظ", "danger"); return false; }
    }
  });
}
