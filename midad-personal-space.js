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
 '<div class="personal-grid"><section class="card personal-card"><div class="section-title"><div><h3>جدولي الخاص</h3><p>مواعيدك واجتماعاتك وأعمالك الشخصية</p></div><button class="btn primary small" onclick="window.midadPersonalAdd(&#39;event&#39;)">＋ إضافة موعد</button></div>'+
 (events.length?events.map(x=>row(x.title,dateLabel(x.date)+(x.start?" · "+x.start:"")+(x.end?" – "+x.end:"")+(x.place?" · "+x.place:""),'<button class="text-link" onclick="window.midadPersonalDelete(\'events\',\''+x.id+'\')">حذف</button>')).join(""):empty("لا توجد مواعيد بعد","أضف أول موعد إلى جدولك الشخصي."))+'</section>'+
 '<section class="card personal-card"><div class="section-title"><div><h3>ملاحظاتي</h3><p>أفكار ومعلومات خاصة لا تظهر للطلاب</p></div><button class="btn primary small" onclick="window.midadPersonalAdd(&#39;note&#39;)">＋ تدوين ملاحظة</button></div>'+
 (notes.length?notes.map(x=>row(x.title,dateLabel(x.date)+(x.text?" · "+x.text:""),'<button class="text-link" onclick="window.midadPersonalDelete(\'notes\',\''+x.id+'\')">حذف</button>')).join(""):empty("دفتر ملاحظاتك فارغ","دوّن ما تريد الرجوع إليه لاحقاً."))+'</section>'+
 '<section class="card personal-card"><div class="section-title"><div><h3>التنبيهات والتذكيرات</h3><p>تذكيرات تظهر داخل منصتك</p></div><button class="btn primary small" onclick="window.midadPersonalAdd(&#39;reminder&#39;)">＋ تنبيه جديد</button></div>'+
 (reminders.length?reminders.map(x=>row((x.done?"✓ ":"")+x.title,dateLabel(x.date)+(x.time?" · "+x.time:"")+(x.detail?" · "+x.detail:""),'<button class="text-link" onclick="window.midadPersonalToggle(\''+x.id+'\')">'+(x.done?"إلغاء الإنجاز":"تم")+'</button><button class="text-link" onclick="window.midadPersonalDelete(\'reminders\',\''+x.id+'\')">حذف</button>')).join(""):empty("لا توجد تنبيهات","أنشئ تذكيراً بموعد أو مهمة تريد إنجازها."))+'</section></div>'+
 '<p class="personal-storage-note">خصوصية: تُحفظ هذه البيانات في مساحة تخزين هذا المتصفح وعلى هذا الجهاز، ولا تُضاف إلى بيانات الأقسام أو تُعرض للطلاب.</p>';
}
window.midadPersonalActive=false;
window.midadPersonalOpen=function(){window.midadPersonalActive=true;document.body.classList.add("midad-personal-mode");window.render();window.scrollTo({top:0,behavior:"smooth"})};
window.midadPersonalExit=function(){window.midadPersonalActive=false;document.body.classList.remove("midad-personal-mode");window.navigate("home")};
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
.midad-personal-mode .shell{grid-template-columns:minmax(0,1fr);max-width:1250px}.midad-personal-mode .sidebar,.midad-personal-mode .mobile-nav{display:none!important}
#personalSpaceButton{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #dce8dc;border-radius:13px;background:#edf4ed;color:#286342;font:800 12px Tajawal,Cairo,sans-serif;white-space:nowrap}
#personalSpaceButton svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.personal-welcome{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:25px 27px;margin-bottom:17px;border:1px solid #dce8dc;border-radius:22px;background:linear-gradient(125deg,#f8fcf8,#eaf2ea)}
.personal-kicker{font-size:11px;font-weight:900;color:#548064}.personal-welcome h1{font-size:29px;color:#244c34;margin:5px 0}.personal-welcome p{margin:0;color:#718276;font-size:12px;line-height:1.8}
.personal-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:17px}.personal-stats>div{padding:16px;background:#fff;border:1px solid #e2eae2;border-radius:17px;display:grid;gap:4px}.personal-stats b{font-size:23px;color:#2b6543}.personal-stats small{font-size:11px;color:#78877b}
.personal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.personal-card{border-color:#e0e9e0}.personal-card h3{color:#2b5138}.personal-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #edf1ed}.personal-row:last-child{border-bottom:0}.personal-row-copy{min-width:0;display:grid;gap:4px}.personal-row-copy b{font-size:13px;color:#314b39}.personal-row-copy small{font-size:11px;line-height:1.7;color:#7b897e;overflow-wrap:anywhere}.personal-row-actions{display:flex;align-items:center;gap:8px;flex:none}.personal-storage-note{font-size:11px;color:#7d897f;line-height:1.8;margin:16px 3px}
@media(max-width:760px){#personalSpaceButton{padding:8px 9px;font-size:11px}.personal-welcome{align-items:flex-start;flex-direction:column;padding:20px}.personal-welcome .btn{width:100%}.personal-grid{grid-template-columns:1fr}.personal-stats{gap:8px}.personal-stats>div{padding:12px 9px}.personal-stats b{font-size:20px}.personal-stats small{font-size:10px}.personal-row{align-items:flex-start}.personal-row-actions{flex-direction:column;align-items:flex-end}}
`;document.head.appendChild(css);
})();


/* Professional personal workspace refresh */
(() => {
"use strict";
const KEY="midad_teacher_personal_space_v1:";
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
const who=()=>window.midadGetTeacherIdentity?.()||("guest-"+(document.getElementById("teacherName")?.textContent||"teacher"));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>new Date().toISOString().slice(0,10);
const dateText=v=>v?new Date(v+"T12:00:00").toLocaleDateString("ar-DZ",{year:"numeric",month:"short",day:"numeric"}):"";
const timeText=v=>v?new Date("2000-01-01T"+v).toLocaleTimeString("ar-DZ",{hour:"2-digit",minute:"2-digit"}):"";
function read(){try{let d=Object.assign({events:[],notes:[],reminders:[],dismissedAlerts:[]},JSON.parse(localStorage.getItem(KEY+who())||"{}"));["events","notes","reminders","dismissedAlerts"].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});return d}catch(e){return {events:[],notes:[],reminders:[],dismissedAlerts:[]}}}
function write(d){try{localStorage.setItem(KEY+who(),JSON.stringify(d));return true}catch(e){toast("تعذر حفظ المساحة الشخصية.");return false}}
function empty(t,p){return '<div class="px-empty"><b>'+esc(t)+'</b><span>'+esc(p)+'</span></div>'}
function act(t,f){return '<button class="px-action" onclick="'+f+'">'+t+'</button>'}
function weekday(){return ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][new Date().getDay()]}
function slots(){let out=[],day=weekday();(db.scheduleAssets?.tables||[]).filter(t=>t.published&&t.classId).forEach(t=>{let i=(t.days||[]).indexOf(day);if(i<0)return;(t.rows||[]).forEach(r=>{let v=(r.cells||[])[i]||"";if(v.trim())out.push({title:v,from:r.from,to:r.to,cl:db.classes.find(c=>c.id===t.classId)?.name||""})})});return out.sort((a,b)=>(a.from||"").localeCompare(b.from||""))}
function alerts(d){let a=[],date=today(),clock=new Date().toTimeString().slice(0,5);(db.classes||[]).forEach(c=>{let n=db.students.filter(s=>s.classId===c.id).length;if(!n)return;let done=db.attendance.filter(x=>x.classId===c.id&&x.date===date).length;if(done<n)a.push({id:"att-"+date+"-"+c.id,kind:"att",title:"استكمال أخذ الحضور",detail:"قسم "+c.name+" — "+done+" من "+n+" تلميذاً.",classId:c.id})});let ss=slots();if(ss.length&&ss[0].to&&clock>=ss[0].to)a.push({id:"lesson-"+date,kind:"lesson",title:"انتهت الحصة الأولى",detail:ss[0].title+" · "+ss[0].cl+" · "+timeText(ss[0].to)});return a.filter(x=>!d.dismissedAlerts.includes(x.id))}
function schedule(d){let ts=(db.scheduleAssets?.tables||[]).filter(t=>t.published&&t.classId),h='<div class="px-sub"><b>جدول العمل الأسبوعي</b><small>الجداول المنشورة لأقسامك</small></div>';h+=ts.length?ts.map(t=>'<article class="px-timetable"><b>'+esc(t.title||"جدول التوقيت")+'</b><small>'+esc(db.classes.find(c=>c.id===t.classId)?.name||"القسم")+'</small><div class="px-days">'+(t.days||[]).map((day,i)=>'<div><strong>'+esc(day)+'</strong>'+(t.rows||[]).map(r=>{let v=(r.cells||[])[i]||"";return v.trim()?'<span>'+esc(v)+'<small>'+timeText(r.from)+' – '+timeText(r.to)+'</small></span>':""}).join("")+'</div>').join("")+'</div></article>').join(""):empty("لا يوجد جدول منشور","أنشئ جدول التوقيت وانشره لقسمك ليظهر هنا.");h+='<div class="px-sub px-separate"><b>مواعيدي الإضافية</b><button class="btn primary small" onclick="window.midadPersonalAdd(\'event\')">＋ إضافة موعد</button></div>';h+=d.events.length?d.events.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(x=>'<article class="px-event"><div><b>'+esc(x.title)+'</b><small>'+esc(dateText(x.date))+' '+timeText(x.start)+' '+esc(x.place||"")+'</small><p>'+esc(x.detail||"")+'</p></div>'+act("تعديل","window.midadPersonalEdit(\'event\',\'"+x.id+"\')")+act("حذف","window.midadPersonalDelete(\'events\',\'"+x.id+"\')")+'</article>').join(""):empty("لا توجد مواعيد شخصية","أضف اجتماعاتك ومواعيدك ومهامك هنا.");let s=slots();if(s.length)h+='<div class="px-today"><b>حصص اليوم</b>'+s.map(x=>'<span>'+esc(x.title)+' · '+timeText(x.from)+' – '+timeText(x.to)+' · '+esc(x.cl)+'</span>').join("")+'</div>';return h}
function notes(d){let ns=d.notes.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));return '<div class="px-sub"><b>دفتر الملاحظات</b><button class="btn primary small" onclick="window.midadPersonalAdd(\'note\')">＋ ملاحظة جديدة</button></div>'+(ns.length?'<div class="px-notes">'+ns.map(n=>'<article class="px-note" style="--nc:'+esc(n.color||"#e9dfc9")+'"><small>'+esc(n.category||"عام")+(n.pinned?" · مثبّت":"")+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.text)+'</p><footer>'+act("تعديل","window.midadPersonalEdit(\'note\',\'"+n.id+"\')")+act(n.pinned?"فك التثبيت":"تثبيت","window.midadPersonalPin(\'"+n.id+"\')")+act("حذف","window.midadPersonalDelete(\'notes\',\'"+n.id+"\')")+'</footer></article>').join("")+'</div>':empty("دفترك جاهز لأفكارك","أنشئ ملاحظة واختر تصنيفها ولونها."))}
function reminders(d){let a=alerts(d),h='<div class="px-sub"><b>التنبيهات الذكية</b><small>مرتبطة بسجل الحضور وجدول التوقيت المنشور</small></div>';h+=a.length?'<div class="px-alerts">'+a.map(x=>'<article class="px-alert '+x.kind+'"><div><b>'+esc(x.title)+'</b><p>'+esc(x.detail)+'</p></div>'+(x.kind==="att"?'<button class="btn light small" onclick="window.midadPersonalGoAttendance(\''+x.classId+'\')">فتح الحضور</button>':'<button class="btn light small" onclick="window.midadPersonalDismiss(\''+x.id+'\')">تم الاطلاع</button>')+'</article>').join(""):empty("لا توجد تنبيهات عاجلة","الحضور مكتمل ولا توجد حصة أولى منتهية تحتاج إلى تنبيه.");h+='<div class="px-sub px-separate"><b>تذكيراتي الخاصة</b><button class="btn primary small" onclick="window.midadPersonalAdd(\'reminder\')">＋ إضافة تذكير</button></div>';h+=d.reminders.length?d.reminders.map(x=>'<article class="px-event"><button class="px-check" onclick="window.midadPersonalToggle(\''+x.id+'\')">'+(x.done?"✓":"")+'</button><div><b>'+esc(x.title)+'</b><small>'+esc(dateText(x.date))+' '+timeText(x.time)+'</small><p>'+esc(x.detail||"")+'</p></div>'+act("تعديل","window.midadPersonalEdit(\'reminder\',\'"+x.id+"\')")+act("حذف","window.midadPersonalDelete(\'reminders\',\'"+x.id+"\')")+'</article>').join(""):empty("لا توجد تذكيرات شخصية","أضف تذكيراً خاصاً بك متى احتجت.");return h}
function page(){let d=read(),a=alerts(d),n=d.notes.length,e=d.events.length,r=d.reminders.filter(x=>!x.done).length;return '<section class="px-hero"><div><small>مساحة الأستاذ الخاصة</small><h1>منصتي</h1><p>مركزك الشخصي لتنظيم العمل وتدوين الأفكار ومتابعة يومك.</p></div><button class="btn light" onclick="window.midadPersonalExit()">العودة إلى مساحة العمل</button></section><div class="px-stats"><div><small>الجداول والمواعيد</small><b>'+((db.scheduleAssets?.tables||[]).filter(t=>t.published&&t.classId).length+e)+'</b></div><div><small>ملاحظاتي</small><b>'+n+'</b></div><div><small>تنبيهات للمتابعة</small><b>'+(a.length+r)+'</b></div></div><section class="px-panel"><header><small>01 / تنظيم</small><h2>جدولي الخاص</h2><p>جدول الحصص ومواعيدك الإضافية.</p></header>'+schedule(d)+'</section><section class="px-panel"><header><small>02 / تدوين</small><h2>ملاحظاتي</h2><p>دفتر ملاحظات مرن ومنظم.</p></header>'+notes(d)+'</section><section class="px-panel"><header><small>03 / متابعة</small><h2>التنبيهات والتذكيرات</h2><p>تنبيهات مرتبطة بعملك اليومي وتذكيراتك الخاصة.</p></header>'+reminders(d)+'</section><p class="px-privacy">مواعيدك وملاحظاتك محفوظة محلياً على هذا الجهاز ولا تظهر للطلاب.</p>'}
window.midadPersonalActive=false;
window.midadPersonalOpen=()=>{window.midadPersonalActive=true;document.body.classList.add("midad-personal-mode");document.querySelector(".mobile-nav")?.setAttribute("aria-hidden","true");window.render();window.scrollTo({top:0,behavior:"smooth"})};
window.midadPersonalExit=()=>{window.midadPersonalActive=false;document.body.classList.remove("midad-personal-mode");document.querySelector(".mobile-nav")?.removeAttribute("aria-hidden");window.navigate("home")};
window.midadPersonalGoAttendance=id=>{window.midadPersonalActive=false;document.body.classList.remove("midad-personal-mode");document.querySelector(".mobile-nav")?.removeAttribute("aria-hidden");window.navigate("attendance");let s=document.getElementById("attClass");if(s){s.value=id;window.fillAttendanceClass?.()}};
window.midadPersonalDismiss=id=>{let d=read();d.dismissedAlerts.push(id);if(write(d))window.render()};
window.midadPersonalPin=id=>{let d=read(),x=d.notes.find(n=>n.id===id);if(x){x.pinned=!x.pinned;if(write(d))window.render()}};
function fields(k,x){let dt='<div class="form-field"><label>التاريخ</label><input type="date" name="date" required value="'+esc(x.date||today())+'"></div>';if(k==="event")return '<div class="form-grid"><div class="form-field full"><label>عنوان الموعد</label><input name="title" required value="'+esc(x.title||"")+'"></div>'+dt+'<div class="form-field"><label>المكان</label><input name="place" value="'+esc(x.place||"")+'"></div><div class="form-field"><label>من</label><input type="time" name="start" value="'+esc(x.start||"")+'"></div><div class="form-field"><label>إلى</label><input type="time" name="end" value="'+esc(x.end||"")+'"></div><div class="form-field full"><label>تفاصيل</label><textarea name="detail">'+esc(x.detail||"")+'</textarea></div></div>';if(k==="note")return '<div class="form-grid"><div class="form-field full"><label>العنوان</label><input name="title" required value="'+esc(x.title||"")+'"></div><div class="form-field"><label>التصنيف</label><select name="category">'+["عام","تحضير درس","أفكار","متابعة تلاميذ","اجتماعات","مهام"].map(v=>'<option '+((x.category||"عام")===v?"selected":"")+'>'+v+'</option>').join("")+'</select></div><div class="form-field"><label>اللون</label><select name="color">'+["#e9dfc9","#dce9df","#dce6f0","#eee0ed","#f3e2d7","#e8e6c9"].map((v,i)=>'<option value="'+v+'" '+((x.color||"#e9dfc9")===v?"selected":"")+'>'+["رملي","أخضر","أزرق","بنفسجي","خوخي","ليموني هادئ"][i]+'</option>').join("")+'</select></div><div class="form-field full"><label>المحتوى</label><textarea name="text" required style="min-height:140px">'+esc(x.text||"")+'</textarea></div></div>';return '<div class="form-grid"><div class="form-field full"><label>عنوان التذكير</label><input name="title" required value="'+esc(x.title||"")+'"></div>'+dt+'<div class="form-field"><label>الوقت</label><input type="time" name="time" value="'+esc(x.time||"")+'"></div><div class="form-field full"><label>تفاصيل</label><textarea name="detail">'+esc(x.detail||"")+'</textarea></div></div>'}
window.midadPersonalAdd=k=>window.midadPersonalForm(k,null);
window.midadPersonalEdit=(k,id)=>{let d=read(),key=k==="event"?"events":k==="note"?"notes":"reminders",x=d[key].find(v=>v.id===id);if(x)window.midadPersonalForm(k,x)};
window.midadPersonalForm=(k,old)=>{let editing=!!old,key=k==="event"?"events":k==="note"?"notes":"reminders";openModal((editing?"تعديل ":"إضافة ")+({event:"موعد",note:"ملاحظة",reminder:"تذكير"}[k]),"يُحفظ هذا العنصر في مساحتك الشخصية.",'<form id="pxForm">'+fields(k,old||{})+'<div class="modal-actions"><button class="btn primary">حفظ</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');document.getElementById("pxForm").onsubmit=e=>{e.preventDefault();let v=Object.fromEntries(new FormData(e.target).entries()),d=read();if(k==="event"&&v.start&&v.end&&v.end<=v.start){toast("وقت النهاية يجب أن يأتي بعد البداية.");return}if(editing)Object.assign(old,v,{updated:new Date().toISOString()});else d[key].push({id:uid(),...v,created:new Date().toISOString(),done:false,pinned:false});if(write(d)){closeModal();window.render();toast("تم الحفظ.")}}};
window.midadPersonalDelete=(k,id)=>{if(!confirm("هل تريد حذف هذا العنصر؟"))return;let d=read();d[k]=d[k].filter(x=>x.id!==id);if(write(d)){window.render();toast("تم الحذف.")}};
window.midadPersonalToggle=id=>{let d=read(),x=d.reminders.find(v=>v.id===id);if(x){x.done=!x.done;if(write(d))window.render()}};
const baseRender=window.render;window.render=function(){if(window.midadPersonalActive){let m=document.getElementById("main");if(m)m.innerHTML=page();return}baseRender()};
window.setInterval(()=>{if(window.midadPersonalActive){let m=document.getElementById("main");if(m)m.innerHTML=page()}},60000);
const css=document.createElement("style");css.textContent=".midad-personal-mode .shell{grid-template-columns:minmax(0,1fr);max-width:1280px;padding-top:28px}.midad-personal-mode .sidebar,.midad-personal-mode .mobile-nav{display:none!important}.midad-personal-mode .mobile-nav[aria-hidden=true]{visibility:hidden!important;pointer-events:none!important}"+
"#personalSpaceButton{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #dce8dc;border-radius:13px;background:#edf4ed;color:#286342;font:800 12px Tajawal,Cairo,sans-serif;white-space:nowrap}"+
".px-hero{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:27px 30px;margin-bottom:16px;border:1px solid #dfe9dd;border-radius:25px;background:linear-gradient(125deg,#f8fbf6,#e8f0e6);box-shadow:0 12px 28px #375a4010}.px-hero small{font-size:11px;font-weight:900;color:#65836a}.px-hero h1{font-size:32px;color:#284b35;margin:6px 0}.px-hero p{margin:0;color:#728274;font-size:13px}"+
".px-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.px-stats>div{padding:15px 18px;border:1px solid #e5e9e0;border-radius:17px;background:#fff;display:grid;gap:4px}.px-stats small{font-size:11px;color:#849084}.px-stats b{font-size:26px;color:#405b45}"+
".px-panel{padding:21px;margin-bottom:15px;border:1px solid #e6eae2;border-radius:22px;background:#fff;box-shadow:0 7px 20px #3d51400c}.px-panel>header{padding-bottom:14px;border-bottom:1px solid #edf0e9;margin-bottom:14px}.px-panel>header small{font-size:10px;letter-spacing:1px;font-weight:900;color:#9b9f8d}.px-panel>header h2{margin:5px 0;color:#304c37;font-size:21px}.px-panel>header p{margin:0;color:#859086;font-size:12px}"+
".px-sub{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:13px 0}.px-sub>b{font-size:13px;color:#3d5743}.px-sub>small{font-size:10px;color:#89948a}.px-separate{border-top:1px solid #edf0e9;padding-top:15px;margin-top:20px}.px-empty{padding:22px 15px;text-align:center;border:1px dashed #dce5da;border-radius:15px;background:#fafcf9}.px-empty b{display:block;color:#4d6752;font-size:13px;margin-bottom:5px}.px-empty span{font-size:11px;color:#8b978d}"+
".px-timetable{padding:13px;margin-bottom:10px;border:1px solid #e6ece4;border-radius:15px;background:#fbfdf9}.px-timetable>b{display:block;font-size:13px;color:#3d5843}.px-timetable>small{font-size:10px;color:#8a968b}.px-days{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.px-days>div{padding:8px;border-radius:10px;background:#f1f5ef;font-size:10px;color:#58725d}.px-days strong{display:block;margin-bottom:5px}.px-days span{display:block;padding:6px;margin-top:4px;border-radius:7px;background:#fff;color:#425d48}.px-days span small{display:block;margin-top:3px;color:#8a968b}"+
".px-event{display:flex;align-items:center;gap:10px;padding:11px;margin:7px 0;border:1px solid #edf0e9;border-radius:13px}.px-event>div:first-of-type{min-width:0;flex:1}.px-event b{display:block;font-size:12px;color:#435c49}.px-event small,.px-event p{display:block;margin:4px 0 0;font-size:10px;color:#8a968b;line-height:1.6}.px-action{border:0;background:transparent;color:#5f8064;font-size:10px;font-weight:800;padding:4px}.px-today{padding:12px;background:#f4f8f2;border-radius:13px;margin-top:12px}.px-today>b{display:block;font-size:12px;color:#58725d;margin-bottom:7px}.px-today span{display:block;padding:6px;margin-top:4px;background:#fff;border-radius:7px;font-size:10px;color:#526c57}"+
".px-notes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.px-note{display:flex;flex-direction:column;min-height:175px;padding:13px;border-radius:15px;background:linear-gradient(145deg,#fff,var(--nc));border:1px solid #e9e9df}.px-note>small{font-size:10px;color:#78887a}.px-note h3{font-size:14px;color:#405744;margin:10px 0 6px}.px-note p{font-size:11px;line-height:1.8;color:#6f7d70;white-space:pre-wrap;flex:1}.px-note footer{display:flex;justify-content:flex-end;gap:2px;border-top:1px solid #536b4c20;padding-top:8px}"+
".px-alert{display:flex;align-items:center;gap:12px;padding:13px;margin:7px 0;border:1px solid #f0e2c4;border-radius:14px;background:#fff9ed}.px-alert.lesson{background:#eff5fa;border-color:#dbe7f0}.px-alert>div{flex:1;min-width:0}.px-alert b{font-size:12px;color:#725c38}.px-alert.lesson b{color:#4e6c83}.px-alert p{font-size:10px;color:#8c806b;margin:4px 0 0}.px-alert.lesson p{color:#758a9a}.px-check{width:22px;height:22px;border:1px solid #b8c9b8;border-radius:7px;background:#fff;color:#52785a}.px-privacy{font-size:10px;color:#8b978c;margin:13px 3px}"+
"@media(max-width:760px){.midad-personal-mode .shell{padding:14px 11px 28px}.px-hero{align-items:flex-start;flex-direction:column;padding:19px}.px-hero h1{font-size:28px}.px-hero .btn{width:100%}.px-stats{gap:7px}.px-stats>div{padding:11px 8px}.px-stats small{font-size:9px}.px-stats b{font-size:22px}.px-panel{padding:15px 11px}.px-days{grid-template-columns:repeat(2,1fr)}.px-notes{grid-template-columns:1fr}.px-event{flex-wrap:wrap;align-items:flex-start}.px-event>div:first-of-type{min-width:70%}.px-event .px-action{margin-right:auto}.px-alert{flex-wrap:wrap}.px-alert .btn{margin-right:32px}}";
document.head.appendChild(css);
})();

/* Colorful visual refresh for the personal workspace */
(() => {
  "use strict";
  const style = document.createElement("style");
  style.id = "midad-personal-color-refresh";
  style.textContent = `
    .midad-personal-mode { background: #f5f7fb; }
    .midad-personal-mode .shell { background: transparent; }
    .px-hero {
      position: relative; overflow: hidden; isolation: isolate;
      border: 0; color: #fff;
      background: linear-gradient(118deg,#315f54 0%,#478875 48%,#6b9d87 100%);
      box-shadow: 0 16px 34px rgba(48,104,84,.18);
    }
    .px-hero:before,.px-hero:after {
      content:""; position:absolute; z-index:-1; border-radius:50%;
      background:rgba(255,255,255,.10); pointer-events:none;
    }
    .px-hero:before { width:220px;height:220px;left:-55px;top:-115px; }
    .px-hero:after { width:145px;height:145px;left:22%;bottom:-105px;background:rgba(255,255,255,.08); }
    .px-hero small,.px-hero h1,.px-hero p { color:#fff; }
    .px-hero small { opacity:.82; }
    .px-hero h1 { letter-spacing:-.5px; }
    .px-hero p { color:rgba(255,255,255,.82); }
    .px-hero .btn.light { color:#315f54;background:#fff;border:1px solid rgba(255,255,255,.65);box-shadow:0 5px 14px #173f3025; }
    .px-stats { gap:14px; }
    .px-stats>div {
      position:relative;overflow:hidden;min-height:92px;
      border:1px solid transparent;border-radius:19px;
      box-shadow:0 8px 22px rgba(37,57,75,.055);
      transition:transform .22s ease,box-shadow .22s ease;
    }
    .px-stats>div:nth-child(1){background:linear-gradient(135deg,#eaf4ff,#f7fbff);border-color:#dceafa}
    .px-stats>div:nth-child(2){background:linear-gradient(135deg,#f4edff,#fcfaff);border-color:#e9defa}
    .px-stats>div:nth-child(3){background:linear-gradient(135deg,#fff2e8,#fffaf6);border-color:#f8e3d2}
    .px-stats>div:hover { transform:translateY(-3px);box-shadow:0 13px 25px rgba(37,57,75,.09); }
    .px-stats>div:nth-child(1) b{color:#3976a8}
    .px-stats>div:nth-child(2) b{color:#8061b1}
    .px-stats>div:nth-child(3) b{color:#bd7847}
    .px-stats>div:nth-child(1) small{color:#6485a1}
    .px-stats>div:nth-child(2) small{color:#8a78a8}
    .px-stats>div:nth-child(3) small{color:#a27c60}
    .px-panel {
      position:relative;border:1px solid #e7ebf2;border-radius:22px;
      box-shadow:0 9px 26px rgba(38,55,80,.055);
      transition:box-shadow .22s ease,transform .22s ease;
    }
    .px-panel:hover { box-shadow:0 13px 32px rgba(38,55,80,.085); }
    .px-panel>header { border-bottom:1px solid #edf0f6; }
    .px-panel>header small { display:inline-flex;padding:5px 9px;border-radius:20px;background:#edf4f0;color:#4c806b;letter-spacing:.4px; }
    .px-panel:nth-of-type(1)>header small{background:#eaf3ff;color:#4b79a5}
    .px-panel:nth-of-type(2)>header small{background:#f2edff;color:#8064aa}
    .px-panel:nth-of-type(3)>header small{background:#fff1e7;color:#b67b4d}
    .px-panel>header h2 { color:#304c42; }
    .px-sub>b { color:#425e51; }
    .px-timetable { background:linear-gradient(135deg,#f7fbff,#f5f8fc);border-color:#e2ebf5; }
    .px-days>div { background:#eaf1f8;color:#53728d; }
    .px-days span { border:1px solid #e5edf5; }
    .px-days span small { color:#7e91a3; }
    .px-event { background:#fbfcff;border-color:#e9edf5; }
    .px-event:hover { background:#f5f8ff;border-color:#dce6f5; }
    .px-note { border:1px solid rgba(90,100,120,.10);box-shadow:0 5px 14px rgba(60,60,80,.045);transition:transform .2s ease,box-shadow .2s ease; }
    .px-note:hover { transform:translateY(-3px) rotate(-.2deg);box-shadow:0 11px 22px rgba(60,60,80,.10); }
    .px-note:nth-child(6n+1){--nc:#e6f1e8!important}
    .px-note:nth-child(6n+2){--nc:#e5eefb!important}
    .px-note:nth-child(6n+3){--nc:#f2eafb!important}
    .px-note:nth-child(6n+4){--nc:#fff0e4!important}
    .px-note:nth-child(6n+5){--nc:#f8f0d9!important}
    .px-note:nth-child(6n){--nc:#e3f1f2!important}
    .px-note h3 { color:#3e574b; }
    .px-alert { background:linear-gradient(110deg,#fff6e8,#fffaf3);border-color:#f4e4c8; }
    .px-alert.lesson { background:linear-gradient(110deg,#eaf4ff,#f7fbff);border-color:#dceafa; }
    .px-alert .btn.light { background:#fff;border-color:#eadcc4;color:#8a683f; }
    .px-alert.lesson .btn.light { border-color:#d8e5f2;color:#507596; }
    .px-action { border-radius:8px;padding:6px 8px;transition:background .18s ease,color .18s ease; }
    .px-action:hover { background:#eaf2ed;color:#2f7154; }
    .px-check { border-color:#bfd5c6;background:#f2f8f3; }
    .px-privacy { padding:11px 14px;border-radius:12px;background:#edf3ef;color:#688174; }
    .midad-personal-mode button { transition:filter .18s ease,transform .18s ease; }
    .midad-personal-mode button:active { transform:scale(.98); }
    @media(max-width:760px) {
      .px-hero { border-radius:20px;padding:22px 19px; }
      .px-stats>div { min-height:83px;border-radius:15px; }
      .px-panel { border-radius:18px; }
      .px-notes { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .px-note { min-height:165px; }
    }
    @media(max-width:390px) {
      .px-notes { grid-template-columns:1fr; }
    }
    @media(prefers-reduced-motion:reduce) {
      .midad-personal-mode * { transition:none!important;scroll-behavior:auto!important; }
    }
  `;
  document.head.appendChild(style);
})();
