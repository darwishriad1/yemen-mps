// =================================================================
// pages/login.js — إعادة تصميم احترافية مع شاشة Demo Mode بارزة
// =================================================================
import { signInWithEmail, signInWithGoogle, resetPassword, enterDemo, availableDemoRoles } from "../auth.js";
import { watchAuth, getSession, isFirebaseConfigured } from "../firebase.js";
import { toast, icon, openModal, closeModal } from "../ui.js";
import { go } from "../router.js";
import { ROLE_LABELS } from "../permissions.js";

// إعدادات بصرية لكل دور (أيقونة + لون)
const ROLE_VISUALS = {
  MINISTRY_ADMIN:       { icon: "🏛️", color: "#d4af37", accent: "حساب رئيسي" },
  CENTRAL_ADMIN:        { icon: "🛡️", color: "#3b82f6", accent: "إدارة مركزية" },
  DISTRICT_ADMIN:       { icon: "📍", color: "#06b6d4", accent: "إدارة محلية" },
  POLICE_ADMIN:         { icon: "🚓", color: "#dc2626", accent: "مسؤول قسم" },
  POLICE_OFFICER:       { icon: "👮", color: "#ef4444", accent: "رجل شرطة" },
  SHOP_OWNER:           { icon: "🏪", color: "#16a34a", accent: "مالك محل" },
  SHOP_EMPLOYEE:        { icon: "🧑‍💼", color: "#22c55e", accent: "موظف محل" }
};

let view = "main"; // main | demo-picker

export async function render(main) {
  // إذا كان في جلسة بالفعل، انتقل للرئيسية
  if (getSession()) { go("/dashboard"); return; }

  main.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-stage" id="authStage">
        ${renderMainView()}
      </div>
    </div>
  `;

  setupHandlers();
  watchAuth((u) => { if (u) go("/dashboard"); });
}

function renderMainView() {
  return `
    <div class="auth-card auth-card--main">
      <div class="auth-illu"></div>

      <div class="auth-card__brand">
        <div class="brand__mark auth-brand-mark">
          <svg viewBox="0 0 32 32" width="44" height="44"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M11 8h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="none" stroke="#0a1f44" stroke-width="1.5"/><circle cx="16" cy="22" r="0.8" fill="#0a1f44"/></svg>
        </div>
        <h1>نظام حماية وتتبع الهواتف</h1>
        <p>الجمهورية اليمنية — اختر طريقة الدخول</p>
      </div>

      <!-- بطاقة الدخول التجريبي — بارزة -->
      <div class="demo-banner" id="demoBannerBtn" role="button" tabindex="0">
        <div class="demo-banner__glow"></div>
        <div class="demo-banner__icon">🚀</div>
        <div class="demo-banner__body">
          <div class="demo-banner__title">دخول تجريبي فوري</div>
          <div class="demo-banner__sub">استكشف النظام كاملاً بدون إعدادات — اختر دورك وابدأ</div>
        </div>
        <div class="demo-banner__arrow">←</div>
      </div>

      <div class="auth-divider"><span>أو سجّل دخولك</span></div>

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

      <button class="btn btn--ghost btn--block" id="googleBtn" type="button" style="margin-top:8px">
        <svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.4 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
          الدخول عبر Google
      </button>

      <div class="row" style="justify-content:space-between; margin-top:10px;">
        <button class="btn btn--ghost btn--sm" id="forgotBtn" type="button">نسيت كلمة المرور؟</button>
      </div>

      <p class="auth-note">
        <b>تنبيه:</b> الدخول عبر Google لا يمنح أي صلاحيات إدارية تلقائياً.
        يتم التحقق من ملف المستخدم في <span class="kbd">users/&#123;uid&#125;</span> وحالته ودوره.
      </p>

      ${!isFirebaseConfigured() ? `
        <div class="notice" style="margin-top:14px">
          <span>${icon("warn")}</span>
          <div>
            <b>Firebase غير مُهيأ.</b>
            استخدم <b>الدخول التجريبي</b> لاستكشاف الواجهة مباشرة.
          </div>
        </div>` : ""}
    </div>
  `;
}

function renderDemoPicker() {
  const demoUsers = availableDemoRoles();
  // تجميع حسب الفئة
  const groups = [
    { title: "الإدارة المركزية", roles: ["MINISTRY_ADMIN", "CENTRAL_ADMIN", "DISTRICT_ADMIN"] },
    { title: "الشرطة",          roles: ["POLICE_ADMIN", "POLICE_OFFICER"] },
    { title: "المحلات",         roles: ["SHOP_OWNER", "SHOP_EMPLOYEE"] }
  ];

  return `
    <div class="auth-card auth-card--demo">
      <div class="auth-illu"></div>

      <button class="auth-back-btn" id="backToMain">
        <span>→</span> العودة لتسجيل الدخول
      </button>

      <div class="auth-card__brand" style="margin-bottom:20px">
        <div class="demo-picker-icon">🚀</div>
        <h1>اختر دورك للتجربة</h1>
        <p>كل دور له صلاحيات ولوحة مختلفة — جرّب أكثر من دور</p>
      </div>

      ${groups.map(g => `
        <div class="demo-group">
          <div class="demo-group__title">
            <span class="dot"></span> ${g.title}
          </div>
          <div class="demo-grid">
            ${g.roles.map(key => {
              const u = demoUsers.find(x => x.key === key);
              if (!u) return "";
              const v = ROLE_VISUALS[key] || { icon: "👤", color: "#999", accent: "" };
              return `
                <button class="demo-card" data-role="${key}" style="--accent:${v.color}">
                  <div class="demo-card__icon" style="background:${v.color}22; color:${v.color}">${v.icon}</div>
                  <div class="demo-card__body">
                    <div class="demo-card__name">${u.fullName}</div>
                    <div class="demo-card__role">${ROLE_LABELS[u.role] || u.role}</div>
                    <div class="demo-card__meta">📍 ${u.governorateName} — ${u.districtName}</div>
                    ${u.isMainAccount ? `<div class="demo-card__badge">⭐ ${v.accent}</div>` : `<div class="demo-card__hint">${v.accent}</div>`}
                  </div>
                  <div class="demo-card__arrow" style="color:${v.color}">→</div>
                </button>`;
            }).join("")}
          </div>
        </div>
      `).join("")}

      <div class="demo-note">
        <span>${icon("warn")}</span>
        <div>
          البيانات وهمية وتُحفظ في الذاكرة فقط. ستختفي تلقائياً عند إعادة تحميل الصفحة.
          لا يتم إرسال أي بيانات لخادم خارجي.
        </div>
      </div>
    </div>
  `;
}

function setupHandlers() {
  const stage = document.getElementById("authStage");

  // الدخول للـ Demo Picker
  const demoBannerBtn = document.getElementById("demoBannerBtn");
  if (demoBannerBtn) {
    demoBannerBtn.addEventListener("click", () => showDemoPicker());
    demoBannerBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showDemoPicker(); }
    });
  }

  // الرجوع للـ Main
  document.getElementById("backToMain")?.addEventListener("click", showMain);

  // اختيار دور تجريبي
  document.querySelectorAll(".demo-card[data-role]").forEach(card => {
    card.addEventListener("click", async () => {
      const role = card.dataset.role;
      card.classList.add("is-loading");
      card.disabled = true;
      try {
        await enterDemo(role);
        toast(`تم الدخول التجريبي — ${ROLE_LABELS[role] || role}`, "success", { title: "🚀 وضع تجريبي", timeout: 4000 });
        setTimeout(() => go("/dashboard"), 300);
      } catch (e) {
        console.error(e);
        toast("تعذر الدخول التجريبي", "danger");
        card.classList.remove("is-loading");
        card.disabled = false;
      }
    });
  });

  // نموذج تسجيل الدخول
  const form = document.getElementById("loginForm");
  if (form) {
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
      } catch (err) {
        console.error(err);
        const code = err?.code || "";
        const msg = ({
          "auth/invalid-credential": "بيانات الدخول غير صحيحة.",
          "auth/user-not-found":    "المستخدم غير موجود.",
          "auth/wrong-password":    "كلمة المرور غير صحيحة.",
          "auth/too-many-requests":  "محاولات كثيرة، حاول لاحقاً.",
          "auth/invalid-email":      "البريد الإلكتروني غير صالح.",
          "FIREBASE_NOT_CONFIGURED": "يرجى ضبط إعدادات Firebase أو استخدم الدخول التجريبي."
        })[code] || "تعذر إكمال تسجيل الدخول.";
        toast(msg, "danger", { title: "فشل الدخول" });
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="label">تسجيل الدخول</span>`;
      }
    });
  }

  // دخول Google
  document.getElementById("googleBtn")?.addEventListener("click", async () => {
    try { await signInWithGoogle(); }
    catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user") return;
      toast("تعذر إكمال الدخول عبر Google.", "danger");
    }
  });

  // نسيت كلمة المرور
  document.getElementById("forgotBtn")?.addEventListener("click", () => {
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
}

function showDemoPicker() {
  const stage = document.getElementById("authStage");
  stage.style.opacity = "0";
  stage.style.transform = "translateY(-12px)";
  setTimeout(() => {
    stage.innerHTML = renderDemoPicker();
    stage.style.opacity = "";
    stage.style.transform = "";
    // أعد تركيب المعالجات
    setupHandlers();
  }, 180);
}

function showMain() {
  const stage = document.getElementById("authStage");
  stage.style.opacity = "0";
  stage.style.transform = "translateY(12px)";
  setTimeout(() => {
    stage.innerHTML = renderMainView();
    stage.style.opacity = "";
    stage.style.transform = "";
    setupHandlers();
  }, 180);
}
