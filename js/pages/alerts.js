// =================================================================
// pages/alerts.js — التنبيهات
// =================================================================
import { listCollection, updateOne, logAudit, fmtDateTime } from "../firebase.js";
import { emptyState, icon, skeletonRows, fmtRelative, toast } from "../ui.js";

export async function render(main) {
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>التنبيهات</h1>
        <span class="page-head__sub">تنبيهات النظام حسب نطاقك وصلاحياتك</span></div>
    </div>

    <div class="tabs" id="tabs">
      <button class="tab is-active" data-f="unread">غير مقروءة</button>
      <button class="tab" data-f="all">الكل</button>
    </div>

    <div id="list">${skeletonRows(4,4)}</div>
  `;

  let all = [];
  try { all = await listCollection("alerts", { lim: 100 }); }
  catch (e) {
    document.getElementById("list").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  let cur = "unread";
  const render = () => {
    const list = cur === "unread" ? all.filter(a => !a.read) : all;
    if (!list.length) { document.getElementById("list").innerHTML = emptyState({ title: "لا توجد تنبيهات حالياً" }); return; }
    document.getElementById("list").innerHTML = `<div class="list">${list.map(a => `
      <div class="list__item" style="${a.read ? "opacity:.7" : ""}">
        <div style="font-size:18px">${a.severity === "high" ? "🚨" : a.severity === "warn" ? "⚠️" : "🔔"}</div>
        <div class="meta">
          <b>${a.title || a.type || "تنبيه"}</b>
          <span>${a.message || ""}</span>
          <span class="muted small">${fmtRelative(a.createdAt)}</span>
        </div>
        ${!a.read ? `<button class="btn btn--ghost btn--sm right" data-r="${a.id}">تحديد كمقروء</button>` : `<span class="badge badge--muted right">مقروء</span>`}
      </div>`).join("")}</div>`;
    document.querySelectorAll("[data-r]").forEach(b => b.addEventListener("click", async () => {
      try { await updateOne("alerts", b.dataset.r, { read: true }); await logAudit("ALERT_READ", { id: b.dataset.r }); const it = all.find(x => x.id === b.dataset.r); if (it) it.read = true; render(); }
      catch (e) { toast("تعذر التحديث", "danger"); }
    }));
  };
  document.getElementById("tabs").addEventListener("click", (e) => {
    const t = e.target.closest(".tab"); if (!t) return;
    [...e.currentTarget.querySelectorAll(".tab")].forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active"); cur = t.dataset.f; render();
  });
  render();
}
