/* مِداد — تسليم الأنشطة + الإعلانات والتصويت والتعليقات */
(function(){
"use strict";
const API="/api/student-action",LK="midad_local_actions";
const $=s=>document.querySelector(s),E=v=>esc(v==null?"":String(v)),stu=()=>document.body.classList.contains("student-mode");
const day=d=>d?new Date(d).toLocaleDateString("ar-DZ"):"";
let code="",remote=[];
const loc=()=>{try{return JSON.parse(localStorage.getItem(LK)||"[]")}catch(e){return[]}};
const kOf=a=>a.type==="comment"?a.id:a.type+":"+a.studentId+":"+a.refId;
const all=()=>{const m=new Map();remote.concat(loc()).forEach(a=>m.set(a.k,a));return[...m.values()].sort((a,b)=>(a.created||"").localeCompare(b.created||""))};
const of=(t,r)=>all().filter(a=>a.type===t&&a.refId===r);
const me=()=>(db.students||[]).find(s=>s.studentCode===code);
const tasksOf=st=>(db.activities||[]).filter(x=>x.kind==="task"&&x.assignment&&((x.assignment.scope==="student"&&x.assignment.studentId===st.id)||(x.assignment.scope!=="student"&&x.assignment.classId===st.classId))).sort((a,b)=>(b.created||"").localeCompare(a.created||""));

/* ===== النقل: الخادم أولاً، ثم هذا الجهاز كاحتياط ===== */
async function pull(){
 try{let r;
  if(stu()){if(!code)return;r=await fetch(API+"?code="+code,{cache:"no-store"})}
  else{const t=(await window.midadSupabase.auth.getSession()).data.session.access_token;r=await fetch(API+"?classes="+db.classes.map(c=>c.id).join(","),{headers:{Authorization:"Bearer "+t},cache:"no-store"})}
  if(r.ok)remote=(await r.json()).actions||[];
 }catch(e){}
}
async function send(a){
 a.k=kOf(a);
 try{
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,action:a})});
  if(r.ok){const j=await r.json();const x=j.action||a;remote=remote.filter(y=>y.k!==x.k);remote.push(x);return true}
  if(r.status!==404&&r.status<500){const p=await r.json().catch(()=>({}));toast(p.error||"رُفض الطلب.");return false}
 }catch(e){}
 const l=loc().filter(x=>x.k!==a.k);l.push(a);
 try{localStorage.setItem(LK,JSON.stringify(l))}catch(e){toast("الملف كبير جداً للحفظ على هذا الجهاز.");return false}
 toast("تعذر الاتصال بالخادم: حُفظ على هذا الجهاز فقط ولن يصل إلى الأستاذ.");return true;
}

/* ===== واجهة الطالب ===== */
const tile='<button class="student-home-tile tile-announce" onclick="window.midadStudentTab(\'announcements\')"><span class="student-tile-icon"><svg viewBox="0 0 48 48"><path d="M8 20v8a2 2 0 0 0 2 2h6l14 8V10l-14 8h-6a2 2 0 0 0-2 2z"/><path d="M37 17a9 9 0 0 1 0 14"/></svg></span><strong>الإعلانات</strong><small>إعلانات الأستاذ والتصويت</small></button>';
const css=document.createElement("style");css.textContent="body.student-mode .tile-announce .student-tile-icon{background:#f3e8e4;color:#a46e65}.mdvote{justify-content:space-between!important;width:100%}";document.head.appendChild(css);

function annHtml(st){
 const list=(db.announcements||[]).filter(a=>a.classId===st.classId).slice().reverse();
 if(!list.length)return empty("لا توجد إعلانات","ستظهر هنا إعلانات الأستاذ وصناديق التصويت.");
 return list.map(a=>{
  const votes=of("vote",a.id),mine=votes.find(v=>v.studentId===st.id),cm=of("comment",a.id);
  const poll=a.kind==="poll"?'<div style="display:grid;gap:8px;margin:12px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<button class="btn mdvote '+(mine&&mine.data.optionId===o.id?"primary":"light")+'" onclick="midadVote(\''+a.id+'\',\''+o.id+'\')"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></button>'}).join("")+'<small class="muted">'+votes.length+' صوت'+(mine?" · يمكنك تغيير صوتك":"")+'</small></div>':"";
  const cbox=a.commentsOpen===false?'<p class="muted" style="font-size:12px;margin:8px 0 0">التعليقات مغلقة لهذا الإعلان.</p>':'<div style="display:flex;gap:8px;margin-top:8px"><input class="field-search" id="cm_'+a.id+'" maxlength="500" placeholder="اكتب تعليقاً..."><button class="btn primary small" onclick="midadComment(\''+a.id+'\')">إرسال</button></div>';
  return '<article class="card" style="margin-bottom:14px"><span class="pill '+(a.kind==="poll"?"blue":"")+'">'+(a.kind==="poll"?"تصويت":"إعلان")+'</span> <small class="muted">'+day(a.created)+'</small><h3 style="margin:8px 0">'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap;line-height:1.9">'+E(a.body)+'</p>':"")+poll+cm.map(c=>'<p style="padding:8px 0;border-top:1px solid var(--line);margin:0"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+cbox+'</article>';
 }).join("");
}
function draw(){const b=$("#annBox"),st=me();if(b&&st)b.innerHTML=annHtml(st)}
async function annView(){
 const st=me(),shell=$(".student-detail-shell");if(!st||!shell)return;
 const h=$("#main .page-head h1");if(h)h.textContent="الإعلانات";
 const box=document.createElement("div");box.id="annBox";box.innerHTML='<p class="muted">جارٍ التحميل...</p>';
 shell.querySelector(".student-detail-actions").after(box);
 box.innerHTML=annHtml(st);await pull();draw();
}
window.midadVote=async function(aid,oid){const st=me();if(!st)return;if(await send({type:"vote",studentId:st.id,studentName:st.name,classId:st.classId,refId:aid,data:{optionId:oid},created:new Date().toISOString()}))draw()};
window.midadComment=async function(aid){
 const st=me(),i=$("#cm_"+aid),t=(i&&i.value||"").trim();if(!st||!t)return;
 if(await send({type:"comment",id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),studentId:st.id,studentName:st.name,classId:st.classId,refId:aid,data:{text:t},created:new Date().toISOString()}))draw();
};
window.midadSubmitOpen=async function(tid){
 const st=me(),t=(db.activities||[]).find(x=>x.id===tid);if(!st||!t)return;
 await pull();const old=of("submission",tid).find(s=>s.studentId===st.id);
 openModal("تسليم: "+E(t.title||t.category),t.dueDate?"آخر أجل: "+E(t.dueDate):"أرسل إجابتك إلى الأستاذ",
  (old?'<p class="pill green">سُلّم في '+day(old.created)+(old.data.file?" · "+E(old.data.file.name):"")+' — يمكنك إعادة التسليم لاستبداله.</p>':"")+
  '<div class="form-field full"><label>إجابتك (اختياري إن رفعت ملفاً)</label><textarea id="subText" rows="6">'+E(old?old.data.text:"")+'</textarea></div><div class="form-field full"><label>ملف (صورة أو PDF أو Word)</label><input id="subFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"><small class="muted">الحد الأقصى 1 ميغابايت.</small></div><div class="modal-actions"><button class="btn primary" id="subGo" onclick="midadSubmitGo(\''+tid+'\')">تسليم</button><button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
window.midadSubmitGo=async function(tid){
 const st=me(),text=($("#subText")?.value||"").trim(),f=$("#subFile")?.files?.[0],old=of("submission",tid).find(s=>s.studentId===st.id);
 if(!text&&!f&&!(old&&old.data.file)){toast("اكتب إجابة أو ارفع ملفاً.");return}
 if(f&&f.size>1000000){toast("الملف أكبر من 1 ميغابايت.");return}
 const b=$("#subGo");b.disabled=true;let file=old?old.data.file||null:null;
 if(f){file=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=no;r.readAsDataURL(f)}).catch(()=>null);if(!file){toast("تعذرت قراءة الملف.");b.disabled=false;return}}
 const ok=await send({type:"submission",studentId:st.id,studentName:st.name,classId:st.classId,refId:tid,data:{text,file},created:new Date().toISOString()});
 b.disabled=false;if(ok){closeModal();toast("تم تسليم النشاط.")}
};
const SW=window.midadStudentTab;
window.midadStudentTab=function(v){SW.apply(this,arguments);if(v==="announcements")annView()};
const LG=window.midadStudentLogin;
window.midadStudentLogin=function(){code=($("#studentLoginCode")?.value||"").replace(/\D/g,"");return LG.apply(this,arguments)};
const SS=window.midadStudentSelect;
window.midadStudentSelect=function(v){if(!v){code="";remote=[]}return SS.apply(this,arguments)};

/* ===== واجهة الأستاذ ===== */
function tPage(){
 const cn=id=>(db.classes.find(c=>c.id===id)||{}).name||"—",list=(db.announcements||[]).slice().reverse();
 return pageHead("التواصل مع الطلبة","الإعلانات والتصويت","انشر إعلاناً أو صندوق تصويت لقسم، وتحكّم في التعليقات.",btn("＋ إعلان","midadAnnForm('notice')")+" "+btn("＋ صندوق تصويت","midadAnnForm('poll')","secondary"))+
 (list.length?'<div class="cards" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+list.map(a=>{
  const votes=of("vote",a.id),cm=of("comment",a.id);
  const res=a.kind==="poll"?'<div style="display:grid;gap:6px;margin:10px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<div><div style="display:flex;justify-content:space-between;font-size:12px"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></div><div style="height:7px;background:var(--line);border-radius:9px"><div style="height:100%;width:'+p+'%;background:var(--cocoa);border-radius:9px"></div></div></div>'}).join("")+'<small class="muted">'+votes.length+' صوت</small></div>':"";
  return '<article class="item-card"><div class="item-top"><span class="pill '+(a.kind==="poll"?"blue":"")+'">'+(a.kind==="poll"?"تصويت":"إعلان")+'</span><span class="pill green">'+E(cn(a.classId))+'</span></div><h3>'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap">'+E(a.body)+'</p>':"")+res+(cm.length?'<div style="max-height:130px;overflow:auto;font-size:12px">'+cm.map(c=>'<p style="margin:0;padding:6px 0;border-top:1px solid var(--line)"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+'</div>':"")+'<div class="item-meta"><span class="pill">'+cm.length+' تعليق</span><span class="pill '+(a.commentsOpen===false?"rose":"green")+'">'+(a.commentsOpen===false?"التعليقات مغلقة":"التعليقات مفتوحة")+'</span></div><div class="item-actions">'+btn(a.commentsOpen===false?"فتح التعليقات":"إقفال التعليقات","midadAnnToggle('"+a.id+"')","light small")+btn("حذف","midadAnnDel('"+a.id+"')","danger small")+'</div></article>';
 }).join("")+'</div>':empty("لا توجد إعلانات بعد","انشر أول إعلان أو صندوق تصويت لقسمك.",btn("＋ إعلان","midadAnnForm('notice')")));
}
window.midadAnnForm=function(kind){
 if(!(db.classes||[]).length){toast("أنشئ قسماً أولاً.");return}
 const poll=kind==="poll";
 openModal(poll?"صندوق تصويت جديد":"إعلان جديد","سيظهر للطلبة في تبويب «الإعلانات».",'<div class="form-grid"><div class="form-field full"><label>القسم</label><select id="anClass">'+db.classes.map(c=>'<option value="'+E(c.id)+'">'+E(c.name)+'</option>').join("")+'</select></div><div class="form-field full"><label>العنوان</label><input id="anTitle" maxlength="150"></div><div class="form-field full"><label>'+(poll?"السؤال / تفاصيل (اختياري)":"نص الإعلان")+'</label><textarea id="anBody" rows="4"></textarea></div>'+(poll?'<div class="form-field full"><label>خيارات التصويت — خيار في كل سطر</label><textarea id="anOpts" rows="4" placeholder="نعم&#10;لا"></textarea></div>':"")+'<label class="form-field full" style="display:flex;flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="anCm" checked style="width:auto"> السماح للطلبة بالتعليق</label></div><div class="modal-actions"><button class="btn primary" onclick="midadAnnSave(\''+kind+'\')">نشر</button><button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
window.midadAnnSave=function(kind){
 const title=($("#anTitle")?.value||"").trim(),classId=$("#anClass")?.value||"";
 if(!title||!classId){toast("اكتب العنوان واختر القسم.");return}
 let options=[];
 if(kind==="poll"){options=[...new Set(($("#anOpts")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean))].map((t,i)=>({id:"o"+i,text:t}));if(options.length<2){toast("أضف خيارين على الأقل.");return}}
 db.announcements=db.announcements||[];
 db.announcements.push({id:"an-"+id(),kind,classId,title,body:($("#anBody")?.value||"").trim(),options,commentsOpen:!!$("#anCm")?.checked,created:new Date().toISOString()});
 if(!save())return;closeModal();render();toast("تم النشر، وسيراه طلبة القسم.");
};
window.midadAnnToggle=function(aid){const a=(db.announcements||[]).find(x=>x.id===aid);if(!a)return;a.commentsOpen=a.commentsOpen===false;save();render();toast(a.commentsOpen?"فُتحت التعليقات.":"أُقفلت التعليقات.")};
window.midadAnnDel=async function(aid){if(!await ui.confirm("حذف هذا الإعلان؟",{title:"حذف الإعلان",icon:"!",okText:"حذف",danger:true}))return;db.announcements=(db.announcements||[]).filter(x=>x.id!==aid);save();render()};
window.midadSubs=async function(tid){
 const t=(db.activities||[]).find(x=>x.id===tid);if(!t)return;await pull();
 const a=t.assignment||{},sts=db.students.filter(s=>a.scope==="student"?s.id===a.studentId:s.classId===a.classId),subs=of("submission",tid);
 const rows=sts.map(s=>{const x=subs.find(y=>y.studentId===s.id);return '<div class="list-row" style="align-items:flex-start"><div><b>'+E(s.name)+'</b><small class="muted" style="display:block">'+(x?"سُلّم "+day(x.created)+(x.data.late?" · متأخر":""):"لم يسلّم بعد")+'</small>'+(x&&x.data.text?'<p style="white-space:pre-wrap;margin:6px 0;font-size:12px;line-height:1.8">'+E(x.data.text)+'</p>':"")+'</div>'+(x&&x.data.file?'<a class="btn light small" download="'+E(x.data.file.name)+'" href="'+E(x.data.file.data)+'">تنزيل الملف</a>':"")+'</div>'}).join("");
 openModal("تسليمات: "+E(t.title||t.category),subs.length+" من "+sts.length+" سلّموا",'<div class="list">'+(rows||'<p class="muted">لا يوجد طلبة مستهدفون.</p>')+'</div><div class="modal-actions">'+(window.midadOpenGradePublisher?'<button class="btn primary" onclick="closeModal();midadOpenGradePublisher(\''+tid+'\')">تصحيح وإرسال النقاط</button>':"")+'<button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
};
const R=window.render;
window.render=function(){
 if(page==="announce"&&!stu()){const m=$("#main");m.innerHTML=tPage();pull().then(()=>{if(page==="announce"&&!stu())m.innerHTML=tPage()});return}
 return R.apply(this,arguments);
};
const navs=document.querySelectorAll(".sidebar .nav"),last=navs[navs.length-1];
if(last){const b=document.createElement("button");b.dataset.page="announce";b.onclick=()=>window.navigate("announce");b.innerHTML='<span class="ni"><svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/></svg></span>الإعلانات والتصويت';last.appendChild(b)}

/* حقن الأزرار في الواجهات الموجودة */
const main=$("#main");
new MutationObserver(()=>{
 if(stu()){
  const g=main.querySelector(".student-home-grid");
  if(g&&!g.querySelector(".tile-announce"))g.insertAdjacentHTML("beforeend",tile);
  const st=me(),cards=main.querySelectorAll(".student-task-card");
  if(st&&cards.length){const ts=tasksOf(st);cards.forEach((c,i)=>{const box=c.querySelector(".item-actions");if(ts[i]&&box&&!box.querySelector(".mdsub"))box.insertAdjacentHTML("beforeend",'<button class="btn secondary small mdsub" onclick="midadSubmitOpen(\''+ts[i].id+'\')">تسليم</button>')})}
 }else{
  main.querySelectorAll(".task-saved-card").forEach(c=>{
   const m=(c.querySelector("[onclick*=viewTask]")?.getAttribute("onclick")||"").match(/viewTask\('([^']+)'/),box=c.querySelector(".item-actions");
   if(m&&box&&!box.querySelector(".mdsubs"))box.insertAdjacentHTML("afterbegin",'<button class="btn secondary small mdsubs" onclick="midadSubs(\''+m[1]+'\')">التسليمات</button>');
  });
 }
}).observe(main,{childList:true});
})();
