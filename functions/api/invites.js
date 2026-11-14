import {json,getUser,profile} from './_auth.js';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(){let s='';for(let i=0;i<8;i++)s+=alphabet[Math.floor(Math.random()*alphabet.length)];return s}
export async function onRequest({request,env}){
  if(!['POST','PUT'].includes(request.method))return json({error:'طريقة الطلب غير مدعومة.'},405);
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول أولاً.'},401);
  const me=await profile(env.DB,auth.id);
  if(!me||!['teacher','admin'].includes(me.role))return json({error:'إنشاء دعوات الأساتذة متاح للأستاذ أو المشرف فقط.'},403);
  let body={};try{body=await request.json()}catch{}
  if(request.method==='POST'){
    const subject=String(body.subject||me.subject||'').trim();
    if(!subject||subject.length>100)return json({error:'حدد التخصص قبل إنشاء الدعوة.'},400);
    const code=makeCode(),now=new Date(),expires=new Date(now.getTime()+48*60*60*1000).toISOString();
    await env.DB.prepare('INSERT INTO midad_invites(code,created_by,subject,expires_at,used,created_at) VALUES(?,?,?,?,0,?)').bind(code,auth.id,subject,expires,now.toISOString()).run();
    return json({code,subject,expiresAt:expires});
  }
  const code=String(body.code||'').trim().toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))return json({error:'رمز الدعوة غير صحيح.'},400);
  if(me)return json({error:'هذا الحساب مسجل بالفعل.'},409);
  return json({error:'تعذر إكمال تسجيل الأستاذ.'},400);
}
