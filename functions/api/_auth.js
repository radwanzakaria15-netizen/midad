const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export { json };
export async function getUser(request,env){
  const token=(request.headers.get('Authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) return null;
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY) throw new Error('إعدادات Supabase غير مكتملة في Cloudflare Pages.');
  const response=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
  if(!response.ok)return null;
  const user=await response.json();
  return user?.id?{id:user.id,email:user.email||null}:null;
}
export async function profile(db,uid){
  return db.prepare('SELECT uid,name,username,role,subject,recovery_email,created_at FROM midad_users WHERE uid=?').bind(uid).first();
}
export function badMethod(){return json({error:'طريقة الطلب غير مدعومة.'},405);}
