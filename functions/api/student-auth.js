/* functions/api/student-auth.js — Cloudflare Pages Function (D1)
   دخول الطالب: بصمة الهاتف (WebAuthn) أو حساب Google، حسب إعداد الأستاذ.
   • نفس جدول midad_student_actions (لا حاجة لجدول جديد). الأنواع: setting · passkey · glink · challenge
   • لتفعيل Google: أضف متغير البيئة GOOGLE_CLIENT_ID (Web client من Google Cloud Console)
     وأضف نطاق موقعك في «Authorized JavaScript origins».
   الأوضاع: "passkey" = معرّف الطالب + حفظ البصمة (الافتراضي) · "google" = حساب Google */
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const Q=(env,sql,...a)=>env.DB.prepare(sql).bind(...a);
const T="midad_student_actions";
let ready=null;
const ensure=env=>ready||(ready=env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS "+T+"(k TEXT PRIMARY KEY, id TEXT, type TEXT, student_id TEXT, student_name TEXT, class_id TEXT, ref_id TEXT, data TEXT, created TEXT)"),
  env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_msa_class ON "+T+"(class_id)")
]).catch(e=>{ready=null;throw e}));

/* ---------- أدوات ---------- */
const b64u=b=>{let s="";new Uint8Array(b).forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const unb64u=s=>{s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u};
const utf8=s=>new TextEncoder().encode(s);
const sha=async d=>new Uint8Array(await crypto.subtle.digest("SHA-256",d));
const rnd=n=>b64u(crypto.getRandomValues(new Uint8Array(n)));
const MODES=["passkey","google"];

async function who(env,code){
  code=String(code||"").replace(/\D/g,"");
  if(!/^\d{6}$/.test(code))return null;
  const row=await Q(env,"SELECT payload_json FROM midad_students WHERE student_code=?",code).first();
  if(!row)return null;
  const ws=JSON.parse(row.payload_json),st=(ws.students||[]).find(x=>String(x.studentCode||"")===code);
  return st?{student:st,workspace:ws}:null;
}
async function teacherClasses(request){
  const auth=request.headers.get("Authorization")||"";if(!auth)return null;
  const r=await fetch(new URL("/api/workspace",request.url),{headers:{Authorization:auth}});
  if(!r.ok)return null;
  const w=(await r.json()).workspace;return(w&&w.classes||[]).map(c=>String(c.id));
}
async function modeOf(env,classId){
  const r=await Q(env,"SELECT data FROM "+T+" WHERE k=? AND type='setting'","setting:"+classId).first();
  const m=r?(JSON.parse(r.data||"{}").mode):"";
  return MODES.includes(m)?m:"passkey";
}
async function newChallenge(env,extra){
  await Q(env,"DELETE FROM "+T+" WHERE type='challenge' AND created<?",new Date(Date.now()-10*60000).toISOString()).run();
  const id=rnd(12),challenge=rnd(32);
  await Q(env,"INSERT INTO "+T+"(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'challenge',?,'','','',?,?)","ch:"+id,id,extra&&extra.studentId||"",JSON.stringify({challenge}),new Date().toISOString()).run();
  return{challengeId:id,challenge};
}
async function takeChallenge(env,id){
  const k="ch:"+String(id||"");
  const r=await Q(env,"SELECT * FROM "+T+" WHERE k=? AND type='challenge'",k).first();
  if(!r)return null;
  await Q(env,"DELETE FROM "+T+" WHERE k=?",k).run();
  if(Date.now()-Date.parse(r.created)>10*60000)return null;
  return{challenge:JSON.parse(r.data).challenge,studentId:r.student_id};
}

/* ---------- WebAuthn ---------- */
function derToRaw(sig){
  let o=2;if(sig[1]&0x80)o+=sig[1]&0x7f;
  if(sig[o]!==2)throw new Error("sig");
  const rl=sig[o+1],r=sig.slice(o+2,o+2+rl);o+=2+rl;
  if(sig[o]!==2)throw new Error("sig");
  const sl=sig[o+1],s=sig.slice(o+2,o+2+sl);
  const fix=x=>{while(x.length>32&&x[0]===0)x=x.slice(1);const out=new Uint8Array(32);out.set(x,32-x.length);return out};
  const raw=new Uint8Array(64);raw.set(fix(r),0);raw.set(fix(s),32);return raw;
}
function clientData(b64,type,challenge,origin){
  try{const c=JSON.parse(new TextDecoder().decode(unb64u(b64)));return c.type===type&&c.challenge===challenge&&c.origin===origin}catch(e){return false}
}
async function verifyAssertion(pk,a,challenge,origin,rpId){
  if(!clientData(a.clientDataJSON,"webauthn.get",challenge,origin))return false;
  const ad=unb64u(a.authenticatorData),rp=await sha(utf8(rpId));
  if(ad.length<37)return false;
  for(let i=0;i<32;i++)if(ad[i]!==rp[i])return false;
  if(!(ad[32]&1)||!(ad[32]&4))return false;            // وجود المستخدم + التحقق بالبصمة/القفل
  const cdh=await sha(unb64u(a.clientDataJSON)),msg=new Uint8Array(ad.length+32);msg.set(ad,0);msg.set(cdh,ad.length);
  const spki=unb64u(pk.publicKey),sig=unb64u(a.signature);
  if(pk.alg===-7){
    const key=await crypto.subtle.importKey("spki",spki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    return crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,derToRaw(sig),msg);
  }
  if(pk.alg===-257){
    const key=await crypto.subtle.importKey("spki",spki,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,sig,msg);
  }
  return false;
}

/* ---------- Google ---------- */
async function verifyGoogle(env,idt){
  try{
    const[h,p,s]=String(idt||"").split(".");if(!s||!env.GOOGLE_CLIENT_ID)return null;
    const dec=x=>JSON.parse(new TextDecoder().decode(unb64u(x))),head=dec(h),pay=dec(p);
    if(head.alg!=="RS256")return null;
    const jw=await(await fetch("https://www.googleapis.com/oauth2/v3/certs",{cf:{cacheTtl:3600,cacheEverything:true}})).json();
    const jwk=(jw.keys||[]).find(k=>k.kid===head.kid);if(!jwk)return null;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,unb64u(s),utf8(h+"."+p)))return null;
    if(!["accounts.google.com","https://accounts.google.com"].includes(pay.iss)||pay.aud!==env.GOOGLE_CLIENT_ID||!pay.sub||pay.exp*1000<Date.now())return null;
    return{sub:String(pay.sub),email:String(pay.email||"")};
  }catch(e){console.error(e);return null}
}

/* ---------- GET ---------- */
export async function onRequestGet({request,env}){
  try{
    await ensure(env);
    const u=new URL(request.url),code=u.searchParams.get("code");
    if(u.searchParams.get("config"))return J({googleClientId:env.GOOGLE_CLIENT_ID||""});
    if(code){
      const p=await who(env,code);if(!p)return J({error:"معرّف غير صالح"},401);
      return J({mode:await modeOf(env,p.student.classId)});
    }
    const ids=await teacherClasses(request);if(!ids)return J({error:"غير مصرّح"},401);
    if(!ids.length)return J({mode:"passkey",linked:{}});
    const ph=ids.map(()=>"?").join(",");
    const [st,rows]=await Promise.all([
      Q(env,`SELECT class_id,data FROM ${T} WHERE type='setting' AND class_id IN (${ph})`,...ids).all(),
      Q(env,`SELECT student_id,type,COUNT(*) n FROM ${T} WHERE type IN ('passkey','glink') AND class_id IN (${ph}) GROUP BY student_id,type`,...ids).all()]);
    const m=(st.results[0]&&JSON.parse(st.results[0].data||"{}").mode)||"passkey",linked={};
    rows.results.forEach(r=>{(linked[r.student_id]=linked[r.student_id]||{})[r.type==="glink"?"google":"passkeys"]=r.n});
    return J({mode:MODES.includes(m)?m:"passkey",linked,googleReady:!!env.GOOGLE_CLIENT_ID});
  }catch(e){console.error(e);return J({error:"تعذر تحميل البيانات"},500)}
}

/* ---------- POST ---------- */
async function teacherOp(request,env,b){
  const ids=await teacherClasses(request);if(!ids)return J({error:"تعذر التحقق من حسابك. أعد تسجيل الدخول."},401);
  if(b.setMode!==undefined){
    if(!MODES.includes(b.setMode))return J({error:"وضع غير مدعوم"},400);
    if(b.setMode==="google"&&!env.GOOGLE_CLIENT_ID)return J({error:"لم يُضبط GOOGLE_CLIENT_ID في إعدادات الخادم بعد."},400);
    if(ids.length)await env.DB.batch(ids.map(id=>Q(env,"INSERT INTO "+T+"(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'setting','teacher','',?,'',?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data","setting:"+id,"setting:"+id,id,JSON.stringify({mode:b.setMode}),new Date().toISOString())));
    return J({ok:true,mode:b.setMode});
  }
  if(b.reset){
    const sid=String(b.reset.studentId||"");if(!sid||!ids.length)return J({error:"طلب غير صالح"},400);
    await Q(env,`DELETE FROM ${T} WHERE student_id=? AND type IN ('passkey','glink') AND class_id IN (${ids.map(()=>"?").join(",")})`,sid,...ids).run();
    return J({ok:true});
  }
  return J({error:"طلب غير صالح"},400);
}
export async function onRequestPost({request,env}){
  try{
    await ensure(env);
    let b;try{b=await request.json()}catch(e){return J({error:"طلب غير صالح"},400)}
    if(b.setMode!==undefined||b.reset)return await teacherOp(request,env,b);
    const url=new URL(request.url),origin=url.origin,rpId=url.hostname;

    if(b.passkey){
      const a=b.passkey;
      if(a.step==="options"){                                   // بدء حفظ البصمة (الطالب يملك المعرّف)
        const p=await who(env,a.code);if(!p)return J({error:"معرّف غير صالح"},401);
        const c=await newChallenge(env,{studentId:p.student.id});
        return J({...c,rpId,userId:b64u(utf8(String(p.student.id).slice(0,60))),userName:p.student.name||"طالب"});
      }
      if(a.step==="register"){
        const p=await who(env,a.code);if(!p)return J({error:"معرّف غير صالح"},401);
        const ch=await takeChallenge(env,a.challengeId);
        if(!ch||ch.studentId!==p.student.id)return J({error:"انتهت صلاحية الطلب، أعد المحاولة."},400);
        if(!clientData(a.clientDataJSON,"webauthn.create",ch.challenge,origin))return J({error:"تعذر التحقق من البصمة."},400);
        if(![-7,-257].includes(a.alg)||!a.publicKey||!a.id)return J({error:"هذا الجهاز لا يدعم هذه الطريقة."},400);
        const old=await Q(env,"SELECT COUNT(*) n FROM "+T+" WHERE type='passkey' AND student_id=?",p.student.id).first();
        if(old&&old.n>=5)return J({error:"وصلت إلى الحد الأقصى للأجهزة المحفوظة. اطلب من الأستاذ إعادة التعيين."},400);
        await Q(env,"INSERT INTO "+T+"(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'passkey',?,?,?,?,?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data","pk:"+a.id,a.id,p.student.id,p.student.name||"",p.student.classId||"",String(p.student.studentCode),JSON.stringify({publicKey:a.publicKey,alg:a.alg}),new Date().toISOString()).run();
        return J({ok:true});
      }
      if(a.step==="challenge"){return J({...await newChallenge(env),rpId})}
      if(a.step==="verify"){                                    // الدخول بالبصمة
        const ch=await takeChallenge(env,a.challengeId);if(!ch)return J({error:"انتهت صلاحية الطلب، أعد المحاولة."},400);
        const row=await Q(env,"SELECT * FROM "+T+" WHERE k=? AND type='passkey'","pk:"+String(a.id||"")).first();
        if(!row)return J({error:"هذه البصمة غير محفوظة. ادخل بالمعرّف ثم احفظها من جديد."},401);
        if(!await verifyAssertion(JSON.parse(row.data),a,ch.challenge,origin,rpId))return J({error:"فشل التحقق من البصمة."},401);
        const pp=await who(env,row.ref_id),st=pp&&pp.student.id===row.student_id?pp.student:null;
        if(!st)return J({error:"لم يعد هذا الطالب موجوداً."},404);
        if(await modeOf(env,st.classId)==="google")return J({error:"هذا القسم يتطلب الدخول بحساب Google."},403);
        return J({ok:true,code:String(st.studentCode)});
      }
      return J({error:"خطوة غير معروفة"},400);
    }

    if(b.google){
      const g=await verifyGoogle(env,b.google.credential);
      if(!g)return J({error:"تعذر التحقق من حساب Google."},401);
      const link=await Q(env,"SELECT * FROM "+T+" WHERE k=? AND type='glink'","g:"+g.sub).first();
      if(link){
        const pp=await who(env,link.ref_id),st=pp&&pp.student.id===link.student_id?pp.student:null;
        if(!st)return J({error:"لم يعد هذا الطالب موجوداً."},404);
        return J({ok:true,code:String(st.studentCode)});
      }
      if(!b.google.code)return J({need:"code"});
      const p=await who(env,b.google.code);
      if(!p)return J({error:"معرّف غير صالح"},401);
      const had=await Q(env,"SELECT 1 x FROM "+T+" WHERE type='glink' AND student_id=?",p.student.id).first();
      if(had)return J({error:"هذا المعرّف مرتبط بحساب Google آخر. اطلب من الأستاذ إعادة التعيين."},403);
      await Q(env,"INSERT INTO "+T+"(k,id,type,student_id,student_name,class_id,ref_id,data,created) VALUES(?,?,'glink',?,?,?,?,?,?)","g:"+g.sub,"g:"+g.sub,p.student.id,p.student.name||"",p.student.classId||"",String(p.student.studentCode),JSON.stringify({email:g.email}),new Date().toISOString()).run();
      return J({ok:true,code:String(p.student.studentCode),linked:true});
    }
    return J({error:"طلب غير صالح"},400);
  }catch(e){console.error(e);return J({error:"حدث خطأ غير متوقع"},500)}
}
