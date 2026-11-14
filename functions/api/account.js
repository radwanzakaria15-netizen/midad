import {json,getUser,profile} from './_auth.js';
export async function onRequest({request,env}){
  if(!['GET','POST','PATCH'].includes(request.method))return json({error:'طريقة الطلب غير مدعومة.'},405);
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول أولاً.'},401);
  const current=await profile(env.DB,auth.id);
  if(request.method==='GET')return json({user:current||null});
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const name=String(body.name||'').trim();
  const username=body.username==null?null:String(body.username).trim().toLowerCase();
  const recovery=body.recoveryEmail==null?null:String(body.recoveryEmail).trim().toLowerCase();
  if(!name||name.length>100)return json({error:'أدخل الاسم الكامل.'},400);
  if(username!==null&&!/^[a-z0-9_]{4,20}$/.test(username))return json({error:'اسم المستخدم يجب أن يكون إنجليزياً من 4 إلى 20 رمزاً.'},400);
  if(recovery&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recovery)||recovery.length>254))return json({error:'البريد الاحتياطي غير صالح.'},400);
  const now=new Date().toISOString();
  try{
    if(!current){
      await env.DB.prepare('INSERT INTO midad_users(uid,name,username,role,subject,recovery_email,created_at,updated_at) VALUES(?,?,?,\'student\',NULL,?,?,?)').bind(auth.id,name,username,recovery,now,now).run();
    }else{
      await env.DB.prepare('UPDATE midad_users SET name=?,username=COALESCE(?,username),recovery_email=?,updated_at=? WHERE uid=?').bind(name,username,recovery,now,auth.id).run();
    }
    return json({user:await profile(env.DB,auth.id)});
  }catch(e){
    if(String(e.message).includes('UNIQUE'))return json({error:'اسم المستخدم مستخدم بالفعل.'},409);
    return json({error:'تعذر حفظ الحساب.'},500);
  }
}
