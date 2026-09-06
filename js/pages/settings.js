// =================================================================
// pages/settings.js — إعدادات النظام (عرض)
// =================================================================
import { getSession } from "../firebase.js";
import { ROLE_LABELS } from "../permissions.js";

export async function render(main) {
  const user = getSession();
  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title"><h1>إعدادات النظام</h1>
        <span class="page-head__sub">إعدادات اليمن الأساسية</span></div>
    </div>

    <div class="grid grid--2">
      <div class="card">
        <div class="card__head"><h2>الإعدادات الإقليمية</h2></div>
        <dl class="kv">
          <dt>الدولة</dt><dd>الجمهورية اليمنية 🇾🇪</dd>
          <dt>اللغة</dt><dd>العربية</dd>
          <dt>الاتجاه</dt><dd>RTL</dd>
          <dt>العملة</dt><dd>YER — الريال اليمني</dd>
          <dt>المنطقة الزمنية</dt><dd>Asia/Aden</dd>
          <dt>تنسيق التاريخ</dt><dd>DD/MM/YYYY</dd>
          <dt>الوقت</dt><dd>24 ساعة</dd>
        </dl>
      </div>

      <div class="card">
        <div class="card__head"><h2>إعدادات Firebase</h2></div>
        <p class="small muted">يتم قراءة الإعدادات من <span class="kbd">js/firebase.js</span> عند الإقلاع.</p>
        <p class="small">لإعداد المشروع:</p>
        <ol class="small" style="line-height:2">
          <li>أنشئ مشروع Firebase جديد.</li>
          <li>فعّل <b>Authentication → Email/Password + Google</b>.</li>
          <li>أنشئ قاعدة بيانات <b>Firestore</b> في وضع Production.</li>
          <li>انشر قواعد الأمان من ملف <span class="kbd">docs/firestore.rules</span>.</li>
          <li>ضع إعدادات المشروع في <span class="kbd">FIREBASE_CONFIG</span>.</li>
        </ol>
      </div>

      <div class="card">
        <div class="card__head"><h2>حسابك</h2></div>
        <dl class="kv">
          <dt>الاسم</dt><dd>${user?.fullName || "—"}</dd>
          <dt>البريد</dt><dd>${user?.email || "—"}</dd>
          <dt>الدور</dt><dd>${ROLE_LABELS[user?.role] || "—"}</dd>
          <dt>الحالة</dt><dd>${user?.status || "—"}</dd>
          <dt>رئيسي؟</dt><dd>${user?.isMainAccount ? "نعم" : "لا"}</dd>
        </dl>
      </div>

      <div class="card">
        <div class="card__head"><h2>مبدأ المعمارية</h2></div>
        <p class="small">Role + Permission + Organization + Geographic Scope + Data Scope</p>
        <div class="row" style="margin-top:8px">
          <span class="tag">RBAC</span><span class="tag">PBAC</span>
          <span class="tag">Geo Scope</span><span class="tag">Org Scope</span>
          <span class="tag">Audit</span>
        </div>
      </div>
    </div>
  `;
}
