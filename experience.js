(function(){
  db.experiences = Array.isArray(db.experiences) ? db.experiences : [];
  let currentExperienceId = null;
  let experienceStep = 0;
  let experienceAnswers = {};
  let experienceSceneStep = 0;
  let matchState = { left: null, right: null, matched: [] };

  const modeNames = {board:"الشرح بالسبورة",interactive:"الشرح التفاعلي المتحرّك",summary:"الملخّص الإبداعي",slides:"الملخص الإبداعي — شرائح",video:"ملخص فيديو",audio:"الملخص الصوتي",chart:"المخطط البياني",assessment:"التقويم والمراجعة"};
  const modeDescriptions = {
    board:"مشاهد تعليمية متحركة تشرح الظواهر خطوة بخطوة مع عناصر تتحرك وتتفاعل.",
    interactive:"مشاهد تعليمية متحركة تشرح الظواهر خطوة بخطوة مع عناصر تتحرك وتتفاعل.",
    summary:"ملخص بصري منظم بألوان وإطارات وخرائط ذهنية ورسوم توضيحية.",
    slides:"حوّل أفكار الدرس إلى مجموعة شرائح تعليمية مرتبة، مختصرة، وجاهزة للعرض.",
    video:"أنشئ سيناريو ملخص فيديو بمشاهد متتابعة ونصوص موجزة وحركة تعليمية.",
    audio:"أنشئ نص ملخص صوتي واضحاً ومتسلسلاً يمكن الاستماع إليه.",
    chart:"استخرج المفاهيم والعلاقات وحوّلها إلى مخطط بياني أو مفاهيمي."
  };
  const safe = v => esc(v == null ? "" : String(v));
  const arr = v => Array.isArray(v) ? v : [];
  const notebookSessionKey = "midad_notebook_session";
  const notebookChoiceKey = "midad_notebook_choice";
  const notebookBase = () => String(db.aiEndpoint || "").replace(/\/+$/, "");
  const notebookToken = () => { try { return sessionStorage.getItem(notebookSessionKey) || ""; } catch (_) { return ""; } };
  const notebookHeaders = () => ({ "Content-Type": "application/json", "Authorization": "Bearer " + notebookToken() });
  function notebookPanel(){
    const connected = !!notebookToken();
    const chosen = (() => { try { return sessionStorage.getItem(notebookChoiceKey) || ""; } catch (_) { return ""; } })();
    return '<section class="card" id="midadNotebookPanel" style="margin:16px 0;border-color:#d9e5d9;background:#fbfdfb">'+
      '<div class="section-title"><div><h3>دفتر NotebookLM</h3><p>اربط حساب Google لإرسال مصادر الدرس إلى دفاترك.</p></div><span class="pill '+(connected?'green':'blue')+'">'+(connected?'الحساب مرتبط':'غير مرتبط')+'</span></div>'+
      (connected?
        '<div class="form-grid"><div class="form-field full"><label for="midadNotebookSelect">اختر الدفتر</label><select id="midadNotebookSelect"><option value="">اضغط «عرض الدفاتر» أولاً</option></select></div><div class="form-field full"><label for="midadNotebookName">اسم دفتر جديد (اختياري)</label><input id="midadNotebookName" maxlength="180" placeholder="مِداد - '+safe("دفتر الدرس")+'"></div></div>'+
        '<div class="toolbar" style="margin-top:12px"><button class="btn light small" onclick="midadLoadNotebooks()">عرض الدفاتر</button><button class="btn secondary small" onclick="midadCreateNotebook()">إنشاء دفتر</button><button class="btn primary small" onclick="midadSendNotebookSource()">إرسال الدرس إلى الدفتر</button><button class="btn light small" onclick="midadDisconnectNotebook()">فصل الجلسة</button></div>'+
        '<p class="muted" id="midadNotebookStatus" aria-live="polite">اختر دفتراً ثم أرسل نص الدرس أو رابطه.</p>'
        :'<p class="muted" style="line-height:1.8">يُستخدم حساب Google الذي توافق على ربطه. بعد الربط يمكنك اختيار دفتر أو إنشاء دفتر جديد وإرسال محتوى الدرس إليه.</p><button class="btn primary" onclick="midadConnectNotebook()">ربط حساب Google</button>')+
      '</section>';
  }
  async function notebookApi(path, options={}){
    const response=await fetch(notebookBase()+path,{...options,headers:{...notebookHeaders(),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||("تعذر تنفيذ طلب NotebookLM ("+response.status+")."));
    return data;
  }
  window.midadConnectNotebook=function(){
    if(!notebookBase()){toast("رابط الخادم غير مضبوط.");return}
    location.href=notebookBase()+"/oauth/google/start";
  };
  window.midadDisconnectNotebook=function(){
    try{sessionStorage.removeItem(notebookSessionKey);sessionStorage.removeItem(notebookChoiceKey)}catch(_){}
    render();toast("تم إنهاء جلسة الربط في هذا المتصفح.");
  };
  window.midadLoadNotebooks=async function(){
    const status=document.getElementById("midadNotebookStatus");
    if(status)status.textContent="جارٍ تحميل الدفاتر...";
    try{
      const data=await notebookApi("/notebook/list");
      const allItems=arr(data.notebooks||data.items); const items=allItems.filter(n=>/^مِداد\s*[-–—]/.test(String(n.display_name||n.displayName||"").trim()));
      const select=document.getElementById("midadNotebookSelect");
      if(!select) return;
      select.innerHTML='<option value="">اختر دفتراً</option>'+items.map(n=>'<option value="'+safe(n.name)+'">'+safe(n.display_name||n.displayName||n.name)+'</option>').join("");
      let saved="";try{saved=sessionStorage.getItem(notebookChoiceKey)||""}catch(_){}
      if(saved&&items.some(n=>n.name===saved))select.value=saved;
      if(status)status.textContent=items.length?"تم تحميل "+items.length+" دفترًا خاصًا بمِداد.":"لا توجد دفاتر أنشأتها مِداد بعد؛ أنشئ دفترًا من هنا.";
    }catch(e){if(status)status.textContent=e.message;else toast(e.message)}
  };
  window.midadCreateNotebook=async function(){
    const status=document.getElementById("midadNotebookStatus");
    const input=document.getElementById("midadNotebookName");
    const title="الدرس";
    const displayName=input?.value.trim()||("مِداد - "+title);
    if(status)status.textContent="جارٍ إنشاء الدفتر...";
    try{
      const data=await notebookApi("/notebook/create",{method:"POST",body:JSON.stringify({displayName})});
      const created=data.name||data.notebook?.name;
      if(created){try{sessionStorage.setItem(notebookChoiceKey,created)}catch(_){}}
      await window.midadLoadNotebooks();
      const select=document.getElementById("midadNotebookSelect");
      if(select&&created)select.value=created;
      if(status)status.textContent="تم إنشاء الدفتر. يمكنك الآن إرسال مصدر الدرس.";
    }catch(e){if(status)status.textContent=e.message;else toast(e.message)}
  };
  window.midadSendNotebookSource=async function(){
    const status=document.getElementById("midadNotebookStatus");
    const notebookName=document.getElementById("midadNotebookSelect")?.value||"";
    const title="مصدر من مِداد";
    const type=document.getElementById("expSourceType")?.value||"text";
    const content=(type==="file"?document.getElementById("expFileText")?.value:type==="video"?document.getElementById("expVideoTranscript")?.value:document.getElementById("expSource")?.value)?.trim()||"";
    const sourceUrl=type==="video"?document.getElementById("expUrl")?.value.trim()||"":"";
    if(!notebookName){if(status)status.textContent="اختر دفتراً أو أنشئ دفترًا جديدًا أولاً.";return}
    if(!content&&!sourceUrl){if(status)status.textContent="أضف نص الدرس أو رابط المصدر أولاً.";return}
    try{
      try{sessionStorage.setItem(notebookChoiceKey,notebookName)}catch(_){}
      let sent=0;
      if(content){
        if(status)status.textContent="جارٍ إرسال نص الدرس إلى NotebookLM...";
        await notebookApi("/notebook/source",{method:"POST",body:JSON.stringify({notebookName,displayName:title+" - نص الدرس",text:content,mimeType:"text/plain"})});
        sent++;
      }
      if(sourceUrl){
        if(status)status.textContent="جارٍ إرسال رابط المصدر...";
        await notebookApi("/notebook/source",{method:"POST",body:JSON.stringify({notebookName,displayName:title+" - رابط المصدر",url:sourceUrl})});
        sent++;
      }
      if(status)status.textContent="تم إرسال "+sent+" مصدر. قد يحتاج NotebookLM بعض الوقت لمعالجته داخل الدفتر.";
      toast("تم إرسال المصدر إلى دفتر NotebookLM.");
    }catch(e){if(status)status.textContent=e.message;else toast(e.message)}
  };
  async function handleNotebookOAuthReturn(){
    const params=new URLSearchParams(location.search);
    const ticket=params.get("google_ticket");
    if(!ticket)return;
    try{
      const response=await fetch(notebookBase()+"/oauth/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticket})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.sessionToken)throw new Error(data.error||"تعذر إكمال ربط حساب Google.");
      try{sessionStorage.setItem(notebookSessionKey,data.sessionToken)}catch(_){}
      history.replaceState({},document.title,location.pathname+location.hash);
      toast("تم ربط حساب Google بنجاح.");
      if(page==="experience")render();
    }catch(e){
      history.replaceState({},document.title,location.pathname+location.hash);
      toast(e.message||"تعذر إكمال الربط.");
    }
  }

  function featurePage(){
    return pageHead("استوديو التعلم الذكي","حوّل مصادرك إلى محتوى تعليمي إبداعي","اختر نوع المصدر أولاً، ثم أضف محتواه واختر التجربة المطلوبة.")+
      '<section class="card experience-input"><div class="form-grid">'+
      '<div class="form-field full"><label for="expSourceType">المصدر</label><select id="expSourceType" onchange="midadExperienceSourceTypeChanged()"><option value="text">نص</option><option value="video">فيديو</option><option value="file">ملف</option></select></div>'+
      '<div class="form-field full" id="expTextSource"><label for="expSource">نص الدرس</label><textarea id="expSource" rows="7" maxlength="18000" placeholder="الصق نص الدرس هنا..."></textarea></div>'+
      '<div class="form-field full" id="expVideoSource" style="display:none"><label for="expUrl">رابط YouTube</label><input id="expUrl" type="url" placeholder="https://www.youtube.com/..."><label for="expVideoTranscript" style="margin-top:10px">تفريغ الكلام أو نص الفيديو</label><textarea id="expVideoTranscript" rows="6" maxlength="18000" placeholder="الصق تفريغ الفيديو هنا؛ الرابط وحده لا يتيح استخراج الكلام تلقائياً."></textarea></div>'+
      '<div class="form-field full" id="expFileSource" style="display:none"><label for="expFile">اختر ملفاً نصياً</label><input id="expFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="midadReadExperienceFile(this)"><small class="muted">يدعم ملفات PDF وWord بصيغة DOCX، ويُستخرج النص منها تلقائياً.</small><textarea id="expFileText" rows="6" maxlength="18000" placeholder="سيظهر النص المستخرج من الملف هنا..." style="margin-top:10px"></textarea></div>'+
      '<p class="muted full" id="expSourceHint">سيُحلّل الذكاء الاصطناعي النص الذي أدخلته فقط.</p></div></section>'+notebookPanel()+
      '<div class="section-title experience-section-title"><div><h3>اختر تجربة التعلم</h3><p>كل نمط يُنشأ بصورة مستقلة ويمكن تعديله وحفظه.</p></div></div>'+
      '<div class="experience-modes">'+
      '<button class="experience-mode summary-mode" onclick="generateExperience(\'slides\')"><span class="experience-icon">▤</span><b>الملخص الإبداعي</b><small>'+modeDescriptions.slides+'</small><span class="mode-action">إنشاء الشرائح ←</span></button>'+
      '<button class="experience-mode interactive-mode" onclick="generateExperience(\'video\')"><span class="experience-icon">▷</span><b>الشرح التفاعلي المتحرك</b><small>'+modeDescriptions.video+'</small><span class="mode-action">إنشاء سيناريو الفيديو ←</span></button>'+
      '<button class="experience-mode" onclick="generateExperience(\'audio\')"><span class="experience-icon">♫</span><b>الملخص الصوتي</b><small>'+modeDescriptions.audio+'</small><span class="mode-action">إنشاء النص الصوتي ←</span></button>'+
      '<button class="experience-mode" onclick="generateExperience(\'chart\')"><span class="experience-icon">⌁</span><b>المخطط البياني</b><small>'+modeDescriptions.chart+'</small><span class="mode-action">إنشاء المخطط ←</span></button>'+
      '</div>'+
      '<section class="experience-saved"><div class="section-title"><div><h3>تجاربي المحفوظة</h3><p>يمكنك فتحها وتعديلها وإعادة استخدامها.</p></div></div>'+
      (db.experiences.length?'<div class="cards">'+db.experiences.slice().reverse().map(x=>'<article class="item-card"><div class="item-top"><span class="pill blue">'+safe(modeNames[x.mode]||"تجربة تعليمية")+'</span></div><h3>'+safe(x.title)+'</h3><div class="item-actions"><button class="btn light small" onclick="openExperience(\''+safe(x.id)+'\')">فتح</button><button class="btn secondary small" onclick="reuseExperience(\''+safe(x.id)+'\')">إعادة الاستخدام</button></div></article>').join("")+'</div>':'<div class="empty"><strong>لا توجد تجارب محفوظة بعد</strong><span>أنشئ أول تجربة تعليمية لتظهر هنا.</span></div>')+'</section>';
  }
  window.midadExperienceSourceTypeChanged=function(){
    const type=document.getElementById("expSourceType")?.value||"text";
    ["expTextSource","expVideoSource","expFileSource"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display="none"});
    const target=document.getElementById(type==="video"?"expVideoSource":type==="file"?"expFileSource":"expTextSource");if(target)target.style.display="";
    const hint=document.getElementById("expSourceHint");if(hint)hint.textContent=type==="video"?"يلزم رابط YouTube مع تفريغ نصي؛ لا نستخرج صوت الفيديو تلقائياً حالياً.":type==="file"?"تُقرأ الملفات النصية المدعومة قبل إرسالها إلى الذكاء الاصطناعي.":"سيُحلّل الذكاء الاصطناعي النص الذي أدخلته فقط.";
  };
  window.midadReadExperienceFile=async function(input){const file=input?.files?.[0],out=document.getElementById("expFileText");if(!file||!out)return;out.value="جارٍ استخراج النص من الملف...";try{out.value=await window.midadExtractDocumentText(file);toast("تم استخراج النص من الملف بنجاح.");}catch(e){out.value="";toast(e.message||"تعذرت قراءة الملف.");}};


  const experienceExportUrls = {};
  let experienceExportOwnerId = null;
  function loadExperienceLibrary(src, globalName){
    if(window[globalName])return Promise.resolve(window[globalName]);
    if(window.__midadLibraryLoads?.[globalName])return window.__midadLibraryLoads[globalName];
    window.__midadLibraryLoads=window.__midadLibraryLoads||{};
    window.__midadLibraryLoads[globalName]=new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src=src;script.async=true;
      script.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error("لم تُحمّل مكتبة إنشاء الملفات."));
      script.onerror=()=>reject(new Error("تعذر تحميل مكتبة إنشاء الملفات. تحقق من الاتصال بالإنترنت."));
      document.head.appendChild(script);
    });
    return window.__midadLibraryLoads[globalName];
  }
  function experienceSlides(item){
    const d=item.data||{}, sections=arr(d.sections);
    return [{heading:d.title||item.title,body:d.intro||"ملخص الدرس",cover:true},...sections].map((x,i)=>({
      heading:String(x.heading|| (i===0?item.title:"فكرة "+i)),
      body:String(x.body||""),
      example:String(x.example||""),
      cover:!!x.cover
    }));
  }
  function experienceExportPanel(item){
    const ready=experienceExportOwnerId===item.id&&Object.keys(experienceExportUrls).length>0;
    return '<section class="card" id="experience-export-panel" style="margin:16px 0;border:1px solid #d9e5d9;background:#fbfdfb">'+
      '<div class="section-title"><div><h3>ملفات الدرس الجاهزة</h3><p id="experience-export-status" aria-live="polite">'+(ready?'اكتمل تجهيز الملفات.':'جارٍ تجهيز ملفات الدرس تلقائياً بعد الإنشاء...')+'</p></div></div>'+
      '<div id="experience-export-links" class="item-actions">'+(ready?experienceExportLinks():'<span class="muted">سيظهر هنا تنزيل PowerPoint وPDF وملفات PNG وWord.</span>')+'</div></section>';
  }
  function experienceExportLinks(){
    const labels={pptx:"تنزيل PowerPoint",pdf:"تنزيل PDF",png:"تنزيل صور PNG (ZIP)",docx:"تنزيل Word"};
    return Object.keys(labels).filter(k=>experienceExportUrls[k]).map(k=>'<a class="btn '+(k==="pptx"?"primary":"light")+' small" href="'+experienceExportUrls[k]+'" download="'+({pptx:"midad-lesson.pptx",pdf:"midad-lesson.pdf",png:"midad-slides-png.zip",docx:"midad-lesson.docx"}[k])+'">'+labels[k]+'</a>').join("");
  }
  async function generateExperienceFiles(item){
    const status=document.getElementById("experience-export-status");
    const links=document.getElementById("experience-export-links");
    const setStatus=t=>{const el=document.getElementById("experience-export-status");if(el)el.textContent=t};
    try{
      if(experienceExportOwnerId!==item.id){Object.keys(experienceExportUrls).forEach(k=>{URL.revokeObjectURL(experienceExportUrls[k]);delete experienceExportUrls[k]});experienceExportOwnerId=item.id;}
      setStatus("جارٍ إعداد ملفات العرض والوثيقة والصور...");
      const [PptxGenJS,html2canvas,jspdf,JSZip,docx]=await Promise.all([
        loadExperienceLibrary("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js","pptxgen"),
        loadExperienceLibrary("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas"),
        loadExperienceLibrary("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js","jspdf"),
        loadExperienceLibrary("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js","JSZip"),
        loadExperienceLibrary("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js","docx")
      ]);
      const slides=experienceSlides(item);
      const fileBase=(String(item.title||"midad-lesson").replace(/[^\\p{L}\\p{N}-]+/gu,"-").replace(/^-|-$/g,"")||"midad-lesson").slice(0,60);
      const pptx=new PptxGenJS();pptx.layout="LAYOUT_WIDE";pptx.author="مِداد";pptx.subject="مورد تعليمي";pptx.title=item.title||"درس تعليمي";pptx.lang="ar-SA";pptx.theme={headFontFace:"Arial",bodyFontFace:"Arial",lang:"ar-SA"};
      slides.forEach((s,i)=>{
        const slide=pptx.addSlide();slide.background={color:i===0?"EAF1EA":"F8FAF7"};
        slide.addText(i===0?"مِداد | ملخص تعليمي":"مِداد | "+(i),{x:0.55,y:0.3,w:12.1,h:0.35,fontFace:"Arial",fontSize:13,color:"66806D",align:"right",margin:0,breakLine:false});
        slide.addText(s.heading,{x:0.75,y:1.0,w:11.8,h:1.0,fontFace:"Arial",fontSize:i===0?30:26,bold:true,color:"294B39",align:"right",valign:"mid",rtlMode:true,margin:0.08,fit:"shrink"});
        slide.addText(s.body,{x:0.9,y:2.25,w:11.5,h:2.3,fontFace:"Arial",fontSize:19,color:"34463A",align:"right",valign:"top",rtlMode:true,breakLine:false,margin:0.12,fit:"shrink"});
        if(s.example)slide.addText([{text:"مثال توضيحي: ",options:{bold:true,color:"55745D"}},{text:s.example,options:{color:"34463A"}}],{x:0.9,y:5.0,w:11.5,h:1.0,fontFace:"Arial",fontSize:16,align:"right",rtlMode:true,breakLine:false,margin:0.12,fit:"shrink",fill:{color:"E8EFE8"},line:{color:"D5E1D5"}});
        slide.addText((i+1)+" / "+slides.length,{x:11.8,y:7.0,w:0.8,h:0.25,fontSize:10,color:"829487",align:"right",margin:0});
      });
      const pptxBlob=await pptx.write({outputType:"blob"});
      const docParas=[new docx.Paragraph({text:item.title||"درس تعليمي",heading:docx.HeadingLevel.TITLE,bidirectional:true,alignment:docx.AlignmentType.RIGHT})];
      if(item.subject||item.level)docParas.push(new docx.Paragraph({text:[item.subject,item.level].filter(Boolean).join(" · "),alignment:docx.AlignmentType.RIGHT,bidirectional:true}));
      if(item.data?.intro)docParas.push(new docx.Paragraph({text:String(item.data.intro),alignment:docx.AlignmentType.RIGHT,bidirectional:true,spacing:{after:240}}));
      slides.slice(1).forEach((s,i)=>{docParas.push(new docx.Paragraph({text:s.heading,heading:docx.HeadingLevel.HEADING_1,bidirectional:true,alignment:docx.AlignmentType.RIGHT}));if(s.body)docParas.push(new docx.Paragraph({text:s.body,bidirectional:true,alignment:docx.AlignmentType.RIGHT,spacing:{after:160}}));if(s.example)docParas.push(new docx.Paragraph({children:[new docx.TextRun({text:"مثال توضيحي: ",bold:true}),new docx.TextRun(s.example)],bidirectional:true,alignment:docx.AlignmentType.RIGHT,spacing:{after:220}}));});
      const docxDocument=new docx.Document({sections:[{properties:{page:{margin:{top:900,right:900,bottom:900,left:900}}},children:docParas}]});
      const docxBlob=await docx.Packer.toBlob(docxDocument);
      const staging=window.document.createElement("div");
      staging.style.cssText="position:fixed;left:-20000px;top:0;width:1280px;z-index:-1;direction:rtl;font-family:Arial,sans-serif";
      window.document.body.appendChild(staging);
      const zip=new JSZip(),pdf=new jspdf.jsPDF({orientation:"landscape",unit:"px",format:[1280,720],compress:true});
      for(let i=0;i<slides.length;i++){
        const s=slides[i];
        staging.innerHTML='<div dir="rtl" style="box-sizing:border-box;width:1280px;height:720px;padding:76px 90px;background:'+(i===0?'#eaf1ea':'#f8faf7')+';color:#294b39;display:flex;flex-direction:column;justify-content:center;font-family:Arial,sans-serif"><div style="font-size:22px;color:#66806d;margin-bottom:46px">مِداد · عرض تعليمي</div><div style="font-size:'+(i===0?54:46)+'px;font-weight:700;line-height:1.35;margin-bottom:32px">'+safe(s.heading)+'</div><div style="font-size:30px;line-height:1.8;color:#34463a;white-space:pre-wrap">'+safe(s.body)+'</div>'+(s.example?'<div style="margin-top:34px;padding:22px 28px;border-radius:18px;background:#e8efe8;font-size:25px;line-height:1.6"><b>مثال توضيحي: </b>'+safe(s.example)+'</div>':'')+'<div style="position:absolute;bottom:38px;left:90px;color:#829487;font-size:18px">'+(i+1)+' / '+slides.length+'</div></div>';
        const canvas=await html2canvas(staging.firstElementChild,{scale:1,backgroundColor:null,useCORS:true});
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
        if(!blob)throw new Error("تعذر إنشاء إحدى صور الشرائح.");
        zip.file("slide-"+String(i+1).padStart(2,"0")+".png",blob);
        if(i>0)pdf.addPage([1280,720],"landscape");
        pdf.addImage(canvas.toDataURL("image/jpeg",0.92),"JPEG",0,0,1280,720,undefined,"FAST");
        setStatus("تم تجهيز "+(i+1)+" من "+slides.length+" شريحة...");
      }
      staging.remove();
      const pdfBlob=pdf.output("blob"),pngBlob=await zip.generateAsync({type:"blob"});
      const blobs={pptx:pptxBlob,pdf:pdfBlob,png:pngBlob,docx:docxBlob};
      Object.entries(blobs).forEach(([key,blob])=>{if(experienceExportUrls[key])URL.revokeObjectURL(experienceExportUrls[key]);experienceExportUrls[key]=URL.createObjectURL(blob)});
      const linkHost=document.getElementById("experience-export-links");
      if(linkHost)linkHost.innerHTML=experienceExportLinks();
      setStatus("اكتمل إنشاء الملفات الأربعة. صور الشرائح مجمّعة في ملف ZIP.");
      item.exportReady=true;
    }catch(error){
      console.error("Midad export error",error);
      setStatus((error.message||"تعذر إنشاء الملفات.")+" يمكنك إعادة فتح التجربة والمحاولة مجدداً.");
      const host=document.getElementById("experience-export-links");
      if(host)host.innerHTML='<button class="btn primary small" onclick="retryExperienceFiles(\''+safe(item.id)+'\')">إعادة إنشاء الملفات</button>';
    }
  }
  window.retryExperienceFiles=function(idValue){const item=db.experiences.find(x=>x.id===idValue);if(item)generateExperienceFiles(item)};

  function resultPage(){
    const item=db.experiences.find(x=>x.id===currentExperienceId);
    if(!item){page="experience";return featurePage()}
    const data=item.data||{};
    const header=pageHead(modeNames[item.mode]||"تجربة تعليمية",safe(item.title),
      safe(item.subject||"")+(item.level?" · "+safe(item.level):""),
      '<button class="btn light" onclick="navigate(\'experience\')">العودة</button>');
    const tools='<div class="experience-toolbar"><button class="btn secondary" onclick="editExperience(\''+item.id+'\')">تعديل المحتوى</button><button class="btn light" onclick="printExperience()">طباعة</button><button class="btn primary" onclick="saveExperienceNow()">حفظ التعديلات</button></div>';
    let body="";
    if(item.mode==="slides") body=renderSlides(item);
    else if(item.mode==="board") body=renderBoard(item);
    else if(item.mode==="interactive"||item.mode==="video") body=renderInteractive(item);
    else if(item.mode==="assessment") body=renderAssessment(item);
    else if(item.mode==="audio") body=renderAudioSummary(item);
    else if(item.mode==="chart") body=renderChartSummary(item);
    else body=renderSummary(item);
    return header+tools+experienceExportPanel(item)+'<div id="experience-result" class="experience-result">'+body+'</div>';
  }

  function renderSlides(item){
    const d=item.data||{}, sections=arr(d.sections);
    if(!sections.length)return '<div class="card">لم تُنشأ شرائح لهذا الدرس. أعد المحاولة.</div>';
    const slides=[{heading:d.title||item.title,body:d.intro||"ملخص الدرس",cover:true},...sections];
    experienceStep=Math.max(0,Math.min(experienceStep,slides.length-1));
    const s=slides[experienceStep]||{};
    const isCover=!!s.cover;
    return '<section class="slide-deck">'+
      '<div class="slide-deck-top"><span>مِداد · عرض تعليمي</span><span>الشريحة '+(experienceStep+1)+' من '+slides.length+'</span></div>'+
      '<article class="lesson-slide '+(isCover?'lesson-slide-cover':'')+'">'+
        '<div class="slide-kicker">'+(isCover?'ملخص الدرس':'الفكرة '+experienceStep)+'</div>'+
        '<h2>'+safe(s.heading||"")+'</h2>'+
        '<p>'+safe(s.body||"")+'</p>'+
        (!isCover&&s.example?'<div class="slide-example"><b>مثال توضيحي</b><span>'+safe(s.example)+'</span></div>':'')+
        (!isCover?renderVisual(s.visual):'')+
      '</article>'+
      '<div class="slide-deck-progress" aria-label="تقدم العرض">'+slides.map((x,i)=>'<button class="'+(i===experienceStep?'active':'')+'" onclick="goExperienceStep('+i+')" aria-label="الشريحة '+(i+1)+'">'+(i+1)+'</button>').join("")+'</div>'+
      '<div class="slide-deck-controls"><button class="btn light" '+(experienceStep===0?'disabled':'')+' onclick="goExperienceStep('+(experienceStep-1)+')">السابق</button><span>تنقّل بين الشرائح لعرض الدرس</span><button class="btn primary" '+(experienceStep===slides.length-1?'disabled':'')+' onclick="goExperienceStep('+(experienceStep+1)+')">التالي</button></div>'+
    '</section>';
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
    if(!v)return "";
    const nodes=arr(v.nodes).slice(0,10), edges=arr(v.edges).slice(0,14);
    if(nodes.length){
      const pos=nodes.map((n,i)=>({id:String(n.id||i),label:safe(n.label||n.title||"مفهوم"),x:Number.isFinite(Number(n.x))?Math.max(8,Math.min(92,Number(n.x))):18+(i%3)*32,y:Number.isFinite(Number(n.y))?Math.max(12,Math.min(88,Number(n.y))):25+Math.floor(i/3)*28}));
      const byId=Object.fromEntries(pos.map(p=>[p.id,p]));
      const lines=edges.map(e=>{const a=byId[String(e.from)],b=byId[String(e.to)];return a&&b?'<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#9aaf9f" stroke-width="1.2" stroke-dasharray="2 1"/>':""}).join("");
      const shapes=pos.map((p,i)=>'<g class="diagram-node" style="--node-delay:'+i+'"><rect x="'+(p.x-12)+'" y="'+(p.y-7)+'" width="24" height="14" rx="3" fill="'+(i%3===0?'#e8efe8':i%3===1?'#f4e8d9':'#e4edf0')+'" stroke="#8da895" stroke-width=".5"/><text x="'+p.x+'" y="'+(p.y+.8)+'" text-anchor="middle" dominant-baseline="middle" font-size="3.4" fill="#294b39">'+p.label+'</text></g>').join("");
      return '<div class="generated-visual"><div class="generated-visual-label">رسم توضيحي مولّد من بنية الدرس</div><svg viewBox="0 0 100 100" role="img" aria-label="مخطط مفاهيم">'+lines+shapes+'</svg></div>';
    }
    const labels=arr(v.labels);
    if(!labels.length)return "";
    return '<div class="visual-flow" aria-label="مخطط توضيحي">'+labels.map((x,i)=>'<span>'+safe(x)+'</span>'+(i<labels.length-1?'<i>←</i>':"")).join("")+'</div>';
  }

  function renderInteractive(item){
    const d=item.data||{}, sections=arr(d.sections), questions=arr(d.questions);
    return '<section class="interactive-lesson"><div class="interactive-hero"><span>رحلة تعلم تفاعلية</span><h2>'+safe(d.title||item.title)+'</h2><p>'+safe(d.intro||"")+'</p></div>'+(/الماء|تبخر|التبخر|دورة الماء|الهطول|التكاثف/i.test(String(d.title||item.title)+" "+String(d.intro||""))?renderWaterWorld(d.title||item.title):renderAnimatedScene(d.scene))+
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


  function renderAssessment(item){
    const d=item.data||{}, questions=arr(d.questions);
    return '<section class="assessment-result"><div class="interactive-hero"><span>مركز التقويم الذكي</span><h2>'+safe(d.title||item.title)+'</h2><p>أجب عن الأسئلة ثم راجع التفسير التعليمي. يمكنك قلب بطاقات المراجعة.</p></div>'+
      '<div class="assessment-tools"><span class="pill blue">'+questions.length+' أسئلة</span><span class="pill green">'+arr(d.flashcards).length+' بطاقات</span></div>'+
      '<section class="quiz-area">'+questions.map((q,i)=>renderQuestion(q,i)).join("")+'</section>'+
      renderMatchingGame(d.matchPairs)+
      (arr(d.flashcards).length?'<section class="flashcards-area"><h3>بطاقات المراجعة</h3><div class="flashcards-grid">'+arr(d.flashcards).map((f,i)=>'<button class="flashcard" onclick="this.classList.toggle(\'flipped\')"><span class="flashcard-inner"><span class="flashcard-front"><small>اقلب البطاقة · '+(i+1)+'</small><b>'+safe(f.front)+'</b></span><span class="flashcard-back"><small>الإجابة</small><b>'+safe(f.back)+'</b></span></span></button>').join("")+'</div></section>':"")+'</section>';
  }


  function renderWaterWorld(title){
    return '<section class="midad-water-lab"><div class="midad-lab-head"><div><span>مختبر مِداد ثلاثي الأبعاد</span><h3>'+safe(title||"دورة الماء في الطبيعة")+'</h3><p>اسحب الشمس داخل المشهد أو غيّر شدة الإشعاع، ولاحظ أثر ذلك في التبخر والسحب.</p></div><span class="midad-live">محاكاة تفاعلية</span></div><div id="midad-water-world" class="midad-water-world"><div class="midad-3d-loading">جارٍ تجهيز المشهد ثلاثي الأبعاد…</div></div><div class="midad-lab-controls"><label>شدة الإشعاع الشمسي <input id="midad-sun-power" type="range" min="15" max="100" value="70"></label><button class="btn light small" onclick="window.Midad3D&&window.Midad3D.resetWater()">إعادة ضبط</button><button class="btn light small" onclick="window.Midad3D&&window.Midad3D.toggleWater()">إيقاف / تشغيل</button></div><div class="midad-lab-readouts"><div><small>الحرارة النسبية</small><b id="midad-temp">دافئة</b></div><div><small>التبخر</small><b id="midad-evap">متوسط</b></div><div><small>السحب</small><b id="midad-cloud">نشطة</b></div></div><p class="midad-lab-note">محاكاة مبسطة لتوضيح العلاقة بين التسخين والتبخر والتكاثف، وليست قياساً علمياً للطقس.</p></section>';
  }

  function renderAnimatedScene(scene){
    if(!scene||(!arr(scene.nodes).length&&!arr(scene.steps).length))return "";
    const steps=arr(scene.steps), nodes=arr(scene.nodes);
    const active=Math.max(0,Math.min(experienceSceneStep,Math.max(0,steps.length-1)));
    return '<section class="animated-scene"><div class="scene-heading"><b>'+safe(scene.title||"مشهد تفاعلي")+'</b><span>اضغط على المراحل لاكتشافها</span></div>'+
      renderVisual({nodes: nodes.length?nodes:steps.map((s,i)=>({id:String(i),label:s,x:18+(i%3)*32,y:25+Math.floor(i/3)*35})),edges:arr(scene.edges)})+
      (steps.length?'<div class="scene-steps">'+steps.map((v,i)=>'<button class="scene-step '+(i===active?"active":"")+'" onclick="goExperienceSceneStep('+i+')"><b>'+(i+1)+'</b>'+safe(typeof v==="string"?v:v.title||v.label||"مرحلة")+'</button>').join("")+'</div><div class="scene-step-detail">'+safe(typeof steps[active]==="object"?(steps[active].description||steps[active].body||steps[active].title):steps[active])+'</div>':"")+
      '</section>';
  }
  function renderMatchingGame(pairs){
    pairs=arr(pairs).slice(0,8);if(pairs.length<2)return "";
    const rightOrder=pairs.map((_,i)=>i).reverse();
    window.__midadMatchedPairs=matchState.matched.slice();
    return '<section class="matching-game"><div class="matching-head"><div><span>لعبة تفاعلية</span><h3>صل كل عنصر بما يناسبه</h3><p>اختر بطاقة من العمود الأول ثم البطاقة المطابقة من العمود الثاني.</p></div><b>'+matchState.matched.length+' / '+pairs.length+'</b></div><div class="matching-board"><svg class="matching-lines" aria-hidden="true"></svg><div class="matching-columns"><div>'+pairs.map((p,i)=>'<button data-match-side="left" data-match-index="'+i+'" class="match-card '+(matchState.matched.includes(i)?"matched":matchState.left===i?"selected":"")+'" '+(matchState.matched.includes(i)?"disabled":"")+' onclick="selectMatchCard(\'left\','+i+')">'+safe(p.left)+'</button>').join("")+'</div><div>'+rightOrder.map(i=>'<button data-match-side="right" data-match-index="'+i+'" class="match-card '+(matchState.matched.includes(i)?"matched":matchState.right===i?"selected":"")+'" '+(matchState.matched.includes(i)?"disabled":"")+' onclick="selectMatchCard(\'right\','+i+')">'+safe(pairs[i].right)+'</button>').join("")+'</div></div></div><p class="match-feedback">'+(matchState.matched.length===pairs.length?"أحسنت! أكملت المطابقة بنجاح.":matchState.left!==null&&matchState.right!==null&&matchState.left!==matchState.right?"ليست مطابقة، حاول مجدداً.":"اختر زوجاً صحيحاً للمتابعة.")+'</p></section>';
  }

  function renderAudioSummary(item){
    const d=item.data||{};
    const narration=[d.intro,...arr(d.sections).map(s=>(s.heading||"")+". "+(s.body||"")), ...arr(d.keyTerms).map(k=>(k.term||"")+". "+(k.definition||""))].filter(Boolean).join("\n\n");
    return '<section class="summary-sheet"><div class="summary-heading"><span>ملخص صوتي</span><h2>'+safe(d.title||item.title)+'</h2><p>نص تعليمي مُعدّ للاستماع. يمكن تشغيله بصوت الجهاز.</p></div><article class="summary-point"><p>'+safe(narration)+'</p><button class="btn primary" onclick="speakExperienceSummary(this)">استمع إلى الملخص</button><button class="btn light" onclick="window.speechSynthesis&&window.speechSynthesis.cancel()">إيقاف الصوت</button></article></section>';
  }
  window.speakExperienceSummary=function(button){
    const text=button.closest(".summary-sheet")?.querySelector(".summary-point p")?.textContent||"";
    if(!text||!window.speechSynthesis){toast("ميزة القراءة الصوتية غير متاحة في هذا المتصفح");return}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang="ar-SA";utterance.rate=.9;window.speechSynthesis.speak(utterance);
  };
  function renderChartSummary(item){
    const d=item.data||{};
    return '<section class="summary-sheet"><div class="summary-heading"><span>المخطط البياني</span><h2>'+safe(d.title||item.title)+'</h2><p>'+safe(d.intro||"")+'</p></div>'+renderVisual(d.visual)+'<div class="summary-grid">'+arr(d.sections).map((s,i)=>'<article class="summary-point"><span>'+(i+1)+'</span><h3>'+safe(s.heading)+'</h3><p>'+safe(s.body)+'</p></article>').join("")+'</div></section>';
  }

  function renderSummary(item){
    const d=item.data||{};
    return '<section class="summary-sheet"><div class="summary-heading"><span>خلاصة الدرس</span><h2>'+safe(d.title||item.title)+'</h2><p>'+safe(d.intro||"")+'</p></div>'+
      renderVisual(d.visual)+
      '<div class="summary-grid">'+arr(d.sections).map((s,i)=>'<article class="summary-point"><span>'+(i+1)+'</span><h3>'+safe(s.heading)+'</h3><p>'+safe(s.body)+'</p>'+(s.example?'<small>مثال: '+safe(s.example)+'</small>':"")+'</article>').join("")+'</div>'+
      (arr(d.keyTerms).length?'<section class="key-terms"><h3>كلمات مفتاحية</h3><div>'+arr(d.keyTerms).map(k=>'<article><b>'+safe(k.term)+'</b><p>'+safe(k.definition)+'</p></article>').join("")+'</div></section>':"")+
      (arr(d.sections).length?'<section class="mind-map"><h3>خريطة الأفكار</h3><div class="mind-root">'+safe(d.title||item.title)+'</div><div class="mind-branches">'+arr(d.sections).map(s=>'<span>'+safe(s.heading)+'</span>').join("")+'</div></section>':"")+
      (d.challenge?'<section class="challenge-card"><span>تحدٍّ قصير</span><h3>'+safe(d.challenge.question)+'</h3><details><summary>اعرض الإجابة المقترحة</summary><p>'+safe(d.challenge.answer)+'</p></details></section>':"")+
      '</section>';
  }

  window.generateExperience=async function(mode){
    const type=document.getElementById("expSourceType")?.value||"text";
    const content=(type==="file"?document.getElementById("expFileText")?.value:type==="video"?document.getElementById("expVideoTranscript")?.value:document.getElementById("expSource")?.value)||"";
    const sourceUrl=type==="video"?(document.getElementById("expUrl")?.value.trim()||""):"";
    const title="المصدر التعليمي",subject="",level="";
    if(content.trim().length<80){toast(type==="video"?"أدخل تفريغ الفيديو بما لا يقل عن 80 حرفاً.":"أدخل نصاً لا يقل عن 80 حرفاً.");return}
    if(type==="video"&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(sourceUrl)){toast("أدخل رابط YouTube صحيحاً يبدأ بـ HTTPS.");return}
    if(!db.aiEndpoint){toast("أضف رابط Gemini الآمن من الإعدادات");navigate("settings");return}
    const taskId="experience-"+id(),cards=[...document.querySelectorAll(".experience-mode")];
    cards.forEach(b=>{b.disabled=true;b.dataset.previousText=b.innerHTML;b.innerHTML="<span>جارٍ الإنشاء...</span>"});
    if(window.midadTaskStart)window.midadTaskStart(taskId,"جارٍ إنشاء التجربة التعليمية في الخلفية");
    let succeeded=false,failureMessage="تعذّر إكمال التجربة. تحقق من اتصال الذكاء الاصطناعي وحاول مجدداً.";
    const controller=new AbortController(),requestTimer=setTimeout(()=>controller.abort(),90000);
    try{
      const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({kind:"experience",outputType:"experience",mode,lessonTitle:title,title,subject,level,content,sourceUrl,sourceType:type,questionCount:10,include:{mcq:true,tf:true,flashcards:true}})});
      const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{}}catch(_){throw new Error("استجابة الخادم غير مفهومة. تحقق من نشر خدمة Gemini.")}
      if(!response.ok)throw new Error(payload.error||("فشل الطلب برمز "+response.status));
      const data=payload.result||payload;if(!Array.isArray(data.sections)||!data.sections.length)throw new Error("النتيجة غير مكتملة؛ أعد المحاولة");
      const item={id:id(),title:data.title||"تجربة تعليمية",subject,level,source:content,sourceUrl,sourceType:type,mode,data,created:new Date().toISOString()};
      db.experiences.push(item);save();succeeded=true;experienceSceneStep=0;matchState={left:null,right:null,matched:[]};
      if(page==="experience"||page==="experience-result"){currentExperienceId=item.id;experienceStep=0;experienceAnswers={};page="experience-result";render();window.scrollTo({top:0,behavior:"smooth"})}
      toast("اكتمل إنشاء التجربة وحُفظت، ويمكنك فتحها من التجارب المحفوظة");
    }catch(e){failureMessage=e.name==="AbortError"?"انتهت مهلة إنشاء التجربة بعد 90 ثانية. تحقق من نشر Worker ومفتاح Gemini ثم أعد المحاولة.":(e.message||failureMessage);toast(failureMessage)}
    finally{clearTimeout(requestTimer);cards.forEach(b=>{b.disabled=false;if(b.dataset.previousText)b.innerHTML=b.dataset.previousText});if(window.midadTaskFinish)window.midadTaskFinish(taskId,succeeded,succeeded?"اكتملت التجربة وحُفظت":failureMessage)}
  };

  window.openExperience=function(idValue){const item=db.experiences.find(x=>x.id===idValue);if(!item)return;currentExperienceId=idValue;experienceStep=0;experienceSceneStep=0;experienceAnswers={};matchState={left:null,right:null,matched:[]};page="experience-result";render();window.scrollTo({top:0,behavior:"smooth"});generateExperienceFiles(item)};
  window.goExperienceStep=function(i){experienceStep=i;render()};
  window.goExperienceSceneStep=function(i){experienceSceneStep=i;render()};
  window.selectMatchCard=function(side,index){
    if(matchState.matched.includes(index))return;
    matchState[side]=index;
    if(matchState.left!==null&&matchState.right!==null){
      if(matchState.left===matchState.right)matchState.matched=[...matchState.matched,matchState.left];
      else {const failed={...matchState};matchState={...matchState,left:null,right:null};render();setTimeout(()=>{matchState=failed;matchState.left=null;matchState.right=null;render()},650);return}
      matchState.left=null;matchState.right=null;
    }
    render();
  };
  window.answerExperience=function(i,j){experienceAnswers[i]=j;render()};
  window.reuseExperience=function(idValue){const x=db.experiences.find(v=>v.id===idValue);if(!x)return;navigate("experience");setTimeout(()=>{const type=x.sourceType||"text";const selector=document.getElementById("expSourceType");if(selector){selector.value=type;midadExperienceSourceTypeChanged()}const textId=type==="file"?"expFileText":type==="video"?"expVideoTranscript":"expSource";const box=document.getElementById(textId);if(box)box.value=x.source||"";const url=document.getElementById("expUrl");if(url)url.value=x.sourceUrl||"";toast("أصبح المصدر جاهزاً لإعادة الاستخدام")},0)};
  window.editExperience=function(idValue){const x=db.experiences.find(v=>v.id===idValue);if(!x)return;openModal("تعديل التجربة التعليمية","عدّل المحتوى المنظم ثم احفظه.",'<form onsubmit="saveExperienceEdit(event,\''+idValue+'\')"><div class="form-field"><label>عنوان التجربة</label><input name="title" value="'+safe(x.title)+'" required></div><div class="form-field"><label>محتوى النمط بصيغة JSON</label><textarea name="data" rows="14" style="direction:ltr;text-align:left;font-family:monospace">'+safe(JSON.stringify(x.data,null,2))+'</textarea><small class="muted">يمكن تعديل العناوين والنصوص والأمثلة والأسئلة مع الحفاظ على بنية JSON.</small></div><div class="modal-actions"><button class="btn primary">حفظ التعديل</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>')};
  window.saveExperienceEdit=function(e,idValue){e.preventDefault();const x=db.experiences.find(v=>v.id===idValue);if(!x)return;const f=new FormData(e.target);try{const data=JSON.parse(f.get("data"));if(!Array.isArray(data.sections)||!data.sections.length)throw new Error();x.title=String(f.get("title")||x.title);x.data=data;Object.keys(experienceExportUrls).forEach(k=>{URL.revokeObjectURL(experienceExportUrls[k]);delete experienceExportUrls[k]});save();closeModal();render();generateExperienceFiles(x);toast("تم حفظ التعديلات وإعادة تجهيز الملفات")}catch(_){toast("صيغة JSON غير صالحة أو ينقصها قسم واحد على الأقل")}};
  window.saveExperienceNow=function(){save();toast("تم حفظ التجربة في مساحة مِداد على هذا الجهاز")};
  window.printExperience=function(){window.print()};
  const baseRender=window.render;
  window.render=function(){
    if(page==="experience"||page==="experience-result"){
      document.getElementById("main").innerHTML=page==="experience"?featurePage():resultPage();
      document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page==="experience"));
      document.getElementById("teacherName").textContent=db.teacher||"الأستاذ";
      document.getElementById("avatar").textContent=(db.teacher||"أ").trim().charAt(0);
      setTimeout(function(){if(window.Midad3D){window.Midad3D.mountWater();window.Midad3D.drawMatches()}},80);
    }else baseRender();
  };
  const baseNavigate=window.navigate;
  window.navigate=function(p){if(p==="experience"){page=p;render();window.scrollTo({top:0,behavior:"smooth"})}else baseNavigate(p)};
  const originalHome=window.homePage;
  if(typeof originalHome==="function"){
    window.homePage=function(){return originalHome().replace('<section class="stats">','<section class="experience-home-card"><div><span>أداة الذكاء الاصطناعي</span><h3>حوّل درسك إلى تجربة تعليمية ممتعة</h3><p>سبورة تعليمية، شرح تفاعلي، أو ملخص ممتع.</p></div><button class="btn primary" onclick="navigate(\'experience\')">ابدأ الآن ←</button></section><section class="stats">')};
  }
  document.querySelectorAll(".nav button").forEach(b=>{});
  const nav=[...document.querySelectorAll(".nav")].find(n=>n.querySelector('[data-page="lessons"]'));
  if(nav&&!nav.querySelector('[data-page="experience"]')){
    const item=document.createElement("button");item.dataset.page="experience";item.innerHTML='<span class="ni">✦</span>حوّل درسك';item.onclick=()=>navigate("experience");
    const first=nav.querySelector('[data-page="lessons"]');if(first)first.insertAdjacentElement("afterend",item);else nav.appendChild(item);
  }
  const mobile=document.querySelector(".mobile-nav");
  if(mobile&&!mobile.querySelector('[data-page="experience"]')){
    const item=document.createElement("button");item.dataset.page="experience";item.innerHTML="<span>✦</span>تجربة";item.onclick=()=>navigate("experience");mobile.insertBefore(item,mobile.querySelector('[data-page="activities"]'));
  }



  handleNotebookOAuthReturn();
  render();
})();