// =================================================================
// permissions.js — RBAC + PBAC + Geographic + Organization scope
// =================================================================

export const ROLES = {
  MINISTRY_ADMIN:        "MINISTRY_ADMIN",
  CENTRAL_ADMIN:         "CENTRAL_ADMIN",
  DISTRICT_ADMIN:        "DISTRICT_ADMIN",
  POLICE_ADMIN:          "POLICE_ADMIN",
  POLICE_STATION_ADMIN:  "POLICE_STATION_ADMIN",
  POLICE_OFFICER:        "POLICE_OFFICER",
  INVESTIGATOR:          "INVESTIGATOR",
  SHOP_OWNER:            "SHOP_OWNER",
  SHOP_EMPLOYEE:         "SHOP_EMPLOYEE",
  CITIZEN:               "CITIZEN"
};

export const ROLE_LABELS = {
  MINISTRY_ADMIN: "مسؤول الوزارة",
  CENTRAL_ADMIN: "الإدارة المركزية",
  DISTRICT_ADMIN: "مسؤول المديرية",
  POLICE_ADMIN: "مسؤول الشرطة",
  POLICE_STATION_ADMIN: "مدير قسم الشرطة",
  POLICE_OFFICER: "رجل شرطة",
  INVESTIGATOR: "محقق",
  SHOP_OWNER: "مالك محل",
  SHOP_EMPLOYEE: "موظف محل",
  CITIZEN: "مواطن"
};

export const PERMISSIONS = {
  DEVICE_VIEW: "DEVICE_VIEW",
  DEVICE_SEARCH: "DEVICE_SEARCH",
  DEVICE_CREATE: "DEVICE_CREATE",
  DEVICE_UPDATE: "DEVICE_UPDATE",
  DEVICE_VERIFY: "DEVICE_VERIFY",
  DEVICE_CHANGE_STATUS: "DEVICE_CHANGE_STATUS",
  DEVICE_VIEW_HISTORY: "DEVICE_VIEW_HISTORY",
  REPORT_VIEW: "REPORT_VIEW",
  REPORT_CREATE: "REPORT_CREATE",
  REPORT_UPDATE: "REPORT_UPDATE",
  REPORT_SUBMIT: "REPORT_SUBMIT",
  REPORT_REVIEW: "REPORT_REVIEW",
  REPORT_APPROVE: "REPORT_APPROVE",
  REPORT_CLOSE: "REPORT_CLOSE",
  REPORT_RECOVER: "REPORT_RECOVER",
  SHOP_VIEW: "SHOP_VIEW",
  SHOP_CREATE: "SHOP_CREATE",
  SHOP_UPDATE: "SHOP_UPDATE",
  SHOP_APPROVE: "SHOP_APPROVE",
  SHOP_SUSPEND: "SHOP_SUSPEND",
  SHOP_MANAGE_EMPLOYEES: "SHOP_MANAGE_EMPLOYEES",
  SALE_CREATE: "SALE_CREATE",
  SALE_VIEW: "SALE_VIEW",
  USED_PURCHASE_CREATE: "USED_PURCHASE_CREATE",
  USED_PURCHASE_VIEW: "USED_PURCHASE_VIEW",
  OWNERSHIP_VIEW: "OWNERSHIP_VIEW",
  OWNERSHIP_TRANSFER: "OWNERSHIP_TRANSFER",
  USER_VIEW: "USER_VIEW",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_SUSPEND: "USER_SUSPEND",
  ROLE_ASSIGN: "ROLE_ASSIGN",
  PERMISSION_MANAGE: "PERMISSION_MANAGE",
  ANALYTICS_VIEW: "ANALYTICS_VIEW",
  AUDIT_VIEW: "AUDIT_VIEW",
  SETTINGS_VIEW: "SETTINGS_VIEW",
  SETTINGS_MANAGE: "SETTINGS_MANAGE"
};

// صلاحيات افتراضية لكل دور (Baseline)
const ROLE_BASELINE = {
  MINISTRY_ADMIN: Object.values(PERMISSIONS),
  CENTRAL_ADMIN: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_UPDATE, PERMISSIONS.DEVICE_VERIFY, PERMISSIONS.DEVICE_CHANGE_STATUS,
    PERMISSIONS.DEVICE_VIEW_HISTORY, PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_REVIEW,
    PERMISSIONS.REPORT_APPROVE, PERMISSIONS.REPORT_CLOSE, PERMISSIONS.REPORT_RECOVER,
    PERMISSIONS.SHOP_VIEW, PERMISSIONS.SHOP_APPROVE, PERMISSIONS.SHOP_SUSPEND,
    PERMISSIONS.OWNERSHIP_VIEW, PERMISSIONS.OWNERSHIP_TRANSFER,
    PERMISSIONS.USER_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SETTINGS_VIEW
  ],
  DISTRICT_ADMIN: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_UPDATE, PERMISSIONS.DEVICE_VERIFY, PERMISSIONS.DEVICE_CHANGE_STATUS,
    PERMISSIONS.DEVICE_VIEW_HISTORY, PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_REVIEW,
    PERMISSIONS.REPORT_APPROVE, PERMISSIONS.REPORT_CLOSE, PERMISSIONS.SHOP_VIEW,
    PERMISSIONS.SHOP_APPROVE, PERMISSIONS.SHOP_SUSPEND, PERMISSIONS.OWNERSHIP_VIEW,
    PERMISSIONS.USER_VIEW, PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.AUDIT_VIEW
  ],
  POLICE_ADMIN: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_VERIFY,
    PERMISSIONS.DEVICE_VIEW_HISTORY, PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_UPDATE, PERMISSIONS.REPORT_REVIEW, PERMISSIONS.REPORT_CLOSE,
    PERMISSIONS.REPORT_RECOVER, PERMISSIONS.OWNERSHIP_VIEW,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  POLICE_STATION_ADMIN: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_VERIFY,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_REVIEW, PERMISSIONS.OWNERSHIP_VIEW
  ],
  POLICE_OFFICER: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.REPORT_VIEW
  ],
  INVESTIGATOR: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_VIEW_HISTORY,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.OWNERSHIP_VIEW
  ],
  SHOP_OWNER: [
    PERMISSIONS.DEVICE_VIEW, PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.DEVICE_VERIFY,
    PERMISSIONS.SHOP_VIEW, PERMISSIONS.SHOP_UPDATE, PERMISSIONS.SHOP_MANAGE_EMPLOYEES,
    PERMISSIONS.SALE_CREATE, PERMISSIONS.SALE_VIEW, PERMISSIONS.USED_PURCHASE_CREATE,
    PERMISSIONS.USED_PURCHASE_VIEW, PERMISSIONS.OWNERSHIP_VIEW
  ],
  SHOP_EMPLOYEE: [
    PERMISSIONS.DEVICE_VERIFY, PERMISSIONS.SALE_CREATE, PERMISSIONS.SALE_VIEW,
    PERMISSIONS.USED_PURCHASE_CREATE, PERMISSIONS.USED_PURCHASE_VIEW
  ],
  CITIZEN: [
    PERMISSIONS.DEVICE_SEARCH, PERMISSIONS.OWNERSHIP_VIEW
  ]
};

export function effectivePermissions(user) {
  if (!user) return [];
  const baseline = ROLE_BASELINE[user.role] || [];
  const extra = Array.isArray(user.permissions) ? user.permissions : [];
  // Union بدون تكرار
  return Array.from(new Set([...baseline, ...extra]));
}

export function can(user, perm) {
  if (!user) return false;
  if (user.isMainAccount) return true; // الحساب الرئيسي
  return effectivePermissions(user).includes(perm);
}

export function canAny(user, perms = []) {
  return perms.some(p => can(user, p));
}

// فحص النطاق الجغرافي
export function inScope(user, target = {}) {
  if (!user) return false;
  if (user.isMainAccount) return true;
  if (user.role === "CENTRAL_ADMIN") return true;
  // مقارنة المديرية
  if (user.districtId && target.districtId && user.districtId === target.districtId) return true;
  // مقارنة قسم الشرطة
  if (user.policeStationId && target.policeStationId && user.policeStationId === target.policeStationId) return true;
  // مقارنة المحل
  if (user.shopId && target.shopId && user.shopId === target.shopId) return true;
  return false;
}

// عناصر القائمة الجانبية حسب الدور
export function navItemsFor(user) {
  if (!user) return [];
  const role = user.role;
  const items = [];

  // الرئيسية مشتركة
  items.push({ group: "الرئيسي" });
  items.push({ key: "dashboard", label: "الرئيسية", href: "#/dashboard", icon: "home" });

  if (["MINISTRY_ADMIN","CENTRAL_ADMIN","DISTRICT_ADMIN"].includes(role)) {
    items.push({ key: "imei", label: "فحص IMEI", href: "#/imei", icon: "search" });
    items.push({ key: "devices", label: "إدارة الأجهزة", href: "#/devices", icon: "phone", perm: PERMISSIONS.DEVICE_VIEW });
    items.push({ key: "reports", label: "البلاغات", href: "#/reports", icon: "alert", perm: PERMISSIONS.REPORT_VIEW });
    items.push({ key: "shops", label: "المحلات المعتمدة", href: "#/shops", icon: "shop", perm: PERMISSIONS.SHOP_VIEW });
    items.push({ key: "users", label: "المستخدمون", href: "#/users", icon: "users", perm: PERMISSIONS.USER_VIEW });
    items.push({ key: "alerts", label: "التنبيهات", href: "#/alerts", icon: "bell" });
    items.push({ key: "audit", label: "سجل التدقيق", href: "#/audit", icon: "shield", perm: PERMISSIONS.AUDIT_VIEW });
    items.push({ key: "settings", label: "الإعدادات", href: "#/settings", icon: "cog", perm: PERMISSIONS.SETTINGS_VIEW });
  }

  if (["POLICE_ADMIN","POLICE_STATION_ADMIN","POLICE_OFFICER","INVESTIGATOR"].includes(role)) {
    items.push({ key: "imei", label: "البحث عن جهاز", href: "#/imei", icon: "search" });
    items.push({ key: "reports", label: "البلاغات", href: "#/reports", icon: "alert", perm: PERMISSIONS.REPORT_VIEW });
    items.push({ key: "shops", label: "المحلات المرتبطة", href: "#/shops", icon: "shop", perm: PERMISSIONS.SHOP_VIEW });
    items.push({ key: "alerts", label: "التنبيهات", href: "#/alerts", icon: "bell" });
    items.push({ key: "profile", label: "الملف الشخصي", href: "#/profile", icon: "user" });
  }

  if (["SHOP_OWNER","SHOP_EMPLOYEE"].includes(role)) {
    items.push({ key: "shop", label: "لوحة المحل", href: "#/shop-panel", icon: "home" });
    items.push({ key: "imei", label: "فحص IMEI", href: "#/imei", icon: "search" });
    items.push({ key: "sale", label: "تسجيل بيع", href: "#/sales/new", icon: "cash", perm: PERMISSIONS.SALE_CREATE });
    items.push({ key: "used", label: "شراء مستعمل", href: "#/used/new", icon: "cart", perm: PERMISSIONS.USED_PURCHASE_CREATE });
    items.push({ key: "sales", label: "العمليات", href: "#/sales", icon: "list", perm: PERMISSIONS.SALE_VIEW });
    items.push({ key: "alerts", label: "التنبيهات", href: "#/alerts", icon: "bell" });
    items.push({ key: "profile", label: "الملف الشخصي", href: "#/profile", icon: "user" });
  }

  return items;
}
