/* Midad cloud workspace sync through Cloudflare Pages Functions + D1.
   Teacher identity is verified server-side using the current Supabase session.
   Student lookup is served by the separate public /api/student endpoint. */
(() => {
  let activeUser=null,saveTimer=null,lastSaved='',loading=false;
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const mergeWorkspace=(remote,local)=>{
    const merged={...local,...remote};
    if(local?.teacher&&local.teacher!=='الأستاذ')merged.teacher=local.teacher;
    if(local?.school)merged.school=local.school;
    if(local?.year&&local.year!=='2026 / 2027')merged.year=local.year;
    const keys=['classes','students','lessons','activities','assessments','attendance','resources','grades','experiences','schedule','classNotes'];
    for(const key of keys){const a=Array.isArray(remote?.[key])?remote[key]:[],b=Array.isArray(local?.[key])?local[key]:[],map=new Map();a.forEach((v,i)=>map.set(v?.id||'remote-'+key+'-'+i,v));b.forEach((v,i)=>map.set(v?.id||'local-'+key+'-'+i,v));merged[key]=Array.from(map.values())}
    return merged;
  };
  async function token(){
    if(!window.midadSupabase?.auth)throw new Error('جلسة الأستاذ غير متاحة. سجّل الدخول مجدداً.');
    const {data,error}=await window.midadSupabase.auth.getSession();if(error)throw error;
    const value=data?.session?.access_token;if(!value)throw new Error('انتهت جلسة الدخول. سجّل الدخول مجدداً.');return value;
  }
  async function api(path,options={}){
    const access=await token();
    const response=await fetch(path,{...options,headers:{'Content-Type':'application/json','Authorization':'Bearer '+access,...(options.headers||{})}});
    const body=await response.json().catch(()=>({error:'استجابة غير مفهومة من الخادم.'}));
    if(!response.ok){const error=new Error(body.error||'تعذر الاتصال بالخادم السحابي.');error.status=response.status;throw error}return body;
  }
  async function writeCloud(workspace){
    const serialized=JSON.stringify(workspace);if(serialized.length>850000)throw new Error('حجم بيانات مساحة العمل كبير. الملفات المرفقة تحتاج إلى تخزين ملفات مخصص.');
    await api('/api/workspace',{method:'PUT',body:JSON.stringify({workspace})});lastSaved=serialized;
  }
  window.midadCloudLoadWorkspace=async(user,localWorkspace)=>{
    activeUser=user;loading=true;
    try{
      let remote;try{remote=await api('/api/workspace')}catch(error){if(error.status!==404)throw error}
      let result;
      if(!remote?.workspace){result=clone(localWorkspace);await writeCloud(result);if(typeof window.toast==='function')window.toast('تم إنشاء مساحة عملك على Cloudflare.')}
      else{result=mergeWorkspace(remote.workspace,localWorkspace);const before=JSON.stringify(remote.workspace||''),after=JSON.stringify(result);if(before!==after)await writeCloud(result);else lastSaved=after;if(typeof window.toast==='function')window.toast('تم تحميل بياناتك ومزامنتها سحابياً.')}
      return result;
    }finally{loading=false}
  };
  window.midadCloudQueueSave=workspace=>{
    if(!activeUser||loading)return;const snapshot=clone(workspace),serialized=JSON.stringify(snapshot);if(serialized===lastSaved)return;
    clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await writeCloud(snapshot);if(typeof window.toast==='function')window.toast('تم حفظ التغييرات في Cloudflare.')}catch(error){console.error('Midad Cloudflare sync:',error);if(typeof window.toast==='function')window.toast(error.message||'تعذرت المزامنة؛ النسخة المحلية لم تُحذف.')}},1200);
  };
  window.midadCloudStop=()=>{clearTimeout(saveTimer);activeUser=null;lastSaved=''};
})();