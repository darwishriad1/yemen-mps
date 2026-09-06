# 🇾🇪 نظام حماية وتتبع الهواتف

> منظومة رقمية متكاملة لإدارة الأجهزة المحمولة في **الجمهورية اليمنية** — فحص IMEI، تسجيل الأجهزة، البلاغات، المحلات المعتمدة، والصلاحيات، ضمن بنية آمنة موحّدة باستخدام Firebase.

![status](https://img.shields.io/badge/status-ready-16a34a?style=flat-square)
![lang](https://img.shields.io/badge/lang-العربية-d4af37?style=flat-square)
![dir](https://img.shields.io/badge/dir-RTL-2563eb?style=flat-square)
![currency](https://img.shields.io/badge/currency-YER-7c3aed?style=flat-square)
![tz](https://img.shields.io/badge/tz-Asia%2FAden-0891b2?style=flat-square)

---

## ✨ الميزات

- 🔍 **فحص IMEI** — بحث فوري بـ 8 حالات دلالية (سليم، غير مسجل، مفقود، مسروق، مسترجع، قيد التحقق، محل اشتباه، محظور).
- 📱 **لوحات مخصصة لكل دور** — إدارة مركزية، شرطة، محلات.
- 🛡️ **أمان متقدّم** — RBAC + PBAC + Geographic + Organization Scope.
- 📊 **إحصائيات حقيقية** من Firestore (بدون بيانات وهمية).
- 🏪 **تسجيل بيع** و**شراء أجهزة مستعملة** مع منع تلقائي للحالات المحظورة.
- 🚨 **بلاغات** (مفقود/مسروق/نزاع ملكية) بحالات متعددة.
- 🔔 **تنبيهات** حسب النطاق والصلاحيات.
- 📜 **سجل تدقيق** كامل لكل عملية حساسة.
- 🌐 **عربية بالكامل** + **RTL** + **Mobile First**.

---

## 🧰 التقنيات

- **Frontend**: HTML5 + CSS3 (Custom Design System) + Vanilla JS (ES Modules).
- **Backend**: Firebase v10 (Auth + Firestore) — modular SDK.
- **Hosting**: GitHub Pages + GitHub Actions للنشر التلقائي.
- **Currency**: YER (الريال اليمني) · **TZ**: Asia/Aden · **Date**: DD/MM/YYYY.

---

## 🚀 النشر على GitHub Pages

1. أنشئ مستودعاً جديداً باسم `yemen-mps` (عام).
2. ارفع محتويات هذا المجلد:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Yemen Mobile Protection System"
   git branch -M main
   git remote add origin https://github.com/<user>/yemen-mps.git
   git push -u origin main
   ```
3. فعّل **Settings → Pages → Source: GitHub Actions**.
4. سيتم النشر تلقائياً عبر `.github/workflows/deploy.yml`.

> **الرابط المباشر:** `https://<user>.github.io/yemen-mps/`

---

## ⚙️ إعداد Firebase

1. أنشئ مشروعاً على [Firebase Console](https://console.firebase.google.com/).
2. فعّل **Authentication** → Email/Password + Google.
3. أنشئ قاعدة **Firestore** (Production mode).
4. انشر قواعد الأمان:
   ```bash
   firebase deploy --only firestore:rules --file docs/firestore.rules
   ```
5. افتح `js/firebase.js` واملأ `FIREBASE_CONFIG` بقيم مشروعك.
6. أنشئ الحساب الرئيسي (UID مع `isMainAccount: true` و `role: "MINISTRY_ADMIN"`).

📖 دليل مفصّل: [`docs/RUN.md`](docs/RUN.md)
🏗️ هيكل البيانات: [`docs/FIREBASE_SCHEMA.md`](docs/FIREBASE_SCHEMA.md)
🔒 قواعد Firestore: [`docs/firestore.rules`](docs/firestore.rules)

---

## 🗂️ بنية المشروع

```
yemen-mobile-system/
├── index.html
├── css/                # theme · layout · components · pages
├── js/                 # firebase · auth · permissions · ui · router · app
│   └── pages/          # 15 صفحة وظيفية
├── docs/               # firestore.rules · FIREBASE_SCHEMA.md · RUN.md
└── .github/workflows/  # نشر تلقائي على GitHub Pages
```

---

## 🧪 تشغيل محلي

```bash
# Python
python3 -m http.server 8000

# Node
npx http-server -p 8000
```

ثم افتح: `http://localhost:8000`

---

## 🔐 المبدأ الأساسي

> **لا ثقة بدون تحقق.**

- كل مستخدم يُتحقَّق من دوره وصلاحياته ونطاقه.
- كل جهاز يُتحقَّق من حالته.
- كل عملية تُسجَّل في سجل التدقيق.
- لا تُمنح صلاحيات إدارية تلقائياً، بما فيها مستخدمو Google SSO.

---

© الجمهورية اليمنية — منظومة حماية الأجهزة المحمولة
