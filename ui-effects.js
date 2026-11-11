(function(){
  const style=document.createElement("style");
  style.textContent=`
    @keyframes midadPageEnter{
      from{opacity:0;transform:translateY(9px)}
      to{opacity:1;transform:translateY(0)}
    }
    #main>*,main>.experience-input,main>.experience-modes,main>.experience-saved{
      animation:midadPageEnter .32s cubic-bezier(.2,.75,.25,1) both;
    }
    .nav button,.mobile-nav button,.btn,.quick,.item-card,.icon-btn,.tool,.experience-mode,.quiz-option,.match-card{
      transition:background-color .22s ease,color .22s ease,border-color .22s ease,box-shadow .22s ease,transform .22s cubic-bezier(.2,.75,.25,1)!important;
    }
    .nav button:hover,.btn:hover,.quick:hover,.item-card:hover,.icon-btn:hover,.tool:hover,.experience-mode:hover{
      transform:translateY(-2px)!important;
    }
    .btn:active,.nav button:active,.mobile-nav button:active,.experience-mode:active{
      transform:translateY(1px)!important;
    }
    main,#main,.page-enter{filter:none!important}
    .midad-task-indicator{
      position:fixed;z-index:95;bottom:22px;left:18px;max-width:min(360px,calc(100vw - 36px));
      display:none;align-items:center;gap:11px;padding:12px 16px;border-radius:15px;
      background:#563829;color:#fff8ef;box-shadow:0 9px 28px #24160f35;font:700 13px Tajawal,Arial,sans-serif;
    }
    .midad-task-indicator.visible{display:flex}
    .midad-task-dot{width:9px;height:9px;border-radius:50%;background:#d9b99e;flex:none}
    .midad-task-indicator.done .midad-task-dot{background:#9ec5a3}
    .midad-task-text{line-height:1.5}
    @media(max-width:760px){.midad-task-indicator{bottom:calc(76px + env(safe-area-inset-bottom));left:12px}}
    @media(prefers-reduced-motion:reduce){
      #main>*,main>.experience-input,main>.experience-modes,main>.experience-saved{animation:none!important}
      .nav button,.mobile-nav button,.btn,.quick,.item-card,.icon-btn,.tool,.experience-mode,.quiz-option,.match-card{transition:none!important}
    }
  `;
  document.head.appendChild(style);
  let audio=null,lastSound=0,enabled=localStorage.getItem("midad_ui_sound")!=="off";
  const jobs=new Map();let hideTimer=null;
  function taskNode(){
    let n=document.getElementById("midadTaskIndicator");
    if(!n){n=document.createElement("div");n.id="midadTaskIndicator";n.className="midad-task-indicator";n.innerHTML='<span class="midad-task-dot"></span><span class="midad-task-text"></span>';document.body.appendChild(n)}
    return n;
  }
  function updateTasks(message,done){
    const n=taskNode(),active=[...jobs.values()].filter(x=>!x.done);
    const label=active.length?(active.length===1?active[0].label:"هناك "+active.length+" مهام تعمل في الخلفية"):message;
    n.querySelector(".midad-task-text").textContent=label||"اكتملت المهمة";
    n.classList.toggle("done",!active.length&&!!done);n.classList.toggle("visible",!!active.length||!!message);
    if(hideTimer)clearTimeout(hideTimer);
    if(!active.length&&message)hideTimer=setTimeout(()=>n.classList.remove("visible"),5200);
  }
  window.midadTaskStart=function(id,label){jobs.set(id,{label:label||"جارٍ تنفيذ المهمة في الخلفية",done:false});updateTasks()};
  window.midadTaskFinish=function(id,success,message){
    const j=jobs.get(id);if(j){j.done=true;j.success=!!success}
    const active=[...jobs.values()].filter(x=>!x.done);
    if(active.length){updateTasks();return}
    jobs.clear();updateTasks(message||(success?"اكتملت المهمة وحُفظت نتيجتها":"تعذّر إكمال المهمة"),true);
  };
  function play(){
    if(!enabled)return;
    const now=Date.now();if(now-lastSound<75)return;lastSound=now;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      audio=audio||new Ctx();if(audio.state==="suspended")audio.resume();
      const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
      osc.type="sine";osc.frequency.setValueAtTime(420,t);osc.frequency.exponentialRampToValueAtTime(330,t+.055);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.014,t+.009);
      gain.gain.exponentialRampToValueAtTime(.0001,t+.065);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.075);
    }catch(_){}
  }
  function paintToggle(){
    const b=document.getElementById("soundToggle");if(!b)return;
    b.textContent=enabled?"♫":"♪";b.classList.toggle("is-muted",!enabled);
    b.title=enabled?"إيقاف أصوات الواجهة":"تشغيل أصوات الواجهة";
  }
  document.addEventListener("click",e=>{
    const toggle=e.target.closest("#soundToggle");
    if(toggle){enabled=!enabled;localStorage.setItem("midad_ui_sound",enabled?"on":"off");paintToggle();if(enabled)play();return}
    if(e.target.closest("button,.quick,.experience-mode"))play();
  },true);
  paintToggle();
})();