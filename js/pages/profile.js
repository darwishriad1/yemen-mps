// =================================================================
// pages/profile.js — الملف الشخصي
// =================================================================
import { getSession, fmtDateTime, isDemoMode, setDemoMode, clearSession, ensureFirebase } from "../firebase.js";
import { ROLE_LABELS } from "../permissions.js";
import { icon, toast } from "../ui.js";

export async function render(main) {
  const u = getSession();
  if (!u) return;
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>الملف الشخصي</h1>
        <span class="page-head__sub">معلومات حسابك في النظام</span></div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><h2>المعلومات الأساسية</h2></div>
        <dl class="kv">
          <dt>الاسم</dt><dd>${u.fullName||"—"}</dd>
          <dt>البريد</dt><dd>${u.email||"—"}</dd>
          <dt>رقم الهاتف</dt><dd>${u.phone||"—"}</dd>
          <dt>الدور</dt><dd>${ROLE_LABELS[u.role]||u.role||"—"}</dd>
          <dt>الحالة</dt><dd>${u.status||"—"}</dd>
          <dt>حساب رئيسي؟</dt><dd>${u.isMainAccount ? "نعم" : "لا"}</dd>
        </dl>
      </div>

      <div class="card">
        <div class="card__head"><h2>النطاق الجغرافي</h2></div>
        <dl class="kv">
          <dt>المحافظة</dt><dd>${u.governorateName||"—"}</dd>
          <dt>المديرية</dt><dd>${u.districtName||"—"}</dd>
          <dt>قسم الشرطة</dt><dd>${u.policeStationName||"—"}</dd>
          <dt>المحل</dt><dd>${u.shopName||"—"}</dd>
        </dl>
      </div>

      <div class="card">
        <div class="card__head"><h2>الجلسة</h2></div>
        <dl class="kv">
          <dt>آخر دخول</dt><dd>${fmtDateTime(u.lastLoginAt)}</dd>
          <dt>تاريخ الإنشاء</dt><dd>${fmtDateTime(u.createdAt)}</dd>
          <dt>تغيير كلمة المرور</dt><dd>${u.mustChangePassword ? "مطلوب" : "لا"}</dd>
        </dl>
        <div class="row" style="margin-top:12px">
          <button class="btn btn--danger" id="logoutBtn">${icon("logout")} تسجيل الخروج</button>
        </div>
      </div>

      <div class="card">
        <div class="card__head"><h2>إجراءات سريعة</h2></div>
        <div class="row">
          <a class="btn btn--gold" href="#/imei">${icon("search")} فحص IMEI</a>
          <a class="btn btn--primary" href="#/alerts">${icon("bell")} التنبيهات</a>
          <a class="btn btn--ghost" href="#/audit">${icon("shield")} سجل التدقيق</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      if (isDemoMode()) {
        setDemoMode(false); clearSession();
        location.hash = "#/login";
        return;
      }
      await ensureFirebase();
      const { getAuth: ga, signOut } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
      await signOut(ga());
      location.hash = "#/login";
    }
    catch (e) { toast("تعذر تسجيل الخروج", "danger"); }
  });
}
