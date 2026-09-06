// =================================================================
// pages/shop-panel.js — لوحة المحل
// =================================================================
import { getSession, listCollection, fmtDateTime, fmtYER } from "../firebase.js";
import { icon, emptyState, skeletonRows, fmtRelative, deviceStatusBadge } from "../ui.js";

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>لوحة المحل</h1>
        <span class="page-head__sub">${user?.shopName || "—"}</span></div>
      <div class="page-head__actions">
        <a class="btn btn--gold" href="#/imei">${icon("search")} فحص IMEI</a>
        <a class="btn btn--primary" href="#/sales/new">${icon("cash")} تسجيل بيع</a>
        <a class="btn btn--success" href="#/used/new">${icon("cart")} شراء مستعمل</a>
      </div>
    </div>

    <div class="banner banner--warn">
      <span>${icon("warn")}</span>
      <div>
        <b>تنبيه أمني:</b>
        لا تستكمل أي عملية شراء أو بيع لأجهزة بحالة (مفقود / مسروق / محظور)،
        ولا تواجه أي شخص — اتبع الإجراء الرسمي المعتمد وأبلغ قسم الشرطة المرتبط.
      </div>
    </div>

    <div id="stats" style="margin-top:14px">${skeletonRows(4,2)}</div>

    <div class="grid grid--2" style="margin-top:18px">
      <div class="card">
        <div class="card__head"><h2>${icon("cash")} آخر المبيعات</h2>
          <a class="btn btn--ghost btn--sm" href="#/sales">عرض الكل</a></div>
        <div id="sales">${skeletonRows(4,3)}</div>
      </div>
      <div class="card">
        <div class="card__head"><h2>${icon("cart")} آخر المشتريات</h2></div>
        <div id="used">${skeletonRows(4,3)}</div>
      </div>
    </div>
  `;

  // الإحصائيات
  let sales = [], used = [];
  try {
    [sales, used] = await Promise.all([
      listCollection("sales", { lim: 200 }),
      listCollection("usedPhonePurchases", { lim: 200 })
    ]);
  } catch {}

  if (user?.shopId) {
    sales = sales.filter(x => x.shopId === user.shopId);
    used = used.filter(x => x.shopId === user.shopId);
  }

  const totalSales = sales.reduce((a, s) => a + Number(s.price || 0), 0);
  const totalUsed = used.reduce((a, s) => a + Number(s.price || 0), 0);

  document.getElementById("stats").innerHTML = `
    <div class="stats-grid">
      <div class="stat stat--blue"><span class="stat__label">عمليات البيع</span><span class="stat__value">${sales.length}</span></div>
      <div class="stat stat--green"><span class="stat__label">إجمالي المبيعات</span><span class="stat__value">${fmtYER(totalSales)}</span></div>
      <div class="stat stat--gold"><span class="stat__label">عمليات الشراء</span><span class="stat__value">${used.length}</span></div>
      <div class="stat stat--orange"><span class="stat__label">إجمالي المشتريات</span><span class="stat__value">${fmtYER(totalUsed)}</span></div>
    </div>`;

  document.getElementById("sales").innerHTML = sales.length ? `<div class="list">${sales.slice(0,6).map(s => `
    <div class="list__item">
      ${icon("cash")}
      <div class="meta"><b>${s.buyerName||"—"}</b><span>${s.device?.brand||""} ${s.device?.model||""} · ${fmtRelative(s.createdAt)}</span></div>
      <span class="badge badge--success right">${fmtYER(s.price)}</span>
    </div>`).join("")}</div>` : emptyState({ title: "لا توجد عمليات حالياً" });

  document.getElementById("used").innerHTML = used.length ? `<div class="list">${used.slice(0,6).map(s => `
    <div class="list__item">
      ${icon("cart")}
      <div class="meta"><b>${s.sellerName||"—"}</b><span>${s.brand||""} ${s.model||""} · ${fmtRelative(s.createdAt)}</span></div>
      <span class="badge badge--gold right">${fmtYER(s.price)}</span>
    </div>`).join("")}</div>` : emptyState({ title: "لا توجد عمليات حالياً" });
}
