import {json} from '../_auth.js';
function hex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function digest(value){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}

export async function onRequestPost({request,env}){
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const code=String(body.code||'').trim().toUpperCase(),username=String(body.username||'').trim().toLowerCase(),reservationToken=String(body.reservationToken||'');
  if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||!/^[a-z0-9_]{4,20}$/.test(username)||!/^[a-f0-9]{64}$/.test(reservationToken))return json({error:'بيانات الحجز غير صالحة.'},400);
  try{
    const hash=await digest(reservationToken);
    await env.DB.prepare('UPDATE midad_invites SET reserved_username=NULL,reservation_token_hash=NULL,reserved_until=NULL WHERE code=? AND used=0 AND reserved_username=? AND reservation_token_hash=?')
      .bind(code,username,hash).run();
    return json({ok:true});
  }catch{return json({error:'تعذر تحرير حجز الدعوة.'},500)}
}
