const cors={
  'Access-Control-Allow-Origin':'https://radwanzakaria15-netizen.github.io',
  'Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Authorization',
  'Access-Control-Max-Age':'86400'
};
export async function onRequest(ctx){
  if(ctx.request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const res=await ctx.next();
  const r=new Response(res.body,res);
  Object.entries(cors).forEach(([k,v])=>r.headers.set(k,v));
  return r;
}
