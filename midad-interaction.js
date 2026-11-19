/* مِداد — تسليم الأنشطة + الإعلانات والتصويت والتعليقات + عرض ملفات التوقيت/البرنامج */
(function(){
"use strict";
const API="/api/student-action",LK="midad_local_actions",MAXF=1000000;
const $=s=>document.querySelector(s),E=v=>esc(v==null?"":String(v)),stu=()=>document.body.classList.contains("student-mode");
const day=d=>d?new Date(d).toLocaleDateString("ar-DZ"):"";
const isImg=f=>/^image\//.test(f.type||"")||/\.(png|jpe?g|webp|gif)$/i.test(f.name||"");
const ICON='<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/></svg>';
let code="",remote=[],srvAnn=[],srvOk=false,srvSched=null,srvErr="";
/* رمز الطالب: قد يضيع عند استعادة الجلسة أو الدخول بالبصمة/Google فيبقى كل شيء فارغاً، لذا نستنتجه من أكثر من مصدر */
const guessCode=()=>{
 const i=$("#studentLoginCode"),v=i&&String(i.value||"").replace(/\D/g,"");if(/^\d{6}$/.test(v||""))return v;
 for(const S of [sessionStorage,localStorage]){try{for(let n=0;n<S.length;n++){const k=S.key(n)||"";
  if(!/student|portal|code/i.test(k)||/^midad_(local_actions|pk|sched)/.test(k))continue;
  const raw=S.getItem(k)||"",m=raw.match(/^\s*"?(\d{6})"?\s*$/)||raw.match(/"studentCode"\s*:\s*"(\d{6})"/)||raw.match(/"code"\s*:\s*"(\d{6})"/);if(m)return m[1]}}catch(e){}}
 return"";
};
const getCode=()=>code||(stu()?(code=guessCode()):"");
window.midadSetStudentCode=c=>{code=String(c||"").replace(/\D/g,"");srvOk=false};
window.midadGetStudentCode=getCode;
const loc=()=>{try{return JSON.parse(localStorage.getItem(LK)||"[]")}catch(e){return[]}};
const kOf=a=>a.type==="comment"?a.id:a.type+":"+a.studentId+":"+a.refId;
const all=()=>{const m=new Map();remote.concat(loc()).forEach(a=>m.set(a.k,a));return[...m.values()].sort((a,b)=>(a.created||"").localeCompare(b.created||""))};
const of=(t,r)=>all().filter(a=>a.type===t&&a.refId===r);
const me=()=>{const c=getCode();return c?(db.students||[]).find(s=>String(s.studentCode)===c):null};
const tasksOf=st=>(db.activities||[]).filter(x=>x.kind==="task"&&x.assignment&&((x.assignment.scope==="student"&&x.assignment.studentId===st.id)||(x.assignment.scope!=="student"&&x.assignment.classId===st.classId))).sort((a,b)=>(b.created||"").localeCompare(a.created||""));
const tok=async()=>(await window.midadSupabase.auth.getSession()).data.session.access_token;

/* ===== النقل ===== */
async function pull(){
 try{
  let r;
  if(stu()){const c=getCode();if(!c)return;r=await fetch(API+"?code="+c,{cache:"no-store"})}
  else r=await fetch(API,{headers:{Authorization:"Bearer "+await tok()},cache:"no-store"});
  if(r.ok){const j=await r.json();remote=j.actions||[];if(stu()){srvAnn=j.announcements||[];srvSched=j.schedule||null;srvOk=true;srvErr=""}}
  else if(stu()){const p=await r.json().catch(()=>({}));srvErr=p.error||("خطأ "+r.status)}
 }catch(e){if(stu())srvErr="تعذر الاتصال بالخادم"}
}
async function send(a){
 a.k=kOf(a);
 try{
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:getCode(),action:a})});
  if(r.ok){const j=await r.json(),x=j.action||a;remote=remote.filter(y=>y.k!==x.k);remote.push(x);return true}
  if(r.status!==404&&r.status<500){const p=await r.json().catch(()=>({}));toast(p.error||"رُفض الطلب.");return false}
 }catch(e){}
 const l=loc().filter(x=>x.k!==a.k);l.push(a);
 try{localStorage.setItem(LK,JSON.stringify(l))}catch(e){toast("الملف كبير جداً للحفظ على هذا الجهاز.");return false}
 toast("تعذر الاتصال بالخادم: حُفظ على هذا الجهاز فقط ولن يصل إلى الأستاذ.");return true;
}
async function publish(op,a,quiet){
 try{
  const item=op==="delete"?{id:a.id}:{id:a.id,classId:a.classId,kind:a.kind,title:a.title,body:a.body,options:a.options,commentsOpen:a.commentsOpen,attachment:a.attachment||null,created:a.created};
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({announce:{op,item}})});
  if(r.ok)return true;
  const p=await r.json().catch(()=>({}));if(!quiet)toast((p.error||"تعذر النشر")+" — لم يصل إلى الطلبة.");return false;
 }catch(e){if(!quiet)toast("تعذر الاتصال بالخادم: الإعلان محفوظ لديك ولم يصل إلى الطلبة بعد.");return false}
}
async function pub(a,quiet){const ok=await publish("upsert",a,quiet);if(a.published!==ok){a.published=ok;save()}return ok}
async function syncPending(){for(const a of (db.announcements||[]).filter(x=>x.published!==true))await pub(a,true)}

/* ===== مرفقات ===== */
function attHtml(at,small){
 if(!at)return"";
 const src=at.url||at.data||"";
 if(src&&isImg(at))return '<a href="'+E(src)+'" target="_blank" rel="noopener"><img src="'+E(src)+'" alt="'+E(at.name||"")+'" style="max-width:100%;'+(small?"max-height:140px;":"")+'border-radius:12px;margin:8px 0;border:1px solid var(--line)"></a>';
 let h="";
 if(src)h+='<a class="btn light small" target="_blank" rel="noopener" href="'+E(src)+'" download="'+E(at.name||"file")+'">تحميل: '+E(at.name||"ملف")+'</a> ';
 if(at.link)h+='<a class="btn light small" target="_blank" rel="noopener" href="'+E(at.link)+'">فتح الرابط ↗</a>';
 return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">'+h+'</div>';
}

/* ===== واجهة الطالب ===== */
const tile='<button class="student-home-tile tile-announce" onclick="window.midadStudentTab(\'announcements\')"><span class="student-tile-icon"><svg viewBox="0 0 48 48"><path d="M8 20v8a2 2 0 0 0 2 2h6l14 8V10l-14 8h-6a2 2 0 0 0-2 2z"/><path d="M37 17a9 9 0 0 1 0 14"/></svg></span><strong>الإعلانات</strong><small>إعلانات الأستاذ والتصويت</small></button>';
const css=document.createElement("style");
css.textContent="@keyframes mdIn{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}@keyframes mdFade{from{opacity:0}to{opacity:1}}.mdreveal{animation:mdIn .7s cubic-bezier(.2,.8,.2,1) both}@media(prefers-reduced-motion:reduce){.mdreveal{animation:none}}body.student-mode .tile-announce .student-tile-icon{background:#f3e8e4;color:#a46e65}.mdvote{justify-content:space-between!important;width:100%}.mobile-nav button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}@media(max-width:760px){.mobile-nav{grid-auto-flow:column!important;grid-template-columns:none!important;grid-auto-columns:minmax(0,1fr)!important}.mobile-nav button{font-size:9px!important}}";
document.head.appendChild(css);
const annsFor=st=>{
 const base=srvOk?srvAnn:(db.announcements||[]).filter(a=>a.classId===st.classId);
 return base.slice().sort((a,b)=>(b.created||"").localeCompare(a.created||""));
};
function annHtml(st){
 const list=annsFor(st);
 if(!list.length)return(srvErr?'<p class="muted" style="font-size:12px;text-align:center">تعذر تحميل الإعلانات: '+E(srvErr)+'</p>':"")+empty("لا توجد إعلانات","ستظهر هنا إعلانات الأستاذ وصناديق التصويت.");
 return list.map(a=>{
  const votes=of("vote",a.id),mine=votes.find(v=>v.studentId===st.id),cm=of("comment",a.id);
  const poll=a.kind==="poll"?'<div style="display:grid;gap:8px;margin:12px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<button class="btn mdvote '+(mine&&mine.data.optionId===o.id?"primary":"light")+'" onclick="midadVote(\''+a.id+'\',\''+o.id+'\')"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></button>'}).join("")+'<small class="muted">'+votes.length+' صوت'+(mine?" · يمكنك تغيير صوتك":"")+'</small></div>':"";
  const cbox=a.commentsOpen===false?'<p class="muted" style="font-size:12px;margin:8px 0 0">التعليقات مغلقة لهذا الإعلان.</p>':'<div style="display:flex;gap:8px;margin-top:8px;align-items:center;max-width:100%"><input class="field-search" style="flex:1 1 auto;min-width:0;width:auto" id="cm_'+a.id+'" maxlength="500" placeholder="اكتب تعليقاً..."><button class="btn primary small" style="flex:none" onclick="midadComment(\''+a.id+'\')">إرسال</button></div>';
  return '<article class="card" style="margin-bottom:14px"><span class="pill '+(a.kind==="poll"?"blue":"")+'">'+(a.kind==="poll"?"تصويت":"إعلان")+'</span> <small class="muted">'+day(a.created)+'</small><h3 style="margin:8px 0">'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap;line-height:1.9">'+E(a.body)+'</p>':"")+attHtml(a.attachment)+poll+cm.map(c=>'<p style="padding:8px 0;border-top:1px solid var(--line);margin:0"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+cbox+'</article>';
 }).join("");
}
function draw(){const b=$("#annBox"),st=me();if(b&&st)b.innerHTML=annHtml(st)}
async function annView(){
 const st=me();let shell=$(".student-detail-shell");
 if(!shell&&$("#main")){shell=document.createElement("div");shell.className="student-detail-shell";$("#main").appendChild(shell)}
 if(!st||!shell)return;
 if($("#annBox"))$("#annBox").remove();
 const h=$("#main .page-head h1");if(h)h.textContent="الإعلانات";
 const box=document.createElement("div");box.id="annBox";
 const act=shell.querySelector(".student-detail-actions");if(act)act.after(box);else shell.appendChild(box);
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
 if(f&&f.size>MAXF){toast("الملف أكبر من 1 ميغابايت.");return}
 const b=$("#subGo");b.disabled=true;let file=old?old.data.file||null:null;
 if(f){file=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=no;r.readAsDataURL(f)}).catch(()=>null);if(!file){toast("تعذرت قراءة الملف.");b.disabled=false;return}}
 const ok=await send({type:"submission",studentId:st.id,studentName:st.name,classId:st.classId,refId:tid,data:{text,file},created:new Date().toISOString()});
 b.disabled=false;if(ok){closeModal();toast("تم تسليم النشاط.")}
};
const SW=window.midadStudentTab;
window.midadStudentTab=function(v){SW.apply(this,arguments);if(v==="announcements")annView()};
const LG=window.midadStudentLogin;
window.midadStudentLogin=function(){code=($("#studentLoginCode")?.value||"").replace(/\D/g,"");srvOk=false;return LG.apply(this,arguments)};
const SS=window.midadStudentSelect;
window.midadStudentSelect=function(v){if(!v){code="";remote=[];srvAnn=[];srvOk=false}return SS.apply(this,arguments)};

/* عرض ملفات التوقيت/البرنامج عند الطالب: الصورة مباشرة، وغيرها بزر تحميل */
async function fixSchedule(){
 const shell=$(".student-detail-shell");if(!shell||shell.dataset.mdfix)return;shell.dataset.mdfix="1";
 const sa=db.scheduleAssets||{},files=[...(sa.timetableFiles||[]),...(sa.programFiles||[]),...(db.classes||[]).flatMap(c=>[c.timetableFile,c.programFile].filter(Boolean))];
 for(const row of [...shell.querySelectorAll(".schedule-entry")]){
  const b=row.querySelector("button[onclick*=midadOpenStoredFile]");if(!b)continue;
  const m=(b.getAttribute("onclick")||"").match(/midadOpenStoredFile\('([^']*)','([^']*)'/);if(!m)continue;
  const f=files.find(x=>x&&x.key===m[1])||{key:m[1],name:m[2]},name=f.name||m[2];
  let src=f.url||f.data||f.fileUrl||f.publicUrl||"";
  if(!src&&window.midadGetFile){try{const bl=await midadGetFile(f.key);if(bl)src=URL.createObjectURL(bl)}catch(e){}}
  if(!src)continue;
  const d=document.createElement("div");d.className="mdfile";
  d.innerHTML=isImg({type:f.type,name})?'<img src="'+E(src)+'" alt="'+E(name)+'" style="width:100%;border-radius:14px;border:1px solid var(--line);margin:8px 0">':'<div class="schedule-entry"><b>'+E(name)+'</b><a class="btn primary small" href="'+E(src)+'" download="'+E(name)+'" target="_blank" rel="noopener">تحميل</a></div>';
  row.replaceWith(d);
 }
 shell.querySelectorAll("h3").forEach(h=>{
  const sib=[];for(let n=h.nextElementSibling;n&&n.tagName!=="H3";n=n.nextElementSibling)sib.push(n);
  if(sib.some(n=>n.classList.contains("mdfile")))sib.filter(n=>n.classList.contains("empty")).forEach(n=>n.remove());
 });
}
/* ===== نشر التوقيت والبرنامج للطلبة =====
   كان الملف يُحفظ في متصفح الأستاذ فقط (IndexedDB) ولا يصل للطلبة. الآن يُرفع للسحابة ويُنشر عبر الخادم لقسمه. */
const SIG="midad_sched_sig",SV=window.save;
const hash=t=>{let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return String(h)};
const sigs=()=>{try{return JSON.parse(localStorage.getItem(SIG)||"{}")}catch(e){return{}}};
const allSched=()=>{const sa=db.scheduleAssets||{};return[...(sa.timetableFiles||[]),...(sa.programFiles||[]),...(db.classes||[]).flatMap(c=>[c.timetableFile,c.programFile,...(c.timetableFiles||[]),...(c.programFiles||[])])].filter(Boolean)};
const filesOf=(c,kind)=>{
 const sa=db.scheduleAssets||{},seen=new Set();
 return[c[kind+"File"],...(c[kind+"Files"]||[]),...(sa[kind+"Files"]||[]).filter(x=>x&&(x.classId===c.id||(x.classIds||[]).includes(c.id)))]
  .filter(x=>x&&!seen.has(x.key||x.name)&&seen.add(x.key||x.name));
};
const pubFile=f=>({name:f.name,type:f.type||"",url:f.url||"",link:f.link||"",data:f.data||""});
const schedBody=c=>({classId:c.id,
 timetable:c.timetablePublished?{rows:c.timetableRows||[],files:filesOf(c,"timetable").map(pubFile)}:null,
 program:c.programPublished?{rows:[],files:filesOf(c,"program").map(pubFile)}:null});
async function pushSched(body,quiet){
 try{
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({schedule:body})});
  if(r.ok)return true;
  const p=await r.json().catch(()=>({}));if(!quiet)toast((p.error||"تعذر نشر التوقيت")+" — لم يصل إلى الطلبة.");return false;
 }catch(e){if(!quiet)toast("تعذر الاتصال بالخادم: لم يصل التوقيت إلى الطلبة بعد.");return false}
}
async function syncOne(c,quiet,force){
 const b=schedBody(c),h=hash(JSON.stringify(b)),sg=sigs();
 if(!force&&sg[c.id]===h)return true;
 if(!await pushSched(b,quiet))return false;
 sg[c.id]=h;try{localStorage.setItem(SIG,JSON.stringify(sg))}catch(e){}return true;
}
const tried=new Set();
const readURL=f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ok("");r.readAsDataURL(f)});
async function healFiles(){ /* ملفات رُفعت سابقاً وبقيت في جهاز الأستاذ فقط: نرفعها الآن للسحابة */
 if(typeof midadGetFile!=="function")return false;let ch=false;
 for(const f of allSched()){
  if(f.url||f.data||f.link||!f.key||tried.has(f.key))continue;tried.add(f.key);
  let bl=null;try{bl=await midadGetFile(f.key)}catch(e){}
  if(!bl)continue;
  const file=new File([bl],f.name||"file",{type:f.type||bl.type||""});let up=null;
  try{if(window.midadUploadToCloud)up=await midadUploadToCloud(file,"schedule")}catch(e){console.error(e)}
  if(up){f.url=up.url;ch=true}
  else if(file.size<=600000){const d=await readURL(file);if(d){f.data=d;ch=true}}
  else toast("تعذر رفع «"+(f.name||"ملف")+"» للسحابة فلن يراه الطلبة. أعد رفعه بعد التحقق من الحاوية midad-files.");
 }
 return ch;
}
let schedBusy=false,stm=0;
async function syncSchedules(){
 if(stu()||schedBusy||!window.midadSupabase||!(db.classes||[]).length)return;
 schedBusy=true;
 try{
  let changed=await healFiles();
  for(const c of db.classes){ /* وجود محتوى ولم يُضبط خيار النشر قط = ننشره (الأستاذ يستطيع إخفاءه بإلغاء التحديد) */
   if(c.timetablePublished===undefined&&((c.timetableRows||[]).length||filesOf(c,"timetable").length)){c.timetablePublished=true;changed=true}
   if(c.programPublished===undefined&&filesOf(c,"program").length){c.programPublished=true;changed=true}
  }
  if(changed&&SV)SV();
  const sg=sigs();
  for(const c of db.classes){
   const b=schedBody(c);if(!b.timetable&&!b.program&&sg[c.id]===undefined)continue;
   await syncOne(c,true,false);
  }
 }finally{schedBusy=false}
}
if(typeof SV==="function")window.save=function(){const r=SV.apply(this,arguments);clearTimeout(stm);stm=setTimeout(syncSchedules,1800);return r};

/* رفع ملف التوقيت/البرنامج إلى التخزين السحابي ليصل إلى هواتف الطلبة */
const SU=window.midadScheduleUpload;
if(SU)window.midadScheduleUpload=async function(kind,input){
 const file=input.files&&input.files[0],cid=window.scheduleFocusClass;
 await SU.apply(this,arguments);
 if(!file)return;
 const mine=()=>allSched().filter(x=>x.name===file.name&&!x.url&&!x.data);
 if(!mine().length)return;
 let up=null,err="";
 try{if(window.midadUploadToCloud)up=await midadUploadToCloud(file,"schedule")}catch(e){err=(e&&e.message)||"";console.error(e)}
 if(up)mine().forEach(x=>{x.url=up.url;x.classId=x.classId||cid});
 else if(file.size<=600000){
  const d=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ok("");r.readAsDataURL(file)});
  if(!d){toast("تعذرت قراءة الملف.");return}
  mine().forEach(x=>{x.data=d;x.classId=x.classId||cid});
 }else{toast("تعذر رفع الملف إلى التخزين السحابي"+(err?" ("+err+")":"")+" فلن يراه الطلبة. تحقق من الحاوية midad-files وصلاحيات الرفع، أو استخدم ملفاً أصغر من 600 كيلوبايت.");return}
 const c=(db.classes||[]).find(x=>x.id===cid);if(!c){if(SV)SV();return}
 c[kind+"Published"]=true;if(SV)SV();render();
 if(await syncOne(c,false,true))toast("رُفع الملف ونُشر لطلبة القسم.");
};

/* عرض التوقيت/البرنامج عند الطالب من الخادم */
function fileHtml(f){
 const src=f.url||f.data||"",nm=E(f.name||"ملف");let h="";
 if(src&&isImg(f))h+='<img class="mdreveal" src="'+E(src)+'" alt="'+nm+'" loading="lazy" onclick="midadZoom(this.src)" style="display:block;width:100%;border-radius:14px;border:1px solid var(--line);margin:8px 0;cursor:zoom-in">';
 else if(src)h+='<div class="schedule-entry"><b>'+nm+'</b><a class="btn primary small" href="'+E(src)+'" download="'+nm+'" target="_blank" rel="noopener">تحميل</a></div>';
 if(f.link)h+='<a class="btn light small" target="_blank" rel="noopener" href="'+E(f.link)+'">فتح الرابط ↗</a>';
 return h;
}
window.midadZoom=function(src){
 const o=document.createElement("div");
 o.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(10,18,24,.9);display:flex;align-items:center;justify-content:center;padding:12px;animation:mdFade .25s ease both";
 o.innerHTML='<img src="'+E(src)+'" style="max-width:100%;max-height:100%;border-radius:12px;animation:mdIn .4s ease both">';
 o.onclick=()=>o.remove();document.body.appendChild(o);
};
function secHtml(title,sec){
 if(!sec)return"";
 const rows=sec.rows&&sec.rows.length?'<div class="table-wrap"><table><thead><tr><th>اليوم</th><th>من</th><th>إلى</th><th>المادة</th></tr></thead><tbody>'+sec.rows.map(r=>'<tr><td>'+E(r.day)+'</td><td>'+E(r.from)+'</td><td>'+E(r.to)+'</td><td>'+E(r.subject)+'</td></tr>').join("")+'</tbody></table></div>':"";
 const files=(sec.files||[]).map(fileHtml).join("");
 return(rows||files)?'<section class="card" style="margin-bottom:14px"><h3 style="margin:0 0 8px">'+title+'</h3>'+rows+files+'</section>':"";
}
async function schedView(){
 const shell=$(".student-detail-shell");if(!shell||shell.dataset.mdsched)return"skip";shell.dataset.mdsched="1";
 await pull();
 if(!srvSched)return false;
 const act=shell.querySelector(".student-detail-actions");
 let box=$("#schedBox");if(!box){box=document.createElement("div");box.id="schedBox"}
 box.innerHTML=secHtml("التوقيت",srvSched.timetable)+secHtml("البرنامج",srvSched.program)||empty("لا يوجد توقيت أو برنامج منشور","سيظهر هنا عندما ينشره الأستاذ.");
 [...shell.children].forEach(n=>{if(n!==box&&n!==act)n.style.display="none"});
 act?act.after(box):shell.appendChild(box);
 return true;
}

/* ===== واجهة الأستاذ ===== */
function tPage(){
 const cn=id=>(db.classes.find(c=>c.id===id)||{}).name||"—",list=(db.announcements||[]).slice().reverse();
 return pageHead("التواصل مع الطلبة","الإعلانات والتصويت","انشر إعلاناً أو صندوق تصويت لقسم، وتحكّم في التعليقات.",btn("＋ إعلان","midadAnnForm('notice')")+" "+btn("＋ صندوق تصويت","midadAnnForm('poll')","secondary"))+
 (list.length?'<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">'+list.map(a=>{
  const votes=of("vote",a.id),cm=of("comment",a.id);
  const res=a.kind==="poll"?'<div style="display:grid;gap:6px;margin:10px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<div><div style="display:flex;justify-content:space-between;font-size:12px"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></div><div style="height:7px;background:var(--line);border-radius:9px"><div style="height:100%;width:'+p+'%;background:var(--cocoa);border-radius:9px"></div></div></div>'}).join("")+'<small class="muted">'+votes.length+' صوت</small></div>':"";
  return '<article class="item-card"><div class="item-top"><span class="pill '+(a.kind==="poll"?"blue":"")+'">'+(a.kind==="poll"?"تصويت":"إعلان")+'</span><span class="pill green">'+E(cn(a.classId))+'</span></div><h3>'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap">'+E(a.body)+'</p>':"")+attHtml(a.attachment,true)+res+(cm.length?'<div style="max-height:130px;overflow:auto;font-size:12px">'+cm.map(c=>'<p style="margin:0;padding:6px 0;border-top:1px solid var(--line)"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+'</div>':"")+'<div class="item-meta"><span class="pill">'+cm.length+' تعليق</span><span class="pill '+(a.commentsOpen===false?"rose":"green")+'">'+(a.commentsOpen===false?"التعليقات مغلقة":"التعليقات مفتوحة")+'</span><span class="pill '+(a.published?"green":"rose")+'">'+(a.published?"وصل للطلبة":"لم يصل للطلبة")+'</span></div><div class="item-actions">'+btn("تعديل","midadAnnForm('"+a.kind+"','"+a.id+"')","secondary small")+btn(a.commentsOpen===false?"فتح التعليقات":"إقفال التعليقات","midadAnnToggle('"+a.id+"')","light small")+(a.published?"":btn("إعادة النشر","midadAnnRepub('"+a.id+"')","primary small"))+btn("حذف","midadAnnDel('"+a.id+"')","danger small")+'</div></article>';
 }).join("")+'</div>':empty("لا توجد إعلانات بعد","انشر أول إعلان أو صندوق تصويت لقسمك.",btn("＋ إعلان","midadAnnForm('notice')")));
}
window.midadAnnForm=function(kind,editId){
 if(!(db.classes||[]).length){toast("أنشئ قسماً أولاً.");return}
 const old=editId?(db.announcements||[]).find(x=>x.id===editId):null,poll=kind==="poll",at=old&&old.attachment;
 openModal((old?"تعديل ":"")+(poll?"صندوق تصويت":"إعلان"),"سيظهر للطلبة في تبويب «الإعلانات».",'<div class="form-grid"><div class="form-field full"><label>القسم</label><select id="anClass">'+db.classes.map(c=>'<option value="'+E(c.id)+'"'+(old&&old.classId===c.id?" selected":"")+'>'+E(c.name)+'</option>').join("")+'</select></div><div class="form-field full"><label>العنوان</label><input id="anTitle" maxlength="150" value="'+E(old?old.title:"")+'"></div><div class="form-field full"><label>'+(poll?"السؤال / تفاصيل (اختياري)":"نص الإعلان")+'</label><textarea id="anBody" rows="4">'+E(old?old.body:"")+'</textarea></div>'+(poll?'<div class="form-field full"><label>خيارات التصويت — خيار في كل سطر</label><textarea id="anOpts" rows="4" placeholder="نعم&#10;لا">'+E(old?(old.options||[]).map(o=>o.text).join("\n"):"")+'</textarea></div>':"")+
 '<div class="form-field full"><label>مرفق: صورة أو PDF أو Word (اختياري)</label><input id="anFile" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx">'+(at&&(at.url||at.data)?'<label style="display:flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" id="anRm" style="width:auto"> إزالة المرفق الحالي ('+E(at.name||"ملف")+')</label>':"")+'</div><div class="form-field full"><label>أو رابط (Google Drive أو غيره)</label><input id="anLink" type="url" placeholder="https://drive.google.com/..." value="'+E(at&&at.link||"")+'"></div>'+
 '<label class="form-field full" style="display:flex;flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="anCm" '+(!old||old.commentsOpen!==false?"checked":"")+' style="width:auto"> السماح للطلبة بالتعليق</label></div><div class="modal-actions"><button class="btn primary" id="anGo" onclick="midadAnnSave(\''+kind+'\',\''+(editId||"")+'\')">'+(old?"حفظ التعديل":"نشر")+'</button><button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
window.midadAnnSave=async function(kind,editId){
 const title=($("#anTitle")?.value||"").trim(),classId=$("#anClass")?.value||"",old=editId?(db.announcements||[]).find(x=>x.id===editId):null;
 if(!title||!classId){toast("اكتب العنوان واختر القسم.");return}
 let options=[];
 if(kind==="poll"){
  const lines=[...new Set(($("#anOpts")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean))];
  if(lines.length<2){toast("أضف خيارين على الأقل.");return}
  const prev=old?old.options||[]:[];options=lines.map((t,i)=>({id:(prev.find(o=>o.text===t)||{}).id||"o"+Date.now().toString(36)+i,text:t}));
 }
 const f=$("#anFile")?.files?.[0],link=($("#anLink")?.value||"").trim();
 if(link&&!/^https:\/\//i.test(link)){toast("الرابط يجب أن يبدأ بـ https://");return}
 let at=old&&old.attachment&&!$("#anRm")?.checked?{...old.attachment}:{};
 const go=$("#anGo");go.disabled=true;go.textContent="جارٍ الحفظ...";
 if(f){
  if(f.size>10*1024*1024){toast("الملف أكبر من 10 ميغابايت.");go.disabled=false;go.textContent="نشر";return}
  at={name:f.name,type:f.type||""};
  let up=null;try{up=await midadUploadToCloud(f,"announcements")}catch(e){console.error(e)}
  if(up)at.url=up.url;
  else if(f.size<=600000)at.data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});
  else{toast("تعذر رفع الملف إلى التخزين السحابي (حاوية midad-files). استخدم رابط Drive بدلاً منه.");go.disabled=false;go.textContent="نشر";return}
 }
 if(link)at.link=link;else delete at.link;
 const attachment=(at.url||at.data||at.link)?at:null;
 db.announcements=db.announcements||[];
 const a=old||{id:"an-"+id(),kind,created:new Date().toISOString()};
 Object.assign(a,{classId,title,body:($("#anBody")?.value||"").trim(),options,commentsOpen:!!$("#anCm")?.checked,attachment,published:false});
 if(!old)db.announcements.push(a);
 if(!save())return;
 closeModal();render();
 if(await pub(a)){toast(old?"تم حفظ التعديل وإرساله للطلبة.":"تم النشر، وسيراه طلبة القسم.");if(page==="announce")render()}
};
window.midadAnnRepub=async function(aid){const a=(db.announcements||[]).find(x=>x.id===aid);if(a&&await pub(a)){toast("وصل الإعلان إلى الطلبة.");render()}};
window.midadAnnToggle=async function(aid){const a=(db.announcements||[]).find(x=>x.id===aid);if(!a)return;a.commentsOpen=a.commentsOpen===false;a.published=false;save();render();if(await pub(a)){toast(a.commentsOpen?"فُتحت التعليقات.":"أُقفلت التعليقات.");render()}};
window.midadAnnDel=async function(aid){
 const a=(db.announcements||[]).find(x=>x.id===aid);if(!a)return;
 if(!await ui.confirm("حذف هذا الإعلان؟",{title:"حذف الإعلان",icon:"!",okText:"حذف",danger:true}))return;
 if(a.published!==false&&!await publish("delete",a)){return}
 db.announcements=db.announcements.filter(x=>x.id!==aid);save();render();
};
window.midadSubs=async function(tid){
 const t=(db.activities||[]).find(x=>x.id===tid);if(!t)return;await pull();
 const a=t.assignment||{},sts=db.students.filter(s=>a.scope==="student"?s.id===a.studentId:s.classId===a.classId),subs=of("submission",tid);
 const rows=sts.map(s=>{const x=subs.find(y=>y.studentId===s.id);return '<div class="list-row" style="align-items:flex-start"><div><b>'+E(s.name)+'</b><small class="muted" style="display:block">'+(x?"سُلّم "+day(x.created)+(x.data.late?" · متأخر":""):"لم يسلّم بعد")+'</small>'+(x&&x.data.text?'<p style="white-space:pre-wrap;margin:6px 0;font-size:12px;line-height:1.8">'+E(x.data.text)+'</p>':"")+'</div>'+(x&&x.data.file?'<a class="btn light small" download="'+E(x.data.file.name)+'" href="'+E(x.data.file.data)+'">تنزيل الملف</a>':"")+'</div>'}).join("");
 openModal("تسليمات: "+E(t.title||t.category),subs.length+" من "+sts.length+" سلّموا",'<div class="list">'+(rows||'<p class="muted">لا يوجد طلبة مستهدفون.</p>')+'</div><div class="modal-actions">'+(window.midadOpenGradePublisher?'<button class="btn primary" onclick="closeModal();midadOpenGradePublisher(\''+tid+'\')">تصحيح وإرسال النقاط</button>':"")+'<button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
};
const R=window.render;
window.render=function(){
 if(page==="announce"&&!stu()){
  const m=$("#main");m.innerHTML=tPage();
  pull().then(syncPending).then(()=>{if(page==="announce"&&!stu())m.innerHTML=tPage()});return;
 }
 return R.apply(this,arguments);
};

/* الوصول من القائمة الجانبية + شريط الهاتف + قائمة «المزيد» + الرئيسية */
const navs=document.querySelectorAll(".sidebar .nav"),last=navs[navs.length-1];
if(last){const b=document.createElement("button");b.dataset.page="announce";b.onclick=()=>window.navigate("announce");b.innerHTML='<span class="ni">'+ICON+'</span>الإعلانات والتصويت';last.appendChild(b)}
const mn=$(".mobile-nav");
if(mn){const b=document.createElement("button");b.dataset.page="announce";b.onclick=()=>window.navigate("announce");b.innerHTML='<span>'+ICON+'</span>إعلانات';mn.appendChild(b)}
const OM=window.midadOpenMore;
if(OM)window.midadOpenMore=function(){OM.apply(this,arguments);const l=$("#modal .list");if(l)l.insertAdjacentHTML("afterbegin",'<button class="btn light" style="width:100%;justify-content:flex-start" onclick="closeModal();navigate(\'announce\')">الإعلانات والتصويت</button>')};

const main=$("#main");
const boot=()=>{if(!stu()){syncPending();syncSchedules()}};
setTimeout(boot,5000);
try{window.midadSupabase&&window.midadSupabase.auth.onAuthStateChange((ev,ss)=>{if(ss)setTimeout(boot,4000)})}catch(e){}
new MutationObserver(()=>{
 if(stu()){
  const g=main.querySelector(".student-home-grid");
  if(g&&!g.querySelector(".tile-announce"))g.insertAdjacentHTML("beforeend",tile);
  const st=me(),cards=main.querySelectorAll(".student-task-card");
  if(st&&cards.length){const ts=tasksOf(st);cards.forEach((c,i)=>{const box=c.querySelector(".item-actions");if(ts[i]&&box&&!box.querySelector(".mdsub"))box.insertAdjacentHTML("beforeend",'<button class="btn secondary small mdsub" onclick="midadSubmitOpen(\''+ts[i].id+'\')">تسليم</button>')})}
  if(/البرنامج|التوقيت|الجدول/.test(($("#main .page-head h1")||{}).textContent||"")){const sh=$(".student-detail-shell");const done=schedView();if(sh)Promise.resolve(done).then(ok=>{if(ok===false){sh.dataset.mdfix="";fixSchedule()}})}
 }else{
  const q=main.querySelector("#midadQuickGrid");
  if(q&&!q.querySelector(".mdq"))q.insertAdjacentHTML("beforeend",'<button class="quick mdq" onclick="navigate(\'announce\')"><div class="qico">'+ICON+'</div><b>الإعلانات والتصويت</b><small>انشر للطلبة وتابع التفاعل</small></button>');
  main.querySelectorAll(".task-saved-card").forEach(c=>{
   const m=(c.querySelector("[onclick*=viewTask]")?.getAttribute("onclick")||"").match(/viewTask\('([^']+)'/),box=c.querySelector(".item-actions");
   if(m&&box&&!box.querySelector(".mdsubs"))box.insertAdjacentHTML("afterbegin",'<button class="btn secondary small mdsubs" onclick="midadSubs(\''+m[1]+'\')">التسليمات</button>');
  });
 }
}).observe(main,{childList:true});
})();
