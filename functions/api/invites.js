import {json,getUser,profile} from './_auth.js';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(){
  let code='';
  const limit=256-(256%alphabet.length);
  while(code.length<8){
    const bytes=new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for(const byte of bytes){
      if(byte>=limit)continue;
      code+=alphabet[byte%alphabet.length];
      if(code.length===8)break;
    }
  }
  return code;
}
export async function onRequestPost({request,env}){
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول أولاً.'},401);
  const me=await profile(env.DB,auth.id);
  if(!me||!['teacher','admin'].includes(me.role))return json({error:'إنشاء دعوات الأساتذة متاح للأستاذ أو المشرف فقط.'},403);
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const requestedSubject=String(body.subject||'').trim();
  if(me.role==='teacher'&&requestedSubject&&requestedSubject!==me.subject)return json({error:'يمكن للأستاذ إنشاء دعوات لتخصصه فقط.'},403);
  const subject=me.role==='admin'?(requestedSubject||me.subject||''):String(me.subject||'').trim();
  if(!subject||subject.length>100)return json({error:'حدد التخصص قبل إنشاء الدعوة.'},400);
  const code=makeCode(),now=new Date(),expires=new Date(now.getTime()+48*60*60*1000).toISOString();
  await env.DB.prepare('INSERT INTO midad_invites(code,created_by,subject,expires_at,used,created_at) VALUES(?,?,?,?,0,?)').bind(code,auth.id,subject,expires,now.toISOString()).run();
  return json({code,subject,expiresAt:expires});
}
