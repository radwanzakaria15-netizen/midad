const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function teacherId(request,env){
  const auth=request.headers.get('Authorization')||'';
  const match=auth.match(/^Bearer\s+(.+)$/i);
  if(!match) return null;
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY) throw new Error('إعدادات التحقق من حساب الأستاذ غير مكتملة في Cloudflare.');
  const r=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+match[1]}});
  if(!r.ok)return null;
  const user=await r.json();
  return user?.id||null;
}
function publicStudentWorkspace(w,student){
  const classId=student.classId||'';
  const klass=(w.classes||[]).find(x=>x.id===classId)||null;
  const tasks=(w.activities||[]).filter(x=>x.kind==='task'&&x.assignment&&((x.assignment.scope==='student'&&x.assignment.studentId===student.id)||(x.assignment.scope!=='student'&&x.assignment.classId===classId)));
  const grades=(w.grades||[]).filter(x=>x.studentId===student.id&&x.published);
  const lessons=(w.lessons||[]).filter(x=>!x.classId||x.classId===classId);
  const classNotes=(w.classNotes||[]).filter(x=>x.classId===classId);
  const schedule=(w.schedule||[]).filter(x=>!x.classId||x.classId===classId);
  return {
    teacher:w.teacher||'الأستاذ',
    school:w.school||'',
    year:w.year||'',
    students:[student],
    classes:klass?[klass]:[],
    lessons,activities:tasks,grades,classNotes,schedule,
    attendance:(w.attendance||[]).filter(x=>x.studentId===student.id),
    notificationReads:[]
  };
}
export async function onRequest(context){
  const {request,env}=context;
  if(request.method!=='GET'&&request.method!=='PUT'&&request.method!=='POST')return json({error:'طريقة الطلب غير مدعومة.'},405);
  let owner;
  try{owner=await teacherId(request,env);}catch(e){return json({error:e.message},500);}
  if(!owner)return json({error:'يلزم تسجيل دخول الأستاذ أو أن الجلسة انتهت.'},401);
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT workspace_json, updated_at FROM midad_workspaces WHERE owner_id=?').bind(owner).first();
    if(!row)return json({error:'لا توجد مساحة سحابية بعد.'},404);
    let workspace;
    try{workspace=JSON.parse(row.workspace_json);}catch{return json({error:'تعذر قراءة بيانات مساحة العمل.'},500);}
    return json({workspace,updatedAt:row.updated_at});
  }
  let body;
  try{body=await request.json();}catch{return json({error:'صيغة البيانات غير صحيحة.'},400);}
  const workspace=body?.workspace;
  if(!workspace||typeof workspace!=='object'||!Array.isArray(workspace.students)||!Array.isArray(workspace.classes))return json({error:'بيانات مساحة العمل ناقصة.'},400);
  const serialized=JSON.stringify(workspace);
  if(serialized.length>850000)return json({error:'حجم مساحة العمل يتجاوز الحد المسموح حالياً.'},413);
  const now=new Date().toISOString();
  try{
    await env.DB.prepare('INSERT INTO midad_workspaces(owner_id,workspace_json,updated_at) VALUES(?,?,?) ON CONFLICT(owner_id) DO UPDATE SET workspace_json=excluded.workspace_json,updated_at=excluded.updated_at').bind(owner,serialized,now).run();
    const statements=[env.DB.prepare('DELETE FROM midad_students WHERE owner_id=?').bind(owner)];
    for(const student of workspace.students){
      const code=String(student?.studentCode||'');
      if(!/^\d{6}$/.test(code)||!student?.id)continue;
      const payload=publicStudentWorkspace(workspace,student);
      statements.push(env.DB.prepare('INSERT INTO midad_students(student_code,owner_id,student_id,payload_json,updated_at) VALUES(?,?,?,?,?)').bind(code,owner,String(student.id),JSON.stringify(payload),now));
    }
    if(statements.length>1)await env.DB.batch(statements);
    return json({ok:true,updatedAt:now,studentsPublished:statements.length-1});
  }catch(error){
    if(String(error?.message||'').includes('UNIQUE'))return json({error:'يوجد تكرار في معرّف طالب من ستة أرقام. غيّر المعرّف المكرر ثم أعد الحفظ.'},409);
    return json({error:'تعذر حفظ مساحة العمل في قاعدة البيانات.'},500);
  }
}