/* مِداد — حركات وانتقالات وأيقونات الواجهة الجديدة (لا يغيّر أي منطق في المنصة) */
(function(){
"use strict";
const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const main=document.getElementById("main");
if(!main)return;
document.body.classList.add("md-ready");

/* ===== أيقونات تحلّ محل الرموز النصية القديمة ===== */
const S=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const ICONS={
 "◇":S('<path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/>'),
 "✦":S('<path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z"/>'),
 "▧":S('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1M9 12l2 2 4-4M9 17h6"/>'),
 "▣":S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
 "▤":S('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6M9 17h6"/>'),
 "▦":S('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
 "♙":S('<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1.5a6 6 0 0 1 12 0V20"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a4 4 0 0 1 3 4v2"/>'),
 "✓":S('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/>'),
 "✎":S('<path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/>'),
 "⌕":S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>'),
 "↑":S('<path d="M12 19V5m0 0-5 5m5-5 5 5"/>'),
 "♧":S('<path d="M18 16H6c1.7-2 2-3.5 2-7a4 4 0 0 1 8 0c0 3.5.3 5 2 7z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>'),
 "◷":S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
};
const SEL=".item-symbol,.mini-icon,.stat-icon,.qico,.student-task-icon,.student-notice-icon,.nav .ni,.mobile-nav button>span";
function iconify(root){
 (root||document).querySelectorAll(SEL).forEach(el=>{
  if(el.querySelector("svg"))return;
  const t=el.textContent.trim();
  if(ICONS[t])el.innerHTML=ICONS[t];
 });
}

/* ===== أرقام تعدّ تصاعدياً ===== */
const toLatin=s=>String(s).replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d));
function countUp(root){
 if(reduce)return;
 root.querySelectorAll(".stat strong").forEach(el=>{
  const orig=el.textContent,n=parseInt(toLatin(orig).replace(/\D/g,""),10);
  if(!/^[\d٠-٩\s,.،٬]+$/.test(orig.trim())||isNaN(n)||n<2||n>100000)return;
  const t0=performance.now(),dur=Math.min(900,350+n*12);
  const step=now=>{
   const p=Math.min(1,(now-t0)/dur),v=Math.round(n*(1-Math.pow(1-p,3)));
   el.textContent=p<1?v.toLocaleString("ar-DZ"):orig;
   if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
 });
}

/* ===== انتقال بين الصفحات: يُشغَّل فقط عند تغيّر الصفحة لا عند كل تحديث ===== */
let sig="",timer=0;
function signature(){
 const h=main.querySelector(".page-head h1,.student-login-card");
 return(document.body.classList.contains("student-mode")?"s":"t")+"|"+(h?(h.textContent||"").slice(0,40):"")+"|"+(main.querySelector(".student-home-grid")?"home":"");
}
const ENTER=".page-head,.hero,.card,.item-card,.stat,.quick,.student-home-tile,.list-row,.empty,.table-wrap,.student-task-card,.student-notice,.student-grade-card,.toolbar,article";
function enter(){
 if(reduce)return;
 clearTimeout(timer);
 let i=0;
 main.querySelectorAll(ENTER).forEach(el=>{el.style.setProperty("--i",Math.min(i++,14))});
 main.classList.remove("md-enter");void main.offsetWidth;main.classList.add("md-enter");
 countUp(main);
 timer=setTimeout(()=>main.classList.remove("md-enter"),1500);
}
let raf=0;
new MutationObserver(()=>{
 cancelAnimationFrame(raf);
 raf=requestAnimationFrame(()=>{
  iconify(main);
  const s=signature();
  if(s!==sig&&main.children.length){sig=s;enter()}
 });
}).observe(main,{childList:true,subtree:true});
/* الأيقونات خارج #main: القائمة الجانبية وشريط الهاتف */
iconify(document);
new MutationObserver(()=>iconify(document.querySelector(".sidebar")||document)).observe(document.body,{childList:true});
setTimeout(()=>iconify(document),600);

/* ===== نوافذ منبثقة: أيقونات داخلها ===== */
const mb=document.getElementById("modalBackdrop");
if(mb)new MutationObserver(()=>iconify(mb)).observe(mb,{childList:true,subtree:true});

/* ===== موجة الضغط ===== */
document.addEventListener("pointerdown",e=>{
 if(reduce)return;
 const t=e.target.closest(".btn,.quick,.student-home-tile,.nav button,.tool,.icon-btn,.close");
 if(!t||t.disabled)return;
 const r=t.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,sp=document.createElement("span");
 sp.className="md-ripple";
 sp.style.cssText="width:"+s+"px;height:"+s+"px;left:"+(e.clientX-r.left-s/2)+"px;top:"+(e.clientY-r.top-s/2)+"px";
 t.appendChild(sp);setTimeout(()=>sp.remove(),700);
},{passive:true});

/* ===== ظل الشريط العلوي عند التمرير ===== */
let ticking=false;
addEventListener("scroll",()=>{
 if(ticking)return;ticking=true;
 requestAnimationFrame(()=>{document.body.classList.toggle("md-scrolled",scrollY>8);ticking=false});
},{passive:true});
})();
