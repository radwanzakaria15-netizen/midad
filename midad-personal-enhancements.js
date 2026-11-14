(() => {
"use strict";
const K="midad_teacher_personal_space_v1:";
const who=()=>window.midadGetTeacherIdentity?.()||("guest-"+(document.getElementById("teacherName")?.textContent||"teacher"));
const read=()=>{try{return Object.assign({personalTables:[],timetableImages:[]},JSON.parse(localStorage.getItem(K+who())||"{}"))}catch(e){return {personalTables:[],timetableImages:[]}}};
const write=d=>{try{localStorage.setItem(K+who(),JSON.stringify(d));return true}catch(e){toast("تعذر الحفظ على هذا الجهاز.");return false}};
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
const uid=()=>"pt-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let clock=null,seen=new Set(),table=null;
function store(file,key){return new Promise((ok,no)=>{let q=indexedDB.open("midad-files-v1",1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains("files"))q.result.createObjectStore("files")};q.onsuccess=()=>{let tx=q.result.transaction("files","readwrite");tx.objectStore("files").put(file,key);tx.oncomplete=()=>ok();tx.onerror=()=>no(tx.error)};q.onerror=()=>no(q.error)})}
function load(key){return new Promise((ok,no)=>{let q=indexedDB.open("midad-files-v1",1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains("files"))q.result.createObjectStore("files")};q.onsuccess=()=>{let r=q.result.transaction("files").objectStore("files").get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)};q.onerror=()=>no(q.error)})}
function block(d){return '<div class="px-personal-timetable"><div class="px-sub"><b>جدولي الشخصي</b><small>صورة أو جدول قابل للتحرير</small></div><div class="px-table-actions"><button class="btn primary small" onclick="window.midadPersonalTableEditor()">إنشاء جدول</button><label class="btn light small" for="pxTimetableImage">رفع صورة الجدول</label><input id="pxTimetableImage" type="file" accept="image/*" hidden onchange="window.midadPersonalUploadTableImage(this)"></div>'+(d.personalTables||[]).map(t=>'<article class="px-personal-table-card"><b>'+esc(t.title)+'</b><button class="px-action" onclick="window.midadPersonalTableEditor(\''+t.id+'\')">تعديل</button><button class="px-action" onclick="window.midadPersonalDeleteTable(\''+t.id+'\')">حذف</button></article>').join("")+(d.timetableImages||[]).map(x=>'<article class="px-personal-table-card"><b>'+esc(x.name)+'</b><button class="px-action" onclick="window.midadPersonalOpenTableImage(\''+x.id+'\')">عرض</button><button class="px-action" onclick="window.midadPersonalDeleteTableImage(\''+x.id+'\')">حذف</button></article>').join("")+'</div>'}
function enhance(){if(!window.midadPersonalActive)return;let p=document.querySelector(".px-panel");if(p&&!p.querySelector(".px-personal-timetable")){let a=p.querySelector(".px-sub");if(a)a.insertAdjacentHTML("beforebegin",block(read()))}}
window.midadPersonalUploadTableImage=async input=>{let f=input.files?.[0];if(!f)return;if(!f.type.startsWith("image/")||f.size>12*1024*1024){toast("اختر صورة لا يتجاوز حجمها 12 ميغابايت.");input.value="";return}let key="px-table-"+uid();try{await store(f,key);let d=read();d.timetableImages.push({id:uid(),key,name:f.name});if(write(d)){window.render();toast("تم حفظ صورة الجدول.")}}catch(e){toast("تعذر حفظ الصورة.")}input.value=""};
window.midadPersonalOpenTableImage=async id=>{let x=read().timetableImages.find(v=>v.id===id);if(!x)return;try{let b=await load(x.key),u=URL.createObjectURL(b);window.open(u,"_blank");setTimeout(()=>URL.revokeObjectURL(u),60000)}catch(e){toast("تعذر فتح الصورة.")}};
window.midadPersonalDeleteTableImage=id=>{let d=read();d.timetableImages=d.timetableImages.filter(x=>x.id!==id);if(write(d))window.render()};
window.midadPersonalDeleteTable=id=>{let d=read();d.personalTables=d.personalTables.filter(x=>x.id!==id);if(write(d))window.render()};
window.midadPersonalTableEditor=id=>{let d=read(),old=d.personalTables.find(x=>x.id===id);table=(table&&table.id===id)?JSON.parse(JSON.stringify(table)):(old?JSON.parse(JSON.stringify(old)):{id:uid(),title:"جدولي الأسبوعي",days:["الأحد","الإثنين","الأربعاء","الخميس"],rows:[{time:"08:00 - 09:00",cells:["","","",""]},{time:"09:00 - 10:00",cells:["","","",""]}]});let draw=()=>'<div class="px-word-editor"><input id="pxWordTitle" class="px-word-title" value="'+esc(table.title)+'"><div class="px-word-tools"><button type="button" class="tool" onclick="window.midadPersonalTableRow()">＋ صف</button><button type="button" class="tool" onclick="window.midadPersonalTableCol()">＋ عمود</button></div><div class="table-wrap"><table class="px-word-grid"><thead><tr><th>الوقت</th>'+table.days.map((v,i)=>'<th><input data-day="'+i+'" value="'+esc(v)+'"></th>').join("")+'</tr></thead><tbody>'+table.rows.map((r,i)=>'<tr><th><input data-time="'+i+'" value="'+esc(r.time)+'"></th>'+table.days.map((v,j)=>'<td><textarea data-cell="'+i+'-'+j+'">'+esc(r.cells[j]||"")+'</textarea></td>').join("")+'</tr>').join("")+'</tbody></table></div></div>';let sync=()=>{let m=document.querySelector(".modal");table.title=document.getElementById("pxWordTitle").value;table.days=[...m.querySelectorAll("[data-day]")].map(x=>x.value);table.rows=table.rows.map((r,i)=>({time:m.querySelector('[data-time="'+i+'"]').value,cells:table.days.map((v,j)=>m.querySelector('[data-cell="'+i+'-'+j+'"]').value)}))};window.midadPersonalTableRow=()=>{sync();table.rows.push({time:"",cells:table.days.map(()=> "")});window.midadPersonalTableEditor(table.id)};window.midadPersonalTableCol=()=>{sync();table.days.push("يوم جديد");table.rows.forEach(r=>r.cells.push(""));window.midadPersonalTableEditor(table.id)};openModal(old?"تعديل جدول شخصي":"إنشاء جدول شخصي","حرّر الجدول مباشرة بأسلوب قريب من Word.",'<div>'+draw()+'</div><div class="modal-actions"><button class="btn primary" id="pxSaveWord">حفظ الجدول</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div>',true);document.getElementById("pxSaveWord").onclick=()=>{sync();let n=read(),i=n.personalTables.findIndex(x=>x.id===table.id);if(i<0)n.personalTables.push(table);else n.personalTables[i]=table;if(write(n)){closeModal();window.render();toast("تم حفظ الجدول.")}}};
async function permission(){
 if(!("Notification" in window)){toast("هذا المتصفح لا يدعم إشعارات الجهاز.");return false}
 if(!window.isSecureContext){toast("يجب فتح مِداد عبر اتصال آمن HTTPS لتفعيل الإشعارات.");return false}
 let p=Notification.permission;
 try{if(p==="default")p=await Notification.requestPermission()}catch(e){toast("تعذر طلب إذن الإشعارات من المتصفح.");return false}
 if(p!=="granted"){toast(p==="denied"?"الإشعارات محظورة من إعدادات المتصفح. اسمح بها لموقع مِداد ثم أعد المحاولة.":"لم تمنح إذن إشعارات الجهاز.");return false}
 if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("./midad-notifications-sw.js",{scope:"./"});await navigator.serviceWorker.ready}catch(e){toast("تم السماح بالإشعارات، لكن تعذر تجهيز خدمة إشعارات الخلفية.");return false}}
 toast("تم تفعيل إذن الإشعارات. ستعمل المواعيد ما دامت المنصة مفتوحة أو مسموحاً لها بالعمل في الخلفية.");
 return true;
}
window.midadPersonalEnableNotifications=permission;
window.midadPersonalTestNotification=async function(){
 try{navigator.vibrate?.([300,120,300,120,600])}catch(e){}
 const ok=await permission();if(!ok)return;
 const sent=await notify({id:"manual-test-"+Date.now(),title:"اختبار إشعارات مِداد",detail:"إذا ظهر هذا الإشعار، فإن إذن الإشعارات يعمل على هذا الجهاز."});
 if(sent)toast("أُرسل إشعار الاختبار. إذا لم يصدر اهتزاز، فتحقق من إعدادات إشعارات الموقع والهزّاز في Android.");
 else toast("تعذر إرسال الإشعار. تحقق من أذونات مِداد وإعدادات المتصفح.");
};
async function notify(x){
 if(!("Notification" in window)||Notification.permission!=="granted")return false;
 const vibration=[300,120,300,120,600],opts={body:x.detail||"حان موعد التذكير.",tag:"midad-"+x.id,renotify:true,vibrate:vibration,requireInteraction:true,silent:false,timestamp:Date.now(),data:{url:"./"}};
 try{
  if("serviceWorker" in navigator){
   let reg=await navigator.serviceWorker.getRegistration("./");
   if(!reg)reg=await navigator.serviceWorker.register("./midad-notifications-sw.js",{scope:"./"});
   await navigator.serviceWorker.ready;
   await reg.showNotification(x.title,opts);
  }else new Notification(x.title,opts);
  try{navigator.vibrate?.(vibration)}catch(e){}
  try{if(navigator.setAppBadge)await navigator.setAppBadge(1)}catch(e){}
  return true;
 }catch(error){
  console.error("Midad notification failed:",error);
  try{new Notification(x.title,opts);try{navigator.vibrate?.(vibration)}catch(e){}return true}
  catch(fallbackError){console.error("Midad notification fallback failed:",fallbackError);return false}
 }
}
async function check(){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 const d=read(),now=new Date(),date=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0"),time=now.toTimeString().slice(0,5);
 d.notifiedAlerts=Array.isArray(d.notifiedAlerts)?d.notifiedAlerts:[];
 const smart=typeof window.midadPersonalGetSmartAlerts==="function"?window.midadPersonalGetSmartAlerts():[];
 for(const alert of smart){
  if(d.notifiedAlerts.includes(alert.id))continue;
  const sent=await notify({id:"smart-"+alert.id,title:alert.title,detail:alert.detail});
  if(sent){d.notifiedAlerts.push(alert.id);write(d)}
 }
 for(const x of (d.reminders||[])){if(x.done||x.firedAt||!x.date||!x.time||x.date!==date||x.time>time)continue;const k=x.id+date+x.time;if(seen.has(k))continue;seen.add(k);const sent=await notify({id:k,title:(x.type==="alarm"?"حان موعد المنبّه: ":"حان موعد التذكير: ")+x.title,detail:x.detail});if(sent){x.firedAt=new Date().toISOString();write(d)}else seen.delete(k)}
}
const base=window.render;window.render=function(){base();enhance()};
const open=window.midadPersonalOpen;window.midadPersonalOpen=function(){open();if(!clock)clock=setInterval(check,15000);setTimeout(enhance,0);check()};
if(!clock)clock=setInterval(check,15000);
window.addEventListener("focus",check);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
setTimeout(check,1200);


const css=document.createElement("style");css.textContent='.px-personal-timetable{padding:13px;margin-bottom:17px;border:1px solid #dce8e3;border-radius:15px;background:#f6faf8}.px-table-actions,.px-word-tools{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.px-personal-table-card{display:flex;align-items:center;gap:10px;padding:9px;margin-top:7px;border:1px solid #e5eaf0;border-radius:11px;background:#fff}.px-personal-table-card b{flex:1;font-size:12px}.px-word-editor{padding:10px;background:#fff;border:1px solid #dbe2e8;border-radius:10px}.px-word-title{width:100%;padding:9px;text-align:center;border:0;border-bottom:1px solid #dbe2e8;font-size:18px;font-weight:900}.px-word-grid{min-width:650px;table-layout:fixed}.px-word-grid th,.px-word-grid td{border:1px solid #cbd5dd;padding:5px}.px-word-grid input,.px-word-grid textarea{width:100%;min-width:0;border:1px solid #e0e6eb;border-radius:5px;padding:6px;text-align:center}.px-word-grid textarea{min-height:48px;text-align:right}.px-notes{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:9px!important}.px-note{min-height:125px!important;padding:10px!important}.px-note h3{font-size:12px!important;margin:6px 0!important}.px-note p{font-size:10px!important;line-height:1.55!important;max-height:52px;overflow:auto}.px-event{padding-right:48px!important;position:relative}.px-event:before{content:"◷";position:absolute;right:10px;top:12px;width:29px;height:29px;border-radius:10px;background:#e8f0ff;color:#587eae;display:grid;place-items:center;font-size:17px}.px-event:has(.px-check):before{content:"♧";background:#f0eafa;color:#8a6caf}.px-alert{padding-right:48px!important;position:relative}.px-alert:before{content:"♧";position:absolute;right:12px;top:14px;width:27px;height:27px;border-radius:9px;background:#ffedcf;color:#a8793d;display:grid;place-items:center}@media(max-width:760px){.px-notes{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:390px){.px-notes{grid-template-columns:1fr!important}}';document.head.appendChild(css);
if("serviceWorker" in navigator)navigator.serviceWorker.register("./midad-notifications-sw.js").catch(()=>{});clock=setInterval(check,15000);check();
})();


/* Refined notes & private reminders UI */
(() => {
  "use strict";
  const style = document.createElement("style");
  style.id = "midad-private-notes-reminders-pro";
  style.textContent = `
    .midad-personal-mode .px-panel:has(.px-notes),
    .midad-personal-mode .px-panel:has(.px-alerts) {
      border-color:#e3e9e7;
      background:linear-gradient(180deg,#fff 0%,#fcfdfd 100%);
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header,
    .midad-personal-mode .px-panel:has(.px-alerts)>header {
      display:flex;align-items:center;gap:12px;
      padding:2px 0 16px;margin-bottom:17px;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:before,
    .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
      content:"";width:42px;height:42px;flex:0 0 42px;
      border-radius:14px;background:#f0eaff;
      box-shadow:inset 0 0 0 1px #e7defa;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:before {
      background:#f0eaff;
      background-image:linear-gradient(135deg,transparent 44%,#8b70bd 45%,#8b70bd 49%,transparent 50%);
    }
    .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
      background:#fff1e5;
      box-shadow:inset 0 0 0 1px #f5e2d0;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header>div,
    .midad-personal-mode .px-panel:has(.px-alerts)>header>div {min-width:0}
    .midad-personal-mode .px-notes {
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:13px!important;
    }
    .midad-personal-mode .px-note {
      position:relative;min-width:0;min-height:205px!important;
      padding:16px 16px 12px!important;
      border:1px solid #e8e9ef!important;
      border-right:4px solid var(--nc)!important;
      border-radius:16px!important;
      background:linear-gradient(145deg,#fff 0%,#fbfbfd 100%)!important;
      box-shadow:0 5px 16px rgba(40,48,68,.045);
      transition:transform .2s ease,box-shadow .2s ease;
    }
    .midad-personal-mode .px-note:hover {
      transform:translateY(-3px);
      box-shadow:0 12px 24px rgba(40,48,68,.09);
    }
    .midad-personal-mode .px-note>small {
      display:inline-flex;align-items:center;gap:5px;
      padding:5px 9px;border-radius:20px;
      background:#f1eff8;color:#75658f;
      font-size:10px;font-weight:800;
    }
    .midad-personal-mode .px-note h3 {
      margin:12px 0 7px!important;
      color:#303d4b;font-size:15px!important;line-height:1.5;
    }
    .midad-personal-mode .px-note p {
      max-height:94px!important;overflow:auto;
      color:#6f7b88;font-size:12px!important;
      line-height:1.85!important;
      scrollbar-width:thin;
    }
    .midad-personal-mode .px-note footer {
      justify-content:flex-start;flex-wrap:wrap;gap:6px;
      margin-top:10px;padding-top:10px;
      border-top:1px solid #edf0f3;
    }
    .midad-personal-mode .px-note footer .px-action {
      padding:6px 10px;border:1px solid #e8eaf0;
      border-radius:9px;background:#fff;color:#63758a;
      font-size:10px;transition:background .18s ease;
    }
    .midad-personal-mode .px-note footer .px-action:hover {
      background:#f2f4f8;color:#42566d;
    }
    .midad-personal-mode .px-panel:has(.px-notes) .px-sub,
    .midad-personal-mode .px-panel:has(.px-alerts) .px-sub {
      margin:4px 0 14px;
    }
    .midad-personal-mode .px-panel:has(.px-notes) .px-sub>b,
    .midad-personal-mode .px-panel:has(.px-alerts) .px-sub>b {
      font-size:14px;color:#354b57;
    }
    .midad-personal-mode .px-event {
      min-height:78px;margin:9px 0!important;padding:13px 54px 13px 13px!important;
      border:1px solid #e8edf1!important;border-radius:15px!important;
      background:linear-gradient(110deg,#fff 0%,#fbfcfe 100%);
      box-shadow:0 4px 13px rgba(43,62,78,.035);
      transition:border-color .18s ease,transform .18s ease;
    }
    .midad-personal-mode .px-event:hover {
      border-color:#d7e2e8!important;transform:translateX(-2px);
    }
    .midad-personal-mode .px-event:before {
      right:13px;top:17px;width:30px;height:30px;
      border-radius:10px;background:#eaf2fb;color:#547da5;
      font-size:15px;font-weight:800;
    }
    .midad-personal-mode .px-event:has(.px-check):before {
      content:"✓";background:#f0ebfa;color:#8069a8;
    }
    .midad-personal-mode .px-event b {
      color:#344a59;font-size:13px;line-height:1.5;
    }
    .midad-personal-mode .px-event small {
      display:inline-flex;flex-wrap:wrap;gap:5px;
      margin-top:6px;color:#6e8291;font-size:11px;
    }
    .midad-personal-mode .px-event p {
      margin-top:6px;color:#87939c;font-size:11px;line-height:1.7;
    }
    .midad-personal-mode .px-event .px-check {
      width:24px;height:24px;flex:0 0 24px;
      border:1px solid #d8dfe6;border-radius:8px;
      background:#fff;color:#557c66;
    }
    .midad-personal-mode .px-event .px-action {
      padding:6px 10px;border:1px solid #e7ebef;
      border-radius:9px;background:#fff;color:#627b8b;
      font-size:10px;
    }
    .midad-personal-mode .px-alert {
      min-height:76px;padding:14px 52px 14px 14px!important;
      border-radius:15px;border-width:1px;
      box-shadow:0 4px 14px rgba(60,68,76,.04);
    }
    .midad-personal-mode .px-alert:before {
      right:13px;top:17px;width:28px;height:28px;
      border-radius:9px;font-size:14px;
    }
    .midad-personal-mode .px-alert b {font-size:13px}
    .midad-personal-mode .px-alert p {font-size:11px;line-height:1.65}
    .midad-personal-mode .px-alert .btn {
      border:1px solid #e4e9ed;background:#fff;
      box-shadow:none;color:#5b7180;
    }
    .midad-personal-mode .px-separate {
      margin-top:23px;padding-top:17px;border-top:1px solid #edf0f3;
    }
    @media(max-width:760px) {
      .midad-personal-mode .px-notes {grid-template-columns:1fr!important;gap:10px!important}
      .midad-personal-mode .px-note {min-height:0!important;padding:14px!important}
      .midad-personal-mode .px-note p {max-height:110px!important}
      .midad-personal-mode .px-event {padding-left:9px!important;gap:8px}
      .midad-personal-mode .px-event .px-action {margin-right:0}
      .midad-personal-mode .px-panel:has(.px-notes)>header,
      .midad-personal-mode .px-panel:has(.px-alerts)>header {gap:9px}
    }
    @media(prefers-reduced-motion:reduce) {
      .midad-personal-mode .px-note,.midad-personal-mode .px-event {transition:none}
      .midad-personal-mode .px-note:hover,.midad-personal-mode .px-event:hover {transform:none}
    }
  `;
  document.head.appendChild(style);
})();


/* Notes & reminders — editorial workspace redesign v2 */
(() => {
  "use strict";
  if (document.getElementById("midad-notes-reminders-v2")) return;
  const style = document.createElement("style");
  style.id = "midad-notes-reminders-v2";
  style.textContent = `
    .midad-personal-mode .px-panel:has(.px-notes),
    .midad-personal-mode .px-panel:has(.px-alerts) {
      background:#fbfcfd;
      border:1px solid #e5eaf0;
      border-radius:24px;
      box-shadow:0 10px 30px rgba(35,52,74,.045);
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header,
    .midad-personal-mode .px-panel:has(.px-alerts)>header {
      position:relative;
      padding:5px 4px 17px 58px;
      border-bottom:1px solid #e9edf2;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:before,
    .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
      content:"";
      position:absolute;right:0;top:2px;
      width:42px;height:42px;border-radius:13px;
      background:#eeeafa;border:1px solid #e4def4;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:after,
    .midad-personal-mode .px-panel:has(.px-alerts)>header:after {
      position:absolute;right:12px;top:12px;
      font-size:17px;font-weight:800;color:#7764a2;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:after {content:"✎"}
    .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
      background:#eaf2f8;border-color:#dce8f1;
    }
    .midad-personal-mode .px-panel:has(.px-alerts)>header:after {
      content:"◷";color:#547b9a;
    }
    .midad-personal-mode .px-panel>header h2 {
      color:#293d50;font-size:20px;letter-spacing:-.2px;
    }
    .midad-personal-mode .px-panel>header p {
      color:#8794a1;font-size:11px;
    }
    .midad-personal-mode .px-panel:has(.px-notes) .px-sub,
    .midad-personal-mode .px-panel:has(.px-alerts) .px-sub {
      margin:18px 0 13px;
    }
    .midad-personal-mode .px-panel:has(.px-notes) .px-sub>b,
    .midad-personal-mode .px-panel:has(.px-alerts) .px-sub>b {
      color:#3d5368;font-size:13px;
    }
    .midad-personal-mode .px-panel:has(.px-notes) .px-sub .btn,
    .midad-personal-mode .px-panel:has(.px-alerts) .px-sub .btn {
      border-radius:11px;padding:9px 13px;
      background:#344f68;color:#fff;border:0;
      box-shadow:0 5px 12px rgba(52,79,104,.13);
    }

    /* Notes: clean paper cards with an editorial information hierarchy */
    .midad-personal-mode .px-notes {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:13px!important;
    }
    .midad-personal-mode .px-notes .px-note {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      grid-template-rows:auto auto 1fr auto;
      gap:0 10px;
      min-height:190px!important;
      padding:16px 17px 12px!important;
      position:relative;overflow:hidden;
      border:1px solid #e5eaf0!important;
      border-radius:16px!important;
      border-right:3px solid var(--nc)!important;
      background:
        linear-gradient(90deg,transparent 0,transparent 26px,#f0f3f6 27px,transparent 28px),
        repeating-linear-gradient(to bottom,#fff 0,#fff 27px,#f1f4f7 28px,#fff 29px)!important;
      box-shadow:0 4px 14px rgba(40,57,76,.035);
      transform:none!important;
      transition:border-color .18s ease,box-shadow .18s ease;
    }
    .midad-personal-mode .px-notes .px-note:before {
      content:"";
      position:absolute;right:0;top:0;bottom:0;width:3px;
      background:var(--nc);
    }
    .midad-personal-mode .px-notes .px-note:hover {
      border-color:#d5dee7!important;
      box-shadow:0 10px 23px rgba(40,57,76,.075);
    }
    .midad-personal-mode .px-notes .px-note>small {
      grid-column:1/-1;grid-row:1;
      justify-self:start;
      display:inline-flex;align-items:center;
      padding:4px 9px;margin-bottom:8px;
      border:1px solid #e7ebf0;border-radius:7px;
      background:#f5f7fa;color:#697b8d;
      font-size:10px;font-weight:800;
    }
    .midad-personal-mode .px-notes .px-note h3 {
      grid-column:1;grid-row:2;
      margin:0 0 6px!important;
      color:#30465a;font-size:14px!important;
      line-height:1.6;
    }
    .midad-personal-mode .px-notes .px-note p {
      grid-column:1/-1;grid-row:3;
      margin:0 0 10px!important;
      max-height:92px!important;overflow:auto;
      color:#68798a;font-size:11px!important;
      line-height:1.95!important;
      white-space:pre-wrap;
    }
    .midad-personal-mode .px-notes .px-note footer {
      grid-column:1/-1;grid-row:4;
      display:flex;align-items:center;justify-content:flex-start;
      flex-wrap:wrap;gap:5px;
      margin:0;padding-top:9px;
      border-top:1px solid #e9edf1;
    }
    .midad-personal-mode .px-notes .px-note footer .px-action {
      padding:6px 10px;border:1px solid #e3e8ee;
      border-radius:8px;background:#fff;color:#63788c;
      font-size:10px;font-weight:700;
    }
    .midad-personal-mode .px-notes .px-note footer .px-action:hover {
      background:#edf3f7;color:#34546f;
    }

    /* Reminders: compact agenda rows with a clear action area */
    .midad-personal-mode .px-panel .px-event:has(.px-check) {
      display:grid;
      grid-template-columns:28px minmax(0,1fr) auto auto;
      align-items:center;gap:10px;
      min-height:76px;margin:8px 0!important;
      padding:12px 13px!important;
      border:1px solid #e5eaf0!important;
      border-radius:14px!important;
      border-right:3px solid #9db7ca!important;
      background:#fff!important;
      box-shadow:0 3px 12px rgba(42,61,80,.035);
      transform:none!important;
      transition:border-color .18s ease,box-shadow .18s ease;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check):hover {
      border-color:#cbd9e5!important;
      box-shadow:0 8px 18px rgba(42,61,80,.065);
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check):before {display:none!important}
    .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-check {
      grid-column:1;grid-row:1;
      width:25px;height:25px;min-width:25px;
      border:1px solid #cbd8e2;border-radius:8px;
      background:#f6f9fb;color:#47745d;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check)>div:first-of-type {
      grid-column:2;grid-row:1;
      min-width:0;width:auto;flex:none;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check) b {
      color:#30485d;font-size:12px;line-height:1.6;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check) small {
      display:block;margin-top:4px;color:#64829a;
      font-size:10px;line-height:1.6;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check) p {
      margin:4px 0 0;color:#8996a2;
      font-size:10px;line-height:1.65;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-action {
      grid-row:1;align-self:center;
      padding:7px 10px;border:1px solid #e4eaf0;
      border-radius:8px;background:#f9fbfc;
      color:#637b8e;font-size:10px;white-space:nowrap;
    }
    .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-action:hover {
      background:#edf3f7;color:#34546f;
    }

    /* System alerts */
    .midad-personal-mode .px-panel .px-alert {
      display:grid;grid-template-columns:minmax(0,1fr) auto;
      align-items:center;gap:12px;
      min-height:72px;margin:8px 0;
      padding:13px 15px!important;
      border:1px solid #e9e5d9;border-right:3px solid #c5a879;
      border-radius:14px;background:#fffdf8;
      box-shadow:none;
    }
    .midad-personal-mode .px-panel .px-alert.lesson {
      background:#f8fbfe;border-color:#e1eaf2;border-right-color:#86a9c4;
    }
    .midad-personal-mode .px-panel .px-alert:before {display:none!important}
    .midad-personal-mode .px-panel .px-alert b {color:#5d5748;font-size:12px}
    .midad-personal-mode .px-panel .px-alert.lesson b {color:#3d5d78}
    .midad-personal-mode .px-panel .px-alert p {color:#8a8375;font-size:10px;line-height:1.7}
    .midad-personal-mode .px-panel .px-alert.lesson p {color:#788d9f}
    .midad-personal-mode .px-panel .px-alert .btn {
      border:1px solid #e6e9ed;background:#fff;
      color:#61788a;box-shadow:none;border-radius:9px;
    }

    .midad-personal-mode .px-panel .px-empty {
      padding:25px 16px;border:1px dashed #d9e2e9;
      border-radius:14px;background:#f8fafc;
    }
    .midad-personal-mode .px-panel .px-empty b {color:#526b80}
    .midad-personal-mode .px-panel .px-empty span {color:#8a99a7}
    @media(max-width:760px) {
      .midad-personal-mode .px-notes {grid-template-columns:1fr!important;gap:10px!important}
      .midad-personal-mode .px-notes .px-note {min-height:0!important;padding:14px!important}
      .midad-personal-mode .px-panel .px-event:has(.px-check) {
        grid-template-columns:27px minmax(0,1fr) auto;
        gap:8px;padding:11px 9px!important;
      }
      .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-action {
        grid-row:2;grid-column:2;justify-self:start;
      }
      .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-action:last-child {
        grid-column:3;grid-row:2;
      }
      .midad-personal-mode .px-panel .px-event:has(.px-check)>div:first-of-type {
        grid-column:2/-1;grid-row:1;
      }
      .midad-personal-mode .px-panel .px-event:has(.px-check)>.px-check {grid-row:1}
      .midad-personal-mode .px-panel .px-alert {grid-template-columns:1fr}
      .midad-personal-mode .px-panel .px-alert .btn {justify-self:start}
      .midad-personal-mode .px-panel:has(.px-notes)>header,
      .midad-personal-mode .px-panel:has(.px-alerts)>header {padding-right:53px}
    }
    @media(prefers-reduced-motion:reduce) {
      .midad-personal-mode .px-notes .px-note,
      .midad-personal-mode .px-panel .px-event:has(.px-check) {transition:none}
    }
  `;
  document.head.appendChild(style);
})();


/* Header icon alignment — notes and reminders */
(() => {
  "use strict";
  if (document.getElementById("midad-notes-reminders-header-icons")) return;
  const style = document.createElement("style");
  style.id = "midad-notes-reminders-header-icons";
  style.textContent = `
    .midad-personal-mode .px-panel:has(.px-notes)>header,
    .midad-personal-mode .px-panel:has(.px-alerts)>header {
      min-height:60px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:flex-start;
      gap:3px;
      padding:5px 62px 15px 4px!important;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:before,
    .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
      right:0;top:5px;
      width:48px;height:48px;
      border-radius:15px;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:after,
    .midad-personal-mode .px-panel:has(.px-alerts)>header:after {
      content:"";
      position:absolute;
      right:11px;top:16px;
      width:26px;height:26px;
      display:block;
      font-size:0;
      background-repeat:no-repeat;
      background-position:center;
      background-size:contain;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header:after {
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237765a2' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 2-1.5Z'/%3E%3Cpath d='M14.5 3.8V8H19M8.5 12h7M8.5 16h7'/%3E%3C/svg%3E");
    }
    .midad-personal-mode .px-panel:has(.px-alerts)>header:after {
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23547796' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5l3.5 2'/%3E%3C/svg%3E");
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header h2,
    .midad-personal-mode .px-panel:has(.px-alerts)>header h2 {
      margin:0!important;
      line-height:1.35;
    }
    .midad-personal-mode .px-panel:has(.px-notes)>header p,
    .midad-personal-mode .px-panel:has(.px-alerts)>header p {
      margin:0!important;
      line-height:1.6;
    }
    @media(max-width:760px) {
      .midad-personal-mode .px-panel:has(.px-notes)>header,
      .midad-personal-mode .px-panel:has(.px-alerts)>header {
        min-height:58px;
        padding-right:59px!important;
      }
      .midad-personal-mode .px-panel:has(.px-notes)>header:before,
      .midad-personal-mode .px-panel:has(.px-alerts)>header:before {
        width:45px;height:45px;
      }
      .midad-personal-mode .px-panel:has(.px-notes)>header:after,
      .midad-personal-mode .px-panel:has(.px-alerts)>header:after {
        right:10px;top:15px;width:25px;height:25px;
      }
    }
  `;
  document.head.appendChild(style);
})();


/* Reliable entry point for the personal workspace button */
(() => {
  const button = document.getElementById("personalSpaceButton");
  if (!button) return;
  button.addEventListener("click", event => {
    event.preventDefault();
    try {
      window.midadPersonalActive = true;
      document.body.classList.add("midad-personal-mode");
      document.querySelector(".mobile-nav")?.setAttribute("aria-hidden", "true");
      if (typeof window.render === "function") window.render();
      else throw new Error("Midad render function is unavailable");
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}
      if (typeof check === "function") check();
    } catch (error) {
      console.error("Midad personal workspace open failed:", error);
      window.midadPersonalActive = false;
      document.body.classList.remove("midad-personal-mode");
      document.querySelector(".mobile-nav")?.removeAttribute("aria-hidden");
      if (typeof toast === "function") toast("تعذر فتح منصتي. حدّث الصفحة وحاول مجدداً.");
    }
  });
})();
