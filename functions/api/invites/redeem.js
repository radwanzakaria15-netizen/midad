import {json,getUser,profile} from '../_auth.js';
export async function onRequestPost({request,env}){
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول أولاً.'},401);
  if(await profile(env.DB,auth.id))return json({error:'هذا الحساب لديه ملف مستخدم بالفعل.'},409);
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  const code=String(body.code||'').trim().toUpperCase(),name=String(body.name||'').trim(),username=String(body.username||'').trim().toLowerCase();
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))return json({error:'رمز الدعوة يجب أن يتكون من 8 أحرف.'},400);
  if(!name||name.length>100)return json({error:'أدخل الاسم الكامل.'},400);
  if(!/^[a-z0-9_]{4,20}$/.test(username))return json({error:'اسم المستخدم غير صالح.'},400);
  const now=new Date().toISOString();
  try{
    const result=await env.DB.batch([
      env.DB.prepare('UPDATE midad_invites SET used=1,used_by=? WHERE code=? AND used=0 AND expires_at>?').bind(auth.id,code,now),
      env.DB.prepare('INSERT INTO midad_users(uid,name,username,role,subject,created_at,updated_at) SELECT ?,?,?,\'teacher\',subject,?,? FROM midad_invites WHERE code=? AND used=1 AND used_by=? AND expires_at>?').bind(auth.id,name,username,now,now,code,auth.id,now)
    ]);
    if(!result[0]?.meta?.changes||!result[1]?.meta?.changes)return json({error:'الرمز غير صالح أو منتهي أو سبق استخدامه.'},400);
    return json({user:await profile(env.DB,auth.id)});
  }catch(e){
    if(String(e.message).includes('UNIQUE'))return json({error:'اسم المستخدم مستخدم بالفعل.'},409);
    return json({error:'تعذر تفعيل دعوة الأستاذ.'},500);
  }
}
