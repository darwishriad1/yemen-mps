# دليل التشغيل — نظام حماية وتتبع الهواتف

## المتطلبات
- متصفح حديث (Chrome / Edge / Firefox / Safari).
- (اختياري) Node.js لتشغيل خادم محلي بسيط، أو أي استضافة Static.

## الإعداد

1. **إنشاء مشروع Firebase**
   - ادخل إلى [Firebase Console](https://console.firebase.google.com/).
   - أنشئ مشروعاً جديداً باسم `yemen-mps` (أو ما يناسبك).
   - فعّل **Authentication → Sign-in method**:
     - Email/Password
     - Google
   - أنشئ قاعدة بيانات **Firestore** (Production mode).
   - من **Project settings → General → Your apps** اختر Web app وانسخ القيم.

2. **ضبط إعدادات Firebase في الواجهة**
   افتح `js/firebase.js` واملأ `FIREBASE_CONFIG` بالقيم التي نسختها:
   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "yemen-mps.firebaseapp.com",
     projectId: "yemen-mps",
     storageBucket: "yemen-mps.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:123:web:abc"
   };
   ```

3. **نشر قواعد الأمان**
   ```bash
   firebase login
   firebase init firestore   # اختر مشروعك، لا تنشئ ملفات rules/indexes من init
   cp docs/firestore.rules firestore.rules
   firebase deploy --only firestore:rules
   ```

4. **إنشاء الحساب الرئيسي (مرة واحدة فقط)**
   - من Firebase Console → Authentication → Add user (Email/Password).
   - انسخ الـ UID للمستخدم.
   - في Firestore أنشئ وثيقة في `users/{uid}`:
     ```json
     {
       "uid": "...",
       "fullName": "مسؤول النظام",
       "email": "admin@...",
       "role": "MINISTRY_ADMIN",
       "isMainAccount": true,
       "status": "ACTIVE",
       "permissions": [],
       "createdAt": <server-timestamp>
     }
     ```
   - سجّل الدخول بهذا الحساب.

5. **تشغيل محلي**
   ```bash
   # Python
   python3 -m http.server 8000
   # أو Node
   npx http-server -p 8000
   ```
   افتح: `http://localhost:8000`

6. **النشر (Firebase Hosting)**
   ```bash
   firebase init hosting   # public = . (المجلد الحالي)
   firebase deploy --only hosting
   ```

## ملاحظات تشغيلية
- لا تستخدم LocalStorage لتخزين البيانات الحساسة.
- كل عملية حساسة تُسجَّل في `auditLogs`.
- صلاحية الحساب الرئيسي (MINISTRY_ADMIN + isMainAccount=true) مطلوبة لإدارة المستخدمين وإعدادات النظام.
- بيانات الاختبار: يمكنك إضافة سجلات من الواجهة (بعد تسجيل الدخول بحساب ذي صلاحية).
- العملة الافتراضية: **YER — الريال اليمني**.
- الاتجاه: **RTL**، اللغة: **العربية**، المنطقة الزمنية: **Asia/Aden**.

## بنية المشروع
```
yemen-mobile-system/
├── index.html
├── css/
│   ├── theme.css        # الهوية البصرية + المتغيرات
│   ├── layout.css       # التخطيط (Appbar + Sidenav + Main)
│   ├── components.css   # المكونات (Buttons, Cards, Tables, Toast, Modal)
│   └── pages.css        # تنسيقات الصفحات
├── js/
│   ├── firebase.js      # طبقة Firebase
│   ├── auth.js          # تسجيل الدخول والخروج
│   ├── permissions.js   # RBAC + PBAC + Geo/Org Scope
│   ├── ui.js            # Toast, Modal, Icons, Helpers
│   ├── router.js        # Hash router + Guards
│   ├── app.js           # الإقلاع + القائمة الجانبية
│   └── pages/
│       ├── login.js
│       ├── dashboard.js
│       ├── imei.js
│       ├── devices.js
│       ├── reports.js
│       ├── shops.js
│       ├── users.js
│       ├── alerts.js
│       ├── audit.js
│       ├── settings.js
│       ├── sales.js
│       ├── used.js
│       ├── shop-panel.js
│       ├── police-panel.js
│       └── profile.js
└── docs/
    ├── firestore.rules
    ├── FIREBASE_SCHEMA.md
    └── RUN.md
```

## الدعم
- ادعم بفهارس Firestore من `docs/FIREBASE_SCHEMA.md` إن ظهرت رسالة "requires an index".
- لأي استفسار عن البنية، راجع `FIREBASE_SCHEMA.md`.
- قواعد الأمان في `firestore.rules` قابلة للتعديل حسب المتطلبات التنظيمية.
