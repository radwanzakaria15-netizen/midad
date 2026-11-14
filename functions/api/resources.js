import {json,getUser,profile} from './_auth.js';
export async function onRequest({request,env}){
  if(!['GET','POST','PATCH'].includes(request.method))return json({error:'طريقة الطلب غير مدعومة.'},405);
  if(request.method==='GET'){
    const auth=await getUser(request,env).catch(()=>null);
    const me=auth?await profile(env.DB,auth.id):null;
    const rows=me?await env.DB.prepare("SELECT * FROM midad_resources WHERE status='approved' OR owner_id=? ORDER BY created_at DESC LIMIT 200").bind(me.uid).all():await env.DB.prepare("SELECT * FROM midad_resources WHERE status='approved' ORDER BY created_at DESC LIMIT 200").all();
    return json({resources:rows.results||[]});
  }
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول لنشر مورد أو مراجعته.'},401);
  const me=await profile(env.DB,auth.id);if(!me)return json({error:'أكمل إعداد حسابك أولاً.'},409);
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(request.method==='POST'){
    const title=String(body.title||'').trim(),description=String(body.description||'').trim(),subject=String(body.subject||'').trim(),type=String(body.type||'other');
    if(!title||title.length>180||description.length>3000||!subject||!['lesson','book','summary','other'].includes(type))return json({error:'تحقق من عنوان المورد ووصفه وتخصصه.'},400);
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await env.DB.prepare("INSERT INTO midad_resources(id,owner_id,owner_name,subject,title,description,resource_type,file_url,status,created_at) VALUES(?,?,?,?,?,?,?,?,'pending',?)").bind(id,auth.id,me.name,subject,title,description,type,body.fileUrl||null,now).run();
    return json({id,status:'pending'},201);
  }
  if(!['teacher','admin'].includes(me.role))return json({error:'المراجعة متاحة للأساتذة والمشرفين فقط.'},403);
  const id=String(body.id||''),status=String(body.status||'');
  if(!id||!['approved','rejected'].includes(status))return json({error:'طلب مراجعة غير صالح.'},400);
  const resource=await env.DB.prepare('SELECT subject FROM midad_resources WHERE id=? AND status=\'pending\'').bind(id).first();
  if(!resource)return json({error:'المورد غير موجود أو تمت مراجعته.'},404);
  if(me.role!=='admin'&&me.subject!==resource.subject)return json({error:'لا يمكنك مراجعة موارد تخصص آخر.'},403);
  await env.DB.prepare('UPDATE midad_resources SET status=?,reviewed_by=?,reviewed_at=? WHERE id=? AND status=\'pending\'').bind(status,auth.id,new Date().toISOString(),id).run();
  return json({ok:true,status});
}
