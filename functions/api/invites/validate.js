import {json} from '../_auth.js';

export async function onRequestPost({request,env}){
  let body;
  try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  const code=String(body.code||'').trim().toUpperCase();
  const username=String(body.username||'').trim().toLowerCase();
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||!/^[a-z0-9_]{4,20}$/.test(username)){
    return json({error:'تحقق من رمز الدعوة واسم المستخدم.'},400);
  }
  try{
    const now=new Date().toISOString();
    const invite=await env.DB.prepare('SELECT subject FROM midad_invites WHERE code=? AND used=0 AND expires_at>?').bind(code,now).first();
    if(!invite)return json({error:'رمز الدعوة غير صالح أو منتهي أو سبق استخدامه.'},400);
    const existing=await env.DB.prepare('SELECT 1 AS found FROM midad_users WHERE username=? COLLATE NOCASE LIMIT 1').bind(username).first();
    if(existing)return json({error:'اسم المستخدم مستخدم بالفعل.'},409);
    return json({valid:true,subject:invite.subject});
  }catch{
    return json({error:'تعذر التحقق من الدعوة الآن.'},500);
  }
}
