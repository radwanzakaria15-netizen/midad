const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const code=(url.searchParams.get('code')||'').replace(/\D/g,'');
  if(!/^\d{6}$/.test(code))return json({error:'أدخل معرّفاً صحيحاً من ستة أرقام.'},400);
  try{
    const row=await env.DB.prepare('SELECT payload_json FROM midad_students WHERE student_code=?').bind(code).first();
    if(!row)return json({error:'لم نعثر على هذا المعرّف. تحقق منه أو اطلب من الأستاذ نشر بيانات القسم.'},404);
    const payload=JSON.parse(row.payload_json);
    return json(payload);
  }catch{return json({error:'تعذر تحميل فضاء المتعلم حالياً.'},500);}
}