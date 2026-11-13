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
async function permission(){if(!("Notification" in window)){toast("المتصفح لا يدعم الإشعارات.");return false}let p=Notification.permission;if(p==="default")p=await Notification.requestPermission();if(p!=="granted"){toast("لم يتم السماح بإشعارات الجهاز.");return false}try{if("serviceWorker" in navigator)await navigator.serviceWorker.register("./midad-notifications-sw.js")}catch(e){}toast("تم تفعيل إشعارات الجهاز. يلزم إبقاء مِداد مفتوحاً لمواعيد التذكير.");return true}
window.midadPersonalEnableNotifications=permission;
async function notify(x){if(!("Notification" in window)||Notification.permission!=="granted")return;let opts={body:x.detail||"حان موعد التذكير.",tag:"midad-"+x.id,renotify:false,vibrate:[250,120,250,120,450],requireInteraction:true};try{let reg=await navigator.serviceWorker?.getRegistration("./");if(reg?.showNotification)await reg.showNotification(x.title,opts);else{new Notification(x.title,opts);navigator.vibrate?.([250,120,250,120,450])}}catch(e){}}
function check(){let d=read(),now=new Date(),date=now.toISOString().slice(0,10),time=now.toTimeString().slice(0,5);(d.reminders||[]).forEach(x=>{if(!x.done&&x.date===date&&x.time&&x.time<=time){let k=x.id+date+x.time;if(!seen.has(k)){seen.add(k);notify({id:k,title:"حان موعد: "+x.title,detail:x.detail})}}})}
const base=window.render;window.render=function(){base();enhance()};
const open=window.midadPersonalOpen;window.midadPersonalOpen=function(){open();if(clock)clearInterval(clock);clock=setInterval(check,15000);setTimeout(enhance,0);check()};

const add=window.midadPersonalAdd;window.midadPersonalAdd=function(k){if(k==="reminder")permission();add(k)};
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
