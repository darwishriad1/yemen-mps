// =================================================================
// firebase.js — Firebase v10 modular SDK
// يحوي طبقة الوصول للبيانات + إدارة المصادقة + أدوات مساعدة
// لا يوجد أي بيانات Mock داخل الواجهة؛ عند عدم وجود بيانات تظهر
// Empty States حقيقية فقط.
// =================================================================

// ---------- إعدادات Firebase ----------
// ضع إعدادات مشروعك هنا قبل النشر.
// الإعدادات الحالية قيم صفرية آمنة (لن تعمل المصادقة حتى تملأها).
export const FIREBASE_CONFIG = {
  apiKey: "",            // مثال: "AIza...."
  authDomain: "",        // مثال: "yemen-mps.firebaseapp.com"
  projectId: "",         // مثال: "yemen-mps"
  storageBucket: "",     // مثال: "yemen-mps.appspot.com"
  messagingSenderId: "",
  appId: ""
};

const isConfigured = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

// ---------- تحميل ديناميكي للـ SDK ----------
let app = null, auth = null, db = null, googleProvider = null;
let sdkLoading = null;

async function loadSDK() {
  if (sdkLoading) return sdkLoading;
  sdkLoading = (async () => {
    if (!isConfigured) {
      throw new Error("FIREBASE_NOT_CONFIGURED");
    }
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js")
    ]);
    app = initializeApp(FIREBASE_CONFIG);
    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);
    googleProvider = new authMod.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    return { app, auth, db, authMod, fsMod };
  })();
  return sdkLoading;
}

export async function ensureFirebase() {
  try { return await loadSDK(); }
  catch (e) {
    if (e.message === "FIREBASE_NOT_CONFIGURED") {
      throw new Error("إعدادات Firebase غير مكتملة. افتح js/firebase.js وضع إعدادات مشروعك.");
    }
    throw e;
  }
}

export function getDb()  { return db; }
export function getAuth(){ return auth; }
export const isFirebaseConfigured = () => isConfigured;

// =================================================================
//  Auth helpers
// =================================================================
import { onAuthStateChanged, signOut as fbSignOut,
         signInWithEmailAndPassword, signInWithPopup,
         createUserWithEmailAndPassword, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp,
         collection, query, where, getDocs, addDoc, orderBy, limit,
         startAt, endAt, onSnapshot, writeBatch, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export {
  onAuthStateChanged, fbSignOut, signInWithEmailAndPassword, signInWithPopup,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs, addDoc, orderBy, limit,
  startAt, endAt, onSnapshot, writeBatch, runTransaction
};

// =================================================================
//  Session — مصادقة + ملف المستخدم
// =================================================================
const SESSION_KEY = "yemen_mps_session";

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
export function setSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// جلب ملف المستخدم من users/{uid}
export async function fetchUserProfile(uid) {
  await ensureFirebase();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// عند تغيير حالة المصادقة في Firebase
export function watchAuth(cb) {
  // ensure SDK is loaded then attach
  ensureFirebase()
    .then(() => onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { clearSession(); cb(null); return; }
      let profile = null;
      try { profile = await fetchUserProfile(fbUser.uid); }
      catch (e) { console.error(e); }
      if (!profile) { clearSession(); cb(null); return; }
      if (profile.status !== "ACTIVE") { clearSession(); cb(null); return; }
      setSession({ uid: fbUser.uid, email: fbUser.email, ...profile });
      cb({ uid: fbUser.uid, email: fbUser.email, ...profile });
    }))
    .catch((e) => { console.warn("Firebase unavailable:", e.message); cb(null); });
}

// =================================================================
//  فحص IMEI — البحث في devices/{imei}
// =================================================================
export async function checkIMEI(rawImei) {
  const imei = String(rawImei || "").trim();
  if (!imei) return { status: "EMPTY" };
  await ensureFirebase();
  // البحث المباشر بالمعرّف (document id = IMEI)
  const snap = await getDoc(doc(db, "devices", imei));
  if (!snap.exists()) {
    // مسح بواسطة IMEI1 أو IMEI2 في حال كانت الوثيقة مُعرّفها UUID
    const q1 = query(collection(db, "devices"), where("imei1", "==", imei), limit(1));
    const q2 = query(collection(db, "devices"), where("imei2", "==", imei), limit(1));
    const [r1, r2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const hit = !r1.empty ? r1.docs[0] : (!r2.empty ? r2.docs[0] : null);
    if (!hit) return { status: "UNREGISTERED", imei };
    return { status: hit.data().status || "ACTIVE", device: { id: hit.id, ...hit.data() }, imei };
  }
  return { status: snap.data().status || "ACTIVE", device: { id: snap.id, ...snap.data() }, imei };
}

// =================================================================
//  Audit log — تسجيل عملية
// =================================================================
export async function logAudit(action, payload = {}) {
  try {
    await ensureFirebase();
    const session = getSession();
    await addDoc(collection(db, "auditLogs"), {
      action, payload,
      actorUid: session?.uid || null,
      actorName: session?.fullName || null,
      actorRole: session?.role || null,
      ip: null, ua: navigator.userAgent,
      createdAt: serverTimestamp()
    });
  } catch (e) { console.warn("audit log failed", e); }
}

// =================================================================
//  Generic helpers
// =================================================================
export async function listCollection(name, { where: w = [], order, lim } = {}) {
  await ensureFirebase();
  let q = collection(db, name);
  const filters = [];
  if (w && w.length) filters.push(...w);
  if (order) filters.push(order(order.field, order.dir || "asc"));
  if (lim) filters.push(limit(lim));
  if (filters.length) q = query(q, ...filters);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getOne(name, id) {
  await ensureFirebase();
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createOne(name, id, data) {
  await ensureFirebase();
  const ref = id ? doc(db, name, id) : doc(collection(db, name));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateOne(name, id, data) {
  await ensureFirebase();
  await updateDoc(doc(db, name, id), { ...data, updatedAt: serverTimestamp() });
}

export function newId(prefix = "id") {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}_${r}`;
}

// قناع IMEI لأغراض الخصوصية: ***********1234
export function maskImei(imei = "") {
  const s = String(imei);
  if (s.length <= 4) return s;
  return "*".repeat(s.length - 4) + s.slice(-4);
}

// تنسيق العملة
export function fmtYER(n) {
  const v = Number(n || 0);
  return v.toLocaleString("ar-YE") + " ر.ي";
}

// تنسيق التاريخ DD/MM/YYYY
export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  if (isNaN(d.getTime())) return "—";
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

export function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  if (isNaN(d.getTime())) return "—";
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
