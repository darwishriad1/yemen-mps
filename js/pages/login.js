// =================================================================
// pages/login.js
// =================================================================
import { signInWithEmail, signInWithGoogle, resetPassword } from "../auth.js";
import { watchAuth, getSession, isFirebaseConfigured } from "../firebase.js";
import { toast, icon, openModal, closeModal } from "../ui.js";
import { go } from "../router.js";
import { ROLE_LABELS } from "../permissions.js";

export async function render(main) {
  // إذا كان في جلسة بالفعل، انتقل للرئيسية
  if (getSession()) { go("/dashboard"); return; }

  main.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-illu"></div>
        <div class="auth-card__brand">
          <div class="brand__mark">${icon("shield").replace('width="18" height="18"', 'width="40" height="40"')}</div>
          <h1>نظام حماية وتتبع الهواتف</h1>
          <p>الجمهورية اليمنية — تسجيل الدخول إلى المنظومة</p>
        </div>

        <form id="loginForm" autocomplete="on" novalidate>
          <div class="field">
            <label class="field__label" for="email">البريد الإلكتروني</label>
            <input class="input input--lg" type="email" id="email" name="email" required placeholder="name@example.com" />
          </div>
          <div class="field">
            <label class="field__label" for="password">كلمة المرور</label>
            <input class="input input--lg" type="password" id="password" name="password" required placeholder="••••••••" minlength="6" />
          </div>
          <button class="btn btn--primary btn--lg btn--block" type="submit" id="loginBtn">
            <span class="label">تسجيل الدخول</span>
          </button>
        </form>

        <div class="auth-divider">أو</div>

        <button class="btn btn--ghost btn--block" id="googleBtn" type="button">
          <svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.4 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          الدخول عبر Google
        </button>

        <div class="row" style="justify-content:space-between; margin-top: 8px;">
          <button class="btn btn--ghost btn--sm" id="forgotBtn" type="button">نسيت كلمة المرور؟</button>
        </div>

        <p class="auth-note">
          <b>تنبيه:</b> الدخول عبر Google لا يمنح أي صلاحيات إدارية تلقائياً.
          يتم التحقق من ملف المستخدم في <span class="kbd">users/&#123;uid&#125;</span> وحالته ودوره.
          إن لم يكن الحساب معتمداً سيتم رفض الدخول.
        </p>

        ${!isFirebaseConfigured() ? `
          <div class="notice" style="margin-top:14px">
            <span>${icon("warn")}</span>
            <div>
              <b>Firebase غير مُهيأ.</b>
              افتح <span class="kbd">js/firebase.js</span> واملأ إعدادات مشروعك (apiKey, projectId, ...).
              حتى ذلك الحين، تسجيل الدخول لن يعمل وستظهر رسائل توضيحية.
            </div>
          </div>` : ""}
      </div>
    </div>
  `;

  // تفاعل النموذج
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    if (!email || !password) { toast("أدخل البريد وكلمة المرور", "warn"); return; }
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> &nbsp; جاري التحقق...`;
    try {
      await signInWithEmail(email, password);
      // onAuthStateChanged سيتولى الباقي
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      const msg = ({
        "auth/invalid-credential": "بيانات الدخول غير صحيحة.",
        "auth/user-not-found":    "المستخدم غير موجود.",
        "auth/wrong-password":    "كلمة المرور غير صحيحة.",
        "auth/too-many-requests":  "محاولات كثيرة، حاول لاحقاً.",
        "auth/invalid-email":      "البريد الإلكتروني غير صالح.",
        "FIREBASE_NOT_CONFIGURED": "يرجى ضبط إعدادات Firebase أولاً."
      })[code] || "تعذر إكمال تسجيل الدخول. حاول مرة أخرى.";
      toast(msg, "danger", { title: "فشل الدخول" });
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span class="label">تسجيل الدخول</span>`;
    }
  });

  document.getElementById("googleBtn").addEventListener("click", async () => {
    try { await signInWithGoogle(); }
    catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user") return;
      toast("تعذر إكمال الدخول عبر Google.", "danger");
    }
  });

  document.getElementById("forgotBtn").addEventListener("click", () => {
    openModal({
      title: "إعادة تعيين كلمة المرور",
      body: `
        <div class="field">
          <label class="field__label">البريد الإلكتروني</label>
          <input class="input" id="resetEmail" type="email" placeholder="name@example.com" />
        </div>
        <p class="small muted" style="margin-top:8px">سيتم إرسال رابط إعادة التعيين إلى بريدك.</p>
      `,
      confirmText: "إرسال الرابط",
      onConfirm: async () => {
        const em = document.getElementById("resetEmail").value.trim();
        if (!em) { toast("أدخل البريد الإلكتروني", "warn"); return false; }
        try { await resetPassword(em); toast("تم إرسال رابط إعادة التعيين", "success"); }
        catch (e) { toast("تعذر إرسال الرابط، تحقق من البريد.", "danger"); return false; }
      }
    });
  });

  // إذا تم تسجيل الدخول بالفعل
  watchAuth((u) => { if (u) go("/dashboard"); });
}
