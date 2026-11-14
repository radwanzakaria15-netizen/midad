(() => {
"use strict";

const dialog = document.createElement("dialog");
dialog.id = "midadUiDialog";
dialog.className = "midad-ui-dialog";
dialog.dir = "rtl";
dialog.setAttribute("aria-labelledby", "midadUiTitle");
dialog.innerHTML = '<section class="midad-ui-card"><header class="midad-ui-head"><span class="midad-ui-icon" id="midadUiIcon" aria-hidden="true">؟</span><div><h2 id="midadUiTitle"></h2><p id="midadUiMessage"></p></div></header><form id="midadUiForm" novalidate><input id="midadUiInput" class="midad-ui-input" type="text" autocomplete="off" hidden><footer class="midad-ui-actions"><button type="button" class="midad-ui-cancel" id="midadUiCancel">إلغاء</button><button type="submit" class="midad-ui-ok" id="midadUiOk">حسناً</button></footer></form></section>';
document.body.appendChild(dialog);

const style = document.createElement("style");
style.textContent = `
.midad-ui-dialog{width:min(440px,calc(100vw - 32px));max-width:440px;padding:0;border:1px solid var(--line,#eadbcb);border-radius:24px;background:var(--paper,#fffaf2);color:var(--ink,#30231d);box-shadow:0 26px 90px rgba(20,30,22,.28);font-family:Tajawal,Cairo,system-ui,sans-serif;overflow:visible;opacity:0;transform:translateY(12px) scale(.98);transition:opacity .2s ease,transform .2s ease}
.midad-ui-dialog[open]{opacity:1;transform:translateY(0) scale(1)}
.midad-ui-dialog::backdrop{background:rgba(18,27,21,.42);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.midad-ui-card{padding:22px 22px 18px}
.midad-ui-head{display:flex;align-items:flex-start;gap:13px}
.midad-ui-icon{display:grid;place-items:center;flex:none;width:43px;height:43px;border-radius:14px;background:#edf3ec;color:var(--green,#66836d);font-size:21px;font-weight:900}
.midad-ui-head h2{margin:1px 0 7px;font-size:19px;line-height:1.5;color:var(--deep,#563829)}
.midad-ui-head p{margin:0;color:var(--muted,#8e786a);font-size:13px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}
.midad-ui-input{display:block;width:100%;margin-top:16px;padding:12px 14px;border:1px solid var(--line,#eadbcb);border-radius:13px;background:var(--white,#fffdf9);color:var(--ink,#30231d);font:inherit;font-size:14px;outline:none}
.midad-ui-input:focus{border-color:var(--green,#66836d);box-shadow:0 0 0 3px rgba(102,131,109,.13)}
.midad-ui-actions{display:flex;gap:9px;margin-top:21px}
.midad-ui-actions button{flex:1;min-height:44px;padding:10px 14px;border:1px solid transparent;border-radius:13px;font:800 13px Tajawal,Cairo,system-ui,sans-serif;cursor:pointer;transition:transform .16s,filter .16s}
.midad-ui-actions button:active{transform:scale(.98)}
.midad-ui-ok{background:linear-gradient(145deg,#66836d,#4e6e56);color:#fff}
.midad-ui-cancel{background:var(--cream,#f8f0e6);border-color:var(--line,#eadbcb)!important;color:var(--deep,#563829)}
.midad-ui-ok.danger{background:#b65f59;color:#fff}
.midad-ui-actions button:focus-visible{outline:3px solid rgba(102,131,109,.3);outline-offset:2px}
.midad-field-error{display:block;margin:5px 2px 0;color:#b65f59;font:600 11px/1.7 Tajawal,Cairo,sans-serif}
.midad-field-invalid{border-color:#c56c65!important;box-shadow:0 0 0 2px rgba(197,108,101,.1)!important}
.midad-field-invalid:focus{border-color:#b65f59!important}
.midad-night .midad-ui-dialog{background:#26362c;border-color:#3a4d3d;color:#edf4ec}
.midad-night .midad-ui-head h2{color:#d9e6d7}
.midad-night .midad-ui-head p{color:#a6b6a5}
.midad-night .midad-ui-icon{background:#35483a;color:#a9d0af}
.midad-night .midad-ui-input{background:#202e25;border-color:#536c58;color:#edf4ec}
.midad-night .midad-ui-cancel{background:#35483a;border-color:#536c58!important;color:#e7f0e6}
@media(prefers-reduced-motion:reduce){.midad-ui-dialog{transition:none}}
`;
style.textContent += `\n/* Keep hidden dialog controls hidden despite component display rules. */\ndialog [hidden], .md-dialog [hidden] { display: none !important; }\n`;
document.head.appendChild(style);

let activeFinish = null;
let backgroundScrollY = 0;
let backgroundLocked = false;
let savedBodyStyles = null;

function lockBackgroundScroll() {
  if (backgroundLocked) return;
  backgroundLocked = true;
  backgroundScrollY = window.scrollY || window.pageYOffset || 0;
  savedBodyStyles = {
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
    overflow: document.body.style.overflow
  };
  document.body.style.position = "fixed";
  document.body.style.top = "-" + backgroundScrollY + "px";
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

function unlockBackgroundScroll() {
  if (!backgroundLocked) return;
  backgroundLocked = false;
  const previous = savedBodyStyles || {};
  document.body.style.position = previous.position || "";
  document.body.style.top = previous.top || "";
  document.body.style.left = previous.left || "";
  document.body.style.right = previous.right || "";
  document.body.style.width = previous.width || "";
  document.body.style.overflow = previous.overflow || "";
  savedBodyStyles = null;
  window.scrollTo(0, backgroundScrollY);
}

function show(kind, message, options = {}) {
  return new Promise(resolve => {
    if (activeFinish) activeFinish(kind === "confirm" ? false : null);
    const title = document.getElementById("midadUiTitle");
    const text = document.getElementById("midadUiMessage");
    const icon = document.getElementById("midadUiIcon");
    const input = document.getElementById("midadUiInput");
    const form = document.getElementById("midadUiForm");
    const ok = document.getElementById("midadUiOk");
    const cancel = document.getElementById("midadUiCancel");
    title.textContent = options.title || (kind === "confirm" ? "تأكيد الإجراء" : kind === "prompt" ? "إدخال قيمة" : "تنبيه");
    text.textContent = String(message ?? "");
    icon.textContent = options.icon || (kind === "confirm" ? "؟" : kind === "prompt" ? "✎" : "i");
    input.hidden = kind !== "prompt";
    input.value = kind === "prompt" ? String(options.defaultValue ?? "") : "";
    ok.textContent = options.okText || (kind === "confirm" ? "تأكيد" : kind === "prompt" ? "حفظ" : "حسناً");
    cancel.textContent = options.cancelText || "إلغاء";
    cancel.hidden = kind === "alert";
    ok.classList.toggle("danger", kind === "confirm" && options.danger === true);
    let settled = false;
    const cleanup = () => {
      form.removeEventListener("submit", onSubmit);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdrop);
      cancel.removeEventListener("click", onCancelButton);
      activeFinish = null;
    };
    const finish = value => {
      if (settled) return;
      settled = true;
      cleanup();
      if (dialog.open) dialog.close();
      unlockBackgroundScroll();
      resolve(value);
    };
    const onSubmit = event => {
      event.preventDefault();
      finish(kind === "prompt" ? input.value : true);
    };
    const onCancel = event => {
      if (event) event.preventDefault();
      finish(kind === "confirm" ? false : null);
    };
    const onCancelButton = () => finish(kind === "confirm" ? false : null);
    const onBackdrop = event => { if (event.target === dialog) finish(kind === "confirm" ? false : null); };
    activeFinish = finish;
    form.addEventListener("submit", onSubmit);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onBackdrop);
    cancel.addEventListener("click", onCancelButton);
    lockBackgroundScroll();
    dialog.showModal();
    requestAnimationFrame(() => {
      dialog.style.opacity = "1";
      dialog.style.transform = "translateY(0) scale(1)";
      (kind === "prompt" ? input : ok).focus();
      if (kind === "prompt") input.select();
    });
  });
}

window.ui = Object.freeze({
  alert: (message, options = {}) => show("alert", message, options),
  confirm: (message, options = {}) => show("confirm", message, options),
  prompt: (message, defaultValue = "", options = {}) => show("prompt", message, {...options, defaultValue})
});

function ensureNoValidate(root = document) {
  root.querySelectorAll?.("form").forEach(form => {
    form.noValidate = true;
    form.setAttribute("novalidate", "");
  });
}
function fieldContainer(field) {
  return field.closest(".form-field,.midad-auth-field,.px-field") || field.parentElement || field;
}
function errorElement(field) {
  const host = fieldContainer(field);
  let node = host.querySelector(":scope > .midad-field-error");
  if (!node) {
    node = document.createElement("small");
    node.className = "midad-field-error";
    node.setAttribute("aria-live", "polite");
    host.appendChild(node);
  }
  return node;
}
function fieldMessage(field) {
  const value = String(field.value ?? "").trim();
  const host = fieldContainer(field);
  const label = field.labels?.[0]?.textContent?.trim() || host.querySelector("label")?.textContent?.trim() || field.getAttribute("aria-label") || "هذا الحقل";
  if (field.disabled || field.type === "hidden" || field.closest("[hidden]")) return "";
  if (field.required && (field.type === "checkbox" ? !field.checked : field.type === "radio" ? !field.form?.querySelector('input[name="' + CSS.escape(field.name) + '"]:checked') : !value)) return "يرجى إدخال " + label.replace(/[*：:]/g, "").trim() + ".";
  if (!value) return "";
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "أدخل بريداً إلكترونياً صحيحاً.";
  if (field.type === "url") { try { new URL(value); } catch (_) { return "أدخل رابطاً صحيحاً يبدأ بـ https:// أو http://."; } }
  if (field.minLength > 0 && value.length < field.minLength) return "يجب ألا يقل هذا الحقل عن " + field.minLength + " أحرف.";
  if (field.maxLength > 0 && value.length > field.maxLength) return "يجب ألا يزيد هذا الحقل عن " + field.maxLength + " حرفاً.";
  if (field.type === "number") {
    const n = Number(value);
    if (field.min !== "" && n < Number(field.min)) return "القيمة يجب ألا تقل عن " + field.min + ".";
    if (field.max !== "" && n > Number(field.max)) return "القيمة يجب ألا تزيد عن " + field.max + ".";
  }
  if (field.pattern) { try { if (!(new RegExp("^(?:" + field.pattern + ")$")).test(value)) return "تحقق من صيغة البيانات المدخلة."; } catch (_) {} }
  return "";
}
function validate(form) {
  let first = null, valid = true;
  form.querySelectorAll("input,select,textarea").forEach(field => {
    const message = fieldMessage(field);
    const error = errorElement(field);
    error.textContent = message;
    field.classList.toggle("midad-field-invalid", !!message);
    if (message) { valid = false; first ||= field; field.setAttribute("aria-invalid", "true"); }
    else field.removeAttribute("aria-invalid");
  });
  if (first) { first.focus({preventScroll:true}); first.scrollIntoView({behavior:"smooth",block:"center"}); }
  return valid;
}
document.addEventListener("submit", event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  form.noValidate = true;
  form.setAttribute("novalidate", "");
  if (!validate(form)) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
document.addEventListener("input", event => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
  const error = fieldContainer(field).querySelector(":scope > .midad-field-error");
  if (!error) return;
  const message = fieldMessage(field);
  error.textContent = message;
  field.classList.toggle("midad-field-invalid", !!message);
  if (!message) field.removeAttribute("aria-invalid");
}, true);
document.addEventListener("change", event => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
  const error = fieldContainer(field).querySelector(":scope > .midad-field-error");
  if (!error) return;
  const message = fieldMessage(field);
  error.textContent = message;
  field.classList.toggle("midad-field-invalid", !!message);
  if (!message) field.removeAttribute("aria-invalid");
}, true);
ensureNoValidate();
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
  if (node.nodeType === 1) {
    if (node.matches?.("form")) { node.noValidate = true; node.setAttribute("novalidate", ""); }
    ensureNoValidate(node);
  }
}))).observe(document.documentElement, {childList:true,subtree:true});

})();