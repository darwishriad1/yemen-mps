// =================================================================
// ui.js — Toast, Modal, Icons, Helpers
// =================================================================

// ---------- Icons (inline SVG) ----------
const ICONS = {
  home:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  search:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  phone:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  alert:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  shop:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h18l-1 12H4z"/><path d="M16 9V5a4 4 0 0 0-8 0v4"/></svg>',
  users:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  bell:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  shield:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  cog:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.04 4.96l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  cash:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  cart:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  list:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
  user:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  logout:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
  check:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-11"/></svg>',
  x:       '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  warn:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  question:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  edit:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  trash:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  plus:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  download:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  filter:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>',
  eye:     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
};

export function icon(name) { return ICONS[name] || ""; }

// ---------- Toast ----------
export function toast(message, type = "info", { title, timeout = 3500 } = {}) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const t = document.createElement("div");
  t.className = `toast toast--${type}`;
  t.innerHTML = `
    <div style="margin-top:2px">${type === "success" ? icon("check") : type === "danger" ? icon("x") : type === "warn" ? icon("warn") : icon("bell")}</div>
    <div>
      <div class="toast__title">${title || (type === "success" ? "تم بنجاح" : type === "danger" ? "خطأ" : "تنبيه")}</div>
      <div class="toast__body">${message}</div>
    </div>
    <div class="toast__close" aria-label="إغلاق">✕</div>
  `;
  stack.appendChild(t);
  const close = () => { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; setTimeout(() => t.remove(), 220); };
  t.querySelector(".toast__close").addEventListener("click", close);
  setTimeout(close, timeout);
}

// ---------- Modal ----------
let modalCloseCb = null;
export function openModal({ title = "تأكيد", body = "", confirmText = "تأكيد", cancelText = "إلغاء",
                          onConfirm, danger = false, confirmId = "modalConfirm" } = {}) {
  const modal = document.getElementById("modal");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = body;
  const confirmBtn = document.getElementById(confirmId);
  confirmBtn.textContent = confirmText;
  confirmBtn.className = "btn " + (danger ? "btn--danger" : "btn--primary");
  modal.hidden = false;

  modalCloseCb = onConfirm;
  confirmBtn.onclick = async () => {
    if (modalCloseCb) {
      const r = await modalCloseCb();
      if (r !== false) closeModal();
    } else closeModal();
  };
  modal.querySelectorAll("[data-modal-close]").forEach(el => el.onclick = closeModal);
}
export function closeModal() {
  const modal = document.getElementById("modal");
  modal.hidden = true;
  modalCloseCb = null;
}

// ---------- Empty state ----------
export function emptyState({ title = "لا توجد بيانات حالياً", desc = "لم يتم العثور على سجلات.", icon = "📭" } = {}) {
  return `
    <div class="empty">
      <div class="empty__icon">${icon}</div>
      <div class="empty__title">${title}</div>
      <div class="small">${desc}</div>
    </div>`;
}

// ---------- Skeleton ----------
export function skeletonRows(cols = 5, rows = 6) {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr>${Array.from({length:cols},()=>`<th><div class="skeleton" style="height:10px;width:80%"></div></th>`).join("")}</tr></thead>
        <tbody>${Array.from({length:rows},()=>`<tr>${Array.from({length:cols},()=>`<td><div class="skeleton" style="height:10px"></div></td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>`;
}

// ---------- Helpers ----------
export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }
export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

export function fmtRelative(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `قبل ${Math.floor(diff/60)} دقيقة`;
  if (diff < 86400) return `قبل ${Math.floor(diff/3600)} ساعة`;
  if (diff < 604800) return `قبل ${Math.floor(diff/86400)} يوم`;
  return d.toLocaleDateString("ar-YE");
}

// ملصق حالة الجهاز
export function deviceStatusBadge(status) {
  const map = {
    ACTIVE:            { cls: "badge--success",  label: "سليم / فعال" },
    UNREGISTERED:      { cls: "badge--muted",    label: "غير مسجل" },
    UNDER_VERIFICATION:{ cls: "badge--pending",  label: "قيد التحقق" },
    LOST:              { cls: "badge--danger",   label: "مفقود" },
    STOLEN:            { cls: "badge--danger",   label: "مسروق" },
    RECOVERED:         { cls: "badge--info",     label: "مسترجع" },
    SUSPICIOUS:        { cls: "badge--suspicious", label: "محل اشتباه" },
    BLOCKED:           { cls: "badge--danger",   label: "محظور" }
  };
  const v = map[status] || { cls: "badge--muted", label: status || "—" };
  return `<span class="badge ${v.cls}"><span class="dot"></span>${v.label}</span>`;
}
