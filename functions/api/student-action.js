/* functions/api/student-action.js — Cloudflare Pages Function (D1)
   يستخدم نفس قاعدة D1 (الربط env.DB). أنشئ الجدول مرة واحدة:

   wrangler d1 execute <اسم-القاعدة> --remote --command "CREATE TABLE IF NOT EXISTS midad_student_actions(k TEXT PRIMARY KEY, id TEXT, type TEXT, student_id TEXT, student_name TEXT, class_id TEXT, ref_id TEXT, data TEXT, created TEXT); CREATE INDEX IF NOT EXISTS idx_msa_class ON midad_student_actions(class_id);"
*/
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const out=r=>({k:r.k,id:r.id,type:r.type,studentId:r.student_id,studentName:r.student_name,classId:r.class_id,refId:r.ref_id,data:JSON.parse(r.data||"{}"),created:r.created});
async function who(env,code){
  code=String(code||"").replace(/\D/g,"");
  if(!/^\d{6}$/.test(code))return null;
  const row=await env.DB.prepare("SELECT payload_json FROM midad_students WHERE student_code=?").bind(code).first();
  if(!row)return null;
  const ws=JSON.parse(row.payload_json),st=(ws.students||[]).find(x=>String(x.studentCode||"")===code);
  return st?{student:st,workspace:ws}:null;
}
export async function onRequestGet({request,env}){
  try{
    const u=new URL(request.url),code=u.searchParams.get("code");
    if(code){ // الطالب: تصويت وتعليقات قسمه + تسليماته هو فقط
      const p=await who(env,code);if(!p)return J({error:"معرّف غير صالح"},401);
      const s=p.student;
      const a=await env.DB.prepare("SELECT * FROM midad_student_actions WHERE class_id=? AND type IN ('vote','comment') ORDER BY created").bind(s.classId).all();
      const b=await env.DB.prepare("SELECT * FROM midad_student_actions WHERE student_id=? AND type='submission'").bind(s.id).all();
      return J({actions:[...a.results,...b.results].map(out)});
    }
    // الأستاذ: نتحقق عبر /api/workspace نفسها، ونقرأ أقسام الأستاذ الفعلية من مساحته
    const auth=request.headers.get("Authorization")||"";
    if(!auth)return J({error:"غير مصرّح"},401);
    const wr=await fetch(new URL("/api/workspace",request.url),{headers:{Authorization:auth}});
    if(!wr.ok)return J({error:"غير مصرّح"},401);
    const ids=((await wr.json()).workspace?.classes||[]).map(c=>String(c.id));
    if(!ids.length)return J({actions:[]});
    const r=await env.DB.prepare(`SELECT * FROM midad_student_actions WHERE class_id IN (${ids.map(()=>"?").join(",")}) ORDER BY created`).bind(...ids).all();
    return J({actions:r.results.map(out)});
  }catch(e){console.error(e);return J({error:"تعذر تحميل البيانات"},500)}
}
export async function onRequestPost({request,env}){
  try{
    let b;try{b=await request.json()}catch(e){return J({error:"طلب غير صالح"},400)}
    const p=await who(env,b.code);if(!p)return J({error:"معرّف غير صالح"},401);
    const s=p.student,ws=p.workspace,a=b.action||{},type=a.type,ref=String(a.refId||"");
    let data=a.data||{};
    if(type==="submission"){
      const t=(ws.activities||[]).find(x=>x.id===ref&&x.kind==="task"&&x.assignment&&(x.assignment.scope==="student"?x.assignment.studentId===s.id:x.assignment.classId===s.classId));
      if(!t)return J({error:"هذا النشاط غير موجّه إليك"},403);
      data={text:String(data.text||"").slice(0,5000),file:data.file||null,late:!!(t.dueDate&&new Date().toISOString().slice(0,10)>t.dueDate)};
    }else if(type==="vote"||type==="comment"){
      const n=(ws.announcements||[]).find(x=>x.id===ref&&x.classId===s.classId);
      if(!n)return J({error:"الإعلان غير موجود (قد لم يُزامَن بعد)"},403);
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
    await env.DB.prepare("INSERT INTO midad_student_actions(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data,created=excluded.created,student_name=excluded.student_name")
      .bind(k,id||k,type,s.id,s.name,s.classId,ref,json,created).run();
    return J({ok:true,action:out({k,id:id||k,type,student_id:s.id,student_name:s.name,class_id:s.classId,ref_id:ref,data:json,created})});
  }catch(e){console.error(e);return J({error:"تعذر الحفظ"},500)}
}
