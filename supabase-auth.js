/* Midad teacher authentication — Supabase JS v2 */
(() => {
  const SUPABASE_URL = 'https://titltzjtsxmlqadpmezr.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2084oivvToJNqZvQwHTBiA_YXR3ouo7';
  const authStorage = {
    getItem(key){return (localStorage.getItem('midad_auth_remember')==='false'?sessionStorage.getItem(key):localStorage.getItem(key)) || sessionStorage.getItem(key) || localStorage.getItem(key);},
    setItem(key,value){if(localStorage.getItem('midad_auth_remember')==='false'){sessionStorage.setItem(key,value);localStorage.removeItem(key);}else{localStorage.setItem(key,value);sessionStorage.removeItem(key);}},
    removeItem(key){localStorage.removeItem(key);sessionStorage.removeItem(key);}
  };
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{storage:authStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let mode = 'login';
  let busy = false;
  let currentUser = null;
  let pendingConfirmationEmail = '';

  const css = document.createElement('style');
  css.textContent = `
    .app,.mobile-nav{display:none!important}
    body.midad-authenticated .app{display:block!important}
    body.midad-authenticated .mobile-nav{display:flex!important}
    body.student-mode .mobile-nav{display:none!important}
    .mobile-nav [hidden]{display:none!important}
    #midad-auth-gate{--auth-bg:#e4e7ec;--auth-text:#303640;--auth-muted:#77808d;--auth-green:#15803d;--auth-light:#fff;--auth-dark:#bfc4cc;min-height:100vh;min-height:100svh;display:grid;place-items:center;padding:24px max(18px,env(safe-area-inset-left)) max(24px,env(safe-area-inset-bottom));background:var(--auth-bg);color:var(--auth-text);font-family:Cairo,Tajawal,Arial,sans-serif;direction:rtl;position:relative;overflow:hidden;isolation:isolate}
    #midad-auth-gate *{box-sizing:border-box}
    #midad-auth-gate:before,#midad-auth-gate:after{content:'';position:absolute;z-index:-1;border-radius:50%;pointer-events:none;animation:midad-breathe 7s ease-in-out infinite alternate}
    #midad-auth-gate:before{width:min(74vw,520px);aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:16px 16px 34px #bfc4cc,-16px -16px 34px #fff;opacity:.62}
    #midad-auth-gate:after{width:min(58vw,400px);aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:inset 13px 13px 25px #bfc4cc,inset -13px -13px 25px #fff;opacity:.75;animation-delay:-3.5s}
    @keyframes midad-breathe{from{scale:1}to{scale:1.035}}
    .midad-auth-card{position:relative;z-index:1;width:min(400px,100%);padding:30px 28px 25px;border-radius:44px;background:var(--auth-bg);box-shadow:15px 15px 32px #bfc4cc,-15px -15px 32px #fff}
    .midad-auth-brand{text-align:center;margin-bottom:19px}
    .midad-auth-mark{width:58px;height:58px;border-radius:20px;margin:0 auto 9px;display:grid;place-items:center;color:var(--auth-green);box-shadow:7px 7px 14px #bfc4cc,-7px -7px 14px #fff}
    .midad-auth-mark svg{width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .midad-auth-brand h1{font-size:28px;line-height:1.3;font-weight:900;margin:0;letter-spacing:-.5px}
    .midad-auth-brand p{font-size:12px;color:var(--auth-muted);margin:4px 0 0}
    .midad-auth-tabs{height:51px;position:relative;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:5px;margin:20px 0 22px;border-radius:17px;box-shadow:inset 5px 5px 10px #bfc4cc,inset -5px -5px 10px #fff}
    .midad-auth-tabs:before{content:'';position:absolute;top:5px;bottom:5px;right:5px;width:calc(50% - 5px);border-radius:13px;background:var(--auth-bg);box-shadow:5px 5px 10px #bfc4cc,-5px -5px 10px #fff;transition:transform .32s cubic-bezier(.2,.8,.2,1)}
    .midad-auth-tabs.signup:before{transform:translateX(-100%)}
    .midad-auth-tabs button{position:relative;z-index:1;border:0;background:transparent;color:var(--auth-muted);font:800 13px Cairo,Tajawal,sans-serif;height:100%;cursor:pointer}
    .midad-auth-tabs button.active{color:var(--auth-green)}
    .midad-auth-field{display:block;margin:13px 0}
    .midad-auth-field>span{display:block;font-size:12px;font-weight:800;margin:0 2px 7px;color:var(--auth-text)}
    .midad-auth-input-wrap{height:49px;display:flex;align-items:center;gap:10px;padding:0 13px;border:2px solid transparent;border-radius:15px;background:var(--auth-bg);box-shadow:inset 5px 5px 10px #bfc4cc,inset -5px -5px 10px #fff;transition:border-color .2s,box-shadow .2s}
    .midad-auth-input-wrap:focus-within{border-color:var(--auth-green);box-shadow:0 0 0 3px #15803d20,inset 3px 3px 7px #bfc4cc,inset -3px -3px 7px #fff}
    .midad-auth-input-wrap>svg{width:19px;height:19px;flex:none;color:var(--auth-green);stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
    .midad-auth-input-wrap:focus-within>svg{transform:scale(1.12)}
    .midad-auth-input-wrap input{min-width:0;width:100%;height:100%;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;color:var(--auth-text);font:600 13px Cairo,Tajawal,sans-serif;direction:rtl}
    .midad-auth-input-wrap input[dir=ltr]{direction:ltr;text-align:left}
    .midad-auth-input-wrap input::placeholder{color:#929aa5;font-weight:500}
    .midad-auth-eye{width:31px;height:31px;flex:none;border:0;border-radius:10px;background:var(--auth-bg);color:var(--auth-muted);box-shadow:4px 4px 8px #bfc4cc,-4px -4px 8px #fff;display:grid;place-items:center;padding:0}
    .midad-auth-eye svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8}
    .midad-auth-error{display:none;color:var(--auth-green);font-size:11px;margin:5px 5px 0;line-height:1.6}
    .midad-auth-error.show{display:block}
    .midad-auth-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:11px 2px 3px}
    .midad-auth-remember{display:flex;align-items:center;gap:9px;color:var(--auth-muted);font-size:11px;font-weight:700;cursor:pointer}
    .midad-auth-remember input{position:absolute;opacity:0;pointer-events:none}
    .midad-auth-switch{width:39px;height:22px;border-radius:20px;background:var(--auth-bg);box-shadow:inset 3px 3px 6px #bfc4cc,inset -3px -3px 6px #fff;position:relative;transition:background .2s}
    .midad-auth-switch:after{content:'';position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:50%;background:var(--auth-bg);box-shadow:3px 3px 5px #bfc4cc,-3px -3px 5px #fff;transition:transform .22s,background .22s}
    .midad-auth-remember input:checked+.midad-auth-switch:after{transform:translateX(-17px);background:var(--auth-green)}
    .midad-auth-link{border:0;background:transparent;color:var(--auth-green);font:800 11px Cairo,Tajawal,sans-serif;text-decoration:none;padding:4px 0}
    .midad-auth-strength{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:8px 2px 0}
    .midad-auth-strength i{height:4px;border-radius:8px;background:#c9cdd3;transition:background .2s}
    .midad-auth-strength[data-level="1"] i:nth-child(-n+1),.midad-auth-strength[data-level="2"] i:nth-child(-n+2),.midad-auth-strength[data-level="3"] i:nth-child(-n+3),.midad-auth-strength[data-level="4"] i{background:var(--auth-green)}
    .midad-auth-submit{width:100%;min-height:49px;margin-top:17px;border:0;border-radius:15px;background:var(--auth-bg);color:var(--auth-green);box-shadow:7px 7px 14px #bfc4cc,-7px -7px 14px #fff;font:900 14px Cairo,Tajawal,sans-serif;transition:box-shadow .16s,transform .16s;display:flex;align-items:center;justify-content:center;gap:9px}
    .midad-auth-submit:active{box-shadow:inset 5px 5px 10px #bfc4cc,inset -5px -5px 10px #fff;transform:scale(.99)}
    .midad-auth-submit:disabled{opacity:.7;cursor:wait}
    .midad-auth-spinner{width:17px;height:17px;border:2px solid #15803d40;border-top-color:var(--auth-green);border-radius:50%;animation:midad-spin .7s linear infinite}
    @keyframes midad-spin{to{transform:rotate(360deg)}}
    .midad-auth-success{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;box-shadow:4px 4px 8px #bfc4cc,-4px -4px 8px #fff;animation:midad-pop .35s ease}
    .midad-auth-success svg{width:17px;height:17px;stroke:var(--auth-green);fill:none;stroke-width:2.5}
    @keyframes midad-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
    .midad-auth-divider{display:flex;align-items:center;gap:11px;margin:19px 0 13px;color:var(--auth-muted);font-size:10px;font-weight:700}
    .midad-auth-divider:before,.midad-auth-divider:after{content:'';height:1px;flex:1;background:#c9cdd3}
    .midad-auth-google{width:100%;height:46px;border:0;border-radius:14px;background:var(--auth-bg);color:var(--auth-text);box-shadow:6px 6px 12px #bfc4cc,-6px -6px 12px #fff;display:flex;align-items:center;justify-content:center;gap:10px;font:800 12px Cairo,Tajawal,sans-serif}
    .midad-auth-google:active{box-shadow:inset 4px 4px 8px #bfc4cc,inset -4px -4px 8px #fff}
    .midad-auth-google svg{width:18px;height:18px}
    .midad-auth-guest{width:100%;margin-top:11px;min-height:40px;border:0;border-radius:13px;background:transparent;color:var(--auth-muted);font:700 11px Cairo,Tajawal,sans-serif;cursor:pointer}
    body.midad-guest [onclick="midadCreateInvite()"],body.midad-guest [onclick="midadSignOut()"]{display:none!important}
    .midad-auth-msg{font-size:11px;line-height:1.8;margin-top:12px;padding:9px 11px;border-radius:11px;display:none;white-space:pre-wrap}
    .midad-auth-msg.show{display:block}
    .midad-auth-msg.error{background:#dce8df;color:#176338}
    .midad-auth-msg.ok{background:#dce8df;color:#176338}
    .midad-auth-note{font-size:10px;line-height:1.8;color:var(--auth-muted);text-align:center;margin:12px 0 0}
    .midad-auth-user{font-size:12px;color:var(--auth-muted);text-align:center;margin-top:12px;direction:ltr}
    .midad-auth-invite{direction:ltr;text-align:center;font-weight:900;letter-spacing:2px;font-size:23px;padding:13px;background:var(--auth-bg);box-shadow:inset 4px 4px 8px #bfc4cc,inset -4px -4px 8px #fff;border-radius:12px;margin:12px 0;user-select:all}
    @media(prefers-color-scheme:dark){#midad-auth-gate{--auth-bg:#25272c;--auth-text:#e5e7eb;--auth-muted:#a0a6b1;--auth-green:#4ade80;--auth-light:#363940;--auth-dark:#17191d}#midad-auth-gate:before{box-shadow:16px 16px 34px #17191d,-16px -16px 34px #363940}#midad-auth-gate:after{box-shadow:inset 13px 13px 25px #17191d,inset -13px -13px 25px #363940}.midad-auth-card{box-shadow:15px 15px 32px #17191d,-15px -15px 32px #363940}.midad-auth-tabs,.midad-auth-input-wrap{box-shadow:inset 5px 5px 10px #17191d,inset -5px -5px 10px #363940}.midad-auth-tabs:before,.midad-auth-eye,.midad-auth-submit,.midad-auth-google,.midad-auth-success{box-shadow:6px 6px 12px #17191d,-6px -6px 12px #363940}.midad-auth-switch{box-shadow:inset 3px 3px 6px #17191d,inset -3px -3px 6px #363940}.midad-auth-switch:after{box-shadow:3px 3px 5px #17191d,-3px -3px 5px #363940}.midad-auth-submit:active,.midad-auth-google:active{box-shadow:inset 5px 5px 10px #17191d,inset -5px -5px 10px #363940}.midad-auth-divider:before,.midad-auth-divider:after{background:#41454e}.midad-auth-strength i{background:#41454e}.midad-auth-msg.error,.midad-auth-msg.ok{background:#1d3b2a;color:#8ef0ad}}
    @media(max-width:480px){#midad-auth-gate{padding:18px 16px max(20px,env(safe-area-inset-bottom))}.midad-auth-card{padding:25px 21px 21px;border-radius:35px}.midad-auth-brand h1{font-size:26px}.midad-auth-tabs{margin:17px 0 19px}}
    @media(prefers-reduced-motion:reduce){#midad-auth-gate *,#midad-auth-gate:before,#midad-auth-gate:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
  `;
  document.head.appendChild(css);
  const gate = document.createElement('section');
  gate.id = 'midad-auth-gate';
  gate.innerHTML = `
    <div class="midad-auth-card">
      <div class="midad-auth-brand"><div class="midad-auth-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5c2.8-.9 5.4-.4 8 1.4v12c-2.6-1.8-5.2-2.3-8-1.4z"/><path d="M20 5.5c-2.8-.9-5.4-.4-8 1.4v12c2.6-1.8 5.2-2.3 8-1.4z"/></svg></div><h1>مِداد</h1><p>مساحة الأستاذ التعليمية</p></div>
      <div class="midad-auth-tabs" id="midad-auth-tabs"><button type="button" id="midad-login-tab" class="active" onclick="midadAuthMode('login')">دخول</button><button type="button" id="midad-signup-tab" onclick="midadAuthMode('signup')">حساب جديد</button></div>
      <form id="midad-auth-form" novalidate>
        <label class="midad-auth-field" id="midad-name-wrap" hidden><span>الاسم الكامل</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><input id="midad-auth-name" autocomplete="name" maxlength="90" placeholder="اكتب اسمك الكامل"></div><small class="midad-auth-error" id="midad-name-error"></small></label>
        <label class="midad-auth-field"><span>البريد الإلكتروني</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input id="midad-auth-email" type="email" autocomplete="email" required placeholder="name@example.com" dir="ltr"></div><small class="midad-auth-error" id="midad-email-error"></small></label>
        <label class="midad-auth-field"><span>كلمة المرور</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="midad-auth-password" type="password" autocomplete="current-password" required placeholder="••••••••" dir="ltr"><button type="button" class="midad-auth-eye" id="midad-auth-eye" aria-label="إظهار كلمة المرور"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div><small class="midad-auth-error" id="midad-password-error"></small><div class="midad-auth-strength" id="midad-auth-strength" data-level="0" hidden><i></i><i></i><i></i><i></i></div></label>
        <label class="midad-auth-field" id="midad-invite-wrap" hidden><span>رمز دعوة الأستاذ</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/></svg><input id="midad-auth-invite" autocomplete="off" maxlength="32" placeholder="اتركه فارغًا للحساب الأول" dir="ltr"></div></label>
        <div class="midad-auth-row" id="midad-auth-row"><label class="midad-auth-remember"><input type="checkbox" id="midad-remember" checked><span class="midad-auth-switch"></span>تذكّرني</label><button type="button" class="midad-auth-link" id="midad-forgot">نسيت كلمة المرور؟</button></div>
        <button class="midad-auth-submit" id="midad-auth-submit" type="submit">دخول إلى مِداد</button>
      </form>
      <div class="midad-auth-divider"><span>أو تابع عبر</span></div>
      <button type="button" class="midad-auth-google" id="midad-auth-google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4A90E2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"/></svg>المتابعة باستخدام Google</button>
      <button type="button" class="midad-auth-guest" onclick="midadGuestMode()">الدخول مؤقتًا دون حساب</button>
      <button type="button" class="midad-auth-guest" id="midad-auth-resend" hidden onclick="midadResendConfirmation()">إعادة إرسال رسالة التأكيد</button>
      <div class="midad-auth-msg" id="midad-auth-msg" role="status" aria-live="polite"></div>
      <p class="midad-auth-note" id="midad-auth-note">بإنشاء حسابك، ستتمكن من حفظ عملك ومتابعة أقسامك.</p>
    </div>`;
  document.body.insertBefore(gate, document.body.firstChild);

  function message(text, type='ok') {
    const el = document.getElementById('midad-auth-msg');
    el.textContent = text;
    el.className = 'midad-auth-msg show ' + type;
    const resend = document.getElementById('midad-auth-resend');
    if (resend) resend.hidden = !pendingConfirmationEmail;
  }
  function setBusy(value) {
    busy = value;
    const button = document.getElementById('midad-auth-submit');
    button.disabled = value;
    button.innerHTML = value ? '<span class="midad-auth-spinner"></span> جارٍ التنفيذ…' : (mode === 'login' ? 'دخول إلى مِداد' : 'إنشاء الحساب');
    document.getElementById('midad-auth-google').disabled = value;
  }
  function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);}
  function fieldError(id,text){const el=document.getElementById(id);el.textContent=text||'';el.classList.toggle('show',!!text);}
  function validateForm(){
    let ok=true;
    const email=document.getElementById('midad-auth-email').value.trim();
    const password=document.getElementById('midad-auth-password').value;
    fieldError('midad-email-error',validEmail(email)?'':'أدخل بريدًا إلكترونيًا صحيحًا.');
    fieldError('midad-password-error',password.length>=(mode==='login'?6:8)?'':'كلمة المرور يجب أن تتكون من '+(mode==='login'?6:8)+' أحرف على الأقل.');
    if(!validEmail(email)||password.length<(mode==='login'?6:8))ok=false;
    if(mode==='signup'){
      const name=document.getElementById('midad-auth-name').value.trim();
      fieldError('midad-name-error',name?'':'أدخل اسمك الكامل.');
      if(!name)ok=false;
    }
    return ok;
  }
  function strengthLevel(value){
    let score=0;if(value.length>=8)score++;if(/[A-Z]/.test(value)&&/[a-z]/.test(value))score++;if(/\d/.test(value))score++;if(/[^A-Za-z0-9]/.test(value))score++;return Math.min(4,score);
  }
  window.midadAuthMode = (next) => {
    mode = next === 'signup' ? 'signup' : 'login';
    document.getElementById('midad-login-tab').classList.toggle('active',mode==='login');
    document.getElementById('midad-signup-tab').classList.toggle('active',mode==='signup');
    document.getElementById('midad-auth-tabs').classList.toggle('signup',mode==='signup');
    document.getElementById('midad-name-wrap').hidden=mode!=='signup';
    document.getElementById('midad-invite-wrap').hidden=mode!=='signup';
    document.getElementById('midad-auth-password').autocomplete=mode==='login'?'current-password':'new-password';
    document.getElementById('midad-auth-strength').hidden=mode!=='signup';
    document.getElementById('midad-auth-row').hidden=mode==='signup';
    document.getElementById('midad-auth-note').textContent=mode==='signup'?'إنشاء حساب الأستاذ الجديد يتطلب رمز دعوة صالحًا بعد إنشاء الحساب الأول.':'بياناتك محفوظة بأمان في مساحة مِداد.';
    document.getElementById('midad-auth-msg').className='midad-auth-msg';
    ['midad-email-error','midad-password-error','midad-name-error'].forEach(id=>fieldError(id,''));
    pendingConfirmationEmail='';
    document.getElementById('midad-auth-resend').hidden=true;
    setBusy(false);
  };
  document.getElementById('midad-remember').checked=localStorage.getItem('midad_auth_remember')!=='false';
  document.getElementById('midad-remember').addEventListener('change',e=>{
    const key='sb-titltzjtsxmlqadpmezr-auth-token';
    const token=localStorage.getItem(key)||sessionStorage.getItem(key);
    localStorage.setItem('midad_auth_remember',e.target.checked?'true':'false');
    if(token){if(e.target.checked){localStorage.setItem(key,token);sessionStorage.removeItem(key);}else{sessionStorage.setItem(key,token);localStorage.removeItem(key);}}
  });
  document.getElementById('midad-auth-eye').addEventListener('click',()=>{
    const input=document.getElementById('midad-auth-password');const visible=input.type==='password';input.type=visible?'text':'password';
    document.getElementById('midad-auth-eye').setAttribute('aria-label',visible?'إخفاء كلمة المرور':'إظهار كلمة المرور');
  });
  document.getElementById('midad-auth-password').addEventListener('input',e=>{
    const meter=document.getElementById('midad-auth-strength');meter.dataset.level=String(strengthLevel(e.target.value));
  });
  ['midad-auth-email','midad-auth-password','midad-auth-name'].forEach(id=>document.getElementById(id).addEventListener('input',()=>fieldError(id.replace('midad-auth-','midad-')+'-error','')));
  window.midadGuestMode = () => {
    currentUser=null;
    if(window.midadUseGuestWorkspace)window.midadUseGuestWorkspace();
    gate.style.display='none';
    document.body.classList.add('midad-authenticated','midad-guest');
    if(typeof window.toast==='function')window.toast('وضع مؤقت: تُحفظ بياناتك على هذا الجهاز فقط.');
  };
  function showWorkspace(user){
    document.body.classList.remove('midad-guest');
    const changedUser=!currentUser||currentUser.id!==user.id;currentUser=user;
    if(changedUser&&typeof window.midadUseUserWorkspace==='function')window.midadUseUserWorkspace(user);
    gate.style.display='none';document.body.classList.add('midad-authenticated');
  }
  function showGate(){
    document.body.classList.remove('midad-guest');currentUser=null;document.body.classList.remove('midad-authenticated');
    gate.style.display='grid';window.midadAuthMode('login');
  }
  async function showSuccessThenWorkspace(user){
    const button=document.getElementById('midad-auth-submit');
    button.disabled=true;button.innerHTML='<span class="midad-auth-success"><svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg></span> تم بنجاح';
    await new Promise(resolve=>setTimeout(resolve,550));showWorkspace(user);
  }
  document.getElementById('midad-auth-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if(!validateForm())return;
    const email=document.getElementById('midad-auth-email').value.trim();
    const password=document.getElementById('midad-auth-password').value;
    setBusy(true);
    try{
      if(mode==='login'){
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;
        await showSuccessThenWorkspace(data.user);
      }else{
        const fullName=document.getElementById('midad-auth-name').value.trim();
        const inviteCode=document.getElementById('midad-auth-invite').value.trim().toUpperCase();
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:fullName,invite_code:inviteCode}}});
        if(error)throw error;
        if(data.session&&data.user){await showSuccessThenWorkspace(data.user);message('تم إنشاء الحساب وتسجيل الدخول بنجاح.');}
        else{pendingConfirmationEmail=email;message('تم إنشاء الحساب. افتح رسالة تأكيد البريد واضغط رابط التأكيد. يمكنك إعادة إرسال الرسالة من الزر أدناه.','ok');}
      }
    }catch(error){
      const raw=String(error.message||'');
      if(/email_address_not_authorized|not authorized/i.test(raw))message('خدمة البريد الافتراضية في Supabase لا ترسل إلى هذا العنوان. يلزم إعداد SMTP مخصص حتى تصل رسائل التأكيد.','error');
      else if(/over_email_send_rate_limit|email rate limit|too many requests/i.test(raw))message('تجاوز المشروع حد إرسال رسائل البريد مؤقتًا. انتظر قبل المحاولة مجددًا.','error');
      else if(/email not confirmed/i.test(raw)){pendingConfirmationEmail=email;message('حسابك موجود لكنه ينتظر تأكيد البريد. أعد إرسال رسالة التأكيد أدناه.','error');}
      else message(raw||'تعذّر إكمال العملية. تحقق من البيانات وحاول مجددًا.','error');
    }finally{setBusy(false);}
  });
  document.getElementById('midad-auth-google').addEventListener('click',async()=>{
    if(busy)return;setBusy(true);
    try{
      const redirectTo=window.location.origin+window.location.pathname;
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
      if(error)throw error;
    }catch(error){message(error.message||'تعذّر بدء تسجيل الدخول عبر Google.','error');setBusy(false);}
  });
  document.getElementById('midad-forgot').addEventListener('click',async()=>{
    const email=document.getElementById('midad-auth-email').value.trim();
    if(!validEmail(email)){fieldError('midad-email-error','أدخل بريدك الإلكتروني أولًا لاستعادة كلمة المرور.');return;}
    setBusy(true);
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});
      if(error)throw error;
      message('إذا كان البريد مرتبطًا بحساب، فستصلك رسالة تتضمن رابط إعادة تعيين كلمة المرور.','ok');
    }catch(error){message(error.message||'تعذّر إرسال رابط الاستعادة.','error');}
    finally{setBusy(false);}
  });
  window.midadResendConfirmation=async()=>{
    if(busy||!pendingConfirmationEmail)return;setBusy(true);
    try{const {error}=await client.auth.resend({type:'signup',email:pendingConfirmationEmail});if(error)throw error;message('طلبنا إعادة إرسال رسالة التأكيد. افحص الوارد والرسائل غير المرغوب فيها.','ok');}
    catch(error){const raw=String(error.message||'');if(/rate|too many|frequency/i.test(raw))message('وصلت إلى حد إعادة الإرسال مؤقتًا. انتظر قليلًا.','error');else if(/not authorized|email address/i.test(raw))message('Supabase لا يسمح بإرسال البريد إلى هذا العنوان عبر خادم البريد الافتراضي. يلزم إعداد SMTP مخصص.','error');else message(raw||'تعذرت إعادة إرسال رسالة التأكيد.','error');}
    finally{setBusy(false);}
  };
  window.midadCopyInvite=async()=>{
    const value=document.getElementById('midad-generated-invite')?.textContent||'';
    try{await navigator.clipboard.writeText(value);toast('تم نسخ الرمز');}catch(error){toast('يمكنك تحديد الرمز ونسخه يدويًا');}
  };
  window.midadCreateInvite=async()=>{
    if(!currentUser)return;
    try{
      const {data,error}=await client.rpc('create_midad_teacher_invite');if(error)throw error;
      openModal('دعوة أستاذ جديد','أرسل هذا الرمز إلى الأستاذ الذي تريد دعوته. الرمز صالح لمرة واحدة ولمدة 7 أيام.','<div class="midad-auth-invite" id="midad-generated-invite">'+String(data).replace(/[&<>"]/g,'')+'</div><div class="modal-actions"><button class="btn primary" onclick="navigator.clipboard?.writeText(document.getElementById(\'midad-generated-invite\').textContent).then(()=>toast(\'تم نسخ الرمز\')).catch(()=>toast(\'انسخ الرمز يدويًا\'))">نسخ الرمز</button><button class="btn light" onclick="closeModal()">إغلاق</button></div>');
    }catch(error){toast(error.message||'تعذر إنشاء رمز الدعوة');}
  };
  window.midadSignOut=async()=>{const {error}=await client.auth.signOut();if(error)toast(error.message);};
  window.midadSupabase=client;
  client.auth.onAuthStateChange((event,session)=>{
    if(session?.user)showWorkspace(session.user);
    else if(event==='SIGNED_OUT'){if(window.midadCloudStop)window.midadCloudStop();showGate();}
  });
  client.auth.getSession().then(({data,error})=>{
    if(error)message(error.message,'error');
    if(data.session?.user)showWorkspace(data.session.user);else showGate();
  });
})();