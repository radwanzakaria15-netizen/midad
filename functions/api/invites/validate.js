import {json} from '../_auth.js';

function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function digest(value){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
function token(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return hex(bytes);}

export async function onRequestPost({request,env}){
  let body;
  try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const code=String(body.code||'').trim().toUpperCase();
  const username=String(body.username||'').trim().toLowerCase();
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||!/^[a-z0-9_]{4,20}$/.test(username)){
    return json({error:'تحقق من رمز الدعوة واسم المستخدم.'},400);
  }
  try{
    const now=new Date(),nowIso=now.toISOString(),until=new Date(now.getTime()+10*60*1000).toISOString();
    const existing=await env.DB.prepare('SELECT 1 AS found FROM midad_users WHERE username=? COLLATE NOCASE LIMIT 1').bind(username).first();
    if(existing)return json({error:'اسم المستخدم مستخدم بالفعل.'},409);
    const reservationToken=token(),hash=await digest(reservationToken);
    const result=await env.DB.prepare('UPDATE midad_invites SET reserved_username=?,reservation_token_hash=?,reserved_until=? WHERE code=? AND used=0 AND expires_at>? AND (reserved_until IS NULL OR reserved_until<=?)')
      .bind(username,hash,until,code,nowIso,nowIso).run();
    if(!result.meta?.changes)return json({error:'رمز الدعوة غير صالح أو مستخدم أو محجوز مؤقتاً. حاول بعد قليل.'},409);
    const invite=await env.DB.prepare('SELECT subject FROM midad_invites WHERE code=? AND reservation_token_hash=?').bind(code,hash).first();
    if(!invite)return json({error:'تعذر تثبيت حجز الدعوة.'},409);
    return json({valid:true,subject:invite.subject,reservationToken});
  }catch{return json({error:'تعذر التحقق من الدعوة الآن.'},500)}
}
