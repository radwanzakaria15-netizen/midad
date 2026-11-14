import {json,getUser,profile} from '../_auth.js';
function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function digest(value){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}

export async function onRequestPost({request,env}){
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول أولاً.'},401);
  if(await profile(env.DB,auth.id))return json({error:'هذا الحساب لديه ملف مستخدم بالفعل.'},409);
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const code=String(body.code||'').trim().toUpperCase(),name=String(body.name||'').trim(),username=String(body.username||'').trim().toLowerCase(),reservationToken=String(body.reservationToken||'');
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||!/^[a-f0-9]{64}$/.test(reservationToken))return json({error:'احجز رمز الدعوة مجدداً ثم حاول.'},400);
  if(!name||name.length>100)return json({error:'أدخل الاسم الكامل.'},400);
  if(!/^[a-z0-9_]{4,20}$/.test(username))return json({error:'اسم المستخدم غير صالح.'},400);
  const now=new Date().toISOString();
  try{
    const hash=await digest(reservationToken);
    const result=await env.DB.batch([
      env.DB.prepare('UPDATE midad_invites SET used=1,used_by=?,reserved_username=NULL,reservation_token_hash=NULL,reserved_until=NULL WHERE code=? AND used=0 AND reserved_username=? AND reservation_token_hash=? AND reserved_until>? AND expires_at>?')
        .bind(auth.id,code,username,hash,now,now),
      env.DB.prepare("INSERT INTO midad_users(uid,name,username,role,subject,created_at,updated_at) SELECT ?,?,?, 'teacher',subject,?,? FROM midad_invites WHERE code=? AND used=1 AND used_by=?")
        .bind(auth.id,name,username,now,now,code,auth.id)
    ]);
    if(!result[0]?.meta?.changes||!result[1]?.meta?.changes)return json({error:'انتهى حجز الدعوة أو لم يعد صالحاً. سجّل الدخول واطلب حجزاً جديداً.'},409);
    return json({user:await profile(env.DB,auth.id)});
  }catch(e){
    if(String(e.message).includes('UNIQUE'))return json({error:'اسم المستخدم مستخدم بالفعل.'},409);
    return json({error:'تعذر تفعيل دعوة الأستاذ.'},500);
  }
}
