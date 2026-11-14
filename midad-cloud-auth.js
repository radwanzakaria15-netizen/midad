/* Midad account API client. Supabase remains the identity provider; privileged roles are assigned only by Pages Functions. */
(()=>{'use strict';
const API='/api';
async function request(path,{method='GET',body}={}){
 const {data,error}=await window.midadSupabase.auth.getSession();
 if(error)throw error;
 const token=data?.session?.access_token;
 const headers={'Content-Type':'application/json'};
 if(token)headers.Authorization='Bearer '+token;
 const res=await fetch(API+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const result=await res.json().catch(()=>({error:'استجابة غير صالحة من الخادم.'}));
 if(!res.ok)throw new Error(result.error||'تعذر تنفيذ الطلب.');
 return result;
}
window.MidadCloudAuth={
 account:()=>request('/account'),
 saveProfile:data=>request('/account',{method:'POST',body:data}),
 updateProfile:data=>request('/account',{method:'PATCH',body:data}),
 createTeacherInvite:subject=>request('/invites',{method:'POST',body:{subject}}),
 validateTeacherInvite:data=>request('/invites/validate',{method:'POST',body:data}),
 redeemTeacherInvite:data=>request('/invites/redeem',{method:'POST',body:data}),
 resources:()=>request('/resources'),
 submitResource:data=>request('/resources',{method:'POST',body:data}),
 reviewResource:(id,status)=>request('/resources',{method:'PATCH',body:{id,status}}),
 rate:(rating,comment='')=>request('/ratings',{method:'PUT',body:{rating,comment}}),
 ratingSummary:()=>request('/ratings')
};
})();