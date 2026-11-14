import {json,getUser,profile} from './_auth.js';
export async function onRequest({request,env}){
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT COUNT(*) count,ROUND(AVG(rating),1) average FROM midad_ratings').first();
    return json({count:row?.count||0,average:row?.average||0});
  }
  if(request.method!=='PUT')return json({error:'طريقة الطلب غير مدعومة.'},405);
  let auth;try{auth=await getUser(request,env)}catch(e){return json({error:e.message},500)}
  if(!auth)return json({error:'سجّل الدخول لتقييم الموقع.'},401);
  if(!await profile(env.DB,auth.id))return json({error:'أكمل إعداد حسابك أولاً.'},409);
  let body;try{body=await request.json()}catch{return json({error:'البيانات غير صالحة.'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'البيانات غير صالحة.'},400);
  const rating=Number(body.rating),comment=String(body.comment||'').trim();
  if(!Number.isInteger(rating)||rating<1||rating>5||comment.length>1000)return json({error:'التقييم يجب أن يكون من 1 إلى 5.'},400);
  const now=new Date().toISOString();
  await env.DB.prepare('INSERT INTO midad_ratings(uid,rating,comment,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,updated_at=excluded.updated_at').bind(auth.id,rating,comment,now,now).run();
  return json({ok:true});
}
