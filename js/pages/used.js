// =================================================================
// pages/used.js — شراء جهاز مستعمل
// =================================================================
import { getSession, checkIMEI, createOne, logAudit, newId, fmtYER } from "../firebase.js";
import { icon, toast, emptyState, openModal } from "../ui.js";

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>شراء جهاز مستعمل</h1>
        <span class="page-head__sub">ابدأ بفحص IMEI — يمنع إكمال العملية في حالات: مفقود، مسروق، محظور</span></div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><h2>${icon("search")} 1) فحص الجهاز</h2></div>
        <form id="f" class="row" style="gap:8px">
          <input class="input input--imei" id="imei" maxlength="17" placeholder="356938035643809" required />
          <button class="btn btn--gold" type="submit">فحص</button>
        </form>
        <div id="res" style="margin-top:12px"></div>
      </div>

      <div class="card">
        <div class="card__head"><h2>${icon("cart")} 2) بيانات الشراء</h2></div>
        <form id="buyForm" class="grid" style="gap:10px">
          <div class="field"><label class="field__label">اسم البائع</label><input class="input" id="sName" required /></div>
          <div class="field"><label class="field__label">رقم الهوية/الهاتف</label><input class="input" id="sId" /></div>
          <div class="field"><label class="field__label">الشركة</label><input class="input" id="dBrand" /></div>
          <div class="field"><label class="field__label">الموديل</label><input class="input" id="dModel" /></div>
          <div class="field"><label class="field__label">سعر الشراء (ر.ي)</label><input class="input" id="bPrice" type="number" min="0" required /></div>
          <button class="btn btn--primary btn--lg" type="submit" id="saveBtn" disabled>تسجيل الشراء</button>
        </form>
      </div>
    </div>
  `;

  let imeiChecked = null;
  const res = document.getElementById("res");
  const saveBtn = document.getElementById("saveBtn");

  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = document.getElementById("imei").value.trim();
    if (!/^\d{14,16}$/.test(v)) { toast("IMEI غير صالح", "warn"); return; }
    res.innerHTML = `<span class="spinner"></span> جاري التحقق...`;
    try {
      const r = await checkIMEI(v);
      const blocked = ["LOST","STOLEN","BLOCKED"].includes(r.status);
      if (!blocked) {
        imeiChecked = v;
        res.innerHTML = `<div class="banner banner--success"><span>${icon("check")}</span>
          <div><b>الجهاز مقبول للشراء</b><br><span class="small">حالته: ${r.status}. أكمل البيانات.</span></div></div>`;
        saveBtn.disabled = false;
      } else {
        imeiChecked = null; saveBtn.disabled = true;
        res.innerHTML = `<div class="banner banner--danger"><span>${icon("x")}</span>
          <div><b>ممنوع إكمال عملية الشراء</b><br>
          <span class="small">الجهاز بحالة (${r.status}). اتبع الإجراء الرسمي وأبلغ قسم الشرطة.</span></div></div>`;
        await logAudit("USED_PURCHASE_BLOCKED", { imei: v.slice(0,4)+"****"+v.slice(-4), status: r.status });
      }
    } catch (e) { res.innerHTML = emptyState({ title: "تعذر التحقق", desc: e?.message || "" }); }
  });

  document.getElementById("buyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!imeiChecked) { toast("يجب فحص IMEI أولاً", "warn"); return; }
    const payload = {
      id: newId("USED"),
      imei: imeiChecked,
      sellerName: document.getElementById("sName").value.trim(),
      sellerId: document.getElementById("sId").value.trim(),
      brand: document.getElementById("dBrand").value.trim(),
      model: document.getElementById("dModel").value.trim(),
      price: Number(document.getElementById("bPrice").value || 0),
      currency: "YER",
      shopId: user?.shopId || null,
      shopName: user?.shopName || null,
      employeeUid: user?.uid || null,
      employeeName: user?.fullName || null,
      status: "COMPLETED"
    };
    try {
      await createOne("usedPhonePurchases", payload.id, payload);
      await logAudit("USED_PURCHASE_CREATE", { id: payload.id, imei: imeiChecked.slice(0,4)+"****"+imeiChecked.slice(-4) });
      toast("تم تسجيل الشراء", "success");
      setTimeout(() => location.hash = "#/shop-panel", 500);
    } catch (e) { toast("تعذر الحفظ", "danger"); }
  });
}
