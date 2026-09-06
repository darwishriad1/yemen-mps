// =================================================================
// auth.js — Authentication: Email/Password + Google SSO + Demo Mode
// =================================================================
import { ensureFirebase, isFirebaseConfigured,
         fbSignInWithEmailAndPassword, fbSignInWithPopup, fbSendPasswordResetEmail,
         logAudit, getAuth,
         setDemoMode, demoUserFor, setSession, clearSession, listDemoUsers, isDemoMode }
  from "./firebase.js";
import { toast } from "./ui.js";
import { ROLE_LABELS } from "./permissions.js";
import { go } from "./router.js";

export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured()) {
    toast("يرجى ضبط إعدادات Firebase في js/firebase.js أولاً.", "warn", { title: "Firebase غير مُهيأ" });
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  await ensureFirebase();
  const cred = await fbSignInWithEmailAndPassword(getAuth(), email, password);
  await logAudit("AUTH_LOGIN", { method: "email" });
  return cred.user;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    toast("يرجى ضبط إعدادات Firebase في js/firebase.js أولاً.", "warn", { title: "Firebase غير مُهيأ" });
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  await ensureFirebase();
  const cred = await fbSignInWithPopup(getAuth());
  await logAudit("AUTH_LOGIN", { method: "google" });
  return cred.user;
}

export async function resetPassword(email) {
  if (!email) throw new Error("EMPTY_EMAIL");
  await ensureFirebase();
  await fbSendPasswordResetEmail(getAuth(), email);
}

export async function signOut() {
  if (isDemoMode()) {
    setDemoMode(false);
    clearSession();
    toast("تم الخروج من الوضع التجريبي", "success");
    location.hash = "#/login";
    return;
  }
  await ensureFirebase();
  const { signOut: fbSignOut } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  await logAudit("AUTH_LOGOUT");
  await fbSignOut(getAuth());
  location.hash = "#/login";
}

// دخول تجريبي — يحاكي جلسة Firebase بمستخدم وهمي
export async function enterDemo(role) {
  const u = demoUserFor(role);
  if (!u) throw new Error("Unknown demo role: " + role);
  setDemoMode(true);
  setSession(u);
  await logAudit("DEMO_LOGIN", { role });
  return u;
}

export function availableDemoRoles() {
  return listDemoUsers();
}
