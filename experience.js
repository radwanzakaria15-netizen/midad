(function(){
  if (!window.db) return;
  db.experiences = Array.isArray(db.experiences) ? db.experiences : [];
  let currentExperienceId = null;
  let experienceStep = 0;
  let experienceAnswers = {};

  const modeNames = {board:"السبورة التعليمية",interactive:"الشرح التفاعلي",summary:"الملخص الممتع"};
  const modeDescriptions = {
    board:"شرح متدرّج كأن الأستاذ يكتب على السبورة، مع أمثلة ومخططات.",
    interactive:"مقاطع قصيرة وأسئلة وأنشطة مع تصحيح فوري.",
    summary:"أهم الأفكار والكلمات المفتاحية في صورة مبسطة ومخطط ذهني."
  };
  const safe = v => esc(v == null ? "" : String(v));
  const arr = v => Array.isArray(v) ? v : [];

  function featurePage(){
    return pageHead("صناعة المحتوى بالذكاء الاصطناعي","حوّل درسك إلى تجربة تعليمية ممتعة",
      "أدخل عنوان الدرس أو الصق محتواه، ثم اختر طريقة تقديمه.")+
      '<section class="card experience-input"><div class="form-grid">'+
      '<div class="form-field full"><label for="expTitle">عنوان الدرس</label><input id="expTitle" placeholder="مثال: دورة الماء في الطبيعة" maxlength="180"></div>'+
      '<div class="form-field"><label for="expSubject">المادة</label><input id="expSubject" placeholder="العلوم"></div>'+
      '<div class="form-field"><label for="expLevel">الطور والمستوى</label><input id="expLevel" placeholder="السنة الرابعة ابتدائي"></div>'+
      '<div class="form-field full"><label for="expSource">محتوى الدرس (اختياري لكنه يساعد على دقة النتائج)</label><textarea id="expSource" rows="6" maxlength="18000" placeholder="الصق نص الدرس أو التعريفات والقواعد والأمثلة هنا..."></textarea><small class="muted">عند إدخال المحتوى، سيعتمد الذكاء الاصطناعي عليه ويحافظ على أفكاره الأساسية.</small></div></div></section>'+
      '<div class="section-title experience-section-title"><div><h3>اختر تجربة التعلم</h3><p>كل نمط يُنشأ بصورة مستقلة ويمكن تعديله وحفظه.</p></div></div>'+
      '<div class="experience-modes">'+
      '<button class="experience-mode board-mode" onclick="generateExperience(\\'board\\')"><span class="experience-icon">▤</span><b>السبورة التعليمية</b><small>'+modeDescriptions.board+'</small><span class="mode-action">إنشاء الشرح ←</span></button>'+
      '<button class="experience-mode interactive-mode" onclick="generateExperience(\\'interactive\\')"><span class="experience-icon">◇</span><b>الشرح التفاعلي</b><small>'+modeDescriptions.interactive+'</small><span class="mode-action">إنشاء التجربة ←</span></button>'+
      '<button class="experience-mode summary-mode" onclick="generateExperience(\\'summary\\')"><span class="experience-icon">▧</span><b>الملخص الممتع</b><small>'+modeDescriptions.summary+'</small><span class="mode-action">إنشاء الملخص ←</span></button>'+
      '</div>'+
      '<section class="experience-saved"><div class="section-title"><div><h3>تجاربي المحفوظة</h3><p>يمكنك فتحها وتعديلها وإعادة استخدامها.</p></div></div>'+
      (db.experiences.length?'<div class="cards">'+db.experiences.slice().reverse().map(x=>'<article class="item-card"><div class="item-top"><span class="pill blue">'+safe(modeNames[x.mode]||"تجربة تعليمية")+'</span></div><h3>'+safe(x.title)+'</h3><p>'+safe(x.subject||"")+' · '+safe(x.level||"")+'</p><div class="item-actions"><button class="btn light small" onclick="openExperience(\\''+safe(x.id)+'\\')">فتح</button><button class="btn secondary small" onclick="reuseExperience(\\''+safe(x.id)+'\\')">إعادة الاستخدام</button></div></article>').join("")+'</div>':'<div class="empty"><strong>لا توجد تجارب محفوظة بعد</strong><span>أنشئ أول تجربة تعليمية لتظهر هنا.</span></div>')+
      '</section>';
  }

  function resultPage(){
    const item=db.experiences.find(x=>x.id===currentExperienceId);
    if(!item){page="experience";return featurePage()}
    const data=item.data||{};
    const header=pageHead(modeNames[item.mode]||"تجربة تعليمية",safe(item.title),
      safe(item.subject||"")+(item.level?" · "+safe(item.level):""),
      '<button class="btn light" onclick="navigate(\\'experience\\')">العودة</button>');
    const tools='<div class="experience-toolbar"><button class="btn secondary" onclick="editExperience(\\''+item.id+'\\')">تعديل المحتوى</button><button class="btn light" onclick="printExperience()">طباعة</button><button class="btn primary" onclick="saveExperienceNow()">حفظ التعديلات</button></div>';
    let body="";
    if(item.mode==="board") body=renderBoard(item);
    else if(item.mode==="interactive") body=renderInteractive(item);
    else body=renderSummary(item);
    return header+tools+'<div id="experience-result" class="experience-result">'+body+'</div>';
  }

  function renderBoard(item){
    const d=item.data||{}, sections=arr(d.sections);
    if(!sections.length)return '<div class="card">لا توجد مراحل في هذا الشرح.</div>';
    experienceStep=Math.max(0,Math.min(experienceStep,sections.length-1));
    const s=sections[experienceStep]||{};
    return '<section class="digital-board"><div class="board-top"><span>مِداد · السبورة التعليمية</span><span>المرحلة '+(experienceStep+1)+' / '+sections.length+'</span></div>'+
      '<h2>'+safe(d.title||item.title)+'</h2><p class="board-intro">'+safe(d.intro||"")+'</p>'+
      '<article class="board-lesson"><span class="board-step-label">الفكرة '+(experienceStep+1)+'</span><h3>'+safe(s.heading)+'</h3><p>'+safe(s.body)+'</p>'+
      (s.example?'<div class="board-example"><b>مثال تطبيقي</b><p>'+safe(s.example)+'</p></div>':'')+
      renderVisual(s.visual)+
      '</article><div class="board-progress">'+sections.map((x,i)=>'<button class="'+(i===experienceStep?"active":"")+'" onclick="goExperienceStep('+i+')" aria-label="المرحلة '+(i+1)+'">'+(i+1)+'</button>').join("")+'</div>'+
      '<div class="experience-nav"><button class="btn light" '+(experienceStep===0?"disabled":"")+' onclick="goExperienceStep('+(experienceStep-1)+')">السابق</button><button class="btn primary" '+(experienceStep===sections.length-1?"disabled":"")+' onclick="goExperienceStep('+(experienceStep+1)+')">المرحلة التالية</button></div></section>'+
      (arr(d.questions).length?'<section class="card"><h3>تحقق من الفهم</h3>'+arr(d.questions).map((q,i)=>'<p><b>'+(i+1)+'. '+safe(q.question||q.q)+'</b></p>').join("")+'</section>':"");
  }

  function renderVisual(v){
    if(!v||!arr(v.labels).length)return "";
    const labels=arr(v.labels);
    return '<div class="visual-flow" aria-label="مخطط توضيحي">'+labels.map((x,i)=>'<span>'+safe(x)+'</span>'+(i<labels.length-1?'<i>←</i>':"")).join("")+'</div>';
  }

  function renderInteractive(item){
    const d=item.data||{}, sections=arr(d.sections), questions=arr(d.questions);
    return '<section class="interactive-lesson"><div class="interactive-hero"><span>رحلة تعلم تفاعلية</span><h2>'+safe(d.title||item.title)+'</h2><p>'+safe(d.intro||"")+'</p></div>'+
      sections.map((s,i)=>'<article class="interactive-section"><span class="pill">الجزء '+(i+1)+'</span><h3>'+safe(s.heading)+'</h3><p>'+safe(s.body)+'</p>'+(s.example?'<div class="board-example"><b>جرّب أن تفهم</b><p>'+safe(s.example)+'</p></div>':"")+'</article>').join("")+
      '<section class="quiz-area"><h3>اختبر فهمك</h3>'+questions.map((q,i)=>renderQuestion(q,i)).join("")+'</section></section>';
  }

  function renderQuestion(q,i){
    const options=arr(q.options), chosen=experienceAnswers[i];
    const correct=Number(q.correctIndex);
    return '<article class="quiz-card"><b>السؤال '+(i+1)+'</b><h4>'+safe(q.question||q.q)+'</h4>'+
      options.map((o,j)=>'<button class="quiz-option '+(chosen===j?(j===correct?"correct":"incorrect"):"")+'" '+(chosen!==undefined?"disabled":"")+' onclick="answerExperience('+i+','+j+')">'+safe(o)+'</button>').join("")+
      (chosen!==undefined?'<p class="quiz-feedback">'+(chosen===correct?"إجابة صحيحة! ":"حاول مرة أخرى في السؤال القادم. ")+safe(q.feedback||"")+'</p>':"")+
      '</article>';
  }

  function renderSummary(item){
    const d=item.data||{};
    return '<section class="summary-sheet"><div class="summary-heading"><span>خلاصة الدرس</span><h2>'+safe(d.title||item.title)+'</h2><p>'+safe(d.intro||"")+'</p></div>'+
      '<div class="summary-grid">'+arr(d.sections).map((s,i)=>'<article class="summary-point"><span>'+(i+1)+'</span><h3>'+safe(s.heading)+'</h3><p>'+safe(s.body)+'</p>'+(s.example?'<small>مثال: '+safe(s.example)+'</small>':"")+'</article>').join("")+'</div>'+
      (arr(d.keyTerms).length?'<section class="key-terms"><h3>كلمات مفتاحية</h3><div>'+arr(d.keyTerms).map(k=>'<article><b>'+safe(k.term)+'</b><p>'+safe(k.definition)+'</p></article>').join("")+'</div></section>':"")+
      (arr(d.sections).length?'<section class="mind-map"><h3>خريطة الأفكار</h3><div class="mind-root">'+safe(d.title||item.title)+'</div><div class="mind-branches">'+arr(d.sections).map(s=>'<span>'+safe(s.heading)+'</span>').join("")+'</div></section>':"")+
      (d.challenge?'<section class="challenge-card"><span>تحدٍّ قصير</span><h3>'+safe(d.challenge.question)+'</h3><details><summary>اعرض الإجابة المقترحة</summary><p>'+safe(d.challenge.answer)+'</p></details></section>':"")+
      '</section>';
  }

  window.generateExperience=async function(mode){
    const title=document.getElementById("expTitle")?.value.trim()||"";
    const subject=document.getElementById("expSubject")?.value.trim()||"";
    const level=document.getElementById("expLevel")?.value.trim()||"";
    const content=document.getElementById("expSource")?.value.trim()||"";
    if(!title){toast("اكتب عنوان الدرس أولاً");return}
    if(!db.aiEndpoint){toast("أضف رابط Gemini الآمن من الإعدادات");navigate("settings");return}
    const cards=document.querySelectorAll(".experience-mode");
    cards.forEach(b=>{b.disabled=true;b.classList.add("loading")});
    try{
      const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"experience",mode,lessonTitle:title,subject,level,content})});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||"تعذر الاتصال بخدمة الذكاء الاصطناعي");
      const data=payload.result||payload;
      if(!Array.isArray(data.sections)||!data.sections.length)throw new Error("النتيجة غير مكتملة؛ أعد المحاولة");
      const item={id:id(),title:data.title||title,subject,level,source:content,mode,data,created:new Date().toISOString()};
      db.experiences.push(item);save();currentExperienceId=item.id;experienceStep=0;experienceAnswers={};page="experience-result";render();window.scrollTo({top:0,behavior:"smooth"});toast("تم إنشاء التجربة وحفظها");
    }catch(e){toast(e.message||"حدث خطأ أثناء التوليد")}
    finally{cards.forEach(b=>{b.disabled=false;b.classList.remove("loading")})}
  };

  window.openExperience=function(idValue){currentExperienceId=idValue;experienceStep=0;experienceAnswers={};page="experience-result";render();window.scrollTo({top:0,behavior:"smooth"})};
  window.goExperienceStep=function(i){experienceStep=i;render()};
  window.answerExperience=function(i,j){experienceAnswers[i]=j;render()};
  window.reuseExperience=function(idValue){const x=db.experiences.find(v=>v.id===idValue);if(!x)return;navigate("experience");setTimeout(()=>{document.getElementById("expTitle").value=x.title||"";document.getElementById("expSubject").value=x.subject||"";document.getElementById("expLevel").value=x.level||"";document.getElementById("expSource").value=x.source||"";toast("أصبحت بيانات التجربة جاهزة لإعادة الاستخدام")},0)};
  window.editExperience=function(idValue){const x=db.experiences.find(v=>v.id===idValue);if(!x)return;openModal("تعديل التجربة التعليمية","عدّل المحتوى المنظم ثم احفظه.",'<form onsubmit="saveExperienceEdit(event,\\''+idValue+'\\')"><div class="form-field"><label>عنوان التجربة</label><input name="title" value="'+safe(x.title)+'" required></div><div class="form-field"><label>محتوى النمط بصيغة JSON</label><textarea name="data" rows="14" style="direction:ltr;text-align:left;font-family:monospace">'+safe(JSON.stringify(x.data,null,2))+'</textarea><small class="muted">يمكن تعديل العناوين والنصوص والأمثلة والأسئلة مع الحفاظ على بنية JSON.</small></div><div class="modal-actions"><button class="btn primary">حفظ التعديل</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>')};
  window.saveExperienceEdit=function(e,idValue){e.preventDefault();const x=db.experiences.find(v=>v.id===idValue);if(!x)return;const f=new FormData(e.target);try{const data=JSON.parse(f.get("data"));if(!Array.isArray(data.sections)||!data.sections.length)throw new Error();x.title=String(f.get("title")||x.title);x.data=data;save();closeModal();render();toast("تم حفظ التعديلات")}catch(_){toast("صيغة JSON غير صالحة أو ينقصها قسم واحد على الأقل")}};
  window.saveExperienceNow=function(){save();toast("تم حفظ التجربة في مساحة مِداد على هذا الجهاز")};
  window.printExperience=function(){window.print()};
  const baseRender=window.render;
  window.render=function(){
    if(page==="experience"||page==="experience-result"){
      document.getElementById("main").innerHTML=page==="experience"?featurePage():resultPage();
      document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page==="experience"));
      document.getElementById("teacherName").textContent=db.teacher||"الأستاذ";
      document.getElementById("avatar").textContent=(db.teacher||"أ").trim().charAt(0);
    }else baseRender();
  };
  const baseNavigate=window.navigate;
  window.navigate=function(p){if(p==="experience"){page=p;render();window.scrollTo({top:0,behavior:"smooth"})}else baseNavigate(p)};
  const originalHome=window.homePage;
  if(typeof originalHome==="function"){
    window.homePage=function(){return originalHome().replace('<section class="stats">','<section class="experience-home-card"><div><span>أداة الذكاء الاصطناعي</span><h3>حوّل درسك إلى تجربة تعليمية ممتعة</h3><p>سبورة تعليمية، شرح تفاعلي، أو ملخص ممتع.</p></div><button class="btn primary" onclick="navigate(\\'experience\\')">ابدأ الآن ←</button></section><section class="stats">')};
  }
  document.querySelectorAll(".nav button").forEach(b=>{});
  const nav=document.querySelector(".nav");
  if(nav&&!nav.querySelector('[data-page="experience"]')){
    const item=document.createElement("button");item.dataset.page="experience";item.innerHTML='<span class="ni">✦</span>حوّل درسك';item.onclick=()=>navigate("experience");
    const first=nav.querySelector('[data-page="lessons"]');if(first)first.insertAdjacentElement("afterend",item);else nav.appendChild(item);
  }
  const mobile=document.querySelector(".mobile-nav");
  if(mobile&&!mobile.querySelector('[data-page="experience"]')){
    const item=document.createElement("button");item.dataset.page="experience";item.innerHTML="<span>✦</span>تجربة";item.onclick=()=>navigate("experience");mobile.insertBefore(item,mobile.querySelector('[data-page="activities"]'));
  }
  render();
})();