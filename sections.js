(function(){
"use strict";
const $=id=>document.getElementById(id);
const escTask=v=>window.esc?window.esc(v==null?"":String(v)):String(v??"");
const taskKinds=["واجب منزلي","اختبار","امتحان","بحث"];
const taskIcon=k=>{
 const paths={
 "واجب منزلي":'<path d="M13 5H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7"/><path d="M9 11h5M9 15h4"/><path d="m16 4 4 4-7 7-4 1 1-4z"/>',
 "اختبار":'<path d="M7 3h9l5 5v13a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><path d="M16 3v6h5M8 13l2 2 3-3M15 14h3M8 19h10"/>',
 "امتحان":'<path d="M7 3h9l5 5v13a2 2 0 0 1-2 2H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><path d="M16 3v6h5M8 13h9M8 17h9"/><path d="m11 8 1 1 2-2"/>',
 "بحث":'<path d="M6 4h10l4 4v7"/><path d="M16 4v5h4M6 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6"/><circle cx="18" cy="18" r="4"/><path d="m21 21 2 2"/>'
 };
 return '<svg viewBox="0 0 28 28" aria-hidden="true">'+(paths[k]||paths["واجب منزلي"])+'</svg>';
};
const taskId=()=>"task-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const accents={"واجب منزلي":"#537d68","اختبار":"#5579a8","امتحان":"#98734b","بحث":"#806aa0"};
const numberFor=k=>(db.activities||[]).filter(x=>x.kind==="task"&&x.category===k).length+1;
window.activitiesPage=function(){
 const tasks=(db.activities||[]).filter(x=>x.kind==="task"),games=(db.activities||[]).filter(x=>x.kind!=="task");
 const cards=taskKinds.map((k,i)=>'<article class="task-kind-card" style="--task-accent:'+accents[k]+'"><div class="task-kind-top"><span class="task-kind-symbol">'+taskIcon(k)+'</span><span class="task-kind-count">'+tasks.filter(t=>t.category===k).length+' محفوظ</span></div><h3>'+k+'</h3><p>'+["تمارين للتدريب مع ملف إجابات مستقل.","أسئلة قصيرة لقياس الفهم.","امتحان منظم مع سلم تنقيط وتصحيح.","استخرج عناوين بحوث مقترحة من الدرس أو الملف."][i]+'</p><button class="btn task-kind-button" onclick="openTask(\''+k+'\')">إنشاء '+k+' ←</button></article>').join("");
 return pageHead("تنظيم التعلمات","الأنشطة والمهام التعليمية","أنشئ نشاطاً بالذكاء الاصطناعي أو ارفع ملفاً جاهزاً وحدد الفئة المستهدفة.",'<button class="btn light" onclick="openTaskUpload()">↑ رفع نشاط</button><button class="btn primary" onclick="openTask()">＋ إنشاء نشاط</button>')+
 '<section class="task-kind-grid">'+cards+'</section>'+window.midadDesignStrip()+'<div class="section-title" style="margin-top:25px"><div><h3>الأنشطة المحفوظة</h3><p>افتح النشاط لتنزيل ملف الأسئلة وملف الإجابات.</p></div><span class="pill">'+tasks.length+' نشاط</span></div>'+
 (tasks.length?'<div class="task-saved-grid">'+tasks.slice().reverse().map(t=>'<article class="task-saved-card"><div class="task-saved-head" style="--task-accent:'+(accents[t.category]||"#66836d")+'"><i class="task-saved-icon">'+taskIcon(t.category)+'</i><span>'+escTask(t.category)+'</span><b>'+(t.category==="بحث"?"عناوين مقترحة":"رقم "+(t.number||"—"))+'</b></div><div class="task-saved-body"><h3>'+escTask(t.title)+'</h3>'+(t.lessonTitle?'<p><b>الدرس:</b> '+escTask(t.lessonTitle)+'</p>':'')+'<p><b>المادة:</b> '+escTask(t.subject||"—")+'</p><p><b>المستوى:</b> '+escTask(t.level||"—")+'</p>'+(t.uploadedFile?'<span class="task-score-chip">ملف مرفق</span>':t.category!=="بحث"?'<span class="task-score-chip">التنقيط على '+escTask(t.maxScore||20)+'</span>':'')+(t.dueDate?'<p><b>التسليم:</b> '+escTask(t.dueDate)+'</p>':'')+'<div class="item-actions"><button class="btn primary small" onclick="viewTask(\''+t.id+'\')">عرض الملفات</button><button class="btn light small" onclick="deleteTask(\''+t.id+'\')">حذف</button></div></div></article>').join("")+'</div>':empty("لا توجد أنشطة محفوظة بعد","اختر نوع النشاط من البطاقات أعلاه."))+
 (games.length?'<div class="section-title" style="margin-top:28px"><div><h3>الأنشطة التفاعلية السابقة</h3><p>احتفظنا بالأنشطة القديمة.</p></div></div><div class="cards">'+games.slice().reverse().map(a=>'<article class="item-card"><h3>'+escTask(a.title)+'</h3><p>'+escTask(a.subject||"")+' · '+escTask(a.level||"")+'</p><div class="item-actions">'+btn("فتح","viewActivity('"+a.id+"')","light small")+btn("تعديل","editActivity('"+a.id+"')","secondary small")+btn("حذف","deleteItem('activities','"+a.id+"')","danger small")+'</div></article>').join("")+'</div>':"");
};
/* ===== تصاميم ورقية جاهزة (A4) ===== */
const DZ_CSS=`
.dz-wrap{overflow:auto;background:#e6ebe6;padding:14px;border-radius:14px;max-height:68vh}
.dz-page{width:794px;min-height:1123px;box-sizing:border-box;margin:0 auto;background:#fff;color:#1d2a24;padding:46px 52px;font-family:Tajawal,Arial,sans-serif;font-size:15px;line-height:1.9;direction:rtl;box-shadow:0 6px 24px rgba(0,0,0,.14);position:relative}
.dz-page[contenteditable=true]:focus,.dz-page [contenteditable=true]:focus{outline:2px dashed #7f9a86;outline-offset:3px}
.dz-gov{text-align:center}.dz-gov b{display:block;font-size:17px}.dz-gov span{font-size:15px;font-weight:700}
.dz-meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin:14px 0 8px;font-size:14px}
.dz-titlebar{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:2px solid var(--ac);border-bottom:2px solid var(--ac);padding:8px 4px;margin:8px 0 22px;font-weight:800}
.dz-titlebar h1{font-size:19px;margin:0;flex:1;text-align:center}
.dz-ex{position:relative;margin:0 0 20px;break-inside:avoid}
.dz-ex-head{display:flex;justify-content:space-between;align-items:center}
.dz-ex-head h3{margin:0;font-size:17px;text-decoration:underline;text-underline-offset:5px}
.dz-pill{border:1.5px solid var(--ac);border-radius:999px;padding:0 14px;font-size:13px;font-weight:700}
.dz-instr{font-size:14px;margin:4px 0}
.dz-qs{counter-reset:q}
.dz-q{display:flex;gap:8px;align-items:flex-start;counter-increment:q;margin:3px 0}
.dz-q:before{content:counter(q);font-weight:900;flex:none;min-width:18px}
.dz-q>div{flex:1}
.dz-mark{flex:none;font-size:12px;color:#444;min-width:38px;text-align:left;direction:ltr}
.dz-del{position:absolute;left:0;top:-8px;border:0;background:#f5e4e1;color:#994f49;border-radius:8px;font:inherit;font-size:11px;padding:2px 9px;cursor:pointer}
.dz-foot{text-align:center;color:#778;font-size:13px;margin-top:26px}
.dz-box{border:1.5px solid var(--ac);border-radius:8px;padding:10px 16px;margin-bottom:14px}
.dz-box-top{display:flex;justify-content:space-between;font-size:13px;color:#555}
.dz-box-title{display:block;font-size:20px;margin:6px 0 2px}
.dz-part{background:#f2f1f8;border-right:4px solid var(--ac);padding:6px 14px;font-weight:800;margin:18px 0 12px;font-size:17px}
.dz-d2 .dz-pill{color:var(--ac)}
.dz-namerow{display:flex;justify-content:space-between;gap:14px;font-size:14px;margin-bottom:12px}
.dz-cbox{border:2px solid var(--ac);border-radius:18px;text-align:center;padding:10px;margin-bottom:12px}
.dz-cbox h1{margin:0;font-size:22px;color:var(--ac)}.dz-cbox div{font-size:13px;color:#555}
.dz-score{width:100%;border-collapse:collapse;margin-bottom:18px;text-align:center}
.dz-score th,.dz-score td{border:1.5px solid var(--ac);padding:4px}.dz-score th{background:#e7f2ec}
.dz-obs{border-top:1px dashed #999;margin-top:16px;padding-top:8px;color:#555}
.dz-hero{display:flex;justify-content:space-between;gap:16px;color:#fff;background:linear-gradient(120deg,#d9822b,#f2b04c);border-radius:20px;padding:20px 24px;margin-bottom:14px}
.dz-hero h1{margin:4px 0;font-size:25px}.dz-hero small{opacity:.9;font-weight:700}.dz-hero p{margin:0}
.dz-hero-side{display:grid;gap:4px;font-size:13px;align-content:center}
.dz-note{background:#fff3e3;border-radius:12px;padding:9px 14px;margin-bottom:16px;font-size:14px;color:#7a4a14}
.dz-d4 .dz-ex{border:1.5px solid #f1d6b4;border-radius:16px;padding:12px 16px;background:#fffaf4}
.dz-d4 .dz-pill{background:var(--ac);color:#fff}
.dz-cover{text-align:center}
.dz-frame{border:3px double var(--ac);border-radius:10px;margin:46px 0 36px;padding:38px 20px}
.dz-frame h2{margin:6px 0;color:var(--ac);font-size:22px}.dz-frame h1{font-size:32px;margin:14px 0}
.dz-cover-info{display:grid;gap:10px;text-align:right;font-size:16px;max-width:440px;margin:0 auto 26px}
.dz-plan h3{color:var(--ac);font-size:18px;margin:6px 0}.dz-plan li{margin:4px 0}
.dz-strip{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 14px}
.dz-card{flex:none;width:250px;border:1px solid var(--line);border-radius:18px;background:#fff;padding:10px;box-shadow:var(--shadow-sm)}
.dz-thumb{position:relative;width:228px;height:322px;overflow:hidden;border:1px solid #e3e9e3;border-radius:10px;background:#fff;margin:0 auto 10px}
.dz-thumb .dz-page{position:absolute;top:0;right:0;transform:scale(.287);transform-origin:top right;pointer-events:none;box-shadow:none;min-height:1123px;height:1123px;overflow:hidden}
.dz-thumb .dz-ui{display:none}
.dz-card b{display:block}.dz-card small{display:block;color:var(--muted);font-size:11px;margin:3px 0 10px;line-height:1.7}
.dz-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.dz-bar select,.dz-bar input{height:40px;border:1px solid var(--line);border-radius:11px;padding:0 10px;background:#fff}
@media print{.dz-ui{display:none!important}}
`;
(function(){const s=document.createElement("style");s.textContent=DZ_CSS;document.head.appendChild(s)})();
const DZ_SAMPLE=[
 ["التمرين الأول",5,"التعليمات:",[["اكتب هنا نص السؤال الأول.",2],["اكتب هنا نص السؤال الثاني.",2],["اكتب هنا نص السؤال الثالث.",1]]],
 ["التمرين الثاني",7,"السند:",[["اكتب هنا نص السؤال الأول.",3],["اكتب هنا نص السؤال الثاني.",2],["اكتب هنا نص السؤال الثالث.",2]]],
 ["الوضعية الإدماجية",8,"السياق:",[["المهمة الأولى.",3],["المهمة الثانية.",3],["المهمة الثالثة.",2]]]
];
function dzExercise(title,pts,instr,qs){
 return '<section class="dz-ex"><div class="dz-ex-head"><h3>'+title+'</h3><span class="dz-pill">('+pts+' ن)</span></div>'+(instr?'<div class="dz-instr">'+instr+'</div>':'')+'<div class="dz-qs">'+qs.map(q=>'<div class="dz-q"><div>'+q[0]+'</div><span class="dz-mark">['+q[1]+']</span></div>').join('')+'</div></section>';
}
let dzCur=null;
const dzEx=(a,b)=>(dzCur||DZ_SAMPLE).slice(a,b).map(e=>dzExercise(...e)).join('');
const dzFmt=x=>String(Math.round((Number(x)||0)*100)/100);
const dzScoreRow=d=>{const sc=d.sc||[5,7,8,20];return '<tr>'+sc.map(x=>'<td>/ '+x+'</td>').join('')+'</tr>'};
const dzGov='<header class="dz-gov"><b>الجمهورية الجزائرية الديمقراطية الشعبية</b><span>وزارة التربية الوطنية</span></header>';
const DZ_DESIGNS=[
 {name:"الاختبار الرسمي",desc:"ترويسة الجمهورية ووزارة التربية، تمارين بنقاط جانبية.",ac:"#222",kind:"اختبار",title:"اختبار الفصل الأول",build:d=>dzGov+'<div class="dz-meta"><div><b>مديرية التربية لولاية:</b> '+d.directorate+'</div><div><b>السنة الدراسية:</b> '+d.year+'</div><div><b>المؤسسة:</b> '+d.institution+'</div><div><b>المستوى:</b> '+d.level+'</div></div><div class="dz-titlebar"><h1>'+d.title+' في مادة '+d.subject+'</h1><span><b>المدة:</b> '+d.duration+'</span></div><div class="dz-body">'+dzEx(0,3)+'</div><div class="dz-foot">بالتوفيق والنجاح</div>'},
 {name:"الأجزاء والوضعية الإدماجية",desc:"إطار عنوان وأشرطة أجزاء ملوّنة مثل الاختبارات الفصلية.",ac:"#6b63b5",kind:"امتحان",title:"اختبار الفصل الأول",build:d=>'<div class="dz-box"><div class="dz-box-top"><span><b>المؤسسة:</b> '+d.institution+'</span><span>التاريخ: ..........</span></div><b class="dz-box-title">'+d.title+'</b><div>'+d.subject+' — '+d.level+'</div><small>'+d.year+' · المدة: '+d.duration+'</small></div><div class="dz-body"><div class="dz-part">الجزء الأول ('+(d.p1||12)+' نقطة)</div>'+dzEx(0,2)+'<div class="dz-part">الوضعية الإدماجية ('+(d.p2||'08')+' نقاط)</div>'+dzEx(2,3)+'</div>'},
 {name:"فرض محروس مدمج",desc:"سطر الاسم وجدول النقاط وخانة الملاحظة، مناسب لصفحة واحدة.",ac:"#2f7d5b",kind:"اختبار",title:"الفرض المحروس الأول",build:d=>'<div class="dz-namerow"><span>الاسم واللقب: ........................</span><span>القسم: ..........</span><span>الرقم: ......</span></div><div class="dz-cbox"><h1>'+d.title+'</h1><div>'+d.subject+' · '+d.level+' · المدة: '+d.duration+'</div><div>'+d.institution+' · '+d.year+'</div></div><table class="dz-score"><tr><th>التمرين 1</th><th>التمرين 2</th><th>التمرين 3</th><th>المجموع</th></tr>'+dzScoreRow(d)+'</table><div class="dz-body">'+dzEx(0,3)+'</div><div class="dz-obs">الملاحظة: ......................................................</div>'},
 {name:"واجب منزلي ملوّن",desc:"ترويسة بألوان دافئة وبطاقات تمارين للتلاميذ الصغار.",ac:"#d9822b",kind:"واجب منزلي",title:"واجب منزلي",build:d=>'<div class="dz-hero"><div><small>'+d.subject+' · '+d.level+'</small><h1>'+d.title+'</h1><p>'+d.institution+'</p></div><div class="dz-hero-side"><span>التاريخ: ..........</span><span>الاسم: ..............</span></div></div><div class="dz-note">عزيزي التلميذ: أنجز الواجب بخط واضح على كراس الأقسام، وسلّمه في الموعد المحدد.</div><div class="dz-body">'+dzEx(0,2)+'</div><div class="dz-foot">أحسنت، واصل اجتهادك</div>'},
 {name:"غلاف بحث مدرسي",desc:"صفحة غلاف مؤطرة مع خطة بحث جاهزة.",ac:"#3b6ea8",kind:"بحث",title:"عنوان البحث",build:d=>'<div class="dz-cover">'+dzGov+'<div class="dz-frame"><small>بحث في مادة</small><h2>'+d.subject+'</h2><h1>'+d.title+'</h1></div><div class="dz-cover-info"><div><b>إعداد التلميذ(ة):</b> ........................</div><div><b>القسم:</b> '+d.level+'</div><div><b>تحت إشراف الأستاذ(ة):</b> '+d.teacher+'</div></div><div>'+d.institution+' — '+d.year+'</div></div><section class="dz-ex dz-plan" style="margin-top:34px"><h3>خطة البحث</h3><ol><li>المقدمة: التعريف بالموضوع وأهميته.</li><li>العنصر الأول: ................</li><li>العنصر الثاني: ................</li><li>العنصر الثالث: ................</li><li>الخاتمة: أهم النتائج.</li><li>قائمة المراجع.</li></ol></section>'}
];
function dzPageHtml(i,d){
 dzCur=d&&d.exs||null;
 let inner;try{inner=DZ_DESIGNS[i].build(d)}finally{dzCur=null}
 if(d&&d.suggestions&&d.suggestions.length)inner=inner.replace(/<section class="dz-ex dz-plan"[\s\S]*<\/section>/,'<section class="dz-ex dz-plan" style="margin-top:34px"><h3>عناوين مقترحة للبحث</h3><ol>'+d.suggestions.map(x=>'<li>'+x+'</li>').join('')+'</ol></section>');
 return '<div class="dz-page dz-d'+(i+1)+'" style="--ac:'+DZ_DESIGNS[i].ac+'">'+inner+'</div>';
}
function dzDefaults(i){return {institution:db.school||"..............",directorate:"..............",level:(db.classes&&db.classes[0]?.level)||"..............",subject:"..............",year:db.year||"2026 / 2027",duration:"ساعة واحدة",title:DZ_DESIGNS[i].title,teacher:db.teacher||".............."}}
window.midadDesignStrip=function(){
 return '<div class="section-title" style="margin-top:25px"><div><h3>تصاميم جاهزة</h3><p>افتح الورقة في المحرّر لتعدّلها بنفسك، أو ولّد نشاطاً من درسك داخل التصميم مباشرة.</p></div></div><div class="dz-strip">'+DZ_DESIGNS.map((d,i)=>'<article class="dz-card"><div class="dz-thumb">'+dzPageHtml(i,dzDefaults(i))+'</div><b>'+escTask(d.name)+'</b><small>'+escTask(d.desc)+'</small><div style="display:grid;gap:6px"><button class="btn light small" onclick="openDesignForm('+i+',\'edit\')">فتح في المحرّر</button><button class="btn primary small" onclick="openDesignForm('+i+',\'gen\')">✦ توليد نشاط بهذا التصميم</button></div></article>').join("")+'</div>';
};
window.openDesignForm=function(i,mode){
 const D=DZ_DESIGNS[i],d=dzDefaults(i),gen=mode==="gen",f=(id,l,v,full)=>'<div class="form-field'+(full?' full':'')+'"><label>'+l+'</label><input id="dzf_'+id+'" value="'+escTask(v)+'"'+(gen&&(id==="subject"||id==="level")?' required maxlength="120"':'')+'></div>';
 const genFields=gen?'<div class="form-field full"><label>عنوان الدرس</label><input id="dzf_lesson" placeholder="مثال: دورة الماء في الطبيعة"></div><div class="form-field"><label>عدد الأسئلة</label><input id="dzf_count" type="number" min="3" max="30" value="8"></div><div class="form-field"><label>العلامة الكلية</label><input id="dzf_max" type="number" min="1" max="100" step="0.5" value="'+(D.kind==="واجب منزلي"?10:20)+'"></div><div class="form-field full"><label>نص الدرس (المصدر)</label><textarea id="dzf_source" rows="6" placeholder="الصق نص الدرس هنا، وسيُبنى النشاط عليه (80 حرفاً على الأقل)..."></textarea></div>':'';
 openModal(D.name+(gen?" — توليد نشاط":" — فتح في المحرّر"),gen?"سيُولَّد النشاط بالذكاء الاصطناعي ويُوضَع داخل هذا التصميم، ثم يمكنك تعديله.":"أدخل بيانات الورقة، وستظهر في المحرّر قابلة للتعديل.",'<div class="form-grid">'+f("title","عنوان الورقة",d.title,true)+f("institution","المؤسسة",d.institution)+f("directorate","مديرية التربية لولاية",d.directorate)+f("level","المستوى",d.level)+f("subject","المادة",d.subject)+f("year","السنة الدراسية",d.year)+f("duration","المدة",d.duration)+'<div class="form-field"><label>النوع</label><select id="dzf_kind">'+taskKinds.map(k=>'<option'+(k===D.kind?' selected':'')+'>'+k+'</option>').join("")+'</select></div>'+genFields+'</div><div class="modal-actions">'+(gen?'<button class="btn primary" id="dzGenBtn" onclick="dzGenerate('+i+')">✦ توليد النشاط</button>':'<button class="btn primary" onclick="dzOpenFromForm('+i+')">فتح في المحرّر</button>')+'<button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
function dzCollect(){
 const raw={teacher:db.teacher||".............."},d={teacher:escTask(raw.teacher)};
 ["title","institution","directorate","level","subject","year","duration"].forEach(k=>{raw[k]=($("dzf_"+k)?.value||"").trim()||"..............";d[k]=escTask(raw[k])});
 return {raw,d,kind:$("dzf_kind")?.value||"اختبار"};
}
window.dzOpenFromForm=function(i){const c=dzCollect();window.midadDesignEditor(i,c.d,c.kind,null,null)};
function dzBuildExercises(i,questions){
 const names=["التمرين الأول","التمرين الثاني","التمرين الثالث"],g=Math.max(1,Math.min(i===3?2:3,questions.length)),base=Math.floor(questions.length/g),extra=questions.length%g;
 let p=0;const out=[];
 for(let k=0;k<g;k++){
  const size=base+(k<extra?1:0),part=questions.slice(p,p+size);p+=size;
  const pts=part.reduce((a,q)=>a+(Number(q.points)||0),0);
  out.push([(i===1&&k===2&&g===3)?"الوضعية الإدماجية":names[k],dzFmt(pts),"التعليمات:",part.map(q=>[escTask(q.question),dzFmt(q.points)])]);
 }
 return out;
}
window.dzGenerate=async function(i){
 const c=dzCollect(),kind=c.kind,research=kind==="بحث";
 const lesson=($("dzf_lesson")?.value||"").trim(),content=$("dzf_source")?.value||"";
 const count=Math.max(3,Math.min(30,Number($("dzf_count")?.value)||8)),maxScore=Number($("dzf_max")?.value)||20;
 if(!lesson){toast("اكتب عنوان الدرس.");$("dzf_lesson")?.focus();return}
 if(!c.raw.subject||/^\.+$/.test(c.raw.subject)){toast("حدد المادة الدراسية.");$("dzf_subject")?.focus();return}
 if(!c.raw.level||/^\.+$/.test(c.raw.level)){toast("حدد المستوى الدراسي.");$("dzf_level")?.focus();return}
 if(content.trim().length<80){toast("ألصق نص الدرس (80 حرفاً على الأقل).");return}
 if(!research&&(maxScore<=0||maxScore>100)){toast("اختر علامة كلية بين 1 و100.");return}
 if(!db?.aiEndpoint){toast("لم يُضبط رابط الذكاء الاصطناعي من الإعدادات.");return}
 const btn=$("dzGenBtn"),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent="يجري تحليل الدرس..."}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000);
 try{
  const prepared=await summarizeTaskSource(content,{lessonTitle:lesson,subject:c.raw.subject,level:c.raw.level},controller.signal,(done,total,pass)=>{if(btn)btn.textContent="تلخيص المصدر — المرحلة "+pass+" ("+done+"/"+total+")"});
  if(btn)btn.textContent="يجري توليد النشاط...";
  const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({kind:"task",taskCategory:kind,category:kind,lessonTitle:lesson,title:lesson,subject:c.raw.subject,level:c.raw.level,maxScore,questionCount:count,content:prepared.content,sourceUrl:"",sourceType:"text"})});
  const rawText=await response.text();let payload={};
  try{payload=rawText?JSON.parse(rawText):{}}catch(_){throw Error("استجابة غير مفهومة من محرك الذكاء الاصطناعي. أعد المحاولة.")}
  if(!response.ok)throw Error(payload.error||"تعذر توليد النشاط.");
  const result=payload.result||payload,d=c.d;
  if(research){
   if(!Array.isArray(result.suggestions)||!result.suggestions.length)throw Error("لم تُستخرج عناوين بحث. أعد المحاولة.");
   d.suggestions=result.suggestions.map(x=>escTask(x));
  }else{
   if(!Array.isArray(result.questions)||!result.questions.length)throw Error("لم تُنشأ أسئلة صالحة. أعد المحاولة.");
   d.exs=dzBuildExercises(i,result.questions);
   const sums=d.exs.map(e=>Number(e[1]));
   d.sc=sums.map(dzFmt).concat([dzFmt(sums.reduce((a,b)=>a+b,0))]);
   d.p1=dzFmt(sums.slice(0,2).reduce((a,b)=>a+b,0));d.p2=dzFmt(sums[2]||0);d.max=maxScore;
  }
  closeModal();
  window.midadDesignEditor(i,d,kind,null,null);
  toast("تم توليد النشاط داخل التصميم. راجعه وعدّله ثم احفظه.");
 }catch(err){toast(err.name==="AbortError"?"انتهت مهلة التوليد. أعد المحاولة أو اختصر النص.":(err.message||"تعذر توليد النشاط."))}
 finally{clearTimeout(timer);if(btn?.isConnected){btn.disabled=false;btn.textContent=old}}
};
function dzFit(root){const p=root?.querySelector(".dz-page");if(p)p.style.zoom=Math.min(1,(Math.min(window.innerWidth,1100)-80)/794)}
function dzCleanHtml(page){const c=page.cloneNode(true);c.querySelectorAll(".dz-ui").forEach(e=>e.remove());c.removeAttribute("contenteditable");c.style.zoom="";return c.outerHTML}
window.midadDesignEditor=function(i,d,kind,html,existingId){
 window.__dz={i,d,kind,existingId};
 const cls=(db.classes||[]).map(c=>'<option value="'+escTask(c.id)+'">'+escTask(c.name)+'</option>').join("");
 const ex=existingId?(db.activities||[]).find(a=>a.id===existingId):null;
 openModal("محرّر الورقة","انقر على أي نص لتعديله مباشرة. يمكنك إضافة تمرين أو حذفه.",'<div class="dz-bar"><select id="dzClass"><option value="">حفظ بدون إرسال للطلبة</option>'+cls+'</select>'+(kind==="واجب منزلي"?'<input id="dzDue" type="date" title="موعد التسليم" value="'+escTask(ex?.dueDate||"")+'">':'')+'<button class="btn light small" type="button" onclick="dzAddExercise()">＋ تمرين</button><button class="btn light small" type="button" onclick="dzPrint()">طباعة / PDF</button><button class="btn primary small" type="button" onclick="dzSave()">حفظ</button></div><div class="dz-wrap" id="dzWrap">'+(html||dzPageHtml(i,d))+'</div>',true);
 const wrap=$("dzWrap"),page=wrap.querySelector(".dz-page");
 page.setAttribute("contenteditable","true");
 page.querySelectorAll(".dz-ex").forEach(e=>{if(!e.querySelector(".dz-del"))dzAddDel(e)});
 if(ex?.assignment?.classId&&$("dzClass"))$("dzClass").value=ex.assignment.classId;
 dzFit(wrap);
};
function dzAddDel(e){const b=document.createElement("button");b.type="button";b.className="dz-ui dz-del";b.setAttribute("contenteditable","false");b.textContent="حذف التمرين";b.onclick=()=>e.remove();e.appendChild(b)}
window.dzAddExercise=function(){
 const body=document.querySelector("#dzPage, #dzWrap .dz-page .dz-body")||document.querySelector("#dzWrap .dz-page");if(!body)return;
 const t=document.createElement("div");t.innerHTML=dzExercise("تمرين جديد",0,"التعليمات:",[["اكتب هنا نص السؤال.",0]]);
 const el=t.firstElementChild;dzAddDel(el);(document.querySelector("#dzWrap .dz-body")||body).appendChild(el);
};
window.dzPrint=function(){const p=document.querySelector("#dzWrap .dz-page");if(p)window.dzPrintHtml(dzCleanHtml(p))};
window.dzPrintHtml=function(html){
 const w=window.open("","_blank");if(!w){toast("اسمح بفتح نافذة الطباعة من المتصفح.");return}
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>مِداد</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"><style>body{margin:0;background:#fff}'+DZ_CSS+'.dz-page{box-shadow:none!important;margin:0!important;zoom:1!important}@page{size:A4;margin:0}</style>'+html+'</html>');
 w.document.close();w.focus();setTimeout(()=>w.print(),700);
};
window.dzSave=function(){
 const st=window.__dz,page=document.querySelector("#dzWrap .dz-page");if(!st||!page)return;
 const html=dzCleanHtml(page),classId=$("dzClass")?.value||"",dueDate=$("dzDue")?.value||"";
 const assignment=classId?{scope:"class",classId,studentId:""}:null;
 const subject=(page.textContent.match(/مادة\s+([^\n·—]+)/)||[])[1]||st.d.subject||"";
 db.activities=db.activities||[];
 if(st.existingId){const a=db.activities.find(x=>x.id===st.existingId);if(!a)return;Object.assign(a,{designHtml:html,assignment,dueDate:st.kind==="واجب منزلي"?dueDate:""})}
 else{const number=numberFor(st.kind);db.activities.push({id:taskId(),kind:"task",category:st.kind,number,title:(st.d.title||DZ_DESIGNS[st.i].title)+" — "+(st.d.subject||""),subject:st.d.subject||subject,level:st.d.level||"",maxScore:st.d.max||20,dueDate:st.kind==="واجب منزلي"?dueDate:"",assignment,designHtml:html,designIndex:st.i,generatedData:{},created:new Date().toISOString()})}
 if(!save())return;
 closeModal();render();toast(classId?"تم حفظ الورقة وأُرسلت لطلبة القسم.":"تم حفظ الورقة. اختر قسماً عند التعديل لإرسالها للطلبة.");
};
window.midadViewDesign=function(id,readonly){
 const t=(db.activities||[]).find(x=>x.id===id&&x.designHtml);if(!t)return;
 const target=t.assignment?"موجه لقسم: "+((db.classes||[]).find(c=>c.id===t.assignment.classId)?.name||"غير محدد"):"غير مرسل للطلبة";
 openModal(escTask(t.title),readonly?(t.dueDate?"آخر أجل: "+escTask(t.dueDate):"ورقة النشاط"):escTask(target),'<div class="dz-bar"><button class="btn light small" type="button" onclick="dzPrintHtml(document.querySelector(\'#dzView .dz-page\').outerHTML)">طباعة / PDF</button>'+(readonly?'':'<button class="btn secondary small" type="button" onclick="midadEditDesign(\''+t.id+'\')">تعديل الورقة</button>')+'<button class="btn light small" type="button" onclick="closeModal()">إغلاق</button></div><div class="dz-wrap" id="dzView">'+t.designHtml+'</div>',true);
 dzFit($("dzView"));
};
window.midadEditDesign=function(id){const t=(db.activities||[]).find(x=>x.id===id&&x.designHtml);if(!t)return;window.midadDesignEditor(t.designIndex||0,{},t.category,t.designHtml,id)};
window.openTask=function(category){
 const kind=category||"واجب منزلي",n=numberFor(kind);
 openModal("إنشاء "+kind,"أدخل عنوان الدرس والمادة والمستوى وأرفق مصدره.",'<form novalidate id="taskCreateForm"><div class="task-form-banner" style="--task-accent:'+accents[kind]+'"><div><span>نشاط جديد</span><strong>'+(kind==="بحث"?"اقتراحات بحث":kind+" رقم "+n)+'</strong></div><i class="task-form-icon">'+taskIcon(kind)+'</i></div><div class="form-grid">'+
 '<div class="form-field full"><label>عنوان الدرس أو المصدر</label><input id="taskLessonTitle" required maxlength="180" placeholder="مثال: دورة الماء في الطبيعة"></div><div class="form-field"><label>المادة</label><input id="taskSubject" required placeholder="مثال: علوم الطبيعة والحياة"></div><div class="form-field"><label>المستوى الدراسي</label><input id="taskLevel" required placeholder="مثال: الرابعة متوسط"></div>'+
 (kind!=="بحث"?'<div class="form-field"><label>عدد الأسئلة</label><input id="taskQuestionCount" type="number" min="1" max="30" value="8" required></div><div class="form-field"><label>العلامة الكلية</label><input id="taskMaxScore" type="number" min="1" max="100" step="0.5" value="20" required><small class="muted">اختر أي علامة تريدها؛ توزّع النقاط تلقائياً.</small></div>' : '')+
 '<div class="form-field full"><label>توجيه النشاط</label><select id="taskTargetType" onchange="midadTaskTargetChanged()"><option value="class">لكل طلبة قسم</option><option value="student">لطالب معين</option></select></div><div class="form-field"><label>القسم</label><select id="taskTargetClass" onchange="midadTaskTargetClassChanged()">'+(db.classes||[]).map(x=>'<option value="'+escTask(x.id)+'">'+escTask(x.name)+'</option>').join('')+'</select></div><div class="form-field" id="taskTargetStudentWrap" style="display:none"><label>الطالب</label><select id="taskTargetStudent"></select></div>'+(kind==="واجب منزلي"?'<div class="form-field"><label>موعد التسليم</label><input id="taskDueDate" type="date"></div>':'')+
 '<div class="form-field full"><label>مصدر النشاط</label><select id="taskSourceType" onchange="midadTaskSourceTypeChanged()"><option value="text">نص الدرس</option><option value="file">ملف PDF أو Word</option><option value="video">فيديو (مع تفريغ نصه)</option></select></div>'+
 '<div class="form-field full" id="taskTextSource"><label>نص الدرس</label><textarea id="taskSourceText" rows="7" placeholder="الصق محتوى الدرس هنا..."></textarea></div>'+
 '<div class="form-field full" id="taskVideoSource" style="display:none"><label>رابط YouTube</label><input id="taskSourceUrl" type="url" placeholder="https://www.youtube.com/..."><label>تفريغ الفيديو</label><textarea id="taskVideoTranscript" rows="6" placeholder="الصق تفريغ الفيديو؛ الرابط وحده لا يستخرج الكلام."></textarea></div>'+
 '<div class="form-field full" id="taskFileSource" style="display:none"><label>رفع ملف الدرس</label><input id="taskSourceFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="midadReadTaskFile(this)"><small class="muted">يدعم PDF وWord DOCX.</small><textarea id="taskFileText" rows="6" placeholder="سيظهر النص المستخرج هنا..."></textarea></div><p class="muted full" id="taskSourceHint">سيعتمد النشاط على محتوى الدرس المرفق.</p></div><div class="modal-actions"><button type="submit" class="btn primary" id="taskGenerateButton">إنشاء '+kind+' بالذكاء الاصطناعي</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
 const form=$("taskCreateForm");if(form)form.addEventListener("submit",window.generateTaskFromSource);window.midadTaskTargetChanged();
};
window.openTaskUpload=function(){openModal("رفع نشاط جاهز","اختر نوع النشاط والملف وحدد الطلبة المستهدفين.",'<form novalidate id="taskUploadForm"><div class="form-grid"><div class="form-field"><label>نوع النشاط</label><select id="uploadTaskCategory" onchange="midadUploadTargetChanged()"><option>واجب منزلي</option><option>اختبار</option><option>امتحان</option><option>بحث</option></select></div><div class="form-field"><label>المادة</label><input id="uploadTaskSubject" required></div><div class="form-field"><label>المستوى الدراسي</label><input id="uploadTaskLevel" required></div><div class="form-field full"><label>ملف النشاط</label><input id="uploadTaskFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" required><small class="muted">PDF أو Word أو صورة. الحد الحالي 1.5 ميغابايت للحفظ داخل المتصفح.</small></div><div class="form-field full"><label>توجيه النشاط</label><select id="uploadTaskTargetType" onchange="midadUploadTargetChanged()"><option value="class">رفعه لكل طلبة قسم</option><option value="student">تخصيصه لطالب معين</option></select></div><div class="form-field"><label>القسم</label><select id="uploadTaskClass" onchange="midadUploadTargetClassChanged()">'+(db.classes||[]).map(x=>'<option value="'+escTask(x.id)+'">'+escTask(x.name)+'</option>').join('')+'</select></div><div class="form-field" id="uploadTaskStudentWrap" style="display:none"><label>الطالب</label><select id="uploadTaskStudent"></select></div><div class="form-field full" id="uploadTaskDueWrap"><label>موعد التسليم (للواجب)</label><input id="uploadTaskDue" type="date"></div></div><div class="modal-actions"><button class="btn primary" type="submit">حفظ ورفع النشاط</button><button class="btn light" type="button" onclick="closeModal()">إلغاء</button></div></form>');const form=$("taskUploadForm");if(form)form.addEventListener("submit",window.saveUploadedTask);window.midadUploadTargetChanged()};
window.midadUploadTargetChanged=function(){const show=$("uploadTaskTargetType")?.value==="student";const homework=$("uploadTaskCategory")?.value==="واجب منزلي";if($("uploadTaskDueWrap"))$("uploadTaskDueWrap").style.display=homework?"":"none";if($("uploadTaskStudentWrap"))$("uploadTaskStudentWrap").style.display=show?"":"none";window.midadUploadTargetClassChanged()};
window.midadUploadTargetClassChanged=function(){const cid=$("uploadTaskClass")?.value||"",sel=$("uploadTaskStudent");if(!sel)return;sel.innerHTML=(db.students||[]).filter(s=>s.classId===cid).map(s=>'<option value="'+escTask(s.id)+'">'+escTask(s.name)+'</option>').join("");if(!sel.options.length)sel.innerHTML='<option value="">لا يوجد طلبة في هذا القسم</option>'};
window.saveUploadedTask=async function(e){e.preventDefault();const file=$("uploadTaskFile")?.files?.[0],category=$("uploadTaskCategory")?.value,scope=$("uploadTaskTargetType")?.value||"class",classId=$("uploadTaskClass")?.value||"",studentId=scope==="student"?$("uploadTaskStudent")?.value||"":"",subject=$("uploadTaskSubject")?.value.trim()||"",level=$("uploadTaskLevel")?.value.trim()||"",dueDate=category==="واجب منزلي"?$("uploadTaskDue")?.value||"":"";
if(!file||!subject||!level){toast("أكمل البيانات واختر ملف النشاط.");return}if(!classId){toast("اختر القسم الذي سيصله النشاط.");return}if(file.size>15*1024*1024){toast("حجم الملف أكبر من الحد 15 ميغابايت.");return}if(scope==="student"&&!studentId){toast("اختر الطالب المستهدف.");return}
try{let up=null;try{up=await midadUploadToCloud(file,"tasks")}catch(e){console.error("Midad task upload:",e)}let data="";if(!up){if(file.size>300*1024)throw new Error("تعذر رفع الملف إلى التخزين السحابي، ولن يصل إلى الطلبة. أنشئ حاوية midad-files في Supabase ثم أعد المحاولة.");data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(new Error("تعذرت قراءة الملف."));fr.readAsDataURL(file)})}const number=numberFor(category),item={id:taskId(),kind:"task",category,number,title:category+" رقم "+number+" — "+subject,subject,level,dueDate,assignment:{scope,classId,studentId},uploadedFile:{name:file.name,type:file.type,size:file.size,data,url:up?.url||"",path:up?.path||""},generatedData:{},created:new Date().toISOString()};db.activities.push(item);if(!save()){db.activities.pop();return}closeModal();render();toast("تم حفظ النشاط المرفوع وتحديد مستهدفيه.")}catch(err){toast(err.message||"تعذر رفع النشاط.")}};
window.midadTaskTargetChanged=function(){const student=$("taskTargetType")?.value==="student",wrap=$("taskTargetStudentWrap");if(wrap)wrap.style.display=student?"":"none";window.midadTaskTargetClassChanged()};window.midadTaskTargetClassChanged=function(){const classId=$("taskTargetClass")?.value||"",select=$("taskTargetStudent");if(!select)return;select.innerHTML=(db.students||[]).filter(s=>s.classId===classId).map(s=>'<option value="'+escTask(s.id)+'">'+escTask(s.name)+'</option>').join("");if(!select.options.length)select.innerHTML='<option value="">لا يوجد طلبة في هذا القسم</option>'};window.midadTaskSourceTypeChanged=function(){const type=$("taskSourceType")?.value||"text";["taskTextSource","taskVideoSource","taskFileSource"].forEach(id=>{const el=$(id);if(el)el.style.display="none"});const el=$(type==="video"?"taskVideoSource":type==="file"?"taskFileSource":"taskTextSource");if(el)el.style.display="";const hint=$("taskSourceHint");if(hint)hint.textContent=type==="video"?"أدخل رابط YouTube وتفريغ الكلام يدوياً؛ لا نستخرج الصوت تلقائياً حالياً.":type==="file"?"اقرأ الملف أولاً ثم أنشئ النشاط.":"ألصق نص الدرس ليُبنى النشاط عليه."};
window.midadReadTaskFile=async function(input){const file=input?.files?.[0],out=$("taskFileText");if(!file||!out)return;out.value="جارٍ استخراج النص...";try{out.value=await window.midadExtractDocumentText(file,progress=>{if(progress?.message)out.value=progress.message});toast("تم استخراج النص من الملف.")}catch(e){out.value="";toast(e.message||"تعذرت قراءة الملف.")}};
function splitTaskSource(text,maxChars=12000){
 const blocks=String(text||"").replace(/\r\n?/g,"\n").split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
 const chunks=[];let current="";
 for(let block of blocks){
  while(block.length>maxChars){
   if(current){chunks.push(current);current=""}
   let cut=block.lastIndexOf(" ",maxChars);
   if(cut<Math.floor(maxChars*.6))cut=maxChars;
   chunks.push(block.slice(0,cut).trim());
   block=block.slice(cut).trim();
  }
  if(!block)continue;
  if(current&&current.length+block.length+2>maxChars){chunks.push(current);current=block}
  else current=current?current+"\n\n"+block:block;
 }
 if(current)chunks.push(current);
 return chunks;
}
async function summarizeTaskSource(source,meta,signal,onProgress){
 let working=String(source||"").trim(),pass=0;
 const safeLimit=16000;
 while(working.length>safeLimit&&pass<3){
  const chunks=splitTaskSource(working,12000);
  if(!chunks.length)throw new Error("تعذر تقسيم المصدر إلى أجزاء قابلة للتحليل.");
  const notes=new Array(chunks.length);let next=0,done=0;
  async function summarizeWorker(){
   while(next<chunks.length){
    const index=next++;
    const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},signal,body:JSON.stringify({
     kind:"experience",outputType:"experience",mode:"summary",
     lessonTitle:meta.lessonTitle+" — تحليل الجزء "+(index+1),
     title:meta.lessonTitle,subject:meta.subject,level:meta.level,
     content:chunks[index],questionCount:5
    })});
    const raw=await response.text();let payload={};
    try{payload=raw?JSON.parse(raw):{}}catch(_){throw new Error("تعذرت قراءة نتيجة تلخيص الجزء "+(index+1)+".")}
    if(!response.ok)throw new Error(payload.error||("فشل تلخيص الجزء "+(index+1)+" (HTTP "+response.status+")."));
    const data=payload.result||payload;
    if(!Array.isArray(data.sections)||!data.sections.length)throw new Error("نتيجة تلخيص الجزء "+(index+1)+" غير مكتملة.");
    const parts=[];
    if(data.intro)parts.push("تمهيد: "+String(data.intro).slice(0,350));
    data.sections.slice(0,7).forEach(section=>{
     const heading=String(section.heading||"").trim().slice(0,120);
     const body=String(section.body||"").trim().slice(0,500);
     const example=String(section.example||"").trim().slice(0,180);
     if(heading||body)parts.push((heading?heading+": ":"")+body+(example?" مثال: "+example:""));
    });
    if(!parts.length)throw new Error("لم يُنتج المحرك ملخصاً مفيداً للجزء "+(index+1)+".");
    notes[index]="الجزء "+(index+1)+":\n"+parts.join("\n");
    done++;
    if(onProgress)onProgress(done,chunks.length,pass+1);
   }
  }
  await Promise.all(Array.from({length:Math.min(2,chunks.length)},()=>summarizeWorker()));
  working=notes.join("\n\n");
  pass++;
 }
 if(working.length>safeLimit)throw new Error("المصدر ما زال أطول من الحد الآمن بعد ثلاث مراحل تلخيص. قسّمه إلى ملفات أصغر حتى لا نفقد محتواه.");
 return {content:working,summarized:pass>0,passes:pass};
}
window.generateTaskFromSource=async function(e){
 if(e?.preventDefault)e.preventDefault();
 const banner=document.querySelector("#taskCreateForm .task-form-banner strong")?.textContent||"",kind=banner.includes("بحث")?"بحث":banner.includes("اختبار")?"اختبار":banner.includes("امتحان")?"امتحان":"واجب منزلي";
 const lessonTitle=$("taskLessonTitle")?.value.trim()||"",subject=$("taskSubject")?.value.trim()||"",level=$("taskLevel")?.value.trim()||"",maxScore=Number($("taskMaxScore")?.value||20),questionCount=Math.max(1,Math.min(30,Number($("taskQuestionCount")?.value)||8)),dueDate=$("taskDueDate")?.value||"",targetType=$("taskTargetType")?.value||"class",targetClassId=$("taskTargetClass")?.value||"",targetStudentId=targetType==="student"?$("taskTargetStudent")?.value||"": "",type=$("taskSourceType")?.value||"text";
 const content=(type==="file"?$("taskFileText")?.value:type==="video"?$("taskVideoTranscript")?.value:$("taskSourceText")?.value)||"",sourceUrl=type==="video"?$("taskSourceUrl")?.value.trim()||"":"",button=$("taskGenerateButton");
 if(!lessonTitle||!subject||!level){toast("أدخل عنوان الدرس والمادة والمستوى الدراسي.");return false}if(kind!=="بحث"&&(!Number.isFinite(maxScore)||maxScore<=0||maxScore>100)){toast("اختر علامة كلية بين 1 و100.");return false}if(kind!=="بحث"&&(!Number.isInteger(questionCount)||questionCount<1||questionCount>30)){toast("عدد الأسئلة يجب أن يكون بين 1 و30.");return false}if(!targetClassId){toast("اختر القسم الذي سيصله النشاط. أنشئ قسماً أولاً إن لم يوجد.");return false}if(targetType==="student"&&!targetStudentId){toast("اختر الطالب المستهدف.");return false}
 if(content.trim().length<80){toast("أدخل نصاً لا يقل عن 80 حرفاً.");return false}
 if(type==="video"&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(sourceUrl)){toast("أدخل رابط YouTube صحيحاً يبدأ بـ HTTPS.");return false}
 if(!db?.aiEndpoint){toast("لم يُضبط رابط الذكاء الاصطناعي.");return false}
 const originalButtonText=button?.textContent||("إنشاء "+kind+" بالذكاء الاصطناعي");
 if(button){button.disabled=true;button.textContent="يجري تحليل المصدر..."}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),300000);
 try{
  const prepared=await summarizeTaskSource(content,{lessonTitle,subject,level},controller.signal,(done,total,pass)=>{
   if(button)button.textContent="تلخيص المصدر — المرحلة "+pass+" ("+done+"/"+total+")";
  });
  if(button)button.textContent="يجري إنشاء "+kind+"...";
  const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({kind:"task",taskCategory:kind,category:kind,lessonTitle,title:lessonTitle,subject,level,maxScore,questionCount,content:prepared.content,sourceUrl,sourceType:type})});
  const raw=await response.text();let payload={};
  try{payload=raw?JSON.parse(raw):{}}catch(_){throw Error("أعاد محرك الذكاء الاصطناعي استجابة غير مفهومة. أعد المحاولة.")}
  if(!response.ok)throw Error(payload.error||"تعذر إنشاء النشاط.");
  const result=payload.result||payload;
  if(kind==="بحث"&&(!Array.isArray(result.suggestions)||!result.suggestions.length))throw Error("لم يتم استخراج عناوين بحث. أعد المحاولة.");
  if(kind!=="بحث"&&(!Array.isArray(result.questions)||!result.questions.length))throw Error("لم يتم إنشاء أسئلة صالحة.");
  const number=numberFor(kind),title=kind==="بحث"?"عناوين بحوث مقترحة — "+subject:kind+" رقم "+number;
  const item={id:taskId(),kind:"task",category:kind,number,title,lessonTitle,subject,level,maxScore:kind==="بحث"?null:maxScore,dueDate:kind==="واجب منزلي"?dueDate:"",assignment:{scope:targetType,classId:targetClassId,studentId:targetStudentId},generatedData:result,sourceType:type,sourceUrl,sourceOriginalLength:content.trim().length,sourceSummarized:prepared.summarized,sourceSummaryPasses:prepared.passes,created:new Date().toISOString()};
  db.activities=db.activities||[];db.activities.push(item);save();closeModal();render();toast(prepared.summarized?"تم تلخيص المصدر الطويل مرحلياً ثم إنشاء النشاط.":kind==="بحث"?"تم استخراج عناوين البحوث.":"تم إنشاء النشاط وملفا الأسئلة والإجابات.");
 }catch(err){toast(err.name==="AbortError"?"انتهت مهلة تحليل المصدر أو إنشاء النشاط. أعد المحاولة أو قسّم الملف.":(err.message||"تعذر إنشاء النشاط."))}
 finally{clearTimeout(timer);if(button?.isConnected){button.disabled=false;button.textContent=originalButtonText}}
 return false;
};
window.viewTask=function(id){if((db.activities||[]).some(x=>x.id===id&&x.designHtml))return window.midadViewDesign(id);
 const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;const d=t.generatedData||{},research=t.category==="بحث";
 const body=t.uploadedFile?'<div class="task-file-heading questions"><span>↑</span><div><small>نشاط مرفوع · '+escTask(t.category)+'</small><h3>'+escTask(t.uploadedFile.name)+'</h3><p>'+escTask(t.subject)+' · '+escTask(t.level)+'</p></div></div><a class="btn primary" target="_blank" rel="noopener" href="'+(t.uploadedFile.url||t.uploadedFile.data)+'" download="'+escTask(t.uploadedFile.name)+'">تنزيل الملف المرفوع</a>':research?'<div class="task-file-heading research"><span>⌕</span><div><small>عناوين بحوث مقترحة</small><h3>'+escTask(t.subject)+'</h3></div></div><ol class="task-research-list">'+(d.suggestions||[]).map(x=>'<li>'+escTask(x)+'</li>').join("")+'</ol>':
 '<div class="task-file-heading questions"><span>01</span><div><small>'+escTask(t.category)+' رقم '+escTask(t.number)+'</small><h3>'+escTask(t.subject)+'</h3><p>'+escTask(t.level)+' · العلامة على '+escTask(t.maxScore)+'</p></div></div><h4>معاينة الأسئلة</h4><ol class="task-question-list">'+(d.questions||[]).map(q=>'<li>'+escTask(q.question)+' <b>('+escTask(q.points)+' ن)</b></li>').join("")+'</ol><div class="task-file-heading answers"><span>✓</span><div><small>ملف التصحيح</small><h3>الإجابات النموذجية وسلم التنقيط</h3></div></div><ol class="task-answer-list">'+(d.questions||[]).map(q=>'<li><b>'+escTask(q.question)+'</b><p>'+escTask(q.answer)+'</p><span>'+escTask(q.points)+' / '+escTask(t.maxScore)+' ن</span></li>').join("")+'</ol><p class="task-total-score">المجموع: '+escTask(t.maxScore)+' / '+escTask(t.maxScore)+'</p>';
 const buttons=t.uploadedFile?"":research?'<button class="btn primary" onclick="downloadTaskPdf(\''+t.id+'\',\'research\')">تنزيل قائمة العناوين PDF</button>':'<div class="task-download-row"><button class="btn primary" onclick="downloadTaskPdf(\''+t.id+'\',\'questions\')">تنزيل ملف الأسئلة PDF</button><button class="btn secondary" onclick="downloadTaskPdf(\''+t.id+'\',\'answers\')">تنزيل ملف الإجابات PDF</button></div>';
 const target=t.assignment?(t.assignment.scope==="student"?"مخصص لطالب: "+((db.students||[]).find(s=>s.id===t.assignment.studentId)?.name||"غير معروف"):"موجه لقسم: "+((db.classes||[]).find(c=>c.id===t.assignment.classId)?.name||"غير محدد")):"لم يُحدد مستهدف";const editButton=t.uploadedFile?'':'<div class="modal-actions"><button class="btn secondary" onclick="editTask(\''+t.id+'\')">تعديل النشاط</button><span class="muted">'+escTask(target)+(t.dueDate?' · التسليم: '+escTask(t.dueDate):'')+'</span></div>';openModal(escTask(t.title),"ملفات النشاط المنفصلة",body+buttons+editButton+'<div class="modal-actions"><button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
};
window.downloadTaskPdf=async function(id,part){
 const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;
 try{
  if(!window.html2canvas)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  if(!window.jspdf?.jsPDF)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  const d=t.generatedData||{},research=t.category==="بحث",answers=part==="answers",heading=research?"عناوين بحوث مقترحة":answers?"الإجابات النموذجية وسلم التنقيط":"أسئلة "+t.category+" رقم "+t.number,color=research?"#806aa0":answers?"#5579a8":"#537d68";
  const source=research?(d.suggestions||[]):(d.questions||[]);
  const perPage=research?6:3,groups=[];for(let i=0;i<source.length;i+=perPage)groups.push(source.slice(i,i+perPage));if(!groups.length)groups.push([]);
  const PDF=window.jspdf.jsPDF,pdf=new PDF({orientation:"portrait",unit:"pt",format:"a4",compress:true});
  for(let pageIndex=0;pageIndex<groups.length;pageIndex++){
   const rows=groups[pageIndex].map((item,j)=>{const index=pageIndex*perPage+j;return research?'<li style="margin:0 0 24px;padding:0 5px 8px;break-inside:avoid">'+escTask(item)+'</li>':'<li style="margin:0 0 28px;padding:0 5px 12px;break-inside:avoid"><div style="font-weight:700">'+(index+1)+'. '+escTask(item.question)+'</div><div style="margin-top:10px;color:'+color+';font-size:18px;font-weight:700">العلامة: '+escTask(item.points)+' نقطة</div>'+(answers?'<div style="margin-top:12px;line-height:1.8;white-space:pre-wrap">'+escTask(item.answer)+'</div>':'')+'</li>'}).join("");
   const page='<article dir="rtl" style="width:794px;height:1123px;box-sizing:border-box;padding:54px 64px 42px;background:#fff;color:#263b30;font-family:Tajawal,Arial,sans-serif;display:flex;flex-direction:column"><header style="border-bottom:3px solid '+color+';padding-bottom:18px;margin-bottom:24px;flex-shrink:0"><div style="font-size:16px;color:#718174;font-weight:700">مِداد · وثيقة تعليمية</div><h1 style="font-size:30px;line-height:1.45;margin:10px 0;color:#294b39">'+escTask(heading)+'</h1><div style="font-size:17px;color:#65786a"><b>المادة:</b> '+escTask(t.subject)+'　 <b>المستوى:</b> '+escTask(t.level)+'</div>'+(!research?'<div style="margin-top:9px;font-size:17px;color:'+color+';font-weight:700">العلامة الكلية: '+escTask(t.maxScore)+' / '+escTask(t.maxScore)+'</div>':'')+'</header><ol style="padding-right:28px;margin:0;font-size:21px;line-height:1.8;flex:1">'+rows+'</ol><footer style="margin-top:auto;border-top:1px solid #e1e9e0;padding-top:12px;font-size:13px;color:#879589;display:flex;justify-content:space-between"><span>مِداد — وثيقة معدّة للطباعة</span><span>صفحة '+(pageIndex+1)+' من '+groups.length+'</span></footer></article>';
   const host=document.createElement("div");host.style.cssText="position:fixed;left:-20000px;top:0;z-index:-1";host.innerHTML=page;document.body.appendChild(host);
   try{const canvas=await window.html2canvas(host.firstElementChild,{scale:1.5,backgroundColor:"#fff",useCORS:true});if(pageIndex>0)pdf.addPage();pdf.addImage(canvas.toDataURL("JPEG",.96),"JPEG",0,0,595.28,841.89)}finally{host.remove()}
  }
  pdf.save((research?"عناوين-بحوث":answers?"الإجابات-النموذجية":"الأسئلة")+"-"+(t.number||"")+".pdf");
 }catch(e){console.error(e);toast("تعذر تجهيز PDF. تحقق من الاتصال ثم أعد المحاولة.")}
};
let taskEditState=null;window.editTask=function(id){const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;taskEditState={id,title:t.title,instructions:t.generatedData?.instructions||"",suggestions:(t.generatedData?.suggestions||[]).slice(),questions:(t.generatedData?.questions||[]).map(q=>({...q}))};renderTaskEditor()};function renderTaskEditor(){if(!taskEditState)return;const s=taskEditState,research=db.activities.find(x=>x.id===s.id)?.category==="بحث";const rows=research?s.suggestions.map((x,i)=>'<div class="form-field full"><label>عنوان '+(i+1)+'</label><input value="'+escTask(x)+'" oninput="taskEditSuggestion('+i+',this.value)"><button type="button" class="btn light small" onclick="taskEditRemove('+i+')">حذف العنوان</button></div>').join(""):s.questions.map((q,i)=>'<div style="border:1px solid var(--line);border-radius:13px;padding:12px;margin:10px 0"><b>السؤال '+(i+1)+'</b><label class="form-field"><span>نص السؤال</span><textarea oninput="taskEditQuestion('+i+',\'question\',this.value)">'+escTask(q.question)+'</textarea></label><label class="form-field"><span>الإجابة النموذجية</span><textarea oninput="taskEditQuestion('+i+',\'answer\',this.value)">'+escTask(q.answer)+'</textarea></label><label class="form-field"><span>النقاط</span><input type="number" min="0" step="0.5" value="'+escTask(q.points)+'" oninput="taskEditQuestion('+i+',\'points\',this.value)"></label><button type="button" class="btn light small" onclick="taskEditRemove('+i+')">حذف السؤال</button></div>').join("");openModal("تعديل النشاط","عدّل النصوص أو أضف واحذف ما تريد.",'<div class="form-field"><label>عنوان النشاط</label><input id="taskEditTitle" value="'+escTask(s.title)+'"></div><div class="form-field full"><label>التعليمات</label><textarea id="taskEditInstructions">'+escTask(s.instructions)+'</textarea></div><div id="taskEditRows">'+rows+'</div><button class="btn secondary" type="button" onclick="taskEditAdd()">＋ '+(research?"إضافة عنوان":"إضافة سؤال")+'</button><div class="modal-actions"><button class="btn primary" onclick="taskEditSave()">حفظ التعديلات</button><button class="btn light" onclick="viewTask(\''+s.id+'\')">إلغاء</button></div>',true)}window.taskEditQuestion=(i,k,v)=>{if(taskEditState?.questions[i])taskEditState.questions[i][k]=k==="points"?Number(v):v};window.taskEditSuggestion=(i,v)=>{if(taskEditState)taskEditState.suggestions[i]=v};window.taskEditAdd=function(){if(!taskEditState)return;const t=db.activities.find(x=>x.id===taskEditState.id);if(t.category==="بحث")taskEditState.suggestions.push("");else taskEditState.questions.push({question:"",answer:"",points:0});renderTaskEditor()};window.taskEditRemove=function(i){if(!taskEditState)return;const t=db.activities.find(x=>x.id===taskEditState.id);if(t.category==="بحث")taskEditState.suggestions.splice(i,1);else taskEditState.questions.splice(i,1);renderTaskEditor()};window.taskEditSave=function(){if(!taskEditState)return;const t=db.activities.find(x=>x.id===taskEditState.id);t.title=$("taskEditTitle")?.value.trim()||t.title;t.generatedData=t.generatedData||{};t.generatedData.instructions=$("taskEditInstructions")?.value||"";if(t.category==="بحث")t.generatedData.suggestions=taskEditState.suggestions.filter(Boolean);else{const qs=taskEditState.questions.filter(q=>q.question.trim());if(!qs.length){toast("أضف سؤالاً واحداً على الأقل.");return}const total=Number(t.maxScore)||20,weights=qs.map(q=>Math.max(0,Number(q.points)||1)),sum=weights.reduce((a,b)=>a+b,0)||qs.length,raw=weights.map(w=>total*w/sum),units=raw.map(x=>Math.floor(x*2)),left=Math.round(total*2)-units.reduce((a,b)=>a+b,0);raw.map((x,i)=>({i,f:x*2-Math.floor(x*2)})).sort((a,b)=>b.f-a.f).slice(0,left).forEach(x=>units[x.i]++);t.generatedData.questions=qs.map((q,i)=>({...q,points:units[i]/2}))}taskEditState=null;save();closeModal();render();toast("تم حفظ تعديلات النشاط.")};window.deleteTask=async function(id){if(!await ui.confirm("هل تريد حذف هذا النشاط؟",{title:"حذف النشاط",icon:"!",okText:"حذف",danger:true}))return;db.activities=db.activities.filter(x=>x.id!==id);save();render();toast("تم حذف النشاط")};
})();