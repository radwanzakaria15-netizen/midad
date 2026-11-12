(function(){
"use strict";
const $=id=>document.getElementById(id);
const escTask=v=>window.esc?window.esc(v==null?"":String(v)):String(v??"");
const taskKinds=["واجب منزلي","اختبار","امتحان","بحث"];
const taskId=()=>"task-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const accents={"واجب منزلي":"#537d68","اختبار":"#5579a8","امتحان":"#98734b","بحث":"#806aa0"};
const numberFor=k=>(db.activities||[]).filter(x=>x.kind==="task"&&x.category===k).length+1;
window.activitiesPage=function(){
 const tasks=(db.activities||[]).filter(x=>x.kind==="task"),games=(db.activities||[]).filter(x=>x.kind!=="task");
 const cards=taskKinds.map((k,i)=>'<article class="task-kind-card" style="--task-accent:'+accents[k]+'"><div class="task-kind-top"><span class="task-kind-symbol">'+["▤","▧","▦","⌕"][i]+'</span><span class="task-kind-count">'+tasks.filter(t=>t.category===k).length+' محفوظ</span></div><h3>'+k+'</h3><p>'+["تمارين للتدريب مع ملف إجابات مستقل.","أسئلة قصيرة لقياس الفهم.","امتحان منظم مع سلم تنقيط وتصحيح.","استخرج عناوين بحوث مقترحة من الدرس أو الملف."][i]+'</p><button class="btn task-kind-button" onclick="openTask(\''+k+'\')">إنشاء '+k+' ←</button></article>').join("");
 return pageHead("تنظيم التعلمات","الأنشطة والمهام التعليمية","واجبات واختبارات وامتحانات بملفين منفصلين، أو استخراج عناوين بحوث من مصادرك.",'<button class="btn primary" onclick="openTask()">＋ إنشاء نشاط</button>')+
 '<section class="task-kind-grid">'+cards+'</section><div class="section-title" style="margin-top:25px"><div><h3>الأنشطة المحفوظة</h3><p>افتح النشاط لتنزيل ملف الأسئلة وملف الإجابات.</p></div><span class="pill">'+tasks.length+' نشاط</span></div>'+
 (tasks.length?'<div class="task-saved-grid">'+tasks.slice().reverse().map(t=>'<article class="task-saved-card"><div class="task-saved-head" style="--task-accent:'+(accents[t.category]||"#66836d")+'"><span>'+escTask(t.category)+'</span><b>'+(t.category==="بحث"?"عناوين مقترحة":"رقم "+(t.number||"—"))+'</b></div><div class="task-saved-body"><h3>'+escTask(t.title)+'</h3><p><b>المادة:</b> '+escTask(t.subject||"—")+'</p><p><b>المستوى:</b> '+escTask(t.level||"—")+'</p>'+(t.category!=="بحث"?'<span class="task-score-chip">التنقيط على '+escTask(t.maxScore||20)+'</span>':'')+'<div class="item-actions"><button class="btn primary small" onclick="viewTask(\''+t.id+'\')">عرض الملفات</button><button class="btn light small" onclick="deleteTask(\''+t.id+'\')">حذف</button></div></div></article>').join("")+'</div>':empty("لا توجد أنشطة محفوظة بعد","اختر نوع النشاط من البطاقات أعلاه."))+
 (games.length?'<div class="section-title" style="margin-top:28px"><div><h3>الأنشطة التفاعلية السابقة</h3><p>احتفظنا بالأنشطة القديمة.</p></div></div><div class="cards">'+games.slice().reverse().map(a=>'<article class="item-card"><h3>'+escTask(a.title)+'</h3><p>'+escTask(a.subject||"")+' · '+escTask(a.level||"")+'</p><div class="item-actions">'+btn("فتح","viewActivity('"+a.id+"')","light small")+btn("تعديل","editActivity('"+a.id+"')","secondary small")+btn("حذف","deleteItem('activities','"+a.id+"')","danger small")+'</div></article>').join("")+'</div>':"");
};
window.openTask=function(category){
 const kind=category||"واجب منزلي",n=numberFor(kind);
 openModal("إنشاء "+kind,"أدخل المادة والمستوى وأرفق مصدر الدرس.",'<form id="taskCreateForm"><div class="task-form-banner" style="--task-accent:'+accents[kind]+'"><div><span>نشاط جديد</span><strong>'+(kind==="بحث"?"اقتراحات بحث":kind+" رقم "+n)+'</strong></div><i>'+(kind==="بحث"?"⌕":"▤")+'</i></div><div class="form-grid">'+
 '<div class="form-field"><label>المادة</label><input id="taskSubject" required placeholder="مثال: علوم الطبيعة والحياة"></div><div class="form-field"><label>المستوى الدراسي</label><input id="taskLevel" required placeholder="مثال: الرابعة متوسط"></div>'+
 (kind!=="بحث"?'<div class="form-field full"><label>العلامة الكلية</label><select id="taskMaxScore"><option value="10">التنقيط على 10</option><option value="20" selected>التنقيط على 20</option></select><small class="muted">توزّع النقاط على الأسئلة ويظهر سلم التصحيح في ملف الإجابات.</small></div>':'')+
 '<div class="form-field full"><label>مصدر النشاط</label><select id="taskSourceType" onchange="midadTaskSourceTypeChanged()"><option value="text">نص الدرس</option><option value="file">ملف PDF أو Word</option><option value="video">فيديو (مع تفريغ نصه)</option></select></div>'+
 '<div class="form-field full" id="taskTextSource"><label>نص الدرس</label><textarea id="taskSourceText" rows="7" placeholder="الصق محتوى الدرس هنا..."></textarea></div>'+
 '<div class="form-field full" id="taskVideoSource" style="display:none"><label>رابط YouTube</label><input id="taskSourceUrl" type="url" placeholder="https://www.youtube.com/..."><label>تفريغ الفيديو</label><textarea id="taskVideoTranscript" rows="6" placeholder="الصق تفريغ الفيديو؛ الرابط وحده لا يستخرج الكلام."></textarea></div>'+
 '<div class="form-field full" id="taskFileSource" style="display:none"><label>رفع ملف الدرس</label><input id="taskSourceFile" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="midadReadTaskFile(this)"><small class="muted">يدعم PDF وWord DOCX.</small><textarea id="taskFileText" rows="6" placeholder="سيظهر النص المستخرج هنا..."></textarea></div><p class="muted full" id="taskSourceHint">سيعتمد النشاط على محتوى الدرس المرفق.</p></div><div class="modal-actions"><button type="submit" class="btn primary" id="taskGenerateButton">إنشاء '+kind+' بالذكاء الاصطناعي</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
 const form=$("taskCreateForm");if(form)form.addEventListener("submit",window.generateTaskFromSource);
};
window.midadTaskSourceTypeChanged=function(){const type=$("taskSourceType")?.value||"text";["taskTextSource","taskVideoSource","taskFileSource"].forEach(id=>{const el=$(id);if(el)el.style.display="none"});const el=$(type==="video"?"taskVideoSource":type==="file"?"taskFileSource":"taskTextSource");if(el)el.style.display="";const hint=$("taskSourceHint");if(hint)hint.textContent=type==="video"?"أدخل رابط YouTube وتفريغ الكلام يدوياً؛ لا نستخرج الصوت تلقائياً حالياً.":type==="file"?"اقرأ الملف أولاً ثم أنشئ النشاط.":"ألصق نص الدرس ليُبنى النشاط عليه."};
window.midadReadTaskFile=async function(input){const file=input?.files?.[0],out=$("taskFileText");if(!file||!out)return;out.value="جارٍ استخراج النص...";try{out.value=await window.midadExtractDocumentText(file);toast("تم استخراج النص من الملف.")}catch(e){out.value="";toast(e.message||"تعذرت قراءة الملف.")}};
window.generateTaskFromSource=async function(e){
 if(e?.preventDefault)e.preventDefault();
 const banner=document.querySelector("#taskCreateForm .task-form-banner strong")?.textContent||"",kind=banner.includes("بحث")?"بحث":banner.includes("اختبار")?"اختبار":banner.includes("امتحان")?"امتحان":"واجب منزلي";
 const subject=$("taskSubject")?.value.trim()||"",level=$("taskLevel")?.value.trim()||"",maxScore=Number($("taskMaxScore")?.value||20),type=$("taskSourceType")?.value||"text";
 const content=(type==="file"?$("taskFileText")?.value:type==="video"?$("taskVideoTranscript")?.value:$("taskSourceText")?.value)||"",sourceUrl=type==="video"?$("taskSourceUrl")?.value.trim()||"":"",button=$("taskGenerateButton");
 if(!subject||!level){toast("أدخل المادة والمستوى الدراسي.");return false}
 if(content.trim().length<80){toast("أدخل نصاً لا يقل عن 80 حرفاً.");return false}
 if(type==="video"&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(sourceUrl)){toast("أدخل رابط YouTube صحيحاً يبدأ بـ HTTPS.");return false}
 if(!db?.aiEndpoint){toast("لم يُضبط رابط الذكاء الاصطناعي.");return false}
 if(button){button.disabled=true;button.textContent="يجري إعداد النشاط والملفات..."}
 try{
  const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"task",taskCategory:kind,category:kind,subject,level,maxScore,content,sourceUrl,sourceType:type})});
  const payload=await response.json();if(!response.ok)throw Error(payload.error||"تعذر إنشاء النشاط.");
  const result=payload.result||payload;
  if(kind==="بحث"&&(!Array.isArray(result.suggestions)||!result.suggestions.length))throw Error("لم يتم استخراج عناوين بحث. أعد المحاولة.");
  if(kind!=="بحث"&&(!Array.isArray(result.questions)||!result.questions.length))throw Error("لم يتم إنشاء أسئلة صالحة.");
  const number=numberFor(kind),title=kind==="بحث"?"عناوين بحوث مقترحة — "+subject:kind+" رقم "+number;
  const item={id:taskId(),kind:"task",category:kind,number,title,subject,level,maxScore:kind==="بحث"?null:maxScore,generatedData:result,sourceType:type,sourceUrl,created:new Date().toISOString()};
  db.activities=db.activities||[];db.activities.push(item);save();closeModal();render();toast(kind==="بحث"?"تم استخراج عناوين البحوث.":"تم إنشاء النشاط وملفا الأسئلة والإجابات.");
 }catch(err){toast(err.message||"تعذر إنشاء النشاط.");if(button){button.disabled=false;button.textContent="إنشاء "+kind+" بالذكاء الاصطناعي"}}
 return false;
};
window.viewTask=function(id){
 const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;const d=t.generatedData||{},research=t.category==="بحث";
 const body=research?'<div class="task-file-heading research"><span>⌕</span><div><small>عناوين بحوث مقترحة</small><h3>'+escTask(t.subject)+'</h3></div></div><ol class="task-research-list">'+(d.suggestions||[]).map(x=>'<li>'+escTask(x)+'</li>').join("")+'</ol>':
 '<div class="task-file-heading questions"><span>01</span><div><small>'+escTask(t.category)+' رقم '+escTask(t.number)+'</small><h3>'+escTask(t.subject)+'</h3><p>'+escTask(t.level)+' · العلامة على '+escTask(t.maxScore)+'</p></div></div><h4>معاينة الأسئلة</h4><ol class="task-question-list">'+(d.questions||[]).map(q=>'<li>'+escTask(q.question)+' <b>('+escTask(q.points)+' ن)</b></li>').join("")+'</ol><div class="task-file-heading answers"><span>✓</span><div><small>ملف التصحيح</small><h3>الإجابات النموذجية وسلم التنقيط</h3></div></div><ol class="task-answer-list">'+(d.questions||[]).map(q=>'<li><b>'+escTask(q.question)+'</b><p>'+escTask(q.answer)+'</p><span>'+escTask(q.points)+' / '+escTask(t.maxScore)+' ن</span></li>').join("")+'</ol><p class="task-total-score">المجموع: '+escTask(t.maxScore)+' / '+escTask(t.maxScore)+'</p>';
 const buttons=research?'<button class="btn primary" onclick="downloadTaskPdf(\''+t.id+'\',\'research\')">تنزيل قائمة العناوين PDF</button>':'<div class="task-download-row"><button class="btn primary" onclick="downloadTaskPdf(\''+t.id+'\',\'questions\')">تنزيل ملف الأسئلة PDF</button><button class="btn secondary" onclick="downloadTaskPdf(\''+t.id+'\',\'answers\')">تنزيل ملف الإجابات PDF</button></div>';
 openModal(escTask(t.title),"ملفات النشاط المنفصلة",body+buttons+'<div class="modal-actions"><button class="btn light" onclick="closeModal()">إغلاق</button></div>',true);
};
window.downloadTaskPdf=async function(id,part){
 const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;
 try{
  if(!window.html2canvas)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  if(!window.jspdf?.jsPDF)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  const d=t.generatedData||{},research=t.category==="بحث",answers=part==="answers",heading=research?"عناوين بحوث مقترحة":answers?"الإجابات النموذجية وسلم التنقيط":"أسئلة "+t.category+" رقم "+t.number;
  const color=research?"#806aa0":answers?"#5579a8":"#537d68";
  const rows=research?(d.suggestions||[]).map(x=>'<li>'+escTask(x)+'</li>').join(""):(d.questions||[]).map((q,i)=>'<li><b>'+(i+1)+'. '+escTask(q.question)+'</b>'+'<small style="display:block;color:'+color+';font-weight:bold">'+escTask(q.points)+' نقاط</small>'+(answers?'<p>'+escTask(q.answer)+'</p>':'')+'</li>').join("");
  const markup='<article dir="rtl" style="width:794px;min-height:1123px;box-sizing:border-box;padding:58px 64px;background:white;color:#263b30;font-family:Tajawal,Arial,sans-serif"><header style="border-bottom:4px solid '+color+';padding-bottom:20px;margin-bottom:30px"><div style="font-size:17px;color:#718174;font-weight:bold">مِداد · وثيقة تعليمية</div><h1 style="font-size:34px;margin:14px 0;color:#294b39">'+escTask(heading)+'</h1><div style="font-size:18px;color:#65786a"><b>المادة:</b> '+escTask(t.subject)+'　 <b>المستوى:</b> '+escTask(t.level)+'</div>'+(!research?'<div style="margin-top:12px;font-size:18px;color:'+color+';font-weight:bold">العلامة الكلية: '+escTask(t.maxScore)+' / '+escTask(t.maxScore)+'</div>':'')+'</header><ol style="padding-right:30px;font-size:22px;line-height:1.9">'+rows+'</ol>'+(!research&&answers?'<footer style="margin-top:42px;padding:20px;border-radius:15px;background:#edf4ed;font-size:21px;font-weight:bold;color:#315b3e">المجموع النهائي: '+escTask(t.maxScore)+' / '+escTask(t.maxScore)+'</footer>':'')+'<footer style="margin-top:60px;border-top:1px solid #e1e9e0;padding-top:14px;font-size:14px;color:#879589">مِداد — وثيقة معدّة للطباعة</footer></article>';
  const host=document.createElement("div");host.style.cssText="position:fixed;left:-20000px;top:0;z-index:-1";host.innerHTML=markup;document.body.appendChild(host);
  try{const canvas=await window.html2canvas(host.firstElementChild,{scale:1,backgroundColor:"#fff"}),PDF=window.jspdf.jsPDF,pdf=new PDF({orientation:"portrait",unit:"pt",format:"a4",compress:true});pdf.addImage(canvas.toDataURL("JPEG",.95),"JPEG",0,0,595.28,841.89);pdf.save((research?"عناوين-بحوث":answers?"الإجابات-النموذجية":"الأسئلة")+"-"+(t.number||"")+".pdf")}finally{host.remove()}
 }catch(e){toast("تعذر تجهيز PDF. تحقق من الاتصال ثم أعد المحاولة.")}
};
window.deleteTask=function(id){if(!confirm("هل تريد حذف هذا النشاط؟"))return;db.activities=db.activities.filter(x=>x.id!==id);save();render();toast("تم حذف النشاط")};
})();