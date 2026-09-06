# هيكل قاعدة البيانات — Firestore

> ملاحظة: لا توجد بيانات Mock في الواجهة. عند عدم وجود بيانات تظهر رسائل "لا توجد بيانات حالياً".

## المجموعات (Collections)

### users — `users/{uid}`
```js
{
  uid: string,
  fullName: string,
  email: string,
  phone: string,
  role: "MINISTRY_ADMIN" | "CENTRAL_ADMIN" | "DISTRICT_ADMIN"
       | "POLICE_ADMIN" | "POLICE_STATION_ADMIN"
       | "POLICE_OFFICER" | "INVESTIGATOR"
       | "SHOP_OWNER" | "SHOP_EMPLOYEE" | "CITIZEN",
  permissions: string[],   // إضافية فوق baseline
  organizationId: string,
  governorateId: string,   governorateName: string,
  districtId: string,      districtName: string,
  policeStationId: string, policeStationName: string,
  shopId: string,          shopName: string,
  status: "ACTIVE" | "SUSPENDED" | "PENDING",
  isMainAccount: boolean,
  mustChangePassword: boolean,
  lastLoginAt: Timestamp,
  createdAt: Timestamp,
  createdBy: string
}
```

### organizations — `organizations/{id}`
```js
{ name, type, createdAt }
```

### districts — `districts/{id}`
```js
{ name, governorateId, governorateName, createdAt }
```

### policeStations — `policeStations/{id}`
```js
{ name, districtId, districtName, phone, address, createdAt }
```

### shops — `shops/{id}`
```js
{
  name, licenseNumber, ownerName, phone,
  governorateId, governorateName,
  districtId, districtName,
  policeStationId, policeStationName,
  address, status: "ACTIVE"|"PENDING"|"SUSPENDED"|"CLOSED",
  approvedAt, expiresAt
}
```

### devices — `devices/{imei}` (المعرّف = IMEI)
```js
{
  imei1, imei2, serialNumber,
  brand, model, deviceType, color,
  status: "ACTIVE"|"UNREGISTERED"|"UNDER_VERIFICATION"
         |"LOST"|"STOLEN"|"RECOVERED"|"SUSPICIOUS"|"BLOCKED",
  registeredAt, lastUpdated,
  districtId, districtName, policeStationId,
  currentOwnerId, currentOwnerName,
  source: "SHOP_REGISTRATION" | "MANUAL" | "IMPORT",
  registeredBy: uid
}
```

### ownershipRecords — `ownershipRecords/{id}`
```js
{
  deviceId (IMEI),
  previousOwnerId, previousOwnerName,
  newOwnerId, newOwnerName,
  transferredAt, transferReason,
  shopId, executedBy (uid),
  referenceId
}
```

### sales — `sales/{id}` (id = SALE_xxxxx)
```js
{
  imei, device: { brand, model },
  buyerName, buyerPhone, buyerIdNumber,
  price, currency: "YER",
  note,
  shopId, shopName, districtId, districtName,
  employeeUid, employeeName,
  status: "COMPLETED"|"CANCELLED",
  createdAt
}
```

### usedPhonePurchases — `usedPhonePurchases/{id}`
```js
{
  imei, sellerName, sellerId,
  brand, model, color,
  price, currency: "YER",
  shopId, shopName, employeeUid, employeeName,
  status, createdAt
}
```

### policeReports — `policeReports/{id}` (id = RPT_xxxxx)
```js
{
  type: "LOST"|"STOLEN"|"OWNERSHIP_DISPUTE",
  imei, device: { brand, model },
  reporterName, reporterPhone, reporterIdNumber,
  description, location,
  status: "DRAFT"|"SUBMITTED"|"UNDER_REVIEW"|"ACTIVE"|"RECOVERED"|"CLOSED"|"CANCELLED",
  districtId, policeStationId,
  assignedTo, createdAt, updatedAt
}
```

### alerts — `alerts/{id}`
```js
{
  type, title, message,
  severity: "info"|"warn"|"high",
  read: boolean, readBy: [uids],
  imei, deviceId, reportId, shopId,
  districtId, policeStationId,
  createdAt
}
```

### auditLogs — `auditLogs/{id}`
```js
{
  action: "AUTH_LOGIN" | "AUTH_LOGOUT" | "USER_CREATE" | "USER_UPDATE" |
          "DEVICE_CREATE" | "DEVICE_UPDATE" | "DEVICE_STATUS_CHANGE" |
          "SALE_CREATE" | "USED_PURCHASE_CREATE" | "REPORT_CREATE" |
          "SHOP_CREATE" | "SHOP_APPROVE" | "SHOP_SUSPEND" |
          "IMEI_CHECK" | "OWNERSHIP_TRANSFER" | "SETTINGS_UPDATE" | ...,
  payload: { ... },
  actorUid, actorName, actorRole,
  ip, ua, createdAt
}
```

### settings — `settings/system`
```js
{
  country: "YE", language: "ar", dir: "rtl",
  currency: "YER", currencyName: "الريال اليمني",
  timezone: "Asia/Aden",
  dateFormat: "DD/MM/YYYY", timeFormat: "24h"
}
```

## الفهارس المركّبة المقترحة (Composite indexes)

- `devices`: `status ASC, districtId ASC`
- `policeReports`: `status ASC, createdAt DESC`
- `sales`: `shopId ASC, createdAt DESC`
- `usedPhonePurchases`: `shopId ASC, createdAt DESC`
- `alerts`: `read ASC, createdAt DESC`
- `auditLogs`: `actorUid ASC, createdAt DESC`
- `users`: `role ASC, status ASC`
