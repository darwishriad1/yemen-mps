// =================================================================
// pages/sales.js — تسجيل بيع + قائمة المبيعات
// =================================================================
import { listCollection, getSession, createOne, logAudit, fmtDateTime, checkIMEI, maskImei, newId }
  from "../firebase.js";
import { emptyState, icon, openModal, toast, skeletonRows, fmtRelative, fmtYER } from "../ui.js";
import { can, PERMISSIONS } from "../permissions.js";

export async function render(main) {
  const user = getSession();
  const isNew = location.hash.endsWith("/sales/new");

  if (isNew) return renderNew(main, user);
  return renderList(main, user);
}

async function renderList(main, user) {
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>عمليات البيع</h1>
        <span class="page-head__sub">سجل المبيعات المسجّلة</span></div>
      <div class="page-head__actions">
        ${can(user, PERMISSIONS.SALE_CREATE) ? `<a class="btn btn--primary" href="#/sales/new">${icon("plus")} تسجيل بيع</a>` : ""}
      </div>
    </div>
    <div id="tbl">${skeletonRows(6,4)}</div>
  `;
  let all = [];
  try { all = await listCollection("sales", { order: { field: "createdAt", dir: "desc" }, lim: 200 }); }
  catch (e) {
    document.getElementById("tbl").innerHTML = emptyState({ title: "تعذر التحميل", desc: e?.message || "" });
    return;
  }
  // تقييد بالمحل إن لم يكن إدارة
  if (!["MINISTRY_ADMIN","CENTRAL_ADMIN","DISTRICT_ADMIN"].includes(user?.role) && user?.shopId) {
    all = all.filter(s => s.shopId === user.shopId);
  }
  if (!all.length) { document.getElementById("tbl").innerHTML = emptyState({ title: "لا توجد عمليات حالياً" }); return; }
  document.getElementById("tbl").innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>المرجع</th><th>التاريخ</th><th>IMEI</th><th>المشتري</th><th>السعر</th><th>المحل</th><th>الموظف</th></tr></thead>
      <tbody>${all.map(s => `
        <tr>
          <td class="mono small">${s.id}</td>
          <td>${fmtDateTime(s.createdAt)}</td>
          <td class="mono">${maskImei(s.imei)}</td>
          <td>${s.buyerName || "—"}</td>
          <td class="num">${fmtYER(s.price)}</td>
          <td>${s.shopName || "—"}</td>
          <td>${s.employeeName || "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

async function renderNew(main, user) {
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>تسجيل بيع جديد</h1>
        <span class="page-head__sub">ابدأ بفحص IMEI قبل إتمام العملية</span></div>
      <div class="page-head__actions">
        <a class="btn btn--ghost" href="#/sales">${icon("list")} كل العمليات</a>
      </div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><h2>${icon("search")} فحص IMEI</h2></div>
        <form id="f" class="row" style="gap:8px">
          <input class="input input--imei" id="imei" maxlength="17" placeholder="356938035643809" required />
          <button class="btn btn--gold" type="submit">فحص</button>
        </form>
        <div id="res" style="margin-top:12px"></div>
      </div>

      <div class="card">
        <div class="card__head"><h2>${icon("cash")} بيانات البيع</h2></div>
        <form id="saleForm" class="grid" style="gap:10px">
          <div class="field"><label class="field__label">اسم المشتري</label><input class="input" id="bName" required /></div>
          <div class="field"><label class="field__label">رقم الهاتف</label><input class="input" id="bPhone" inputmode="tel" /></div>
          <div class="field"><label class="field__label">السعر (ر.ي)</label><input class="input" id="bPrice" type="number" min="0" required /></div>
          <div class="field"><label class="field__label">ملاحظات</label><textarea class="textarea" id="bNote"></textarea></div>
          <button class="btn btn--primary btn--lg" type="submit" id="saveBtn" disabled>حفظ العملية</button>
        </form>
      </div>
    </div>
  `;

  let device = null, imeiChecked = null;
  const res = document.getElementById("res");
  const saveBtn = document.getElementById("saveBtn");

  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = document.getElementById("imei").value.trim();
    if (!/^\d{14,16}$/.test(v)) { toast("IMEI غير صالح", "warn"); return; }
    res.innerHTML = `<span class="spinner"></span> جاري التحقق...`;
    try {
      const r = await checkIMEI(v);
      if (r.status === "UNREGISTERED" || r.status === "ACTIVE") {
        imeiChecked = v;
        device = r.device || null;
        res.innerHTML = `<div class="banner banner--success"><span>${icon("check")}</span>
          <div><b>الجهاز سليم</b><br><span class="small">يمكنك متابعة عملية البيع.</span></div></div>`;
        saveBtn.disabled = false;
      } else {
        imeiChecked = null; device = null; saveBtn.disabled = true;
        const reason = r.status === "LOST" ? "مفقود" :
                       r.status === "STOLEN" ? "مسروق" :
                       r.status === "BLOCKED" ? "محظور" : "قيد المراجعة";
        res.innerHTML = `<div class="banner banner--danger"><span>${icon("x")}</span>
          <div><b>لا يمكن إكمال البيع — الجهاز ${reason}</b><br>
          <span class="small">اتبع الإجراء الرسمي المعتمد ولا تواجه أي شخص.</span></div></div>`;
        await logAudit("SALE_BLOCKED", { imei: v.slice(0,4)+"****"+v.slice(-4), status: r.status });
      }
    } catch (e) { res.innerHTML = emptyState({ title: "تعذر التحقق", desc: e?.message || "" }); }
  });

  document.getElementById("saleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!imeiChecked) { toast("يجب فحص IMEI أولاً", "warn"); return; }
    const payload = {
      id: newId("SALE"),
      imei: imeiChecked,
      device: device ? { brand: device.brand, model: device.model } : null,
      buyerName: document.getElementById("bName").value.trim(),
      buyerPhone: document.getElementById("bPhone").value.trim(),
      price: Number(document.getElementById("bPrice").value || 0),
      currency: "YER",
      note: document.getElementById("bNote").value.trim(),
      shopId: user?.shopId || null,
      shopName: user?.shopName || null,
      employeeUid: user?.uid || null,
      employeeName: user?.fullName || null,
      districtId: user?.districtId || null,
      districtName: user?.districtName || null,
      status: "COMPLETED"
    };
    try {
      await createOne("sales", payload.id, payload);
      await logAudit("SALE_CREATE", { id: payload.id, imei: imeiChecked.slice(0,4)+"****"+imeiChecked.slice(-4) });
      toast("تم تسجيل عملية البيع", "success");
      setTimeout(() => location.hash = "#/sales", 600);
    } catch (e) { toast("تعذر الحفظ", "danger"); }
  });
}
