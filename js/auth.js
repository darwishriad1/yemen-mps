// =================================================================
// auth.js — Authentication: Email/Password + Google SSO + Demo Mode
// =================================================================
import { ensureFirebase, isFirebaseConfigured,
         signInWithEmailAndPassword, signInWithPopup,
         sendPasswordResetEmail, logAudit,
         setDemoMode, demoUserFor, setSession, clearSession, listDemoUsers }
  from "./firebase.js";
import { toast } from "./ui.js";
import { ROLE_LABELS } from "./permissions.js";
import { go } from "./router.js";

export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured()) {
    toast("يرجى ضبط إعدادات Firebase في js/firebase.js أولاً.", "warn", { title: "Firebase غير مُهيأ" });
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const cred = await signInWithEmailAndPassword(await getAuthRef(), email, password);
  await logAudit("AUTH_LOGIN", { method: "email" });
  return cred.user;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    toast("يرجى ضبط إعدادات Firebase في js/firebase.js أولاً.", "warn", { title: "Firebase غير مُهيأ" });
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }
  const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(getAuth(), provider);
  await logAudit("AUTH_LOGIN", { method: "google" });
  return cred.user;
}

export async function resetPassword(email) {
  if (!email) throw new Error("EMPTY_EMAIL");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  await sendPasswordResetEmail(getAuth(), email);
}

export async function signOut() {
  const { isDemoMode, setDemoMode } = await import("./firebase.js");
  if (isDemoMode()) {
    setDemoMode(false);
    clearSession();
    toast("تم الخروج من الوضع التجريبي", "success");
    location.hash = "#/login";
    return;
  }
  const { getAuth, signOut: fbSignOut } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
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

async function getAuthRef() {
  await ensureFirebase();
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  return getAuth();
}
