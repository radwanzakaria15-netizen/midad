/* functions/api/student-action.js — Cloudflare Pages Function (D1)
   الجدول (مرة واحدة، وإن أنشأته سابقاً فلا حاجة لإعادة إنشائه):
   wrangler d1 execute <اسم-القاعدة> --remote --command "CREATE TABLE IF NOT EXISTS midad_student_actions(k TEXT PRIMARY KEY, id TEXT, type TEXT, student_id TEXT, student_name TEXT, class_id TEXT, ref_id TEXT, data TEXT, created TEXT); CREATE INDEX IF NOT EXISTS idx_msa_class ON midad_student_actions(class_id);"
   أنواع الصفوف: announcement (من الأستاذ) · submission · vote · comment (من الطلبة) */
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const out=r=>({k:r.k,id:r.id,type:r.type,studentId:r.student_id,studentName:r.student_name,classId:r.class_id,refId:r.ref_id,data:JSON.parse(r.data||"{}"),created:r.created});
const outAnn=r=>({id:r.id,classId:r.class_id,created:r.created,...JSON.parse(r.data||"{}")});
const Q=(env,sql,...a)=>env.DB.prepare(sql).bind(...a);
/* إنشاء الجدول تلقائياً (سبب شائع لعدم ظهور الإعلانات: الجدول غير موجود فيفشل كل طلب) */
let ready=null;
function ensure(env){
  return ready||(ready=env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS midad_student_actions(k TEXT PRIMARY KEY, id TEXT, type TEXT, student_id TEXT, student_name TEXT, class_id TEXT, ref_id TEXT, data TEXT, created TEXT)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_msa_class ON midad_student_actions(class_id)")
  ]).catch(e=>{ready=null;throw e}));
}
const cut=(v,n)=>String(v==null?"":v).slice(0,n);
function cleanFile(f){
  if(!f||typeof f!=="object")return null;
  const o={name:cut(f.name||"ملف",200),type:cut(f.type,100)};
  if(/^https:\/\//i.test(f.url||"")&&f.url.length<1000)o.url=f.url;
  if(/^https:\/\//i.test(f.link||"")&&f.link.length<1000)o.link=f.link;
  if(/^data:/.test(f.data||"")&&f.data.length<=900000)o.data=f.data;
  return(o.url||o.link||o.data)?o:null;
}
async function who(env,code){
  code=String(code||"").replace(/\D/g,"");
  if(!/^\d{6}$/.test(code))return null;
  const row=await Q(env,"SELECT payload_json FROM midad_students WHERE student_code=?",code).first();
  if(!row)return null;
  const ws=JSON.parse(row.payload_json),st=(ws.students||[]).find(x=>String(x.studentCode||"")===code);
  return st?{student:st,workspace:ws}:null;
}
// الأستاذ: نتحقق عبر /api/workspace ونأخذ أقسامه الفعلية
async function teacherClasses(request){
  const auth=request.headers.get("Authorization")||"";if(!auth)return null;
  const r=await fetch(new URL("/api/workspace",request.url),{headers:{Authorization:auth}});
  if(!r.ok)return null;
  const w=(await r.json()).workspace;return (w&&w.classes||[]).map(c=>String(c.id));
}
export async function onRequestGet({request,env}){
  try{
    await ensure(env);
    const code=new URL(request.url).searchParams.get("code");
    if(code){
      const p=await who(env,code);if(!p)return J({error:"معرّف غير صالح"},401);
      const s=p.student;
      if(!s.classId)return J({announcements:[],actions:[],schedule:null});
      const [an,a,b,sc]=await Promise.all([
        Q(env,"SELECT * FROM midad_student_actions WHERE class_id=? AND type='announcement' ORDER BY created",s.classId).all(),
        Q(env,"SELECT * FROM midad_student_actions WHERE class_id=? AND type IN ('vote','comment') ORDER BY created",s.classId).all(),
        Q(env,"SELECT * FROM midad_student_actions WHERE student_id=? AND type='submission'",s.id).all(),
        Q(env,"SELECT data,created FROM midad_student_actions WHERE k=? AND type='schedule'","schedule:"+s.classId).first()]);
      return J({announcements:an.results.map(outAnn),actions:[...a.results,...b.results].map(out),schedule:sc?{...JSON.parse(sc.data||"{}"),updated:sc.created}:null});
    }
    const ids=await teacherClasses(request);if(!ids)return J({error:"غير مصرّح"},401);
    if(!ids.length)return J({actions:[]});
    const r=await Q(env,`SELECT * FROM midad_student_actions WHERE type IN ('submission','vote','comment') AND class_id IN (${ids.map(()=>"?").join(",")}) ORDER BY created`,...ids).all();
    return J({actions:r.results.map(out)});
  }catch(e){console.error(e);return J({error:"تعذر تحميل البيانات"},500)}
}
async function teacherOp(request,env,o){
  const ids=await teacherClasses(request);if(!ids)return J({error:"تعذر التحقق من حسابك. أعد تسجيل الدخول ثم أعد المحاولة."},401);
  const it=o.item||{},id=String(it.id||"");
  if(!/^an-[\w-]{3,40}$/.test(id))return J({error:"معرّف غير صالح"},400);
  const ex=await Q(env,"SELECT class_id FROM midad_student_actions WHERE k=? AND type='announcement'",id).first();
  if(ex&&!ids.includes(ex.class_id))return J({error:"ليس إعلانك"},403);
  if(o.op==="delete"){
    if(ex)await env.DB.batch([Q(env,"DELETE FROM midad_student_actions WHERE k=?",id),Q(env,"DELETE FROM midad_student_actions WHERE ref_id=?",id)]);
    return J({ok:true});
  }
  if(o.op!=="upsert")return J({error:"عملية غير مدعومة"},400);
  const classId=String(it.classId||"");if(!ids.includes(classId))return J({error:"هذا القسم لم يصل إلى السحابة بعد. انتظر لحظات حتى تكتمل المزامنة ثم اضغط «إعادة النشر»."},403);
  const title=String(it.title||"").trim().slice(0,150);if(!title)return J({error:"العنوان مطلوب"},400);
  const kind=it.kind==="poll"?"poll":"notice";
  const options=kind==="poll"?(Array.isArray(it.options)?it.options:[]).slice(0,10).map(x=>({id:String(x.id||"").slice(0,30),text:String(x.text||"").trim().slice(0,100)})).filter(x=>x.id&&x.text):[];
  if(kind==="poll"&&options.length<2)return J({error:"أضف خيارين على الأقل"},400);
  const at=it.attachment||{},att={};
  if(typeof at.name==="string")att.name=at.name.slice(0,200);
  if(typeof at.type==="string")att.type=at.type.slice(0,100);
  if(/^https:\/\//i.test(at.url||"")&&at.url.length<1000)att.url=at.url;
  if(/^https:\/\//i.test(at.link||"")&&at.link.length<1000)att.link=at.link;
  if(/^data:/.test(at.data||"")&&at.data.length<=900000)att.data=at.data;
  const data=JSON.stringify({kind,title,body:String(it.body||"").slice(0,3000),options,commentsOpen:it.commentsOpen!==false,attachment:(att.url||att.link||att.data)?att:null});
  const created=isNaN(Date.parse(it.created))?new Date().toISOString():new Date(it.created).toISOString();
  await Q(env,"INSERT INTO midad_student_actions(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'announcement','teacher','',?,'',?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data,class_id=excluded.class_id",id,id,classId,data,created).run();
  return J({ok:true});
}
/* الأستاذ ينشر التوقيت والبرنامج (جدول + ملفات) لقسم معيّن */
async function scheduleOp(request,env,o){
  const ids=await teacherClasses(request);if(!ids)return J({error:"تعذر التحقق من حسابك. أعد تسجيل الدخول ثم أعد المحاولة."},401);
  const classId=String(o.classId||"");
  if(!ids.includes(classId))return J({error:"هذا القسم لم يصل إلى السحابة بعد. انتظر لحظات حتى تكتمل المزامنة."},403);
  const k="schedule:"+classId;
  const sec=x=>{
    if(!x||typeof x!=="object")return null;
    const rows=(Array.isArray(x.rows)?x.rows:[]).slice(0,80).map(r=>({day:cut(r.day,30),from:cut(r.from,10),to:cut(r.to,10),subject:cut(r.subject,100)})).filter(r=>r.day||r.subject);
    const files=(Array.isArray(x.files)?x.files:[]).slice(0,10).map(cleanFile).filter(Boolean);
    return{rows,files};
  };
  const data=JSON.stringify({timetable:sec(o.timetable),program:sec(o.program)});
  if(data.length>1800000)return J({error:"الملف كبير جداً: ارفعه إلى التخزين السحابي أو استخدم رابطاً."},413);
  await Q(env,"INSERT INTO midad_student_actions(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'schedule','teacher','',?,'',?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data,created=excluded.created",k,k,classId,data,new Date().toISOString()).run();
  return J({ok:true});
}
export async function onRequestPost({request,env}){
  try{
    await ensure(env);
    let b;try{b=await request.json()}catch(e){return J({error:"طلب غير صالح"},400)}
    if(b.announce)return await teacherOp(request,env,b.announce);
    if(b.schedule)return await scheduleOp(request,env,b.schedule);
    const p=await who(env,b.code);if(!p)return J({error:"معرّف غير صالح"},401);
    const s=p.student,ws=p.workspace,a=b.action||{},type=a.type,ref=String(a.refId||"");
    let data=a.data||{};
    if(type==="submission"){
      const t=(ws.activities||[]).find(x=>x.id===ref&&x.kind==="task"&&x.assignment&&(x.assignment.scope==="student"?x.assignment.studentId===s.id:x.assignment.classId===s.classId));
      if(!t)return J({error:"هذا النشاط غير موجّه إليك"},403);
      data={text:String(data.text||"").slice(0,5000),file:data.file||null,late:!!(t.dueDate&&new Date().toISOString().slice(0,10)>t.dueDate)};
    }else if(type==="vote"||type==="comment"){
      const row=await Q(env,"SELECT * FROM midad_student_actions WHERE k=? AND type='announcement' AND class_id=?",ref,s.classId).first();
      if(!row)return J({error:"الإعلان غير موجود"},403);
      const n=JSON.parse(row.data||"{}");
      if(type==="vote"){
        if(n.kind!=="poll"||!(n.options||[]).some(o=>o.id===data.optionId))return J({error:"خيار غير صالح"},400);
        data={optionId:data.optionId};
      }else{
        if(n.commentsOpen===false)return J({error:"التعليقات مغلقة"},403);
        const t=String(data.text||"").trim().slice(0,500);if(!t)return J({error:"التعليق فارغ"},400);data={text:t};
      }
    }else return J({error:"نوع غير مدعوم"},400);
    const json=JSON.stringify(data);
    if(json.length>1900000)return J({error:"الملف كبير جداً"},413);
    const id=type==="comment"?"c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6):"";
    const k=type==="comment"?id:`${type}:${s.id}:${ref}`,created=new Date().toISOString();
    await Q(env,"INSERT INTO midad_student_actions(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data,created=excluded.created,student_name=excluded.student_name",k,id||k,type,s.id,s.name,s.classId,ref,json,created).run();
    return J({ok:true,action:out({k,id:id||k,type,student_id:s.id,student_name:s.name,class_id:s.classId,ref_id:ref,data:json,created})});
  }catch(e){console.error(e);return J({error:"تعذر الحفظ"},500)}
}
