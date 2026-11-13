(() => {
"use strict";
const KEY="midad_teacher_personal_space_v1:";
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
const identity=()=>window.midadGetTeacherIdentity?.()||("guest-"+(document.getElementById("teacherName")?.textContent||"teacher"));
const fresh=()=>({events:[],notes:[],reminders:[]});
function data(){try{return Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY+identity())||"{}"))}catch(e){return fresh()}}
function saveData(v){try{localStorage.setItem(KEY+identity(),JSON.stringify(v));return true}catch(e){toast("تعذر حفظ المساحة الشخصية في هذا الجهاز.");return false}}
const dateLabel=v=>v?new Date(v+"T12:00:00").toLocaleDateString("ar-DZ",{year:"numeric",month:"short",day:"numeric"}):"";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function row(title,sub,actions){return '<article class="personal-row"><div class="personal-row-copy"><b>'+esc(title)+'</b><small>'+esc(sub||"")+'</small></div><div class="personal-row-actions">'+actions+'</div></article>'}
function personalPage(){
 const d=data(),today=new Date().toISOString().slice(0,10);
 const events=d.events.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.start||"").localeCompare(b.start||""));
 const notes=d.notes.slice().reverse(),reminders=d.reminders.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
 return '<div class="personal-welcome"><div><span class="personal-kicker">مساحة خاصة بالأستاذ</span><h1>منصتي</h1><p>مساحتك الشخصية لتنظيم يومك وملاحظاتك وتنبيهاتك، بعيداً عن مساحة العمل المشتركة.</p></div><button class="btn light" onclick="window.midadPersonalExit()">العودة إلى مساحة العمل</button></div>'+
 '<div class="personal-stats"><div><b>'+events.length+'</b><small>مواعيد الجدول</small></div><div><b>'+notes.length+'</b><small>ملاحظات شخصية</small></div><div><b>'+reminders.filter(x=>!x.done).length+'</b><small>تنبيهات غير مكتملة</small></div></div>'+
 '<div class="personal-grid"><section class="card personal-card"><div class="section-title"><div><h3>جدولي الخاص</h3><p>مواعيدك واجتماعاتك وأعمالك الشخصية</p></div><button class="btn primary small" onclick="window.midadPersonalAdd('event')">＋ إضافة موعد</button></div>'+
 (events.length?events.map(x=>row(x.title,dateLabel(x.date)+(x.start?" · "+x.start:"")+(x.end?" – "+x.end:"")+(x.place?" · "+x.place:""),'<button class="text-link" onclick="window.midadPersonalDelete(\'events\',\''+x.id+'\')">حذف</button>')).join(""):empty("لا توجد مواعيد بعد","أضف أول موعد إلى جدولك الشخصي."))+'</section>'+
 '<section class="card personal-card"><div class="section-title"><div><h3>ملاحظاتي</h3><p>أفكار ومعلومات خاصة لا تظهر للطلاب</p></div><button class="btn primary small" onclick="window.midadPersonalAdd('note')">＋ تدوين ملاحظة</button></div>'+
 (notes.length?notes.map(x=>row(x.title,dateLabel(x.date)+(x.text?" · "+x.text:""),'<button class="text-link" onclick="window.midadPersonalDelete(\'notes\',\''+x.id+'\')">حذف</button>')).join(""):empty("دفتر ملاحظاتك فارغ","دوّن ما تريد الرجوع إليه لاحقاً."))+'</section>'+
 '<section class="card personal-card"><div class="section-title"><div><h3>التنبيهات والتذكيرات</h3><p>تذكيرات تظهر داخل منصتك</p></div><button class="btn primary small" onclick="window.midadPersonalAdd('reminder')">＋ تنبيه جديد</button></div>'+
 (reminders.length?reminders.map(x=>row((x.done?"✓ ":"")+x.title,dateLabel(x.date)+(x.time?" · "+x.time:"")+(x.detail?" · "+x.detail:""),'<button class="text-link" onclick="window.midadPersonalToggle(\''+x.id+'\')">'+(x.done?"إلغاء الإنجاز":"تم")+'</button><button class="text-link" onclick="window.midadPersonalDelete(\'reminders\',\''+x.id+'\')">حذف</button>')).join(""):empty("لا توجد تنبيهات","أنشئ تذكيراً بموعد أو مهمة تريد إنجازها."))+'</section></div>'+
 '<p class="personal-storage-note">خصوصية: تُحفظ هذه البيانات في مساحة تخزين هذا المتصفح وعلى هذا الجهاز، ولا تُضاف إلى بيانات الأقسام أو تُعرض للطلاب.</p>';
}
window.midadPersonalActive=false;
window.midadPersonalOpen=function(){window.midadPersonalActive=true;window.render();window.scrollTo({top:0,behavior:"smooth"})};
window.midadPersonalExit=function(){window.midadPersonalActive=false;window.navigate("home")};
window.midadPersonalAdd=function(kind){
 const labels={event:"إضافة موعد إلى جدولي",note:"تدوين ملاحظة شخصية",reminder:"إضافة تنبيه"};
 const fields=kind==="event"?'<div class="form-field full"><label>عنوان الموعد</label><input name="title" required maxlength="100"></div><div class="form-field"><label>التاريخ</label><input type="date" name="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="form-field"><label>المكان</label><input name="place" maxlength="80" placeholder="اختياري"></div><div class="form-field"><label>من</label><input type="time" name="start"></div><div class="form-field"><label>إلى</label><input type="time" name="end"></div><div class="form-field full"><label>تفاصيل</label><textarea name="detail"></textarea></div>':kind==="note"?'<div class="form-field full"><label>عنوان الملاحظة</label><input name="title" required maxlength="100"></div><div class="form-field full"><label>المحتوى</label><textarea name="text" required style="min-height:130px"></textarea></div>':'<div class="form-field full"><label>عنوان التنبيه</label><input name="title" required maxlength="100"></div><div class="form-field"><label>التاريخ</label><input type="date" name="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="form-field"><label>الوقت</label><input type="time" name="time"></div><div class="form-field full"><label>تفاصيل إضافية</label><textarea name="detail"></textarea></div>';
 openModal(labels[kind],"سيُحفظ هذا العنصر في مساحتك الشخصية فقط.",'<form id="midadPersonalForm"><div class="form-grid">'+fields+'</div><div class="modal-actions"><button class="btn primary">حفظ</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
 document.getElementById("midadPersonalForm").onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries()),d=data();if(kind==="event"&&v.end&&v.start&&v.end<=v.start){toast("تحقق من وقت نهاية الموعد.");return}d[kind==="event"?"events":kind==="note"?"notes":"reminders"].push({id:uid(),...v,done:false,created:new Date().toISOString()});if(saveData(d)){closeModal();window.render();toast("تم الحفظ في منصتك الشخصية.")}};
};
window.midadPersonalDelete=function(kind,id){const d=data();d[kind]=d[kind].filter(x=>x.id!==id);if(saveData(d)){window.render();toast("تم الحذف.")}};
window.midadPersonalToggle=function(id){const d=data(),x=d.reminders.find(v=>v.id===id);if(!x)return;x.done=!x.done;if(saveData(d))window.render()};
const baseRender=window.render;
window.render=function(){if(window.midadPersonalActive){const m=document.getElementById("main");if(m)m.innerHTML=personalPage();return}baseRender()};
const css=document.createElement("style");css.textContent=`
#personalSpaceButton{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #dce8dc;border-radius:13px;background:#edf4ed;color:#286342;font:800 12px Tajawal,Cairo,sans-serif;white-space:nowrap}
#personalSpaceButton svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.personal-welcome{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:25px 27px;margin-bottom:17px;border:1px solid #dce8dc;border-radius:22px;background:linear-gradient(125deg,#f8fcf8,#eaf2ea)}
.personal-kicker{font-size:11px;font-weight:900;color:#548064}.personal-welcome h1{font-size:29px;color:#244c34;margin:5px 0}.personal-welcome p{margin:0;color:#718276;font-size:12px;line-height:1.8}
.personal-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:17px}.personal-stats>div{padding:16px;background:#fff;border:1px solid #e2eae2;border-radius:17px;display:grid;gap:4px}.personal-stats b{font-size:23px;color:#2b6543}.personal-stats small{font-size:11px;color:#78877b}
.personal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.personal-card{border-color:#e0e9e0}.personal-card h3{color:#2b5138}.personal-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #edf1ed}.personal-row:last-child{border-bottom:0}.personal-row-copy{min-width:0;display:grid;gap:4px}.personal-row-copy b{font-size:13px;color:#314b39}.personal-row-copy small{font-size:11px;line-height:1.7;color:#7b897e;overflow-wrap:anywhere}.personal-row-actions{display:flex;align-items:center;gap:8px;flex:none}.personal-storage-note{font-size:11px;color:#7d897f;line-height:1.8;margin:16px 3px}
@media(max-width:760px){#personalSpaceButton{padding:8px 9px;font-size:11px}.personal-welcome{align-items:flex-start;flex-direction:column;padding:20px}.personal-welcome .btn{width:100%}.personal-grid{grid-template-columns:1fr}.personal-stats{gap:8px}.personal-stats>div{padding:12px 9px}.personal-stats b{font-size:20px}.personal-stats small{font-size:10px}.personal-row{align-items:flex-start}.personal-row-actions{flex-direction:column;align-items:flex-end}}
`;document.head.appendChild(css);
})();
