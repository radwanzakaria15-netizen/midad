(() => {
"use strict";
const $=s=>document.querySelector(s);
const storageKey=()=> "midad_ui_layout_"+(window.KEY||"default");
const catalog=[
 {id:"classes",label:"الأقسام",page:"classes",icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="4" width="8" height="7" rx="2"/><rect x="3" y="13" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/></svg>'},
 {id:"students",label:"التلاميذ",page:"students",icon:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 6a3 3 0 0 1 0 6"/></svg>'},
 {id:"home",label:"الرئيسية",page:"home",icon:'<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10h-6v-7h-4v7H3z"/></svg>'},
 {id:"lessons",label:"الدروس",page:"lessons",icon:'<svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h8"/></svg>'},
 {id:"activities",label:"الأنشطة",page:"activities",icon:'<svg viewBox="0 0 24 24"><path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/></svg>'},
 {id:"assessments",label:"تقييم التلاميذ",page:"assessments",icon:'<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>'},
 {id:"attendance",label:"الحضور",page:"attendance",icon:'<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></svg>'},
 {id:"schedule",label:"التوقيت والبرنامج",page:"schedule",icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4m8-4v4M3 9h18M8 13h3m2 0h3"/></svg>'}
];
const quickCatalog=[
 {id:"classes",label:"الأقسام",desc:"إدارة الأقسام التعليمية",page:"classes"},
 {id:"students",label:"التلاميذ",desc:"قائمة التلاميذ",page:"students"},
 {id:"activities",label:"الأنشطة",desc:"أنشطة وألعاب تعليمية",page:"activities"},
 {id:"library",label:"مكتبة الموارد",desc:"المراجع والملفات",page:"library"},
 {id:"reports",label:"التقارير",desc:"متابعة الأداء",page:"reports"}
];
let editing=false,dragged=null,pointerStart=null;
function read(){try{return JSON.parse(localStorage.getItem(storageKey())||"{}")}catch(_){return {}}}
function write(v){localStorage.setItem(storageKey(),JSON.stringify(v))}
function data(){const v=read();return {hiddenQuick:v.hiddenQuick||quickCatalog.map(x=>x.id),quickOrder:v.quickOrder||[],hiddenNav:v.hiddenNav||["assessments","attendance","schedule"],navOrder:v.navOrder||[]}}
function savePatch(p){write({...read(),...p})}
function orderNodes(root,order,key){if(!root)return;const nodes=[...root.children].filter(n=>n.dataset[key]);const sorted=order.map(id=>nodes.find(n=>n.dataset[key]===id)).filter(Boolean);nodes.forEach(n=>{if(!sorted.includes(n))sorted.push(n)});sorted.forEach(n=>root.appendChild(n))}
function persistOrder(){const q=$("#midadQuickGrid"),n=$(".mobile-nav");savePatch({quickOrder:q?[...q.children].filter(x=>x.dataset.customItem&&!x.hidden).map(x=>x.dataset.customItem):data().quickOrder,navOrder:n?[...n.children].filter(x=>x.dataset.customNav&&!x.hidden).map(x=>x.dataset.customNav):data().navOrder})}
function removeButton(node,type){if(node.querySelector(".midad-remove-item"))return;const b=document.createElement("button");b.type="button";b.className="midad-remove-item";b.textContent="−";b.title="إخفاء العنصر";b.setAttribute("aria-label","إخفاء "+node.textContent.trim());b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const id=node.dataset[type],d=data();if(type==="customItem")savePatch({hiddenQuick:[...new Set([...d.hiddenQuick,id])]});else savePatch({hiddenNav:[...new Set([...d.hiddenNav,id])]});node.hidden=true;renderShelves()});node.appendChild(b)}
function decorate(root,type){if(!root)return;root.querySelectorAll(":scope > [data-"+type+"]").forEach(node=>{removeButton(node,type);if(node.dataset.midadDragBound==="1")return;node.dataset.midadDragBound="1";node.draggable=false;
node.addEventListener("pointerdown",e=>{if(!editing||e.target.closest(".midad-remove-item"))return;pointerStart={node,pointerId:e.pointerId};dragged=node;try{node.setPointerCapture(e.pointerId)}catch(_){}});
node.addEventListener("pointermove",e=>{if(!editing||!pointerStart||pointerStart.node!==node||!dragged)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-"+type+"]");if(!target||target===dragged||target.parentNode!==dragged.parentNode)return;e.preventDefault();const r=target.getBoundingClientRect();target.parentNode.insertBefore(dragged,e.clientY>r.top+r.height/2?target.nextSibling:target)});
node.addEventListener("pointerup",()=>{if(pointerStart&&pointerStart.node===node){pointerStart=null;dragged=null;persistOrder()}});node.addEventListener("pointercancel",()=>{pointerStart=null;dragged=null});
})}
function ensureNavCatalog(){const nav=$(".mobile-nav");if(!nav)return;catalog.forEach(item=>{let n=nav.querySelector('[data-custom-nav="'+item.id+'"]');if(n)return;const existing=nav.querySelector('[data-page="'+item.page+'"]');if(existing){existing.dataset.customNav=item.id;return}const b=document.createElement("button");b.dataset.customNav=item.id;b.dataset.page=item.page;b.innerHTML="<span>"+item.icon+"</span>"+item.label;b.onclick=()=>window.navigate(item.page);nav.appendChild(b)})}
function ensureShelf(id,after){let shelf=$("#"+id);if(!shelf){shelf=document.createElement("div");shelf.id=id;shelf.className="midad-add-shelf";after?.insertAdjacentElement("afterend",shelf)}return shelf}
function restore(type,id){const d=data();if(type==="quick"){savePatch({hiddenQuick:d.hiddenQuick.filter(x=>x!==id)});const item=quickCatalog.find(x=>x.id===id),root=$("#midadQuickGrid");if(item&&root&&!root.querySelector('[data-custom-item="'+id+'"]')){const b=document.createElement("button");b.className="quick";b.dataset.customItem=id;b.innerHTML='<div class="qico"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 9h8M8 13h8"/></svg></div><b>'+item.label+'</b><small>'+item.desc+'</small>';b.onclick=()=>window.navigate(item.page);root.appendChild(b)}}else savePatch({hiddenNav:d.hiddenNav.filter(x=>x!==id)});apply()}
function renderShelves(){const d=data(),q=$("#midadQuickGrid"),nav=$(".mobile-nav");if(q){const shelf=ensureShelf("midad-quick-add-shelf",q);shelf.innerHTML='<span class="midad-add-label">إضافة إلى مربع «ابدأ عملاً جديداً»</span>';quickCatalog.filter(x=>d.hiddenQuick.includes(x.id)).forEach(x=>{const b=document.createElement("button");b.type="button";b.className="midad-add-option";b.textContent="+ "+x.label;b.onclick=()=>restore("quick",x.id);shelf.appendChild(b)});shelf.hidden=!editing||!d.hiddenQuick.length}
if(nav){const shelf=ensureShelf("midad-nav-add-shelf",nav);shelf.innerHTML='<span class="midad-add-label">إضافة إلى الشريط السفلي</span>';catalog.filter(x=>d.hiddenNav.includes(x.id)).forEach(x=>{const b=document.createElement("button");b.type="button";b.className="midad-add-option";b.textContent="+ "+x.label;b.onclick=()=>restore("nav",x.id);shelf.appendChild(b)});shelf.hidden=!editing||!d.hiddenNav.length}}
function ensureEditBar(){let bar=$("#midad-edit-bar");if(!bar){bar=document.createElement("div");bar.id="midad-edit-bar";bar.innerHTML='<span>وضع التخصيص: اسحب لترتيب العناصر</span><button type="button" class="midad-edit-reset">استعادة الافتراضي</button><button type="button" class="midad-edit-done">تم</button>';document.body.appendChild(bar);bar.querySelector(".midad-edit-reset").onclick=()=>{localStorage.removeItem(storageKey());apply()};bar.querySelector(".midad-edit-done").onclick=()=>window.midadFinishCustomize()}bar.hidden=!editing}
function apply(){const d=data(),q=$("#midadQuickGrid"),nav=$(".mobile-nav");ensureNavCatalog();if(q){q.querySelectorAll("[data-custom-item]").forEach(n=>n.hidden=d.hiddenQuick.includes(n.dataset.customItem));orderNodes(q,d.quickOrder,"customItem");decorate(q,"customItem")}if(nav){nav.querySelectorAll("[data-custom-nav]").forEach(n=>n.hidden=d.hiddenNav.includes(n.dataset.customNav));orderNodes(nav,d.navOrder,"customNav");decorate(nav,"customNav")}document.body.classList.toggle("midad-customizing",editing);renderShelves();ensureEditBar()}
window.midadRestoreItem=restore;
window.midadResetLayout=()=>{localStorage.removeItem(storageKey());apply()};
window.midadToggleCustomize=()=>{editing=!editing;apply();if(editing)toast("اسحب العناصر لترتيبها، واضغط (−) لإخفائها، واستخدم (+) لإضافتها من جديد.")};
window.midadFinishCustomize=()=>{persistOrder();editing=false;apply();toast("تم حفظ ترتيب الواجهة.")};
function hideTeacherRevision(){if(document.body.classList.contains("student-mode"))return;document.querySelectorAll("button").forEach(b=>{const label=(b.innerText||b.textContent||"").trim();if((b.dataset.page==="revision"||b.dataset.nav==="revision"||/^المراجعة?$/.test(label))&&!b.closest(".student-home-grid"))b.hidden=true})}
function watch(){ensureNavCatalog();hideTeacherRevision();apply();const target=$("#main");if(target)new MutationObserver(()=>{hideTeacherRevision();if(editing)apply()}).observe(target,{childList:true,subtree:false})}
document.addEventListener("DOMContentLoaded",watch);setTimeout(watch,0);
})();