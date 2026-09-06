// =================================================================
// auth.js — Authentication: Email/Password + Google SSO
// =================================================================
import { ensureFirebase, isFirebaseConfigured,
         signInWithEmailAndPassword, signInWithPopup,
         sendPasswordResetEmail, logAudit }
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
  const { getAuth, signOut: fbSignOut } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  await logAudit("AUTH_LOGOUT");
  await fbSignOut(getAuth());
  location.hash = "#/login";
}

async function getAuthRef() {
  await ensureFirebase();
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  return getAuth();
}
