// =================================================================
// pages/imei.js — فحص IMEI
// =================================================================
import { checkIMEI, fmtDateTime, maskImei, isFirebaseConfigured, logAudit, getSession }
  from "../firebase.js";
import { deviceStatusBadge, icon, toast, emptyState, el } from "../ui.js";
import { can, PERMISSIONS, ROLE_LABELS } from "../permissions.js";

const STATUS_INFO = {
  ACTIVE:             { cls: "active",             label: "الجهاز سليم",        desc: "الجهاز مسجّل في النظام وحالته فعّالة.", icon: "✅", tone: "success" },
  UNREGISTERED:       { cls: "unregistered",       label: "الجهاز غير مسجل",    desc: "لا توجد بيانات لهذا الرقم في قاعدة البيانات. هذا لا يعني أنه مسروق.", icon: "❓", tone: "info" },
  UNDER_VERIFICATION: { cls: "under_verification", label: "الجهاز قيد التحقق",  desc: "الجهاز موجود لكنه يخضع حالياً لإجراءات تحقق ومراجعة.", icon: "🟡", tone: "warn" },
  LOST:               { cls: "lost",               label: "الجهاز مفقود",       desc: "الجهاز مُبلَّغ عنه كمفقود. لا تستكمل عملية البيع أو الشراء. اتبع الإجراء الرسمي.", icon: "🚨", tone: "danger" },
  STOLEN:             { cls: "stolen",             label: "الجهاز مسروق",       desc: "الجهاز مُبلَّغ عنه كمسروق. لا تستكمل العملية. أبلغ الجهة المختصة فوراً.", icon: "🚨", tone: "danger" },
  RECOVERED:          { cls: "recovered",          label: "الجهاز مسترجع",      desc: "تم استرجاع الجهاز بعد التبليغ. راجع السجل لمعرفة التفاصيل.", icon: "🟦", tone: "info" },
  SUSPICIOUS:         { cls: "suspicious",         label: "الجهاز محل اشتباه",  desc: "الجهاز مرتبط بحالة اشتباه. يُرجى التحقق والإبلاغ.", icon: "🟣", tone: "warn" },
  BLOCKED:            { cls: "blocked",            label: "الجهاز محظور",       desc: "الجهاز محظور من قبل الجهة المختصة. لا تستكمل أي عملية عليه.", icon: "⛔", tone: "danger" }
};

export async function render(main) {
  const user = getSession();

  main.innerHTML = `
    <div class="page-head">
      <div class="page-head__title">
        <h1>فحص IMEI</h1>
        <span class="page-head__sub">أدخل رقم IMEI للتحقق من حالة الجهاز في قاعدة البيانات</span>
      </div>
      <div class="page-head__actions">
        <span class="pill">${ROLE_LABELS[user?.role] || ""}</span>
      </div>
    </div>

    <div class="big-search">
      <h2>${icon("search")} أدخل رقم IMEI</h2>
      <p>رقم IMEI هو رقم فريد مكون من 15 خانة يُستخدم لتعريف كل جهاز محمول. يمكنك إيجاده بكتابة <span class="kbd">*#06#</span> على الجهاز.</p>
      <form id="imeiForm" class="big-search__row">
        <input class="input input--imei" id="imeiInput" inputmode="numeric" pattern="[0-9]{14,16}"
               maxlength="17" placeholder="356938035643809" autocomplete="off" required />
        <button class="btn btn--gold btn--lg" type="submit" id="checkBtn">
          <span class="label">فحص الجهاز</span>
        </button>
        <button class="btn btn--ghost" type="button" id="clearBtn">مسح</button>
      </form>
      <div class="small muted">لن يتم تخزين أرقام IMEI في المتصفح. كل عملية فحص تُسجَّل في سجل التدقيق.</div>
    </div>

    <div id="imeiResult" class="imei-result hide"></div>
  `;

  const form = document.getElementById("imeiForm");
  const input = document.getElementById("imeiInput");
  const result = document.getElementById("imeiResult");
  const clear = document.getElementById("clearBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const imei = input.value.trim();
    if (!/^\d{14,16}$/.test(imei)) {
      toast("رقم IMEI يجب أن يكون 14 إلى 16 رقمًا", "warn");
      return;
    }
    await runCheck(imei);
  });

  clear.addEventListener("click", () => {
    input.value = "";
    result.classList.add("hide");
    input.focus();
  });

  // دعم فحص من ?imei=... في الـ hash
  const q = (location.hash.split("?")[1] || "");
  const params = new URLSearchParams(q);
  if (params.get("imei")) { input.value = params.get("imei"); form.requestSubmit(); }
}

async function runCheck(imei) {
  const result = document.getElementById("imeiResult");
  const btn = document.getElementById("checkBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> &nbsp; جاري التحقق...`;

  result.classList.remove("hide");
  result.innerHTML = `<div class="row"><span class="spinner"></span><span>جاري البحث في قاعدة البيانات...</span></div>`;

  let res;
  try {
    res = await checkIMEI(imei);
  } catch (e) {
    console.error(e);
    result.innerHTML = `
      <div class="banner banner--danger">
        <span>${icon("x")}</span>
        <div>
          <b>تعذر الاتصال بقاعدة البيانات</b><br>
          <span class="small">${e?.message || "حاول مرة أخرى لاحقاً."}</span>
        </div>
      </div>`;
    btn.disabled = false;
    btn.innerHTML = `<span class="label">فحص الجهاز</span>`;
    return;
  }

  // تسجيل عملية الفحص في الـ Audit
  logAudit("IMEI_CHECK", { imei: imei.slice(0,4)+"****"+imei.slice(-4), status: res.status }).catch(()=>{});

  if (res.status === "EMPTY") { result.classList.add("hide"); btn.disabled = false; return; }

  if (res.status === "UNREGISTERED") {
    result.className = `imei-result imei-result--unregistered`;
    result.innerHTML = renderUnregistered(imei);
  } else {
    renderDevice(res.status, res.device, imei);
  }

  btn.disabled = false;
  btn.innerHTML = `<span class="label">فحص الجهاز</span>`;
}

function renderUnregistered(imei) {
  return `
    <div class="row">
      <div class="imei-result__icon">❓</div>
      <div>
        <div class="imei-result__title">الجهاز غير مسجّل</div>
        <div class="imei-result__sub">رقم IMEI: <span class="mono">${imei}</span></div>
      </div>
      <div style="margin-inline-start:auto">${deviceStatusBadge("UNREGISTERED")}</div>
    </div>
    <div class="banner banner--info">
      <span>${icon("question")}</span>
      <div>
        عدم وجود الجهاز في قاعدة البيانات <b>لا يعني</b> أنه مسروق.
        يمكن تسجيل الجهاز لدى المحل المعتمد وفق الإجراءات المعتمدة،
        أو متابعة عملية الشراء بعد التحقق من المستندات الأصلية.
      </div>
    </div>
  `;
}

function renderDevice(status, device, imei) {
  const result = document.getElementById("imeiResult");
  const info = STATUS_INFO[status] || STATUS_INFO.ACTIVE;
  const user = getSession();
  const showFullImei = can(user, PERMISSIONS.DEVICE_VIEW_HISTORY) || user?.isMainAccount;
  const imeiDisplay = showFullImei ? device.imei1 || imei : maskImei(device.imei1 || imei);

  result.className = `imei-result imei-result--${info.cls}`;
  result.innerHTML = `
    <div class="row">
      <div class="imei-result__icon">${info.icon}</div>
      <div>
        <div class="imei-result__title">${info.label}</div>
        <div class="imei-result__sub">${info.desc}</div>
      </div>
      <div style="margin-inline-start:auto">${deviceStatusBadge(status)}</div>
    </div>

    <dl class="kv">
      <dt>IMEI</dt><dd class="mono">${imeiDisplay}</dd>
      ${device.imei2 ? `<dt>IMEI 2</dt><dd class="mono">${showFullImei ? device.imei2 : maskImei(device.imei2)}</dd>` : ""}
      ${device.brand   ? `<dt>الشركة</dt><dd>${device.brand}</dd>` : ""}
      ${device.model   ? `<dt>الموديل</dt><dd>${device.model}</dd>` : ""}
      ${device.deviceType ? `<dt>النوع</dt><dd>${device.deviceType}</dd>` : ""}
      ${device.serialNumber ? `<dt>Serial</dt><dd class="mono">${showFullImei ? device.serialNumber : maskImei(device.serialNumber)}</dd>` : ""}
      ${device.districtName ? `<dt>المديرية</dt><dd>${device.districtName}</dd>` : ""}
      ${device.registeredAt ? `<dt>تاريخ التسجيل</dt><dd>${fmtDateTime(device.registeredAt)}</dd>` : ""}
      ${device.lastUpdated ? `<dt>آخر تحديث</dt><dd>${fmtDateTime(device.lastUpdated)}</dd>` : ""}
    </dl>

    ${["LOST","STOLEN","BLOCKED"].includes(status) ? `
      <div class="banner banner--danger">
        <span>${icon("x")}</span>
        <div>
          <b>إجراء محلات معتمد:</b>
          توقف عن إكمال العملية. لا تواجه أي شخص.
          اتبع الإجراء الرسمي المعتمد وأبلغ قسم الشرطة المرتبط.
        </div>
      </div>` : ""}
  `;
}
