# 🚀 تعليمات الرفع على GitHub Pages

## الطريقة الأولى: عبر موقع GitHub (موصى بها)

### 1) إنشاء المستودع
- ادخل على https://github.com/new
- **Repository name**: `yemen-mps`
- **Public** ✅
- **لا تضف** README / .gitignore / license (موجودين)
- اضغط **Create repository**

### 2) الرفع من جهازك
بعد فك ضغط الملف، نفّذ من داخل مجلد `yemen-mobile-system`:

```bash
git remote add origin https://github.com/<USER>/yemen-mps.git
git branch -M main
git push -u origin main
```

> استبدل `<USER>` باسم حسابك على GitHub.

### 3) تفعيل GitHub Pages
- ادخل على المستودع → **Settings** → **Pages**
- **Source**: اختر **GitHub Actions**
- هذا يكفي! الباقي تلقائي.

### 4) انتظر 2-3 دقائق
- روح لتبويب **Actions** وشوف الـ workflow وهو يعمل.
- بعدها الموقع يكون متاح على:

> 🌐 **https://&lt;USER&gt;.github.io/yemen-mps/**

---

## الطريقة الثانية: عبر سطر الأوامر في GitHub CLI (إن كان متوفراً)

```bash
gh repo create yemen-mps --public --source=. --remote=origin --push
gh repo edit --enable-pages
```

---

## ⚙️ بعد النشر

### ضبط Firebase
1. أنشئ مشروع على [Firebase Console](https://console.firebase.google.com/).
2. فعّل **Authentication** (Email/Password + Google).
3. أنشئ قاعدة **Firestore** (Production mode).
4. انشر القواعد:
   ```bash
   firebase deploy --only firestore:rules --file docs/firestore.rules
   ```
5. افتح `js/firebase.js` في المستودع، واملأ `FIREBASE_CONFIG` بقيم مشروعك.
6. Commit + push:
   ```bash
   git add js/firebase.js
   git commit -m "chore: configure Firebase"
   git push
   ```

### إنشاء الحساب الرئيسي
من Firebase Console → Authentication → Add user (Email/Password) → انسخ الـ UID.
من Firestore → أنشئ وثيقة `users/{uid}`:
```json
{
  "uid": "<UID>",
  "fullName": "مسؤول النظام",
  "email": "admin@example.com",
  "role": "MINISTRY_ADMIN",
  "isMainAccount": true,
  "status": "ACTIVE",
  "permissions": [],
  "createdAt": "<server-timestamp>"
}
```

---

## 🛠️ تخصيص النطاق (اختياري)
- **Settings → Pages → Custom domain**
- ضع النطاق (مثل `mps.yemen.gov.ye`).
- فعل **Enforce HTTPS**.

---

## 📋 هيكل النشر
- `index.html` → نقطة الدخول
- `404.html` → صفحة 404 (تعيد التوجيه للرئيسية)
- `css/`, `js/`, `docs/`, `assets/` → ملفات الموقع
- `.github/workflows/deploy.yml` → النشر التلقائي

كل الملفات ضمن الـ Pages. لا حاجة لـ build step — الموقع static بالكامل.
