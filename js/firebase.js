// =================================================================
// firebase.js — Firebase v10 modular SDK + Demo Mode
// يحوي طبقة الوصول للبيانات + إدارة المصادقة + أدوات مساعدة
// يدعم وضعين:
//   1) Firebase حقيقي — عند ضبط FIREBASE_CONFIG
//   2) Demo Mode      — دخول تجريبي بذاكرة محلية (يختفي عند reload)
// =================================================================

// ---------- إعدادات Firebase ----------
// ضع إعدادات مشروعك هنا قبل النشر.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
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
  // Demo Mode: إذا كان في جلسة تجريبية محفوظة، استخدمها
  if (isDemoMode()) {
    const s = getSession();
    cb(s || null);
    return;
  }
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
  if (isDemoMode()) return demoCheckIMEI(imei);
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
  if (isDemoMode()) {
    demoLogAudit(action, payload);
    return;
  }
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
export async function listCollection(name, opts = {}) {
  if (isDemoMode()) {
    let list = demoList(name);
    // تطبيق where (يدعم === فقط)
    if (opts.where && Array.isArray(opts.where)) {
      for (const w of opts.where) {
        const field = w.field;
        const value = w.value;
        const op = w.op || "==";
        list = list.filter(item => {
          if (op === "==") return item[field] === value;
          if (op === "!=") return item[field] !== value;
          return true;
        });
      }
    }
    // order
    if (opts.order) {
      const { field, dir = "asc" } = opts.order;
      list.sort((a, b) => {
        const av = a[field], bv = b[field];
        const at = av?.toDate ? av.toDate().getTime() : (av instanceof Date ? av.getTime() : av);
        const bt = bv?.toDate ? bv.toDate().getTime() : (bv instanceof Date ? bv.getTime() : bv);
        if (at == null) return 1; if (bt == null) return -1;
        return dir === "desc" ? (bt - at) : (at - bt);
      });
    }
    // limit
    if (opts.lim) list = list.slice(0, opts.lim);
    return list;
  }
  await ensureFirebase();
  let q = collection(db, name);
  const filters = [];
  if (opts.where && opts.where.length) filters.push(...opts.where);
  if (opts.order) filters.push(order(opts.order.field, opts.order.dir || "asc"));
  if (opts.lim) filters.push(limit(opts.lim));
  if (filters.length) q = query(q, ...filters);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getOne(name, id) {
  if (isDemoMode()) {
    const list = demoList(name);
    return list.find(x => x.id === id) || null;
  }
  await ensureFirebase();
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createOne(name, id, data) {
  if (isDemoMode()) return demoCreate(name, id, data);
  await ensureFirebase();
  const ref = id ? doc(db, name, id) : doc(collection(db, name));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateOne(name, id, data) {
  if (isDemoMode()) return demoUpdate(name, id, data);
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

// =================================================================
//  DEMO MODE — دخول تجريبي بذاكرة محلية
//  البيانات وهمية وتختفي عند reload — للتجربة فقط
// =================================================================
const DEMO_KEY = "yemen_mps_demo_active";

export function isDemoMode() {
  return sessionStorage.getItem(DEMO_KEY) === "1";
}
export function setDemoMode(active) {
  if (active) sessionStorage.setItem(DEMO_KEY, "1");
  else sessionStorage.removeItem(DEMO_KEY);
}

// مستخدمين تجريبيين
const DEMO_USERS = {
  MINISTRY_ADMIN: {
    uid: "demo_min_001",
    fullName: "أحمد المخلافي",
    email: "admin@yemen-mps.demo",
    phone: "+967771111111",
    role: "MINISTRY_ADMIN",
    isMainAccount: true,
    status: "ACTIVE",
    permissions: [],
    governorateName: "أمانة العاصمة",
    districtName: "المركز",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-01-15")
  },
  CENTRAL_ADMIN: {
    uid: "demo_central_001",
    fullName: "سالم العولقي",
    email: "central@yemen-mps.demo",
    phone: "+967772222222",
    role: "CENTRAL_ADMIN",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "عدن",
    districtName: "خور مكسر",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-02-01")
  },
  DISTRICT_ADMIN: {
    uid: "demo_dist_001",
    fullName: "محمد الحضرمي",
    email: "district@yemen-mps.demo",
    phone: "+967773333333",
    role: "DISTRICT_ADMIN",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "تعز",
    districtName: "المظفر",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-02-10")
  },
  POLICE_ADMIN: {
    uid: "demo_pol_001",
    fullName: "العقيد ناصر الذماري",
    email: "police.admin@yemen-mps.demo",
    phone: "+967774444444",
    role: "POLICE_ADMIN",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "أمانة العاصمة",
    districtName: "السبعين",
    policeStationName: "قسم شرطة السبعين",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-02-15")
  },
  POLICE_OFFICER: {
    uid: "demo_pol_002",
    fullName: "المساعد فؤاد الصبري",
    email: "officer@yemen-mps.demo",
    phone: "+967775555555",
    role: "POLICE_OFFICER",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "عدن",
    districtName: "كريتر",
    policeStationName: "قسم شرطة كريتر",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-03-01")
  },
  SHOP_OWNER: {
    uid: "demo_shop_001",
    fullName: "عبدالله السماني",
    email: "shop.owner@yemen-mps.demo",
    phone: "+967776666666",
    role: "SHOP_OWNER",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "تعز",
    districtName: "المظفر",
    policeStationName: "قسم شرطة المظفر",
    shopId: "shop_001",
    shopName: "محل السماني للاتصالات",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-03-10")
  },
  SHOP_EMPLOYEE: {
    uid: "demo_shop_002",
    fullName: "ياسر الأهدل",
    email: "shop.emp@yemen-mps.demo",
    phone: "+967777777777",
    role: "SHOP_EMPLOYEE",
    isMainAccount: false,
    status: "ACTIVE",
    permissions: [],
    governorateName: "تعز",
    districtName: "المظفر",
    policeStationName: "قسم شرطة المظفر",
    shopId: "shop_001",
    shopName: "محل السماني للاتصالات",
    lastLoginAt: new Date(),
    createdAt: new Date("2026-03-15")
  }
};

export function demoUserFor(role) {
  return DEMO_USERS[role] ? { ...DEMO_USERS[role] } : null;
}
export function listDemoUsers() {
  return Object.entries(DEMO_USERS).map(([k, u]) => ({ key: k, ...u }));
}

// متجر بيانات تجريبي (in-memory) — مشترك بين كل الوحدات
const _store = {
  devices: new Map(),
  sales: [],
  used: [],
  reports: [],
  shops: [],
  users: [],
  alerts: [],
  audit: []
};

// توليد بيانات تجريبية عند الطلب
function seedDemoData() {
  if (_store.devices.size > 0) return;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const ts = (d) => new Date(now - d * day);
  const ts2 = (d) => d * 1000;

  // أجهزة بحالات مختلفة
  const devices = [
    { imei1: "356938035643809", imei2: "356938035643817", brand: "Samsung", model: "Galaxy A14", deviceType: "PHONE", status: "ACTIVE", registeredAt: ts(60) },
    { imei1: "356938035643825", imei2: "356938035643833", brand: "Apple", model: "iPhone 13", deviceType: "PHONE", status: "ACTIVE", registeredAt: ts(45) },
    { imei1: "356938035643841", imei2: "356938035643858", brand: "Huawei", model: "Nova 9", deviceType: "PHONE", status: "STOLEN", registeredAt: ts(30) },
    { imei1: "356938035643866", imei2: "356938035643874", brand: "Xiaomi", model: "Redmi Note 12", deviceType: "PHONE", status: "LOST", registeredAt: ts(20) },
    { imei1: "356938035643882", imei2: "356938035643890", brand: "Oppo", model: "A78", deviceType: "PHONE", status: "ACTIVE", registeredAt: ts(15) },
    { imei1: "356938035643908", imei2: "356938035643916", brand: "Samsung", model: "Galaxy S22", deviceType: "PHONE", status: "RECOVERED", registeredAt: ts(10) },
    { imei1: "356938035643924", imei2: "356938035643932", brand: "Realme", model: "C55", deviceType: "PHONE", status: "UNDER_VERIFICATION", registeredAt: ts(8) },
    { imei1: "356938035643940", imei2: "356938035643957", brand: "Infinix", model: "Hot 30", deviceType: "PHONE", status: "SUSPICIOUS", registeredAt: ts(5) },
    { imei1: "356938035643965", imei2: "356938035643973", brand: "Apple", model: "iPhone 14 Pro", deviceType: "PHONE", status: "BLOCKED", registeredAt: ts(3) },
    { imei1: "356938035643981", imei2: "356938035643999", brand: "Samsung", model: "Galaxy A54", deviceType: "PHONE", status: "ACTIVE", registeredAt: ts(2) }
  ];
  devices.forEach(d => {
    d.districtId = "dist_demo";
    d.districtName = "المظفر";
    d.policeStationId = "ps_demo";
    d.policeStationName = "قسم شرطة المظفر";
    d.lastUpdated = ts(Math.floor(Math.random() * 5));
    _store.devices.set(d.imei1, d);
  });

  // محلات
  _store.shops.push(
    { id: "shop_001", name: "محل السماني للاتصالات", licenseNumber: "LIC-2026-001", ownerName: "عبدالله السماني", phone: "+967776666666", governorateName: "تعز", districtName: "المظفر", policeStationName: "قسم شرطة المظفر", address: "شارع تعز - جوار الجامع الكبير", status: "ACTIVE", approvedAt: ts(80) },
    { id: "shop_002", name: "مؤسسة الإتصالات اليمنية", licenseNumber: "LIC-2026-002", ownerName: "هادي العريقي", phone: "+967778888888", governorateName: "عدن", districtName: "خور مكسر", policeStationName: "قسم شرطة خور مكسر", address: "العريش - شارع البنوك", status: "ACTIVE", approvedAt: ts(70) },
    { id: "shop_003", name: "محل التقنية الذكية", licenseNumber: "LIC-2026-003", ownerName: "سمير الحضرمي", phone: "+967779999999", governorateName: "أمانة العاصمة", districtName: "السبعين", policeStationName: "قسم شرطة السبعين", address: "السبعين - شارع الزبيري", status: "PENDING" }
  );

  // بلاغات
  _store.reports.push(
    { id: "RPT_001", type: "STOLEN", imei: "356938035643841", device: { brand: "Huawei", model: "Nova 9" }, reporterName: "أحمد محمد", reporterPhone: "+967771234567", description: "سُرق الجهاز في سوق تعز الكبير", status: "ACTIVE", createdAt: ts(7) },
    { id: "RPT_002", type: "LOST", imei: "356938035643866", device: { brand: "Xiaomi", model: "Redmi Note 12" }, reporterName: "فاطمة علي", reporterPhone: "+967779876543", description: "فقدت الجهاز في الطريق العام", status: "ACTIVE", createdAt: ts(5) },
    { id: "RPT_003", type: "OWNERSHIP_DISPUTE", imei: "356938035643965", device: { brand: "Apple", model: "iPhone 14 Pro" }, reporterName: "خالد عمر", reporterPhone: "+967771112233", description: "نزاع على ملكية الجهاز", status: "UNDER_REVIEW", createdAt: ts(3) },
    { id: "RPT_004", type: "RECOVERED", imei: "356938035643908", device: { brand: "Samsung", model: "Galaxy S22" }, reporterName: "سعيد عبدالله", reporterPhone: "+967775551122", description: "تم استرجاع الجهاز", status: "RECOVERED", createdAt: ts(2) }
  );

  // تنبيهات
  _store.alerts.push(
    { id: "alert_001", type: "STOLEN_DEVICE", title: "جهاز مسروق تم الإبلاغ عنه", message: "IMEI 356938035643841 - Huawei Nova 9", severity: "high", read: false, imei: "356938035643841", createdAt: ts(0) },
    { id: "alert_002", type: "NEW_REPORT", title: "بلاغ جديد", message: "بلاغ سرقة جديد من قسم شرطة المظفر", severity: "warn", read: false, createdAt: ts(0) },
    { id: "alert_003", type: "SHOP_PENDING", title: "محل بانتظار الاعتماد", message: "محل التقنية الذكية - LIC-2026-003", severity: "info", read: true, createdAt: ts(2) }
  );

  // عمليات بيع تجريبية
  _store.sales.push(
    { id: "SALE_001", imei: "356938035643809", device: { brand: "Samsung", model: "Galaxy A14" }, buyerName: "محمد علي", buyerPhone: "+967711111111", price: 180000, currency: "YER", shopId: "shop_001", shopName: "محل السماني للاتصالات", employeeName: "ياسر الأهدل", status: "COMPLETED", createdAt: ts(1) },
    { id: "SALE_002", imei: "356938035643825", device: { brand: "Apple", model: "iPhone 13" }, buyerName: "سارة أحمد", buyerPhone: "+967722222222", price: 350000, currency: "YER", shopId: "shop_001", shopName: "محل السماني للاتصالات", employeeName: "ياسر الأهدل", status: "COMPLETED", createdAt: ts(3) },
    { id: "SALE_003", imei: "356938035643882", device: { brand: "Oppo", model: "A78" }, buyerName: "علي عبدالله", buyerPhone: "+967733333333", price: 145000, currency: "YER", shopId: "shop_001", shopName: "محل السماني للاتصالات", employeeName: "عبدالله السماني", status: "COMPLETED", createdAt: ts(5) }
  );

  // سجل تدقيق
  _store.audit.push(
    { id: "audit_001", action: "AUTH_LOGIN", actorName: "أحمد المخلافي", actorRole: "MINISTRY_ADMIN", payload: { method: "email" }, createdAt: ts(0) },
    { id: "audit_002", action: "IMEI_CHECK", actorName: "أحمد المخلافي", actorRole: "MINISTRY_ADMIN", payload: { imei: "********3809", status: "ACTIVE" }, createdAt: ts(0) },
    { id: "audit_003", action: "SALE_CREATE", actorName: "ياسر الأهدل", actorRole: "SHOP_EMPLOYEE", payload: { id: "SALE_001", imei: "********3809" }, createdAt: ts(1) }
  );
}

// إضافة البيانات تلقائياً
seedDemoData();

// مساعدات Demo Mode — تُرجع البيانات من المتجر المحلي
export function demoCheckIMEI(rawImei) {
  const imei = String(rawImei || "").trim();
  if (!imei) return { status: "EMPTY" };
  const d = _store.devices.get(imei) || [..._store.devices.values()].find(x => x.imei2 === imei);
  if (!d) return { status: "UNREGISTERED", imei };
  return { status: d.status, device: { id: d.imei1, ...d }, imei };
}

export function demoList(name) {
  if (name === "devices") return [..._store.devices.values()].map(d => ({ id: d.imei1, ...d }));
  if (name === "shops") return [..._store.shops];
  if (name === "policeReports") return [..._store.reports];
  if (name === "alerts") return [..._store.alerts];
  if (name === "sales") return [..._store.sales];
  if (name === "usedPhonePurchases") return [..._store.used];
  if (name === "auditLogs") return [..._store.audit].sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  if (name === "users") return listDemoUsers().map(u => ({ id: u.uid, ...u }));
  return [];
}

export function demoCount(name) {
  return demoList(name).length;
}

export function demoCreate(name, id, data) {
  if (name === "devices") {
    const imei = id || data.imei1;
    _store.devices.set(imei, { ...data, imei1: imei, lastUpdated: new Date() });
    return imei;
  }
  if (name === "sales") {
    const r = { id, ...data, createdAt: new Date() };
    _store.sales.unshift(r);
    return id;
  }
  if (name === "usedPhonePurchases") {
    const r = { id, ...data, createdAt: new Date() };
    _store.used.unshift(r);
    return id;
  }
  if (name === "policeReports") {
    const r = { id: id || `RPT_${String(_store.reports.length + 1).padStart(3, "0")}`, ...data, createdAt: new Date() };
    _store.reports.unshift(r);
    return r.id;
  }
  if (name === "auditLogs") {
    const r = { id, ...data, createdAt: new Date() };
    _store.audit.unshift(r);
    if (_store.audit.length > 200) _store.audit.pop();
    return id;
  }
  if (name === "alerts") {
    const r = { id: id || `alert_${_store.alerts.length + 1}`, ...data, createdAt: new Date() };
    _store.alerts.unshift(r);
    return r.id;
  }
  return id;
}

export function demoUpdate(name, id, data) {
  if (name === "devices") {
    const d = _store.devices.get(id);
    if (d) { Object.assign(d, data, { lastUpdated: new Date() }); }
  } else if (name === "alerts") {
    const a = _store.alerts.find(x => x.id === id);
    if (a) Object.assign(a, data);
  } else if (name === "users") {
    // demo — لا تعديل فعلي للمستخدمين
  }
}

export function demoLogAudit(action, payload = {}) {
  const session = getSession();
  demoCreate("auditLogs", `audit_${Date.now()}`, {
    action, payload,
    actorUid: session?.uid || null,
    actorName: session?.fullName || "Demo User",
    actorRole: session?.role || "DEMO"
  });
}
