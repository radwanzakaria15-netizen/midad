/* مِداد — تسليم الأنشطة + الإعلانات والتصويت والتعليقات + عرض ملفات التوقيت/البرنامج */
(function(){
"use strict";
const API="/api/student-action",LK="midad_local_actions",MAXF=1000000;
const $=s=>document.querySelector(s),E=v=>esc(v==null?"":String(v)),stu=()=>document.body.classList.contains("student-mode");
const day=d=>d?new Date(d).toLocaleDateString("ar-DZ"):"";
const isImg=f=>/^image\//.test(f.type||"")||/\.(png|jpe?g|webp|gif)$/i.test(f.name||"");
const ICON='<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M17.5 8.5a5 5 0 0 1 0 7"/></svg>';
let code="",remote=[],srvAnn=[],srvOk=false,srvSched=null,srvErr="",srvGarden=null;
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
  if(r.ok){const j=await r.json();remote=j.actions||[];if(stu()){srvAnn=j.announcements||[];srvSched=j.schedule||null;srvGarden=j.garden||null;srvOk=true;srvErr=""}}
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
  const item=op==="delete"?{id:a.id}:{id:a.id,classId:a.classId,kind:a.kind,title:a.title,body:a.body,options:a.options,commentsOpen:a.commentsOpen,attachment:a.attachment||null,created:a.scheduledAt||a.created,topic:a.topic||"",scheduledAt:a.scheduledAt||"",audience:a.audience||[],questions:a.questions||[],audio:a.audio||null};
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({announce:{op,item}})});
  if(r.ok)return true;
  const p=await r.json().catch(()=>({}));if(!quiet)toast((p.error||"تعذر النشر")+" — لم يصل إلى الطلبة.");return false;
 }catch(e){if(!quiet)toast("تعذر الاتصال بالخادم: الإعلان محفوظ لديك ولم يصل إلى الطلبة بعد.");return false}
}
async function pub(a,quiet){const ok=await publish("upsert",a,quiet);if(a.published!==ok){a.published=ok;save()}return ok}
async function syncPending(){for(const a of (db.announcements||[]).filter(x=>x.published!==true&&!x.draft))await pub(a,true)}

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
const tile='<button class="student-home-tile tile-announce" onclick="midadOpenAnn(\'stream\')"><span class="student-tile-icon"><svg viewBox="0 0 48 48"><path d="M8 20v8a2 2 0 0 0 2 2h6l14 8V10l-14 8h-6a2 2 0 0 0-2 2z"/><path d="M37 17a9 9 0 0 1 0 14"/></svg></span><strong>الإعلانات</strong><small>إعلانات الأستاذ وأسئلته ومواده</small></button>';
const tile2='<button class="student-home-tile tile-portfolio" onclick="midadOpenAnn(\'portfolio\')"><span class="student-tile-icon"><svg viewBox="0 0 48 48"><path d="M24 8l4.6 9.4L39 19l-7.5 7.3 1.8 10.4L24 31.6l-9.3 5.1 1.8-10.4L9 19l10.4-1.6z"/></svg></span><strong>ملف إنجازي</strong><small>أعمالي ونقاطي وتطوري</small></button>';
const css=document.createElement("style");
css.textContent="@keyframes mdIn{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}@keyframes mdFade{from{opacity:0}to{opacity:1}}.mdreveal{animation:mdIn .7s cubic-bezier(.2,.8,.2,1) both}@media(prefers-reduced-motion:reduce){.mdreveal{animation:none}}body.student-mode .tile-announce .student-tile-icon{background:#f3e8e4;color:#a46e65}.mdvote{justify-content:space-between!important;width:100%}.mobile-nav button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}@media(max-width:760px){.mobile-nav{grid-auto-flow:column!important;grid-template-columns:none!important;grid-auto-columns:minmax(0,1fr)!important}.mobile-nav button{font-size:9px!important}}";
css.textContent+="body.student-mode .tile-portfolio .student-tile-icon{background:#f6ecd2;color:#a58a3a}.tile-announce{position:relative}.mdbadge{position:absolute;top:8px;left:8px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#d94a4a;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}";
document.head.appendChild(css);
const when=a=>a.scheduledAt||a.created||"";
const annsFor=st=>{
 const now=new Date().toISOString();
 const base=srvOk?srvAnn:(db.announcements||[]).filter(a=>a.classId===st.classId&&!a.draft&&(!a.scheduledAt||a.scheduledAt<=now)&&(!(a.audience&&a.audience.length)||a.audience.includes(st.id)));
 return base.slice().sort((a,b)=>when(b).localeCompare(when(a)));
};
let curTopic="";
const KL={notice:"إعلان",poll:"تصويت",question:"سؤال",material:"مادة",quiz:"اختبار"},KC={notice:"",poll:"blue",question:"rose",material:"green",quiz:"blue"};
window.midadTopic=function(t){curTopic=t||"";const b=$("#annBox"),st=me();if(b&&st)b.innerHTML=annHtml(st)};
function quizPost(st,a){
 const qs=a.questions||[],r=of("quiz",a.id).find(x=>x.studentId===st.id),d=r&&r.data||null;
 const head='<span class="pill blue">اختبار</span> '+(a.topic?'<span class="pill">'+E(a.topic)+'</span> ':"")+(d&&d.total?'<span class="pill green">نتيجتك: '+d.score+' / '+d.total+'</span> ':"")+'<small class="muted">'+day(when(a))+'</small><h3 style="margin:8px 0">'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap;line-height:1.9">'+E(a.body)+'</p>':"")+attHtml(a.attachment)+audioHtml(a.audio);
 const box="padding:6px 10px;margin-top:4px;border-radius:10px;border:1px solid var(--line);";
 const body=d&&d.key?qs.map((x,i)=>'<div style="margin:10px 0"><b>'+(i+1)+'. '+E(x.q)+'</b>'+x.options.map((o,j)=>{const ok=j===d.key[i],mine=j===(d.answers||[])[i];return '<div style="'+box+(ok?"background:rgba(60,160,90,.18);":(mine?"background:rgba(220,80,80,.18);":""))+'">'+E(o)+(ok?" ✓":(mine?" ✗":""))+'</div>'}).join("")+'</div>').join(""):
  qs.map((x,i)=>'<div style="margin:10px 0"><b>'+(i+1)+'. '+E(x.q)+'</b>'+x.options.map((o,j)=>'<label style="display:flex;gap:8px;align-items:center;'+box+'"><input type="radio" style="width:auto" name="qz_'+a.id+'_'+i+'" value="'+j+'"> '+E(o)+'</label>').join("")+'</div>').join("")+'<button class="btn primary" onclick="midadQuizSend(\''+a.id+'\')">إرسال الإجابات</button><small class="muted" style="display:block;margin-top:6px">يمكنك الإجابة مرة واحدة فقط.</small>';
 return '<article class="card" id="post_'+a.id+'" style="margin-bottom:14px">'+head+body+'</article>';
}
window.midadQuizSend=async function(aid){
 const st=me();if(!st)return;const a=annsFor(st).find(x=>x.id===aid);if(!a)return;
 const answers=(a.questions||[]).map((_,i)=>{const c=document.querySelector('input[name="qz_'+aid+'_'+i+'"]:checked');return c?+c.value:-1});
 if(answers.includes(-1)){toast("أجب عن كل الأسئلة قبل الإرسال.");return}
 try{
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:getCode(),action:{type:"quiz",refId:aid,data:{answers}}})});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.action){remote=remote.filter(y=>y.k!==j.action.k);remote.push(j.action);draw();toast("صُحّح اختبارك: "+j.action.data.score+" من "+j.action.data.total)}
  else toast(j.error||"تعذر إرسال الإجابات.");
 }catch(e){toast("تعذر الاتصال بالخادم. أعد المحاولة.")}
};
function postHtml(st,a){
 if(a.kind==="quiz")return quizPost(st,a);
 const votes=of("vote",a.id),mine=votes.find(v=>v.studentId===st.id),cm=of("comment",a.id),q=a.kind==="question";
 const poll=a.kind==="poll"?'<div style="display:grid;gap:8px;margin:12px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<button class="btn mdvote '+(mine&&mine.data.optionId===o.id?"primary":"light")+'" onclick="midadVote(\''+a.id+'\',\''+o.id+'\')"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></button>'}).join("")+'<small class="muted">'+votes.length+' صوت'+(mine?" · يمكنك تغيير صوتك":"")+'</small></div>':"";
 const cbox=a.commentsOpen===false?'<p class="muted" style="font-size:12px;margin:8px 0 0">التعليقات مغلقة لهذا المنشور.</p>':'<div style="display:flex;gap:8px;margin-top:8px;align-items:center;max-width:100%"><input class="field-search" style="flex:1 1 auto;min-width:0;width:auto" id="cm_'+a.id+'" maxlength="500" placeholder="'+(q?"اكتب إجابتك...":"اكتب تعليقاً...")+'"><button class="btn primary small" style="flex:none" onclick="midadComment(\''+a.id+'\')">'+(q?"أجب":"إرسال")+'</button></div>';
 return '<article class="card" style="margin-bottom:14px"><span class="pill '+(KC[a.kind]||"")+'">'+(KL[a.kind]||"إعلان")+'</span> '+(a.topic?'<span class="pill">'+E(a.topic)+'</span> ':"")+'<small class="muted">'+day(when(a))+'</small><h3 style="margin:8px 0">'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap;line-height:1.9">'+E(a.body)+'</p>':"")+attHtml(a.attachment)+audioHtml(a.audio)+poll+cm.map(c=>'<p style="padding:8px 0;border-top:1px solid var(--line);margin:0"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+cbox+'</article>';
}
function taskCard(st,t){
 const s=of("submission",t.id).find(x=>x.studentId===st.id),d=t.description||t.instructions||t.body||"",fb=of("feedback",t.id).find(x=>x.studentId===st.id);
 return '<article class="card" style="margin-bottom:14px"><span class="pill rose">واجب</span> <small class="muted">'+day(t.created)+'</small>'+(t.dueDate?' <span class="pill">آخر أجل: '+E(t.dueDate)+'</span>':"")+'<h3 style="margin:8px 0">'+E(t.title||t.category)+'</h3>'+(d?'<p style="white-space:pre-wrap;line-height:1.9">'+E(d)+'</p>':"")+(fb?'<div style="margin:10px 0;padding:10px 12px;border-radius:12px;background:var(--line)"><b>ملاحظة الأستاذ'+(fb.data.score!=null?" · "+E(fb.data.score)+" / "+E(fb.data.max):"")+'</b>'+(fb.data.note?'<p style="margin:6px 0 0;white-space:pre-wrap;line-height:1.8">'+E(fb.data.note)+'</p>':"")+audioHtml(fb.data.audio)+'</div>':"")+'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill '+(fb?"green":(s?"blue":""))+'">'+(fb?"أُرجع إليك":(s?"سُلّم":"لم يُسلَّم بعد"))+'</span><button class="btn secondary small" onclick="midadSubmitOpen(\''+t.id+'\')">'+(s?"إعادة التسليم":"تسليم")+'</button></div></article>';
}
/* ساحة موحّدة: الإعلانات والمواد والأسئلة والتصويت والواجبات في خلاصة واحدة مرتبة بالزمن */
/* ===== المطلوب مني + المستجدات ===== */
const dueInfo=d=>{
 if(!d)return null;const t0=new Date();t0.setHours(0,0,0,0);
 const n=Math.round((new Date(d+"T00:00:00")-t0)/864e5);
 if(isNaN(n))return null;
 return n<0?{n,txt:"متأخر "+(-n)+(-n===1?" يوم":" أيام"),c:"rose"}:n===0?{n,txt:"اليوم",c:"rose"}:n===1?{n,txt:"غداً",c:"blue"}:{n,txt:"بعد "+n+" أيام",c:""};
};
window.midadGoto=function(id){const e=document.getElementById("post_"+id);if(e)e.scrollIntoView({behavior:"smooth",block:"start"})};
window.midadNotifyOn=function(){try{Notification.requestPermission().then(()=>{const b=$("#annBox"),st=me();if(b&&st)b.innerHTML=annHtml(st)})}catch(e){toast("المتصفح لا يدعم التنبيهات.")}};
function todoItems(st){
 const subDone=id=>of("submission",id).some(x=>x.studentId===st.id);
 const a=tasksOf(st).filter(t=>!subDone(t.id)).map(t=>({id:t.id,kind:"واجب",title:t.title||t.category||"واجب",due:t.dueDate||"",t:t.created||"",go:"midadSubmitOpen('"+t.id+"')",btn:"تسليم"}));
 const q=annsFor(st).filter(x=>x.kind==="quiz"&&!of("quiz",x.id).some(r=>r.studentId===st.id)).map(x=>({id:x.id,kind:"اختبار",title:x.title,due:"",t:when(x),go:"midadGoto('"+x.id+"')",btn:"ابدأ"}));
 return a.concat(q).sort((x,y)=>(x.due&&y.due)?x.due.localeCompare(y.due):x.due?-1:y.due?1:y.t.localeCompare(x.t));
}
function todoHtml(st){
 const L=todoItems(st),canN=typeof Notification!=="undefined"&&Notification.permission==="default";
 const nb=canN?'<button class="btn light small" onclick="midadNotifyOn()">🔔 فعّل التنبيهات</button>':"";
 if(!L.length)return '<section class="card" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>المطلوب مني</b><span class="muted" style="font-size:13px">لا يوجد شيء مطلوب منك الآن، أحسنت.</span>'+nb+'</section>';
 return '<section class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0">المطلوب مني ('+L.length+')</h3>'+nb+'</div>'+L.map(x=>{const di=dueInfo(x.due);return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-top:1px solid var(--line)"><div style="min-width:0"><span class="pill '+(x.kind==="اختبار"?"blue":"rose")+'">'+x.kind+'</span> '+(di?'<span class="pill '+di.c+'">'+di.txt+'</span>':"")+'<div style="margin-top:4px;font-weight:600">'+E(x.title)+'</div></div><button class="btn secondary small" style="flex:none" onclick="'+x.go+'">'+x.btn+'</button></div>'}).join("")+'</section>';
}
const seenKey=()=>"midad_seen_"+((me()||{}).id||"");
const seenAt=()=>{try{return localStorage.getItem(seenKey())||""}catch(e){return""}};
const markSeen=()=>{try{localStorage.setItem(seenKey(),new Date().toISOString())}catch(e){}};
let lastBadge=0,notified=new Set(),firstTick=true;
function badge(n){
 lastBadge=n;
 document.querySelectorAll(".tile-announce").forEach(t=>{let b=t.querySelector(".mdbadge");if(!n){if(b)b.remove();return}if(!b){b=document.createElement("span");b.className="mdbadge";t.appendChild(b)}b.textContent=n>99?"99+":n});
 document.title=(n?"("+n+") ":"")+document.title.replace(/^\(\d+\)\s*/,"");
}
function news(st){
 const s=seenAt();if(!s)return[];
 return annsFor(st).filter(a=>when(a)>s).map(a=>({id:a.id,t:(KL[a.kind]||"إعلان")+" جديد: "+a.title}))
  .concat(all().filter(a=>a.type==="feedback"&&a.studentId===st.id&&(a.created||"")>s).map(a=>({id:a.k,t:"أُرجع إليك تسليمك مع ملاحظة"})))
  .concat(tasksOf(st).filter(t=>(t.created||"")>s).map(t=>({id:t.id,t:"واجب جديد: "+(t.title||t.category||"")})));
}
async function notify(list){
 const text=list.length===1?list[0].t:"لديك "+list.length+" مستجدات في ساحة القسم";
 toast(text);
 try{
  if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
  const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
  if(reg&&reg.showNotification)reg.showNotification("مِداد",{body:text,dir:"rtl",lang:"ar"});else new Notification("مِداد",{body:text,dir:"rtl",lang:"ar"});
 }catch(e){}
}
async function tick(){
 if(!stu()||!getCode())return;
 await pull();const st=me();if(!st)return;
 if(!seenAt()){markSeen();return}
 const box=$("#annBox");
 if(box){
  const busy=box.contains(document.activeElement)||[...box.querySelectorAll("input")].some(i=>(i.type==="radio"?i.checked:i.value));
  if(!busy)box.innerHTML=annHtml(st);
  markSeen();badge(0);return;
 }
 const n=news(st);badge(n.length);
 const fresh=n.filter(x=>!notified.has(x.id));fresh.forEach(x=>notified.add(x.id));
 if(firstTick){firstTick=false;return}
 if(fresh.length)notify(fresh);
}
/* ===== ملف الإنجاز (الطالب) ===== */
let viewMode="stream";
const redraw=()=>{const b=$("#annBox"),st=me();if(b&&st)b.innerHTML=annHtml(st)};
window.midadView=function(m){viewMode=m;const h=$("#main .page-head h1");if(h)h.textContent="الإعلانات";redraw()};
window.midadOpenAnn=function(m){viewMode="stream";window.midadStudentTab("announcements")};
const favKey=()=>"midad_fav_"+((me()||{}).id||"");
const favs=()=>{try{return JSON.parse(localStorage.getItem(favKey())||"[]")}catch(e){return[]}};
window.midadFav=function(k){let f=favs();f=f.includes(k)?f.filter(x=>x!==k):f.concat(k);try{localStorage.setItem(favKey(),JSON.stringify(f))}catch(e){}redraw()};
function portItems(st){
 const fbBy={};all().filter(a=>a.type==="feedback"&&a.studentId===st.id).forEach(a=>{fbBy[a.refId]=a});
 const subs=all().filter(a=>a.type==="submission"&&a.studentId===st.id).map(s=>{
  const t=(db.activities||[]).find(x=>x.id===s.refId),f=fbBy[s.refId];
  return{key:"s:"+s.refId,kind:"واجب",title:t?(t.title||t.category||"واجب"):"واجب",t:s.created||"",data:s.data||{},fb:f?f.data:null,pct:f&&f.data.score!=null&&f.data.max?Math.round(f.data.score*100/f.data.max):null};
 });
 const qz=all().filter(a=>a.type==="quiz"&&a.studentId===st.id&&a.data&&a.data.total).map(q=>{
  const a=annsFor(st).find(x=>x.id===q.refId);
  return{key:"q:"+q.refId,kind:"اختبار",title:a?a.title:"اختبار",t:q.created||"",quiz:q.data,pct:Math.round(q.data.score*100/q.data.total)};
 });
 return subs.concat(qz).sort((a,b)=>b.t.localeCompare(a.t));
}
function progChart(d){ /* d: من الأقدم إلى الأحدث؛ الأقدم على اليمين */
 const W=320,H=130,bw=W/d.length,bars=d.map((x,i)=>{const h=Math.max(3,x.pct*88/100),bx=W-(i+1)*bw+6,w=bw-12;return '<rect x="'+bx+'" y="'+(108-h)+'" width="'+w+'" height="'+h+'" rx="6" fill="#c9824f"/><text x="'+(bx+w/2)+'" y="'+(102-h)+'" text-anchor="middle" font-size="11" fill="currentColor">'+x.pct+'</text>'}).join("");
 return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:420px;display:block;margin:8px auto"><line x1="0" y1="108" x2="'+W+'" y2="108" stroke="currentColor" opacity=".25"/>'+bars+'</svg>';
}
function workCard(x,on){
 let body="";
 if(x.quiz)body='<p style="margin:4px 0">نتيجتي: <b>'+x.quiz.score+' من '+x.quiz.total+'</b></p>';
 else{
  const d=x.data,f=d.file;
  body=(d.text?'<p style="white-space:pre-wrap;line-height:1.9;margin:6px 0">'+E(d.text)+'</p>':"")+audioHtml(d.audio)+
   (f&&f.data?(isImg(f)?'<img src="'+E(f.data)+'" alt="'+E(f.name||"")+'" style="max-width:100%;border-radius:12px;margin:6px 0;border:1px solid var(--line)">':'<span class="pill">'+E(f.name||"ملف")+'</span>'):"")+
   (x.fb?'<div style="margin-top:8px;padding:10px 12px;border-radius:12px;background:var(--line)"><b>ملاحظة الأستاذ'+(x.fb.score!=null?" · "+E(x.fb.score)+" / "+E(x.fb.max):"")+'</b>'+(x.fb.note?'<p style="margin:6px 0 0;white-space:pre-wrap;line-height:1.8">'+E(x.fb.note)+'</p>':"")+audioHtml(x.fb.audio)+'</div>':"");
 }
 return '<article class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><span class="pill '+(x.quiz?"blue":"rose")+'">'+x.kind+'</span> '+(x.pct!=null?'<span class="pill green">'+x.pct+'%</span> ':"")+'<small class="muted">'+day(x.t)+'</small><h3 style="margin:6px 0">'+E(x.title)+'</h3></div><button class="btn light small" style="flex:none" data-k="'+E(x.key)+'" onclick="midadFav(this.dataset.k)" aria-label="أفخر بهذا العمل">'+(on?"★":"☆")+'</button></div>'+body+'</article>';
}

/* ===== التحفيز: شارات وسلاسل مواظبة وحديقة القسم ===== */
const dkey=iso=>{const d=new Date(iso);return isNaN(d)?"":d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function activityDays(st){
 return new Set(all().filter(a=>a.studentId===st.id&&["submission","quiz","comment","vote"].includes(a.type)).map(a=>dkey(a.created)).filter(Boolean));
}
function streakOf(st){
 const days=activityDays(st),d=new Date();d.setHours(12,0,0,0);
 let cur=0;
 if(!days.has(dkey(d)))d.setDate(d.getDate()-1); /* لا تنكسر السلسلة قبل نهاية اليوم */
 while(days.has(dkey(d))){cur++;d.setDate(d.getDate()-1)}
 let best=0,run=0;const sorted=[...days].sort();
 sorted.forEach((k,i)=>{const p=sorted[i-1],ok=p&&Math.round((new Date(k+"T12:00:00")-new Date(p+"T12:00:00"))/864e5)===1;run=ok?run+1:1;if(run>best)best=run});
 return{cur,best};
}
function badgesOf(st,L){
 const sk=streakOf(st),mine=all().filter(a=>a.studentId===st.id),
  quizzes=mine.filter(a=>a.type==="quiz"&&a.data&&a.data.total),
  comments=mine.filter(a=>a.type==="comment").length,
  voice=mine.some(a=>a.type==="submission"&&a.data&&a.data.audio),
  fb=mine.some(a=>a.type==="feedback"),
  perfect=quizzes.some(q=>q.data.score===q.data.total),
  great=quizzes.some(q=>q.data.score*100/q.data.total>=90),
  best=Math.max(sk.best,sk.cur);
 return[
  {i:"🌱",t:"البداية",d:"أنجزت أول عمل",on:L.length>=1},
  {i:"🌿",t:"مجتهد",d:"أنجزت 5 أعمال",on:L.length>=5},
  {i:"🌳",t:"مثابر",d:"أنجزت 10 أعمال",on:L.length>=10},
  {i:"🔥",t:"ثلاثة أيام",d:"نشطت 3 أيام متتالية",on:best>=3},
  {i:"⚡",t:"أسبوع كامل",d:"نشطت 7 أيام متتالية",on:best>=7},
  {i:"⭐",t:"نتيجة ممتازة",d:"90٪ أو أكثر في اختبار",on:great},
  {i:"🏆",t:"العلامة الكاملة",d:"أجبت عن كل أسئلة اختبار بصواب",on:perfect},
  {i:"🎙",t:"صوتي مسموع",d:"سلّمت إجابة بصوتك",on:voice},
  {i:"💬",t:"مشارك",d:"شاركت في 3 نقاشات",on:comments>=3},
  {i:"💌",t:"وصلتني ملاحظة",d:"أرجع إليك الأستاذ عملاً",on:fb}
 ];
}
const GARDEN=[["🌰","بذرة تنتظر الماء"],["🌱","أنبتت أول ورقة"],["🌿","تنمو بسرعة"],["🪴","شجيرة جميلة"],["🌳","شجرة قوية"],["🌸","أزهرت حديقتنا"]];
function gardenHtml(){
 const g=srvGarden;if(!g||!g.students)return"";
 const goal=Math.max(3,g.students*2),pct=Math.min(1,g.week/goal),stage=Math.min(GARDEN.length-1,Math.floor(pct*(GARDEN.length-1)+(pct>=1?1:0))),[ic,tx]=GARDEN[stage];
 const left=Math.max(0,goal-g.week);
 return '<section class="card" style="margin-bottom:14px;text-align:center"><div style="font-size:64px;line-height:1.2" aria-hidden="true">'+ic+'</div><h3 style="margin:4px 0">حديقة القسم: '+tx+'</h3><div style="height:10px;background:var(--line);border-radius:9px;overflow:hidden;margin:10px auto;max-width:360px"><div style="height:100%;width:'+Math.round(pct*100)+'%;background:var(--green);border-radius:9px;transition:width .6s"></div></div><p class="muted" style="margin:0;font-size:13px;line-height:1.8">'+(left?"كل واجب أو اختبار يسلّمه أحدنا يسقي الحديقة. بقي "+(left===1?"إنجاز واحد":left===2?"إنجازان":left<=10?left+" إنجازات":left+" إنجازاً")+" هذا الأسبوع لتزهر.":"أزهرت الحديقة هذا الأسبوع بجهدنا جميعاً. شكراً لكم!")+'</p></section>';
}
function motiveHtml(st,L){
 const sk=streakOf(st),bs=badgesOf(st,L),got=bs.filter(b=>b.on).length;
 const streak='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="font-size:34px" aria-hidden="true">'+(sk.cur?"🔥":"✨")+'</span><div><b style="font-size:17px">'+(sk.cur?"مواظب منذ "+sk.cur+(sk.cur===1?" يوم":sk.cur<=10?" أيام":" يوماً"):"ابدأ سلسلتك اليوم")+'</b><div class="muted" style="font-size:12px">'+(sk.best>1?"أطول سلسلة لك: "+sk.best+" أيام":"أنجز شيئاً اليوم لتبدأ السلسلة")+'</div></div></div>';
 const grid='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px">'+bs.map(b=>'<div title="'+E(b.d)+'" style="text-align:center;padding:10px 4px;border-radius:14px;background:'+(b.on?"var(--line)":"transparent")+';border:1px dashed var(--line);'+(b.on?"":"opacity:.45;filter:grayscale(1)")+'"><div style="font-size:28px" aria-hidden="true">'+b.i+'</div><div style="font-size:12px;font-weight:700;margin-top:2px">'+E(b.t)+'</div><div class="muted" style="font-size:10px;line-height:1.5">'+E(b.d)+'</div></div>').join("")+'</div>';
 return gardenHtml()+'<section class="card" style="margin-bottom:14px">'+streak+'<h3 style="margin:0 0 8px">شاراتي ('+got+' من '+bs.length+')</h3>'+grid+'</section>';
}
function portHtml(st){
 const L=portItems(st),fv=favs(),sc=L.filter(x=>x.pct!=null),chron=sc.slice().reverse();
 const avg=sc.length?Math.round(sc.reduce((n,x)=>n+x.pct,0)/sc.length):null;
 const att=(db.attendance||[]).filter(a=>a.studentId===st.id),pres=att.filter(a=>a.status!=="غائب").length;
 const cls=((db.classes||[]).find(c=>c.id===st.classId)||{}).name||"";
 const stat=(v,l)=>'<div style="flex:1 1 80px;text-align:center;padding:12px 6px;border-radius:14px;background:var(--line)"><div style="font-size:24px;font-weight:800">'+v+'</div><small class="muted">'+l+'</small></div>';
 const head='<section class="card" style="margin-bottom:14px"><h3 style="margin:0 0 2px">'+E(st.name)+'</h3><small class="muted">'+E(cls)+'</small><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+stat(L.length,"عملاً مُنجزاً")+stat(avg!=null?avg+"%":"—","معدل نتائجي")+(att.length?stat(pres,"يوم حضور"):"")+stat(fv.filter(k=>L.some(x=>x.key===k)).length,"أفخر بها")+'</div></section>';
 let msg="كلما أنجزت أكثر ظهر تطورك هنا.";
 if(chron.length>=4){const h=Math.floor(chron.length/2),m=a=>a.reduce((n,x)=>n+x.pct,0)/a.length,dl=Math.round(m(chron.slice(h))-m(chron.slice(0,h)));msg=dl>0?"تحسّنت نتائجك بمقدار "+dl+" نقطة. استمر!":"كل محاولة تقرّبك أكثر. واصل!"}
 const prog='<section class="card" style="margin-bottom:14px"><h3 style="margin:0">تطوّري</h3>'+(chron.length?progChart(chron.slice(-10)):"")+'<p class="muted" style="text-align:center;margin:4px 0 0">'+msg+'</p></section>';
 if(!L.length)return head+motiveHtml(st,L)+prog+empty("لا أعمال بعد","ستظهر هنا واجباتك واختباراتك بعد تسليمها.");
 const fav=L.filter(x=>fv.includes(x.key)),rest=L.filter(x=>!fv.includes(x.key));
 return head+motiveHtml(st,L)+prog+(fav.length?'<h3 style="margin:16px 0 8px">★ أعمال أفخر بها</h3>'+fav.map(x=>workCard(x,true)).join(""):"")+'<h3 style="margin:16px 0 8px">أعمالي</h3>'+(rest.length?rest.map(x=>workCard(x,false)).join(""):'<p class="muted">كل أعمالك ضمن المفضلة.</p>');
}
function annHtml(st){return streamHtml(st)}
function streamHtml(st){
 const anns=annsFor(st),tasks=tasksOf(st);
 let items=anns.map(a=>({t:when(a),topic:a.topic||"",h:()=>postHtml(st,a)})).concat(tasks.map(t=>({t:t.created||"",topic:"",h:()=>taskCard(st,t)})));
 const topics=[...new Set(anns.map(a=>a.topic).filter(Boolean))];
 if(curTopic&&!topics.includes(curTopic))curTopic="";
 if(curTopic)items=items.filter(x=>x.topic===curTopic);
 items.sort((a,b)=>b.t.localeCompare(a.t));
 const chips=topics.length?'<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px">'+[""].concat(topics).map(t=>'<button class="btn '+(curTopic===t?"primary":"light")+' small" style="flex:none" data-t="'+E(t)+'" onclick="midadTopic(this.dataset.t)">'+(t?E(t):"الكل")+'</button>').join("")+'</div>':"";
 if(!items.length)return chips+(srvErr?'<p class="muted" style="font-size:12px;text-align:center">تعذر تحميل المنشورات: '+E(srvErr)+'</p>':"")+empty("لا توجد منشورات","ستظهر هنا إعلانات الأستاذ وأسئلته ومواده وواجباته.");
 return(curTopic?"":gardenHtml()+todoHtml(st))+chips+items.map(x=>x.h()).join("");
}

async function annView(){
 const st=me();let shell=$(".student-detail-shell");
 if(!shell&&$("#main")){shell=document.createElement("div");shell.className="student-detail-shell";$("#main").appendChild(shell)}
 if(!st||!shell)return;
 if($("#annBox"))$("#annBox").remove();
 const h=$("#main .page-head h1");if(h)h.textContent="الإعلانات";
 const box=document.createElement("div");box.id="annBox";
 const act=shell.querySelector(".student-detail-actions");if(act)act.after(box);else shell.appendChild(box);
 box.innerHTML=annHtml(st);await pull();draw();markSeen();badge(0);
}
window.midadVote=async function(aid,oid){const st=me();if(!st)return;if(await send({type:"vote",studentId:st.id,studentName:st.name,classId:st.classId,refId:aid,data:{optionId:oid},created:new Date().toISOString()}))draw()};
window.midadComment=async function(aid){
 const st=me(),i=$("#cm_"+aid),t=(i&&i.value||"").trim();if(!st||!t)return;
 if(await send({type:"comment",id:"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),studentId:st.id,studentName:st.name,classId:st.classId,refId:aid,data:{text:t},created:new Date().toISOString()}))draw();
};
window.midadSubmitOpen=async function(tid){
 const st=me(),t=(db.activities||[]).find(x=>x.id===tid);if(!st||!t)return;
 await pull();const old=of("submission",tid).find(s=>s.studentId===st.id);
 REC.sub={ex:old&&old.data.audio||null};setTimeout(()=>renderRec("sub"),0);
 openModal("تسليم: "+E(t.title||t.category),t.dueDate?"آخر أجل: "+E(t.dueDate):"أرسل إجابتك إلى الأستاذ",
  (old?'<p class="pill green">سُلّم في '+day(old.created)+(old.data.file?" · "+E(old.data.file.name):"")+' — يمكنك إعادة التسليم لاستبداله.</p>':"")+
  '<div class="form-field full"><label>إجابتك (اختياري إن رفعت ملفاً)</label><textarea id="subText" rows="6">'+E(old?old.data.text:"")+'</textarea></div><div class="form-field full"><label>أو سجّل إجابتك بصوتك</label><div id="rec_sub"></div></div><div class="form-field full"><label>ملف (صورة أو PDF أو Word)</label><input id="subFile" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"><small class="muted">الحد الأقصى 1 ميغابايت.</small></div><div class="modal-actions"><button class="btn primary" id="subGo" onclick="midadSubmitGo(\''+tid+'\')">تسليم</button><button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
window.midadSubmitGo=async function(tid){
 const st=me(),text=($("#subText")?.value||"").trim(),f=$("#subFile")?.files?.[0],old=of("submission",tid).find(s=>s.studentId===st.id);
 const hasAud=!!(REC.sub&&(REC.sub.blob||(REC.sub.ex&&!REC.sub.removed)));
 if(!text&&!f&&!hasAud&&!(old&&old.data.file)){toast("اكتب إجابة أو سجّل صوتك أو ارفع ملفاً.");return}
 if(f&&f.size>MAXF){toast("الملف أكبر من 1 ميغابايت.");return}
 const b=$("#subGo");b.disabled=true;
 const audio=await packAudio("sub",null);if(audio===false){b.disabled=false;return}let file=old?old.data.file||null:null;
 if(f){file=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=no;r.readAsDataURL(f)}).catch(()=>null);if(!file){toast("تعذرت قراءة الملف.");b.disabled=false;return}}
 const ok=await send({type:"submission",studentId:st.id,studentName:st.name,classId:st.classId,refId:tid,data:{text,file,audio},created:new Date().toISOString()});
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
const fdt=d=>new Date(d).toLocaleString("ar-DZ",{dateStyle:"short",timeStyle:"short"});
const stateOf=a=>a.draft?'<span class="pill rose">مسودة</span>':(a.scheduledAt&&a.scheduledAt>new Date().toISOString()?'<span class="pill blue">مجدول: '+E(fdt(a.scheduledAt))+'</span>':"");
/* ===== تقرير الأولياء الأسبوعي (صورة للمشاركة عبر واتساب) ===== */
const pad2=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
const fmtD=s=>new Date(s+"T12:00:00").toLocaleDateString("ar-DZ",{day:"numeric",month:"short"});
let REPNOTE={},REPLAST=null;
function repData(st,from,to){
 const inR=iso=>{const d=String(iso||"").slice(0,10);return d>=from&&d<=to};
 const att=(db.attendance||[]).filter(a=>a.studentId===st.id&&a.date>=from&&a.date<=to),cnt=v=>att.filter(a=>a.status===v).length;
 const tasks=tasksOf(st).filter(t=>inR(t.created)),done=tasks.filter(t=>of("submission",t.id).some(x=>x.studentId===st.id));
 const qr=all().filter(a=>a.type==="quiz"&&a.studentId===st.id&&inR(a.created)&&a.data&&a.data.total);
 const fb=all().filter(a=>a.type==="feedback"&&a.studentId===st.id&&inR(a.created)&&a.data&&a.data.score!=null&&a.data.max);
 const avg=(L,f)=>L.length?Math.round(L.reduce((n,r)=>n+f(r),0)*100/L.length):null;
 return{marked:att.length,present:cnt("حاضر"),absent:cnt("غائب"),late:cnt("متأخر"),tasks:tasks.length,done:done.length,quizN:qr.length,qAvg:avg(qr,r=>r.data.score/r.data.total),fbN:fb.length,fAvg:avg(fb,r=>r.data.score/r.data.max)};
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function wrapTxt(x,t,maxW){const out=[];let line="";for(const w of String(t).split(/\s+/)){const n=line?line+" "+w:w;if(x.measureText(n).width>maxW&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out}
async function drawReport(st,d,from,to,note){
 try{await document.fonts.ready}catch(e){}
 const W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
 const F='"Segoe UI",Tahoma,"Noto Naskh Arabic","Noto Sans Arabic",Arial,sans-serif',R=W-70;
 const school=typeof db.school==="string"?db.school:((db.school&&db.school.name)||""),cls=((db.classes||[]).find(c=>c.id===st.classId)||{}).name||"";
 x.direction="rtl";x.textAlign="right";x.textBaseline="alphabetic";
 x.fillStyle="#fbf4ea";x.fillRect(0,0,W,H);
 x.fillStyle="#5a3a29";x.fillRect(0,0,W,290);
 x.fillStyle="#f3dcc3";x.font="600 34px "+F;x.fillText(school||"مِداد",R,80);
 x.fillStyle="#fff";x.font="800 62px "+F;x.fillText("التقرير الأسبوعي",R,170);
 x.fillStyle="#f3dcc3";x.font="500 34px "+F;x.fillText("من "+fmtD(from)+" إلى "+fmtD(to),R,232);
 x.fillStyle="#3b2418";x.font="800 56px "+F;x.fillText(st.name,R,375);
 x.fillStyle="#8a6a55";x.font="500 32px "+F;if(cls)x.fillText(cls,R,424);
 const rows=[
  ["الحضور",d.marked?d.present+" حاضر":"لا سجل",d.marked?"غياب "+d.absent+" · تأخر "+d.late:"لم يُسجَّل حضور هذا الأسبوع",d.marked&&!d.absent?"#4c8a5a":"#c9824f"],
  ["الواجبات",d.tasks?d.done+" / "+d.tasks:"—",d.tasks?"واجبات سلّمها هذا الأسبوع":"لا واجبات هذا الأسبوع",d.tasks&&d.done===d.tasks?"#4c8a5a":"#c9824f"],
  ["الاختبارات",d.qAvg!=null?d.qAvg+"%":"—",d.quizN?"معدل "+d.quizN+(d.quizN===1?" اختبار":" اختبارات"):"لا اختبارات هذا الأسبوع","#c9824f"],
  ["التقويمات",d.fAvg!=null?d.fAvg+"%":"—",d.fbN?"معدل "+d.fbN+" تقويمات أُرجعت إليه":"لا تقويمات مُرجعة","#c9824f"]
 ];
 let y=470;
 for(const r of rows){
  x.fillStyle="#fff";rr(x,45,y,W-90,140,26);x.fill();x.strokeStyle="#ead9c6";x.lineWidth=2;x.stroke();
  x.fillStyle="#5a3a29";x.font="700 38px "+F;x.textAlign="right";x.fillText(r[0],R-20,y+62);
  x.fillStyle="#8a6a55";x.font="500 29px "+F;x.fillText(r[2],R-20,y+108);
  x.fillStyle=r[3];x.font="800 58px "+F;x.textAlign="left";x.fillText(r[1],90,y+86);x.textAlign="right";
  y+=158;
 }
 if(note){
  x.fillStyle="#f3e6d3";rr(x,45,y+6,W-90,170,26);x.fill();
  x.fillStyle="#5a3a29";x.font="700 30px "+F;x.fillText("ملاحظة الأستاذ",R-20,y+52);
  x.fillStyle="#3b2418";x.font="500 31px "+F;
  wrapTxt(x,note,W-170).slice(0,3).forEach((l,i)=>x.fillText(l,R-20,y+98+i*44));
 }
 x.fillStyle="#8a6a55";x.font="500 28px "+F;x.textAlign="center";x.fillText((db.teacher?"الأستاذ: "+db.teacher+" · ":"")+"مِداد",W/2,H-40);
 return cv.toDataURL("image/png");
}
window.midadRepNote=function(i){REPNOTE[i.dataset.id]=i.value};
window.midadRepList=function(){
 const cid=$("#rpClass").value,sts=(db.students||[]).filter(s=>s.classId===cid);
 $("#rpList").innerHTML=sts.length?sts.map(s=>'<div class="list-row" style="gap:8px;align-items:center;flex-wrap:wrap"><b style="flex:1 1 120px;min-width:0">'+E(s.name)+'</b><input class="field-search" data-id="'+E(s.id)+'" value="'+E(REPNOTE[s.id]||"")+'" oninput="midadRepNote(this)" maxlength="140" placeholder="ملاحظة قصيرة (اختياري)" style="flex:2 1 180px;min-width:0"><button class="btn secondary small" style="flex:none" data-id="'+E(s.id)+'" onclick="midadRepMake(this.dataset.id)">إنشاء</button></div>').join(""):'<p class="muted">لا يوجد تلاميذ في هذا القسم.</p>';
};
window.midadReport=async function(){
 if(!(db.classes||[]).length){toast("أنشئ قسماً أولاً.");return}
 openModal("تقرير الأولياء الأسبوعي","اختر القسم وآخر يوم في الأسبوع، ثم أنشئ صورة لكل تلميذ لترسلها عبر واتساب.",'<div class="form-grid"><div class="form-field"><label>القسم</label><select id="rpClass" onchange="midadRepList()">'+db.classes.map(c=>'<option value="'+E(c.id)+'">'+E(c.name)+'</option>').join("")+'</select></div><div class="form-field"><label>آخر يوم في الأسبوع</label><input id="rpTo" type="date" value="'+ymd(new Date())+'"></div></div><div id="rpList" class="list" style="margin-top:10px"></div><div class="modal-actions"><button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
 midadRepList();await pull();
};
window.midadRepMake=async function(sid){
 const st=(db.students||[]).find(x=>x.id===sid);if(!st)return;
 const to=$("#rpTo")?.value||ymd(new Date()),dt=new Date(to+"T12:00:00");dt.setDate(dt.getDate()-6);const from=ymd(dt);
 const url=await drawReport(st,repData(st,from,to),from,to,(REPNOTE[sid]||"").trim());
 REPLAST={url,name:st.name};
 openModal("تقرير: "+E(st.name),"معاينة الصورة قبل المشاركة.",'<img src="'+url+'" alt="" style="width:100%;border-radius:14px;border:1px solid var(--line)"><div class="modal-actions"><button class="btn primary" onclick="midadRepShare()">مشاركة</button><button class="btn secondary" onclick="midadRepSave()">تنزيل الصورة</button><button class="btn light" onclick="midadReport()">رجوع</button></div>');
};
window.midadRepSave=function(){const L=REPLAST;if(!L)return;const a=document.createElement("a");a.href=L.url;a.download="تقرير-"+L.name+".png";document.body.appendChild(a);a.click();a.remove()};
window.midadRepShare=async function(){
 const L=REPLAST;if(!L)return;
 try{
  const b=await(await fetch(L.url)).blob(),f=new File([b],"تقرير-"+L.name+".png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"تقرير "+L.name});return}
 }catch(e){if(e&&e.name==="AbortError")return}
 midadRepSave();toast("المشاركة المباشرة غير متاحة هنا، نُزّلت الصورة لترسلها يدوياً.");
};

/* ===== تسجيل صوتي ===== */
const REC={};
const audioHtml=au=>{const src=au&&(au.url||au.data);return src?'<audio controls preload="none" src="'+E(src)+'" style="width:100%;margin:8px 0"></audio>':""};
function initRec(slot,ex){const o=REC[slot];if(o&&o.rec){try{o.rec.stop()}catch(e){}}clearInterval(o&&o.tm);REC[slot]={ex:ex||null}}
function renderRec(slot){
 const el=$("#rec_"+slot);if(!el)return;const s=REC[slot]||(REC[slot]={});
 const src=s.blob?s.url:(s.ex&&!s.removed?(s.ex.url||s.ex.data):"");
 if(s.rec){el.innerHTML='<button type="button" class="btn danger small" onclick="midadRecStop(\''+slot+'\')">■ إيقاف</button> <span class="muted" id="rect_'+slot+'">0:00</span>';return}
 el.innerHTML=(src?'<audio controls src="'+E(src)+'" style="width:100%;margin:4px 0"></audio><br><button type="button" class="btn light small" onclick="midadRecClear(\''+slot+'\')">حذف التسجيل</button> ':"")+'<button type="button" class="btn secondary small" onclick="midadRecStart(\''+slot+'\')">🎙 '+(src?"إعادة التسجيل":"تسجيل")+'</button> <small class="muted">حتى 90 ثانية</small>';
}
window.midadRecStart=async function(slot){
 const s=REC[slot]||(REC[slot]={});
 if(!navigator.mediaDevices||!window.MediaRecorder){toast("هذا المتصفح لا يدعم التسجيل الصوتي.");return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mt=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t))||"";
  const mr=new MediaRecorder(stream,mt?{mimeType:mt,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000}),ch=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)ch.push(e.data)};
  mr.onstop=()=>{stream.getTracks().forEach(t=>t.stop());clearInterval(s.tm);s.dur=Math.round((Date.now()-s.t0)/1000);s.blob=new Blob(ch,{type:mr.mimeType||mt||"audio/webm"});if(s.url)URL.revokeObjectURL(s.url);s.url=URL.createObjectURL(s.blob);s.rec=null;s.removed=false;renderRec(slot)};
  s.rec=mr;s.t0=Date.now();mr.start();renderRec(slot);
  s.tm=setInterval(()=>{const sec=Math.floor((Date.now()-s.t0)/1000),e=$("#rect_"+slot);if(e)e.textContent=Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");if(sec>=90)midadRecStop(slot)},500);
 }catch(e){toast("تعذر الوصول إلى الميكروفون. اسمح به من إعدادات المتصفح.")}
};
window.midadRecStop=function(slot){const s=REC[slot];if(s&&s.rec&&s.rec.state!=="inactive")s.rec.stop()};
window.midadRecClear=function(slot){const s=REC[slot]||(REC[slot]={});s.blob=null;s.removed=true;renderRec(slot)};
/* يعيد: كائن التسجيل، أو null إن لم يوجد، أو false عند فشل (وقد أُظهرت رسالة) */
async function packAudio(slot,folder){
 const s=REC[slot]||{};
 if(s.rec){midadRecStop(slot);await new Promise(r=>setTimeout(r,500))}
 if(!s.blob)return(s.ex&&!s.removed)?s.ex:null;
 const type=(s.blob.type||"audio/webm").split(";")[0],name="voice-"+Date.now()+"."+(/mp4/.test(type)?"m4a":"webm"),out={type:s.blob.type||type,name,dur:s.dur||0};
 if(folder&&window.midadUploadToCloud){try{const up=await midadUploadToCloud(new File([s.blob],name,{type}),folder);if(up&&up.url){out.url=up.url;return out}}catch(e){console.error(e)}}
 if(s.blob.size>650000){toast("التسجيل طويل جداً. اختصره (الحد 90 ثانية).");return false}
 out.data=await readURL(s.blob);if(!out.data){toast("تعذرت قراءة التسجيل.");return false}
 return out;
}
function quizStats(a){
 if(a.kind!=="quiz")return"";
 const qs=a.questions||[],rs=of("quiz",a.id);
 if(!rs.length)return '<p class="muted" style="font-size:12px;margin:8px 0">'+qs.length+' أسئلة · لم يجب أحد بعد.</p>';
 const avg=(rs.reduce((n,r)=>n+(r.data.score||0),0)/rs.length).toFixed(1);
 const hard=qs.map((x,i)=>({i,w:rs.filter(r=>r.data.result&&r.data.result[i]===false).length})).filter(x=>x.w>0).sort((x,y)=>y.w-x.w).slice(0,3);
 return '<div style="font-size:12px;margin:8px 0;line-height:1.9"><b>'+rs.length+' أجابوا · المعدل '+avg+' / '+qs.length+'</b>'+(hard.length?'<br>أكثر الأخطاء: '+hard.map(h=>'سؤال '+(h.i+1)+' ('+h.w+' من '+rs.length+')').join("، "):"")+'<div style="max-height:90px;overflow:auto;margin-top:4px">'+rs.map(r=>'<div>'+E(r.studentName)+': '+r.data.score+' / '+r.data.total+'</div>').join("")+'</div></div>';
}

/* ===== تنبيه الأستاذ بما يصله من الطلبة ===== */
const TSK="midad_tseen";
const tSeen=()=>{try{return localStorage.getItem(TSK)||""}catch(e){return""}};
const tMark=()=>{try{localStorage.setItem(TSK,new Date().toISOString())}catch(e){}};
let tNotified=new Set(),tFirst=true;
const TL={submission:"تسليم جديد",quiz:"إجابة اختبار",comment:"تعليق جديد",vote:"صوت جديد"};
function tNews(){
 const s=tSeen();if(!s)return[];
 return all().filter(a=>TL[a.type]&&(a.created||"")>s).map(a=>({id:a.k,type:a.type,who:a.studentName||"طالب"}));
}
function tBadge(n){
 document.querySelectorAll('.sidebar .nav button[data-page="announce"],.mobile-nav button[data-page="announce"]').forEach(b=>{let x=b.querySelector(".mdbadge2");if(!n){if(x)x.remove();return}if(!x){x=document.createElement("span");x.className="mdbadge2";x.style.cssText="margin-inline-start:auto;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#d94a4a;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center";b.appendChild(x)}x.textContent=n>99?"99+":n});
 document.title=(n?"("+n+") ":"")+document.title.replace(/^\(\d+\)\s*/,"");
}
function tText(list){
 if(list.length===1){const x=list[0];return TL[x.type]+" من "+x.who}
 const c={};list.forEach(x=>c[x.type]=(c[x.type]||0)+1);
 return"وصلك "+list.length+" مستجدات: "+Object.keys(c).map(k=>c[k]+" "+TL[k]).join("، ");
}
async function tTick(){
 if(stu()||!window.midadSupabase)return;
 await pull();
 if(!tSeen()){tMark();return}
 if(typeof page!=="undefined"&&page==="announce"){tMark();tBadge(0);return}
 const n=tNews();tBadge(n.length);
 const fresh=n.filter(x=>!tNotified.has(x.id));fresh.forEach(x=>tNotified.add(x.id));
 if(tFirst){tFirst=false;return}
 if(!fresh.length)return;
 const text=tText(fresh);toast(text);
 try{
  if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
  const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
  if(reg&&reg.showNotification)reg.showNotification("مِداد",{body:text,dir:"rtl",lang:"ar"});else new Notification("مِداد",{body:text,dir:"rtl",lang:"ar"});
 }catch(e){}
}
window.midadTeacherNotifyOn=function(){
 try{Notification.requestPermission().then(p=>{toast(p==="granted"?"فُعّلت تنبيهات النظام. تعمل والصفحة مفتوحة.":"لم تُفعَّل التنبيهات. تبقى الشارة داخل المنصة.");if(page==="announce")render()})}
 catch(e){toast("المتصفح لا يدعم التنبيهات.")}
};
function tPage(){
 const cn=id=>(db.classes.find(c=>c.id===id)||{}).name||"—",list=(db.announcements||[]).slice().reverse();
 return pageHead("ساحة القسم","المنشورات","انشر إعلاناً أو سؤالاً أو مادة أو تصويتاً، وجدوله أو احفظه كمسودة. الواجبات تظهر للطالب في الساحة تلقائياً.",btn("＋ منشور","midadAnnPick()")+" "+btn("تقرير الأولياء","midadReport()","secondary")+(typeof Notification!=="undefined"&&Notification.permission==="default"?" "+btn("🔔 فعّل التنبيهات","midadTeacherNotifyOn()","light"):""))+
 (list.length?'<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">'+list.map(a=>{
  const votes=of("vote",a.id),cm=of("comment",a.id),pend=a.draft||(a.scheduledAt&&a.scheduledAt>new Date().toISOString());
  const res=a.kind==="poll"?'<div style="display:grid;gap:6px;margin:10px 0">'+(a.options||[]).map(o=>{const n=votes.filter(v=>v.data.optionId===o.id).length,p=votes.length?Math.round(n*100/votes.length):0;return '<div><div style="display:flex;justify-content:space-between;font-size:12px"><span>'+E(o.text)+'</span><b>'+n+' · '+p+'%</b></div><div style="height:7px;background:var(--line);border-radius:9px"><div style="height:100%;width:'+p+'%;background:var(--cocoa);border-radius:9px"></div></div></div>'}).join("")+'<small class="muted">'+votes.length+' صوت</small></div>':"";
  const aud=a.audience&&a.audience.length?'<span class="pill">'+a.audience.length+' طلاب محددون</span>':"";
  return '<article class="item-card"><div class="item-top"><span class="pill '+(KC[a.kind]||"")+'">'+(KL[a.kind]||"إعلان")+'</span><span class="pill green">'+E(cn(a.classId))+'</span>'+(a.topic?'<span class="pill">'+E(a.topic)+'</span>':"")+stateOf(a)+aud+'</div><h3>'+E(a.title)+'</h3>'+(a.body?'<p style="white-space:pre-wrap">'+E(a.body)+'</p>':"")+attHtml(a.attachment,true)+audioHtml(a.audio)+res+quizStats(a)+(cm.length?'<div style="max-height:130px;overflow:auto;font-size:12px">'+cm.map(c=>'<p style="margin:0;padding:6px 0;border-top:1px solid var(--line)"><b>'+E(c.studentName)+':</b> '+E(c.data.text)+'</p>').join("")+'</div>':"")+'<div class="item-meta"><span class="pill">'+cm.length+(a.kind==="question"?' إجابة':' تعليق')+'</span>'+(a.draft?"":'<span class="pill '+(a.published?"green":"rose")+'">'+(a.published?(pend?"محفوظ في الخادم":"وصل للطلبة"):"لم يصل للطلبة")+'</span>')+'</div><div class="item-actions">'+btn("تعديل","midadAnnForm('"+a.kind+"','"+a.id+"')","secondary small")+btn("إعادة استخدام","midadAnnReuse('"+a.id+"')","light small")+(pend?btn("نشر الآن","midadAnnNow('"+a.id+"')","primary small"):"")+(a.kind==="question"||a.kind==="quiz"?"":btn(a.commentsOpen===false?"فتح التعليقات":"إقفال التعليقات","midadAnnToggle('"+a.id+"')","light small"))+(!pend&&!a.published?btn("إعادة النشر","midadAnnRepub('"+a.id+"')","primary small"):"")+btn("حذف","midadAnnDel('"+a.id+"')","danger small")+'</div></article>';
 }).join("")+'</div>':empty("لا توجد منشورات بعد","انشر أول منشور لقسمك.",btn("＋ منشور","midadAnnPick()")));
}
window.midadAnnPick=function(){
 const T=[["notice","إعلان","خبر أو تنبيه للقسم"],["question","سؤال","اطرح سؤالاً ليجيب عنه الطلبة"],["material","مادة","درس أو ملف أو رابط للمراجعة"],["quiz","اختبار تلقائي","أسئلة اختيار من متعدد تُصحَّح فوراً","✨"],["poll","صندوق تصويت","اجمع آراء الطلبة"]];
 openModal("إنشاء منشور","اختر نوع المنشور",'<div class="list">'+T.map(t=>'<button class="btn light" style="width:100%;justify-content:flex-start;flex-direction:column;align-items:flex-start;gap:2px;padding:12px 14px" onclick="closeModal();midadAnnForm(\''+t[0]+'\')"><b>'+t[1]+'</b><small class="muted">'+t[2]+'</small></button>').join("")+'</div><p class="muted" style="font-size:12px;margin:10px 0 0">الواجبات والاختبارات تُنشأ من صفحة الأنشطة وتظهر للطالب هنا تلقائياً.</p><div class="modal-actions"><button class="btn light" onclick="closeModal()">إغلاق</button></div>');
};
const KT={notice:["إعلان","نص الإعلان"],poll:["صندوق تصويت","السؤال / تفاصيل (اختياري)"],quiz:["اختبار","تعليمات الاختبار (اختياري)"],question:["سؤال","نص السؤال"],material:["مادة","وصف المادة"]};
const qsToText=qs=>(qs||[]).map(x=>x.q+"\n"+x.options.map((o,i)=>"- "+(i===x.answer?"*":"")+o).join("\n")).join("\n\n");
function parseQs(t){
 const out=[],blocks=t.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 for(let n=0;n<blocks.length;n++){
  const L=blocks[n].split("\n").map(x=>x.trim()).filter(Boolean),q=L.shift(),opts=[];let ans=-1;
  for(const l of L){let s=l.replace(/^[-•]\s*/,""),ok=false;if(s.startsWith("*")){ok=true;s=s.slice(1).trim()}if(!s)continue;if(ok){if(ans>=0)return{err:"السؤال "+(n+1)+": أكثر من خيار صحيح."};ans=opts.length}opts.push(s)}
  if(opts.length<2)return{err:"السؤال "+(n+1)+": أضف خيارين على الأقل (سطر لكل خيار)."};
  if(opts.length>5)return{err:"السؤال "+(n+1)+": الحد الأقصى 5 خيارات."};
  if(ans<0)return{err:"السؤال "+(n+1)+": ضع * قبل الخيار الصحيح."};
  out.push({q,options:opts,answer:ans});
 }
 return out.length?{qs:out}:{err:"أضف سؤالاً واحداً على الأقل."};
}
window.midadQuizAI=async function(){
 const title=($("#anTitle")?.value||"").trim();if(!title){toast("اكتب عنوان الاختبار أولاً ليكون موضوع الأسئلة.");return}
 if(!db.aiEndpoint){toast("أضف رابط Gemini الآمن من صفحة الإعدادات أولاً.");return}
 const b=$("#anAi"),old=b.textContent;b.disabled=true;b.textContent="جارٍ التوليد...";
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),90000);
 try{
  const cl=(db.classes||[]).find(x=>x.id===$("#anClass")?.value)||{};
  const r=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctl.signal,body:JSON.stringify({kind:"quiz",outputType:"quiz",lessonTitle:title,title,level:cl.level||cl.name||"",count:5,format:"mcq"})});
  const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||"فشل الطلب");
  const d=p.result||p,qs=(d.questions||[]).map(x=>({q:String(x.q||x.question||""),options:(x.options||x.choices||[]).map(String),answer:Number.isInteger(+x.answer)?+x.answer:-1})).filter(x=>x.q&&x.options.length>=2&&x.answer>=0&&x.answer<x.options.length);
  if(!qs.length)throw new Error("لم تصل أسئلة اختيار من متعدد. يلزم تحديث gemini-worker ليدعم النوع quiz.");
  $("#anQs").value=qsToText(qs);toast("وُلّدت "+qs.length+" أسئلة. راجعها قبل النشر.");
 }catch(e){toast(e.name==="AbortError"?"انتهت مهلة التوليد.":(e.message||"تعذر التوليد."))}
 finally{clearTimeout(tm);b.disabled=false;b.textContent=old}
};
const toLocal=iso=>{if(!iso)return"";const d=new Date(iso),p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes())};
const audBox=(cid,sel)=>{const sts=(db.students||[]).filter(s=>s.classId===cid);return sts.length?sts.map(s=>'<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" class="anSt" value="'+E(s.id)+'" '+(sel.includes(s.id)?"checked":"")+' style="width:auto"> '+E(s.name)+'</label>').join(""):'<small class="muted">لا يوجد طلبة في هذا القسم.</small>'};
window.midadAnnCls=function(){const l=$("#anAudList");if(l)l.innerHTML=audBox($("#anClass").value,[])};
window.midadAnnAud=function(){const l=$("#anAudList");if(l)l.style.display=$("#anAud").value==="some"?"grid":"none"};
let formTpl=null;
window.midadAnnForm=function(kind,editId,fromId){
 if(!(db.classes||[]).length){toast("أنشئ قسماً أولاً.");return}
 const old=editId?(db.announcements||[]).find(x=>x.id===editId):null,tpl=!old&&fromId?(db.announcements||[]).find(x=>x.id===fromId):null,src=old||tpl;
 formTpl=tpl;initRec("ann",src&&src.audio);setTimeout(()=>renderRec("ann"),0);const poll=kind==="poll",q=kind==="question",at=src&&src.attachment,kt=KT[kind]||KT.notice;
 const cid=old?old.classId:(tpl?((db.classes.find(c=>c.id!==tpl.classId)||db.classes[0]).id):db.classes[0].id);
 const topics=[...new Set((db.announcements||[]).map(a=>a.topic).filter(Boolean))],sel=src&&src.audience||[],some=!!sel.length&&!tpl;
 openModal((old?"تعديل ":(tpl?"إعادة استخدام: ":""))+kt[0],tpl?"اختر القسم الذي سيُنشر فيه نسخة من المنشور.":"سيظهر للطلبة في «ساحة القسم».",
 '<div class="form-grid"><div class="form-field full"><label>القسم</label><select id="anClass" onchange="midadAnnCls()">'+db.classes.map(c=>'<option value="'+E(c.id)+'"'+(c.id===cid?" selected":"")+'>'+E(c.name)+'</option>').join("")+'</select></div>'+
 '<div class="form-field full"><label>العنوان</label><input id="anTitle" maxlength="150" value="'+E(src?src.title:"")+'"></div>'+
 '<div class="form-field full"><label>'+kt[1]+'</label><textarea id="anBody" rows="4">'+E(src?src.body:"")+'</textarea></div>'+
 (kind==="quiz"?'<div class="form-field full"><label>الأسئلة — سطر فارغ بين كل سؤال وآخر، وضع * قبل الخيار الصحيح</label><textarea id="anQs" rows="10" placeholder="ما عاصمة الجزائر؟&#10;- وهران&#10;- *الجزائر&#10;- قسنطينة">'+E(src?qsToText(src.questions):"")+'</textarea><button class="btn light small" id="anAi" type="button" style="margin-top:6px" onclick="midadQuizAI()">✨ توليد بالذكاء الاصطناعي</button><small class="muted">يُستخدم عنوان الاختبار موضوعاً. راجع الأسئلة قبل النشر.</small></div>':"")+
 (poll?'<div class="form-field full"><label>خيارات التصويت — خيار في كل سطر</label><textarea id="anOpts" rows="4" placeholder="نعم&#10;لا">'+E(src?(src.options||[]).map(o=>o.text).join("\n"):"")+'</textarea></div>':"")+
 '<div class="form-field full"><label>الموضوع (اختياري) — مثل: الوحدة 1، الفصل الثاني</label><input id="anTopic" list="anTopics" maxlength="60" value="'+E(src?src.topic||"":"")+'"><datalist id="anTopics">'+topics.map(t=>'<option value="'+E(t)+'">').join("")+'</datalist></div>'+
 '<div class="form-field full"><label>موجّه إلى</label><select id="anAud" onchange="midadAnnAud()"><option value="all">كل طلاب القسم</option><option value="some"'+(some?" selected":"")+'>طلاب محددون</option></select><div id="anAudList" style="display:'+(some?"grid":"none")+';gap:6px;margin-top:8px;max-height:150px;overflow:auto">'+audBox(cid,sel)+'</div></div>'+
 '<div class="form-field full"><label>رسالة صوتية (اختياري)</label><div id="rec_ann"></div></div>'+
 '<div class="form-field full"><label>مرفق: صورة أو PDF أو Word (اختياري)</label><input id="anFile" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx">'+(at&&(at.url||at.data)?'<label style="display:flex;gap:6px;align-items:center;font-size:12px"><input type="checkbox" id="anRm" style="width:auto"> إزالة المرفق الحالي ('+E(at.name||"ملف")+')</label>':"")+'</div>'+
 '<div class="form-field full"><label>أو رابط (Google Drive أو غيره)</label><input id="anLink" type="url" placeholder="https://drive.google.com/..." value="'+E(at&&at.link||"")+'"></div>'+
 '<div class="form-field full"><label>موعد النشر (اتركه فارغاً للنشر الآن)</label><input id="anAt" type="datetime-local" value="'+E(toLocal(old?old.scheduledAt:""))+'" oninput="var g=document.getElementById(\'anGo\');if(g&&!g.dataset.edit)g.textContent=this.value?\'جدولة\':\'نشر\'"></div>'+
 (kind==="quiz"?'<p class="muted" style="font-size:12px;margin:0">يُصحَّح الاختبار تلقائياً، وتظهر النتيجة للطالب فور الإرسال. لكل طالب محاولة واحدة.</p>':q?'<p class="muted" style="font-size:12px;margin:0">تُفتح الإجابات تلقائياً لأن الطلبة يجيبون عبر التعليقات.</p>':'<label class="form-field full" style="display:flex;flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="anCm" '+(!src||src.commentsOpen!==false?"checked":"")+' style="width:auto"> السماح للطلبة بالتعليق</label>')+
 '</div><div class="modal-actions"><button class="btn primary" id="anGo"'+(old&&!old.draft?' data-edit="1"':"")+' onclick="midadAnnSave(\''+kind+'\',\''+(editId||"")+'\')">'+(old&&!old.draft?"حفظ التعديل":(old&&old.scheduledAt?"جدولة":"نشر"))+'</button>'+(!old||old.draft?'<button class="btn secondary" onclick="midadAnnSave(\''+kind+'\',\''+(editId||"")+'\',true)">حفظ كمسودة</button>':"")+'<button class="btn light" onclick="closeModal()">إلغاء</button></div>');
};
window.midadAnnReuse=function(aid){const a=(db.announcements||[]).find(x=>x.id===aid);if(a)midadAnnForm(a.kind,"",aid)};
window.midadAnnNow=async function(aid){
 const a=(db.announcements||[]).find(x=>x.id===aid);if(!a)return;
 a.draft=false;a.scheduledAt="";a.created=new Date().toISOString();a.published=false;if(!save())return;render();
 if(await pub(a)){toast("نُشر الآن وسيراه الطلبة.");render()}
};
window.midadAnnSave=async function(kind,editId,asDraft){
 const title=($("#anTitle")?.value||"").trim(),classId=$("#anClass")?.value||"",old=editId?(db.announcements||[]).find(x=>x.id===editId):null,tpl=old?null:formTpl;
 if(!title||!classId){toast("اكتب العنوان واختر القسم.");return}
 let options=[];
 if(kind==="poll"){
  const lines=[...new Set(($("#anOpts")?.value||"").split("\n").map(x=>x.trim()).filter(Boolean))];
  if(lines.length<2){toast("أضف خيارين على الأقل.");return}
  const prev=old?old.options||[]:[];options=lines.map((t,i)=>({id:(prev.find(o=>o.text===t)||{}).id||"o"+Date.now().toString(36)+i,text:t}));
 }
 let questions=[];
 if(kind==="quiz"){const p=parseQs($("#anQs")?.value||"");if(p.err){toast(p.err);return}questions=p.qs}
 let audience=[];
 if($("#anAud")?.value==="some"){audience=[...document.querySelectorAll(".anSt:checked")].map(x=>x.value);if(!audience.length){toast("اختر طالباً واحداً على الأقل.");return}}
 const av=$("#anAt")?.value||"",scheduledAt=av?new Date(av).toISOString():"";
 if(scheduledAt&&!asDraft&&scheduledAt<=new Date().toISOString()){toast("اختر موعداً في المستقبل أو اترك الحقل فارغاً.");return}
 const f=$("#anFile")?.files?.[0],link=($("#anLink")?.value||"").trim();
 if(link&&!/^https:\/\//i.test(link)){toast("الرابط يجب أن يبدأ بـ https://");return}
 const base=old||tpl;
 let at=base&&base.attachment&&!$("#anRm")?.checked?{...base.attachment}:{};
 const go=$("#anGo");go.disabled=true;go.textContent="جارٍ الحفظ...";
 const reset=()=>{go.disabled=false;go.textContent="نشر"};
 if(f){
  if(f.size>10*1024*1024){toast("الملف أكبر من 10 ميغابايت.");reset();return}
  at={name:f.name,type:f.type||""};
  let up=null;try{up=await midadUploadToCloud(f,"announcements")}catch(e){console.error(e)}
  if(up)at.url=up.url;
  else if(f.size<=600000)at.data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});
  else{toast("تعذر رفع الملف إلى التخزين السحابي (حاوية midad-files). استخدم رابط Drive بدلاً منه.");reset();return}
 }
 if(link)at.link=link;else delete at.link;
 const attachment=(at.url||at.data||at.link)?at:null;
 const audio=await packAudio("ann","announcements");if(audio===false){reset();return}
 db.announcements=db.announcements||[];
 const a=old||{id:"an-"+id(),kind,created:new Date().toISOString()};
 Object.assign(a,{classId,title,body:($("#anBody")?.value||"").trim(),options,commentsOpen:kind==="question"?true:!!$("#anCm")?.checked,attachment,audio,questions,topic:($("#anTopic")?.value||"").trim().slice(0,60),audience,scheduledAt,draft:!!asDraft,published:false});
 if(!old)db.announcements.push(a);
 formTpl=null;
 if(!save())return;
 closeModal();render();
 if(asDraft){toast("حُفظ كمسودة ولن يراه الطلبة حتى تنشره.");return}
 if(await pub(a)){toast(scheduledAt?"تمت الجدولة، وسيظهر للطلبة في "+fdt(scheduledAt)+".":(old?"تم حفظ التعديل وإرساله للطلبة.":"تم النشر، وسيراه الطلبة المستهدفون."));if(page==="announce")render()}
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
 const a=t.assignment||{},sts=db.students.filter(s=>a.scope==="student"?s.id===a.studentId:s.classId===a.classId),subs=of("submission",tid),fbs=of("feedback",tid);
 const rows=sts.map(s=>{const x=subs.find(y=>y.studentId===s.id),f=fbs.find(y=>y.studentId===s.id);return '<div class="list-row" style="align-items:flex-start"><div><b>'+E(s.name)+'</b><small class="muted" style="display:block">'+(x?"سُلّم "+day(x.created)+(x.data.late?" · متأخر":""):"لم يسلّم بعد")+'</small>'+(x&&x.data.text?'<p style="white-space:pre-wrap;margin:6px 0;font-size:12px;line-height:1.8">'+E(x.data.text)+'</p>':"")+(x&&x.data.audio?audioHtml(x.data.audio):"")+(f?'<span class="pill green">أُرجع'+(f.data.score!=null?" · "+E(f.data.score)+" / "+E(f.data.max):"")+'</span>':"")+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+(x&&x.data.file?'<a class="btn light small" download="'+E(x.data.file.name)+'" href="'+E(x.data.file.data)+'">تنزيل الملف</a>':"")+(x?'<button class="btn secondary small" onclick="midadFb(\''+tid+'\',\''+E(s.id)+'\')">'+(f?"تعديل الملاحظة":"إرجاع بنقطة وملاحظة")+'</button>':"")+'</div></div>'}).join("");
 openModal("تسليمات: "+E(t.title||t.category),subs.length+" من "+sts.length+" سلّموا",'<div class="list">'+(rows||'<p class="muted">لا يوجد طلبة مستهدفون.</p>')+'</div><div class="modal-actions">'+(window.midadOpenGradePublisher?'<button class="btn primary" onclick="closeModal();midadOpenGradePublisher(\''+tid+'\')">تصحيح وإرسال النقاط</button>':"")+'<button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
};
window.midadFb=function(tid,sid){
 const s=(db.students||[]).find(x=>x.id===sid),f=of("feedback",tid).find(x=>x.studentId===sid),d=f?f.data:{};
 initRec("fb",d.audio);setTimeout(()=>renderRec("fb"),0);
 openModal("إرجاع التسليم: "+E(s?s.name:""),"تظهر النقطة والملاحظة للطالب في ساحة القسم.",'<div class="form-grid"><div class="form-field"><label>النقطة (اختيارية)</label><input id="fbScore" type="number" min="0" step="0.25" value="'+E(d.score==null?"":d.score)+'"></div><div class="form-field"><label>من</label><input id="fbMax" type="number" min="1" value="'+E(d.max||20)+'"></div><div class="form-field full"><label>ملاحظة للطالب</label><textarea id="fbNote" rows="4" maxlength="1000">'+E(d.note||"")+'</textarea></div><div class="form-field full"><label>أو ملاحظة صوتية</label><div id="rec_fb"></div></div></div><div class="modal-actions"><button class="btn primary" id="fbGo" onclick="midadFbSave(\''+tid+'\',\''+E(sid)+'\')">إرجاع</button><button class="btn light" onclick="midadSubs(\''+tid+'\')">رجوع</button></div>');
};
window.midadFbSave=async function(tid,sid){
 const score=$("#fbScore").value,max=$("#fbMax").value,note=$("#fbNote").value;
 const b=$("#fbGo");b.disabled=true;
 const audio=await packAudio("fb","feedback");if(audio===false){b.disabled=false;return}
 if(score===""&&!note.trim()&&!audio){toast("اكتب نقطة أو ملاحظة أو سجّل صوتاً.");b.disabled=false;return}
 try{
  const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+await tok()},body:JSON.stringify({feedback:{studentId:sid,refId:tid,score,max,note,audio}})});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.action){remote=remote.filter(y=>y.k!==j.action.k);remote.push(j.action);toast("أُرجع التسليم إلى الطالب.");midadSubs(tid);return}
  toast(j.error||"تعذر الإرجاع.");
 }catch(e){toast("تعذر الاتصال بالخادم.")}
 b.disabled=false;
};
const R=window.render;
window.render=function(){
 if(page==="announce"&&!stu()){
  const m=$("#main");m.innerHTML=tPage();
  pull().then(syncPending).then(()=>{if(page==="announce"&&!stu()){m.innerHTML=tPage();tMark();tBadge(0)}});return;
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
setTimeout(tick,4000);setInterval(tick,60000);setTimeout(tTick,6000);setInterval(tTick,60000);
const boot=()=>{if(!stu()){syncPending();syncSchedules()}};
setTimeout(boot,5000);
try{window.midadSupabase&&window.midadSupabase.auth.onAuthStateChange((ev,ss)=>{if(ss)setTimeout(boot,4000)})}catch(e){}
new MutationObserver(()=>{
 if(stu()){
  const g=main.querySelector(".student-home-grid");
  if(g&&!g.querySelector(".tile-announce")){g.insertAdjacentHTML("beforeend",tile);badge(lastBadge)}
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
