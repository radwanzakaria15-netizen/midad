(function(){
  const style=document.createElement("style");
  style.textContent=`
    .tap-feedback{will-change:transform}
    .nav .ni svg,.mobile-nav svg{transition:transform .18s ease}
    .mobile-nav button.active span{color:var(--deep)}
    .mobile-nav button.active svg{filter:drop-shadow(0 2px 2px #56382924)}
    .sound-toggle.is-muted{opacity:.55}
  `;
  document.head.appendChild(style);
  let audio=null,lastSound=0,enabled=localStorage.getItem("midad_ui_sound")!=="off";
  function play(){
    if(!enabled)return;
    const now=Date.now();if(now-lastSound<65)return;lastSound=now;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      audio=audio||new Ctx();if(audio.state==="suspended")audio.resume();
      const t=audio.currentTime;
      [[660,0,.045],[880,.055,.055]].forEach(([hz,delay,duration])=>{
        const osc=audio.createOscillator(),gain=audio.createGain();
        osc.type="sine";osc.frequency.setValueAtTime(hz,t+delay);
        gain.gain.setValueAtTime(.0001,t+delay);
        gain.gain.exponentialRampToValueAtTime(.035,t+delay+.008);
        gain.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);
        osc.connect(gain);gain.connect(audio.destination);
        osc.start(t+delay);osc.stop(t+delay+duration+.01);
      });
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
    const b=e.target.closest("button,.quick,.experience-mode,.item-card");
    if(!b)return;
    b.classList.remove("tap-feedback");void b.offsetWidth;b.classList.add("tap-feedback");
    play();
  },true);
  const main=document.getElementById("main");
  if(main){
    const observer=new MutationObserver(()=>{
      main.classList.remove("page-enter");void main.offsetWidth;main.classList.add("page-enter");
    });
    observer.observe(main,{childList:true,subtree:false});
  }
  paintToggle();
})();