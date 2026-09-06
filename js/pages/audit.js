// =================================================================
// pages/audit.js — سجل التدقيق
// =================================================================
import { listCollection, fmtDateTime } from "../firebase.js";
import { emptyState, icon, skeletonRows, fmtRelative } from "../ui.js";

export async function render(main) {
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>سجل التدقيق</h1>
        <span class="page-head__sub">سجل كامل بالعمليات الحساسة في النظام</span></div>
    </div>

    <div class="toolbar">
      <input class="input" id="q" placeholder="بحث بنوع العملية أو اسم المستخدم..." />
      <span class="spacer"></span>
      <button class="btn btn--ghost btn--sm" id="exportBtn">${icon("download")} تصدير</button>
    </div>

    <div id="tbl">${skeletonRows(5,5)}</div>
  `;

  let all = [];
  try { all = await listCollection("auditLogs", { order: { field: "createdAt", dir: "desc" }, lim: 200 }); }
  catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }

  const render = () => {
    const term = document.getElementById("q").value.trim().toLowerCase();
    const list = term ? all.filter(a => [a.action, a.actorName, a.actorRole].some(v => (v||"").toLowerCase().includes(term))) : all;
    if (!list.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد سجلات حالياً" }); return; }
    document.getElementById("tbl").innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>العملية</th><th>المستخدم</th><th>الدور</th><th>التفاصيل</th><th>التاريخ</th></tr></thead>
        <tbody>${list.map(a => `
          <tr>
            <td><span class="badge badge--info">${a.action||"—"}</span></td>
            <td>${a.actorName||"—"}</td>
            <td>${a.actorRole||"—"}</td>
            <td class="small">${a.payload ? JSON.stringify(a.payload) : "—"}</td>
            <td>${fmtDateTime(a.createdAt)}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>`;
  };
  document.getElementById("q").addEventListener("input", render);
  document.getElementById("exportBtn").addEventListener("click", () => {
    const csv = "action,actor,role,when\n" + all.map(a => [a.action, a.actorName, a.actorRole, fmtDateTime(a.createdAt)].join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "audit-logs.csv"; a.click(); URL.revokeObjectURL(url);
  });
  render();
}
