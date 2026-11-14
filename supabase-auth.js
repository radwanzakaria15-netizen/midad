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
  window.midadGetTeacherIdentity = () => currentUser?.id || ('guest-' + (document.getElementById('teacherName')?.textContent || 'teacher'));
  let pendingConfirmationEmail = '';
  let processingUserId = '';
  let manualAuthFlow = false;
  const usernameEmail = value => String(value||'').trim().toLowerCase()+'@midad.app';

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
    .midad-auth-input-wrap input:-webkit-autofill,.midad-auth-input-wrap input:-webkit-autofill:hover,.midad-auth-input-wrap input:-webkit-autofill:focus,.midad-auth-input-wrap input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 1000px #fbfdfb inset!important;box-shadow:0 0 0 1000px #fbfdfb inset!important;-webkit-text-fill-color:var(--auth-text)!important;caret-color:var(--auth-text);transition:background-color 99999s ease-out 0s}
    .midad-auth-input-wrap input:autofill{background:#fbfdfb!important;color:var(--auth-text)!important}
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

    /* Refined Midad identity: calm educational UI, less neumorphic */
    #midad-auth-gate{
      --auth-bg:#f4f6f2;--auth-text:#26352d;--auth-muted:#758078;--auth-green:#28734f;
      background:radial-gradient(ellipse at 12% 12%,#e7eee7 0,transparent 34%),radial-gradient(ellipse at 88% 88%,#e9efe8 0,transparent 34%),#f4f6f2;
    }
    #midad-auth-gate:before,#midad-auth-gate:after{display:none}
    .midad-auth-card{
      width:min(420px,100%);padding:32px 30px 26px;border:1px solid #e6ebe5;
      border-radius:28px;background:#fff;box-shadow:0 18px 55px rgba(39,65,48,.09);
    }
    .midad-auth-brand{margin-bottom:22px}
    .midad-auth-mark{
      width:62px;height:62px;border-radius:19px;margin-bottom:10px;background:#edf4ee;
      box-shadow:none;color:#28734f;
    }
    .midad-auth-brand h1{font-size:30px;color:#263c30;letter-spacing:0}
    .midad-auth-brand p{font-size:12px;color:#78857b}
    .midad-auth-tabs{
      height:48px;padding:4px;margin:20px 0 22px;border-radius:13px;
      background:#f1f4f0;box-shadow:none;
    }
    .midad-auth-tabs:before{
      top:4px;bottom:4px;right:4px;width:calc(50% - 4px);border-radius:10px;
      background:#fff;box-shadow:0 2px 7px rgba(38,65,47,.10);
    }
    .midad-auth-tabs button{font-size:13px;color:#77827a}
    .midad-auth-tabs button.active{color:#28734f}
    .midad-auth-field{margin:14px 0}
    .midad-auth-field>span{font-size:12px;margin-bottom:7px;color:#35443a}
    .midad-auth-input-wrap{
      height:51px;gap:11px;padding:0 14px;border:1px solid #e1e8e1;border-radius:12px;
      background:#fbfcfa;box-shadow:none;
    }
    .midad-auth-input-wrap:focus-within{
      border-color:#78a88a;box-shadow:0 0 0 3px rgba(40,115,79,.10);
    }
    .midad-auth-input-wrap>svg{color:#668873}
    .midad-auth-input-wrap:focus-within>svg{transform:none}
    .midad-auth-input-wrap input{font-size:13px;color:#26352d}
    .midad-auth-eye{background:#f1f5f1;box-shadow:none;border-radius:9px}
    .midad-auth-row{margin:12px 2px 4px}
    .midad-auth-switch{background:#e9eee9;box-shadow:none}
    .midad-auth-switch:after{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18)}
    .midad-auth-remember input:checked+.midad-auth-switch{background:#dcebe0}
    .midad-auth-remember input:checked+.midad-auth-switch:after{background:#28734f}
    .midad-auth-link{color:#28734f}
    .midad-auth-strength i{background:#e4eae4}
    .midad-auth-strength[data-level="1"] i:nth-child(-n+1),.midad-auth-strength[data-level="2"] i:nth-child(-n+2),.midad-auth-strength[data-level="3"] i:nth-child(-n+3),.midad-auth-strength[data-level="4"] i{background:#3d9565}
    .midad-auth-submit{
      min-height:51px;margin-top:19px;border-radius:12px;background:#28734f;color:#fff;
      box-shadow:0 5px 13px rgba(40,115,79,.18);font-size:14px;
    }
    .midad-auth-submit:active{background:#216342;box-shadow:inset 0 2px 5px rgba(0,0,0,.15);transform:translateY(1px)}
    .midad-auth-submit:disabled{background:#6e9b80;color:#fff}
    .midad-auth-spinner{border-color:rgba(255,255,255,.35);border-top-color:#fff}
    .midad-auth-success{background:rgba(255,255,255,.16);box-shadow:none}
    .midad-auth-success svg{stroke:#fff}
    .midad-auth-divider{margin:19px 0 13px;color:#8a948d}
    .midad-auth-divider:before,.midad-auth-divider:after{background:#e5eae5}
    .midad-auth-google{
      height:48px;border:1px solid #e1e7e1;border-radius:12px;background:#fff;color:#35443a;
      box-shadow:none;font-size:12px;
    }
    .midad-auth-google:active{background:#f6f9f6;box-shadow:inset 0 1px 3px rgba(0,0,0,.06)}
    .midad-auth-guest{color:#728077}
    .midad-auth-msg{border-radius:10px}
    .midad-auth-msg.error,.midad-auth-msg.ok{background:#edf5ef;color:#286342}
    .midad-auth-invite{background:#f5f8f5;box-shadow:none;border:1px dashed #cbd9cd}
    @media(prefers-color-scheme:dark){
      #midad-auth-gate{--auth-bg:#202923;--auth-text:#e5eee7;--auth-muted:#a7b5aa;--auth-green:#72bd8d;background:radial-gradient(ellipse at 12% 12%,#29392e 0,transparent 36%),#202923}
      .midad-auth-card{background:#28332b;border-color:#35443a;box-shadow:0 18px 55px rgba(0,0,0,.22)}
      .midad-auth-brand h1{color:#edf5ee}.midad-auth-brand p,.midad-auth-field>span{color:#c3d0c5}
      .midad-auth-mark{background:#33463a;color:#80c999}
      .midad-auth-tabs{background:#202923}
      .midad-auth-tabs:before{background:#35443a;box-shadow:0 2px 7px rgba(0,0,0,.18)}
      .midad-auth-tabs button{color:#a7b5aa}.midad-auth-tabs button.active{color:#9bddaf}
      .midad-auth-input-wrap{background:#222d25;border-color:#3b4a3f}
      .midad-auth-input-wrap:focus-within{border-color:#72bd8d;box-shadow:0 0 0 3px rgba(114,189,141,.12)}
      .midad-auth-input-wrap input{color:#edf5ee}
      .midad-auth-input-wrap input::placeholder{color:#87978a}
      .midad-auth-eye{background:#35443a;color:#c5d4c8}
      .midad-auth-submit{background:#39845a;color:#fff;box-shadow:0 5px 13px rgba(0,0,0,.18)}
      .midad-auth-submit:active{background:#2d704a}
      .midad-auth-google{background:#2d3930;border-color:#435347;color:#edf5ee;box-shadow:none}
      .midad-auth-google:active{background:#35443a}
      .midad-auth-divider:before,.midad-auth-divider:after{background:#3c4a40}
      .midad-auth-strength i{background:#3c4a40}
      .midad-auth-msg.error,.midad-auth-msg.ok{background:#263f30;color:#a6e2b7}
      .midad-auth-invite{background:#222d25;border-color:#4b6652}
      .midad-auth-switch{background:#202923}
      .midad-auth-switch:after{background:#cbd8cd}
      .midad-auth-remember input:checked+.midad-auth-switch{background:#344d3b}
    }
    @media(max-width:480px){
      .midad-auth-card{padding:27px 22px 22px;border-radius:23px}
      .midad-auth-brand h1{font-size:28px}
    }

    /* New split-screen sign-in experience */
    #midad-auth-gate{padding:28px;background:#edf2ed;min-height:100svh;overflow:auto}
    .midad-auth-layout{width:min(1050px,100%);min-height:min(690px,calc(100svh - 56px));display:grid;grid-template-columns:minmax(0,1fr) minmax(390px,460px);direction:rtl;border:1px solid #dfe8df;border-radius:30px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(34,67,45,.12)}
    .midad-auth-intro{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:48px 46px;background:linear-gradient(145deg,#244d38,#316b4b 65%,#477c59);color:#f5fbf5;overflow:hidden}
    .midad-auth-intro:before,.midad-auth-intro:after{content:"";position:absolute;border:1px solid rgba(255,255,255,.12);border-radius:50%;pointer-events:none}
    .midad-auth-intro:before{width:440px;height:440px;left:-190px;bottom:-170px;box-shadow:0 0 0 32px rgba(255,255,255,.035),0 0 0 70px rgba(255,255,255,.025)}
    .midad-auth-intro:after{width:210px;height:210px;right:-100px;top:-95px}
    .midad-auth-intro-brand,.midad-auth-intro-copy,.midad-auth-art{position:relative;z-index:1}
    .midad-auth-intro-brand{display:flex;align-items:center;gap:14px}
    .midad-auth-intro-mark{width:55px;height:55px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2)}
    .midad-auth-intro-mark svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .midad-auth-intro-brand strong{font-size:29px;font-weight:900;line-height:1.2}
    .midad-auth-intro-brand small{display:block;margin-top:4px;color:#d7e8da;font-size:12px}
    .midad-auth-intro-copy{max-width:470px;margin:55px 0 25px}
    .midad-auth-intro-copy .eyebrow{font-size:12px;font-weight:800;color:#c5e2cb;letter-spacing:.5px}
    .midad-auth-intro-copy h2{font-size:34px;line-height:1.5;margin:12px 0;color:#fff;font-weight:900}
    .midad-auth-intro-copy p{font-size:15px;line-height:2;color:#dcebe0;margin:0;max-width:410px}
    .midad-auth-art{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:410px}
    .midad-auth-art span{min-height:72px;padding:14px;border-radius:15px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;gap:10px;color:#f3faf4;font-size:12px;font-weight:800}
    .midad-auth-art svg{width:22px;height:22px;flex:none;stroke:#d2e9d7;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .midad-auth-card{width:auto;max-width:none;align-self:center;padding:46px 42px 38px;border:0;border-radius:0;background:#fff;box-shadow:none}
    .midad-auth-brand{display:none}
    .midad-auth-card:before{content:"مرحباً بعودتك";display:block;color:#263c30;font-size:26px;font-weight:900;margin-bottom:5px}
    .midad-auth-card:after{content:"سجّل الدخول لمتابعة مساحتك التعليمية";display:block;color:#7c8a7f;font-size:12px;margin-bottom:23px}
    .midad-auth-tabs{margin:0 0 22px;background:#f0f5f0;border:1px solid #e7eee7}
    .midad-auth-input-wrap{background:#fbfdfb;border-color:#e2eae2}
    .midad-auth-input-wrap:focus-within{border-color:#6eaa80;box-shadow:0 0 0 3px rgba(46,125,75,.11)}
    .midad-auth-submit{background:#2d7049;border-radius:13px;box-shadow:0 7px 16px rgba(45,112,73,.18)}
    .midad-auth-submit:hover{background:#245d3c}
    .midad-auth-google{border-radius:13px;background:#fff;border:1px solid #e0e8e0}
    .midad-auth-guest{margin-top:8px}
    @media(prefers-color-scheme:dark){
      #midad-auth-gate{background:#18231c}
      .midad-auth-layout{background:#26342a;border-color:#35483a;box-shadow:0 24px 70px rgba(0,0,0,.3)}
      .midad-auth-card{background:#26342a}
      .midad-auth-card:before{color:#eef6ef}.midad-auth-card:after{color:#aab9ad}
      .midad-auth-input-wrap{background:#202c23;border-color:#3a4b3e}
      .midad-auth-input-wrap input:-webkit-autofill,.midad-auth-input-wrap input:-webkit-autofill:hover,.midad-auth-input-wrap input:-webkit-autofill:focus,.midad-auth-input-wrap input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 1000px #202c23 inset!important;box-shadow:0 0 0 1000px #202c23 inset!important;-webkit-text-fill-color:#eef6ef!important;caret-color:#eef6ef}
      .midad-auth-google{background:#29382d;border-color:#405445;color:#eef6ef}
      .midad-auth-tabs{background:#202c23;border-color:#3a4b3e}
    }
    @media(max-width:760px){
      #midad-auth-gate{padding:12px;place-items:start center}
      .midad-auth-layout{width:min(480px,100%);min-height:0;grid-template-columns:1fr;border-radius:23px}
      .midad-auth-intro{padding:22px 22px 20px;min-height:195px}
      .midad-auth-intro-brand{gap:10px}
      .midad-auth-intro-mark{width:45px;height:45px;border-radius:14px}
      .midad-auth-intro-brand strong{font-size:24px}
      .midad-auth-intro-copy{margin:22px 0 0}
      .midad-auth-intro-copy h2{font-size:21px;margin:5px 0}
      .midad-auth-intro-copy p{font-size:11px;line-height:1.7}
      .midad-auth-art{display:none}
      .midad-auth-card{padding:26px 23px 24px}
      .midad-auth-card:before{font-size:23px}
    }
    @media(max-width:380px){.midad-auth-card{padding:23px 18px}.midad-auth-intro{padding:19px}}
  `;
  document.head.appendChild(css);
  const gate = document.createElement('section');
  gate.id = 'midad-auth-gate';
  gate.innerHTML = `
    <div class="midad-auth-layout">
      <aside class="midad-auth-intro">
        <div class="midad-auth-intro-brand"><div class="midad-auth-intro-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5c2.8-.9 5.4-.4 8 1.4v12c-2.6-1.8-5.2-2.3-8-1.4z"/><path d="M20 5.5c-2.8-.9-5.4-.4-8 1.4v12c2.6-1.8 5.2-2.3 8-1.4z"/></svg></div><div><strong>مِداد</strong><small>مساحة الأستاذ التعليمية</small></div></div>
        <div class="midad-auth-intro-copy"><span class="eyebrow">تعليم أكثر تنظيماً</span><h2>كل أدواتك التعليمية في مساحة واحدة.</h2><p>أنشئ دروسك، تابع تلاميذك، ونظّم عملك اليومي بسهولة ووضوح.</p></div>
        <div class="midad-auth-art"><span><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>إعداد الدروس</span><span><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 8h4m-2-2v4"/></svg>متابعة التلاميذ</span></div>
      </aside>
      <div class="midad-auth-card">
      <div class="midad-auth-tabs" id="midad-auth-tabs"><button type="button" id="midad-login-tab" class="active" onclick="midadAuthMode('login')">دخول</button><button type="button" id="midad-signup-tab" onclick="midadAuthMode('signup')">حساب جديد</button></div>
      <form id="midad-auth-form" novalidate>
        <label class="midad-auth-field" id="midad-name-wrap" hidden><span>الاسم الكامل</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><input id="midad-auth-name" autocomplete="name" maxlength="90" placeholder="اكتب اسمك الكامل"></div><small class="midad-auth-error" id="midad-name-error"></small></label>
        <label class="midad-auth-field"><span>اسم المستخدم</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><input id="midad-auth-email" type="text" autocomplete="username" required maxlength="20" placeholder="username_123" dir="ltr"></div><small class="midad-auth-error" id="midad-email-error"></small></label>
        <label class="midad-auth-field"><span>كلمة المرور</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="midad-auth-password" type="password" autocomplete="current-password" required placeholder="••••••••" dir="ltr"><button type="button" class="midad-auth-eye" id="midad-auth-eye" aria-label="إظهار كلمة المرور"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div><small class="midad-auth-error" id="midad-password-error"></small><div class="midad-auth-strength" id="midad-auth-strength" data-level="0" hidden><i></i><i></i><i></i><i></i></div></label>
        <label class="midad-auth-field" id="midad-invite-wrap" hidden><span>رمز دعوة الأستاذ</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/></svg><input id="midad-auth-invite" autocomplete="off" maxlength="32" placeholder="رمز الدعوة المكوّن من 8 أحرف" dir="ltr"></div></label>
        <label class="midad-auth-field" id="midad-recovery-wrap" hidden><span>بريد استعادة الحساب (اختياري)</span><div class="midad-auth-input-wrap"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input id="midad-auth-recovery" type="email" autocomplete="email" placeholder="name@example.com" dir="ltr"></div></label>
        <div class="midad-auth-row" id="midad-auth-row"><label class="midad-auth-remember"><input type="checkbox" id="midad-remember" checked><span class="midad-auth-switch"></span>تذكّرني</label><button type="button" class="midad-auth-link" id="midad-forgot">نسيت كلمة المرور؟</button></div>
        <button class="midad-auth-submit" id="midad-auth-submit" type="submit">دخول إلى مِداد</button>
      </form>
      <div class="midad-auth-divider"><span>أو تابع عبر</span></div>
      <button type="button" class="midad-auth-google" id="midad-auth-google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4A90E2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"/></svg>المتابعة باستخدام Google</button>
      <button type="button" class="midad-auth-guest" onclick="midadGuestMode()">الدخول مؤقتًا دون حساب</button>
      <button type="button" class="midad-auth-guest" id="midad-auth-resend" hidden onclick="midadResendConfirmation()">إعادة إرسال رسالة التأكيد</button>
      <div class="midad-auth-msg" id="midad-auth-msg" role="status" aria-live="polite"></div>
      <p class="midad-auth-note" id="midad-auth-note">بإنشاء حسابك، ستتمكن من حفظ عملك ومتابعة أقسامك.</p>
      </div>
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
  function validUsername(value){return /^[a-z0-9_]{4,20}$/.test(String(value||'').trim().toLowerCase());}
  function validEmail(email){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email);}
  function fieldError(id,text){const el=document.getElementById(id);el.textContent=text||'';el.classList.toggle('show',!!text);}
  function validateForm(){
    const username=document.getElementById('midad-auth-email').value.trim().toLowerCase();
    const password=document.getElementById('midad-auth-password').value;
    fieldError('midad-email-error',validUsername(username)?'':'اسم المستخدم يجب أن يكون إنجليزياً من 4 إلى 20 رمزاً (حروف وأرقام و _).');
    fieldError('midad-password-error',password.length>=(mode==='login'?6:8)?'':'كلمة المرور يجب أن تتكون من '+(mode==='login'?6:8)+' أحرف على الأقل.');
    let ok=validUsername(username)&&password.length>=(mode==='login'?6:8);
    if(mode==='signup'){
      const name=document.getElementById('midad-auth-name').value.trim();
      const invite=document.getElementById('midad-auth-invite').value.trim();
      fieldError('midad-name-error',name?'':'أدخل الاسم الكامل.');
      if(!name||!invite)ok=false;
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
    document.getElementById('midad-recovery-wrap').hidden=mode!=='signup';
    document.getElementById('midad-auth-password').autocomplete=mode==='login'?'current-password':'new-password';
    document.getElementById('midad-auth-strength').hidden=mode!=='signup';
    document.getElementById('midad-auth-row').hidden=mode==='signup';
    document.getElementById('midad-auth-note').textContent=mode==='signup'?'حساب الأستاذ يتطلب رمز دعوة صالحاً. أضف بريد الاستعادة إن رغبت.':'أدخل اسم المستخدم وكلمة المرور للدخول إلى مِداد.';
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
  async function showWorkspace(user){
    if(!user||processingUserId===user.id)return;processingUserId=user.id;
    try{user=await activateTeacher(user);document.body.classList.remove('midad-guest');const changedUser=!currentUser||currentUser.id!==user.id;currentUser=user;if(changedUser&&typeof window.midadUseUserWorkspace==='function')window.midadUseUserWorkspace(user);gate.style.display='none';document.body.classList.add('midad-authenticated');}
    catch(error){message(error.message||'تعذر التحقق من حساب الأستاذ.','error');gate.style.display='grid';document.body.classList.remove('midad-authenticated');}
    finally{processingUserId='';}
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
  async function ensureTeacherProfile(user,extra={}){
    if(!window.MidadCloudAuth)throw new Error('تعذر تحميل خدمة الحسابات. حدّث الصفحة وحاول مجدداً.');
    const result=await window.MidadCloudAuth.account();
    if(result.user){if(!['teacher','admin'].includes(result.user.role))throw new Error('هذا الحساب ليس حساب أستاذ.');return result.user;}
    const meta=user.user_metadata||{};
    const name=String(extra.name||meta.full_name||meta.name||'').trim();
    const username=String(extra.username||meta.username||user.email?.split('@')[0]||'').trim().toLowerCase();
    const invite=String(extra.invite||meta.invite_code||'').trim().toUpperCase();
    if(!name||!validUsername(username)||!invite){
      return await new Promise((resolve,reject)=>{
        window.midadGoogleSetupResolve={resolve,reject,user};
        openModal('إكمال حساب الأستاذ','أدخل بياناتك ورمز الدعوة لتفعيل حساب الأستاذ.',`
          <form onsubmit="window.midadCompleteGoogleSetup(event)" novalidate>
            <label class="form-field"><span>الاسم الكامل</span><input name="name" required maxlength="100"></label>
            <label class="form-field"><span>اسم المستخدم بالإنجليزية</span><input name="username" required minlength="4" maxlength="20" pattern="[a-z0-9_]+" dir="ltr"></label>
            <label class="form-field"><span>رمز دعوة الأستاذ</span><input name="invite" required minlength="8" maxlength="8" dir="ltr"></label>
            <label class="form-field"><span>بريد استعادة الحساب (اختياري)</span><input name="recoveryEmail" type="email" dir="ltr"></label>
            <div class="modal-actions"><button class="btn primary" type="submit">تفعيل الحساب</button></div>
          </form>`);
      });
    }
    const reservation=await window.MidadCloudAuth.validateTeacherInvite({code:invite,username});
      const created=await window.MidadCloudAuth.redeemTeacherInvite({code:invite,name,username,reservationToken:reservation.reservationToken});
    const recovery=String(extra.recoveryEmail||meta.recovery_email||'').trim();
    if(recovery){
      try{await window.MidadCloudAuth.updateProfile({name,username,recoveryEmail:recovery});}
      catch(error){toast('تم تفعيل الحساب، لكن تعذر حفظ بريد الاستعادة. يمكنك إضافته لاحقاً.');}
    }
    return created.user;
  }
  window.midadCompleteGoogleSetup=async function(event){
    event.preventDefault();const pending=window.midadGoogleSetupResolve;if(!pending)return;
    const values=Object.fromEntries(new FormData(event.target).entries());
    const name=String(values.name||'').trim(),username=String(values.username||'').trim().toLowerCase(),invite=String(values.invite||'').trim().toUpperCase();
    if(!name||!validUsername(username)||!/^[A-HJ-NP-Z2-9]{8}$/.test(invite)){toast('تحقق من الاسم واسم المستخدم ورمز الدعوة.');return}
    const submit=event.target.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent='جارٍ التفعيل…'}
    try{
      const reservation=await window.MidadCloudAuth.validateTeacherInvite({code:invite,username});
      const created=await window.MidadCloudAuth.redeemTeacherInvite({code:invite,name,username,reservationToken:reservation.reservationToken});
      if(String(values.recoveryEmail||'').trim()){
        try{await window.MidadCloudAuth.updateProfile({name,username,recoveryEmail:String(values.recoveryEmail).trim()});}
        catch(error){toast('تم تفعيل الحساب، لكن تعذر حفظ بريد الاستعادة. يمكنك إضافته لاحقاً.');}
      }
      window.midadGoogleSetupResolve=null;closeModal();pending.resolve(created.user);
    }catch(error){if(submit){submit.disabled=false;submit.textContent='تفعيل الحساب'}toast(error.message||'تعذر تفعيل الحساب.')}
  };
  async function activateTeacher(user){user.midadProfile=await ensureTeacherProfile(user);return user;}
  document.getElementById('midad-auth-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!validateForm())return;
    const username=document.getElementById('midad-auth-email').value.trim().toLowerCase();
    const email=usernameEmail(username),password=document.getElementById('midad-auth-password').value;
    setBusy(true);manualAuthFlow=true;
    try{
      if(mode==='login'){
        const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
        await showSuccessThenWorkspace(await activateTeacher(data.user));
      }else{
        const fullName=document.getElementById('midad-auth-name').value.trim();
        const inviteCode=document.getElementById('midad-auth-invite').value.trim().toUpperCase();
        let reservationToken='';
        const recoveryEmail=document.getElementById('midad-auth-recovery').value.trim();
        if(recoveryEmail&&!validEmail(recoveryEmail)){message('بريد الاستعادة غير صالح.','error');return}
        // Validate the invitation and username before creating a Supabase identity.
        const reservation=await window.MidadCloudAuth.validateTeacherInvite({code:inviteCode,username});reservationToken=reservation.reservationToken;
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:fullName,username,invite_code:inviteCode,invite_reservation:reservationToken,recovery_email:recoveryEmail}}});
        if(error){await window.MidadCloudAuth.releaseTeacherInvite({code:inviteCode,username,reservationToken}).catch(()=>{});throw error;}
        if(data.session&&data.user){
          const created=await window.MidadCloudAuth.redeemTeacherInvite({code:inviteCode,name:fullName,username,reservationToken});
          if(recoveryEmail){
            try{await window.MidadCloudAuth.updateProfile({name:fullName,username,recoveryEmail});}
            catch(error){toast('تم تفعيل الحساب، لكن تعذر حفظ بريد الاستعادة. يمكنك إضافته لاحقاً.');}
          }
          data.user.midadProfile=created.user;await showSuccessThenWorkspace(data.user);
          message('تم إنشاء حساب الأستاذ وتفعيله بنجاح.');
        }else{
          await window.MidadCloudAuth.releaseTeacherInvite({code:inviteCode,username,reservationToken}).catch(()=>{});
          message('تم إنشاء حساب المصادقة لكن لم تبدأ جلسة دخول. لأن اسم المستخدم مرتبط ببريد افتراضي لا يستقبل الرسائل، يجب تعطيل تأكيد البريد الإلكتروني في إعدادات Supabase قبل التسجيل. لم يُفعّل حساب الأستاذ بعد.','error');
        }
      }
    }catch(error){
      const raw=String(error.message||'');
      if(/already registered|user already registered/i.test(raw))message('اسم المستخدم مسجل بالفعل. جرّب تسجيل الدخول.','error');
      else if(/invalid login credentials/i.test(raw))message('اسم المستخدم أو كلمة المرور غير صحيحة.','error');
      else message(raw||'تعذّر إكمال العملية. تحقق من البيانات ورمز الدعوة.','error');
    }finally{setBusy(false);manualAuthFlow=false;}
  });
  document.getElementById('midad-auth-google').addEventListener('click',async()=>{
    if(busy)return;setBusy(true);
    try{
      const redirectTo=window.location.origin+window.location.pathname;
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
      if(error)throw error;
    }catch(error){message(error.message||'تعذّر بدء تسجيل الدخول عبر Google.','error');setBusy(false);}
  });
  document.getElementById('midad-forgot').addEventListener('click',()=>{
    message('بريد الاستعادة اختياري للأستاذ ويُحفظ في ملفه. إرسال رابط إعادة التعيين إليه يحتاج إعداد خدمة استعادة آمنة على الخادم؛ هذه الخدمة لم تُفعّل بعد.','error');
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
  window.midadCreateInvite=()=>{
    openModal('دعوة أستاذ جديد','حدد تخصص الأستاذ الذي تريد دعوته. الرمز صالح لمرة واحدة ولمدة 48 ساعة.','<form onsubmit="window.midadSubmitInvite(event)"><label class="form-field"><span>التخصص</span><input name="subject" required maxlength="100" placeholder="مثال: اللغة العربية"></label><div class="modal-actions"><button class="btn primary" type="submit">إنشاء الرمز</button><button class="btn light" type="button" onclick="closeModal()">إلغاء</button></div></form>');
  };
  window.midadSubmitInvite=async event=>{
    event.preventDefault();const form=event.target,subject=String(new FormData(form).get('subject')||'').trim();if(!subject)return;
    const button=form.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='جارٍ الإنشاء…'}
    try{const result=await window.MidadCloudAuth.createTeacherInvite(subject);openModal('رمز دعوة الأستاذ','أرسل الرمز التالي. صالح لمرة واحدة ولمدة 48 ساعة.','<div class="midad-auth-invite" id="midad-generated-invite">'+String(result.code).replace(/[&<>"]/g,'')+'</div><div class="modal-actions"><button class="btn primary" onclick="navigator.clipboard?.writeText(document.getElementById(\'midad-generated-invite\').textContent).then(()=>toast(\'تم نسخ الرمز\')).catch(()=>toast(\'انسخ الرمز يدوياً\'))">نسخ الرمز</button><button class="btn light" onclick="closeModal()">إغلاق</button></div>');}
    catch(error){if(button){button.disabled=false;button.textContent='إنشاء الرمز'}toast(error.message||'تعذر إنشاء رمز الدعوة.')}
  };
  window.midadSignOut=async()=>{const {error}=await client.auth.signOut();if(error)toast(error.message);};
  window.midadSupabase=client;
  client.auth.onAuthStateChange((event,session)=>{
    if(session?.user&&!manualAuthFlow)showWorkspace(session.user);
    else if(event==='SIGNED_OUT'){if(window.midadCloudStop)window.midadCloudStop();showGate();}
  });
  client.auth.getSession().then(({data,error})=>{
    if(error)message(error.message,'error');
    if(data.session?.user)showWorkspace(data.session.user);else showGate();
  });
})();