(function(){
"use strict";
const escTask=v=>window.esc?window.esc(v==null?"":String(v)):String(v??"");
const taskKinds=["واجب منزلي","اختبار","امتحان","بحث"];
const taskId=()=>"task-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
window.activitiesPage=function(){
 const tasks=(db.activities||[]).filter(x=>x.kind==="task");
 const games=(db.activities||[]).filter(x=>x.kind!=="task");
 const cards=taskKinds.map((kind,i)=>'<article class="item-card"><div class="item-top"><div class="item-symbol">'+["▤","▧","▦","⌕"][i]+'</div><span class="pill">'+(tasks.filter(t=>t.category===kind).length)+' محفوظ</span></div><h3>'+kind+'</h3><p>'+["أنشئ واجباً منزلياً وحدد المطلوب وموعد التسليم.","جهّز اختباراً قصيراً لمتابعة الفهم.","نظّم امتحاناً مع المدة والتعليمات.","كلّف التلاميذ ببحث مع تحديد محاوره ومصادره."][i]+'</p><div class="item-actions"><button class="btn primary small" onclick="openTask(\''+kind+'\')">إنشاء '+kind+'</button></div></article>').join("");
 return pageHead("تنظيم التعلمات","الأنشطة والمهام التعليمية","أنشئ الواجبات والاختبارات والامتحانات والبحوث، واحتفظ بها في مكان واحد.",'<button class="btn primary" onclick="openTask()">＋ إنشاء مهمة</button>')+
 '<section class="cards">'+cards+'</section>'+
 '<div class="section-title" style="margin-top:22px"><div><h3>المهام المحفوظة</h3><p>يمكنك فتح المهمة أو تعديلها أو حذفها</p></div><span class="pill">'+tasks.length+' مهمة</span></div>'+
 (tasks.length?'<div class="cards">'+tasks.slice().reverse().map(t=>'<article class="item-card"><div class="item-top"><div class="item-symbol">▤</div><span class="pill blue">'+escTask(t.category)+'</span></div><h3>'+escTask(t.title)+'</h3><p>'+escTask(t.subject||"")+' · '+escTask(t.level||"")+'</p><div class="item-meta">'+(t.due?'<span class="pill">التسليم: '+escTask(t.due)+'</span>':'')+'</div><div class="item-actions"><button class="btn light small" onclick="viewTask(\''+t.id+'\')">عرض</button><button class="btn secondary small" onclick="openTask(\''+escTask(t.category)+'\',\''+t.id+'\')">تعديل</button><button class="btn danger small" onclick="deleteTask(\''+t.id+'\')">حذف</button></div></article>').join("")+'</div>':empty("لا توجد مهام محفوظة بعد","اختر نوع المهمة من البطاقات أعلاه لإنشاء أول مهمة."))+
 (games.length?'<div class="section-title" style="margin-top:25px"><div><h3>الألعاب والأنشطة التفاعلية السابقة</h3><p>احتفظنا بالأنشطة التي أنشأتها سابقاً دون حذفها</p></div></div><div class="cards">'+games.slice().reverse().map(a=>'<article class="item-card"><div class="item-top"><div class="item-symbol">◇</div><span class="pill blue">'+escTask(a.type||"نشاط تفاعلي")+'</span></div><h3>'+escTask(a.title)+'</h3><p>'+escTask(a.subject||"")+' · '+escTask(a.level||"")+'</p><div class="item-actions">'+btn("فتح","viewActivity('"+a.id+"')","light small")+btn("تعديل","editActivity('"+a.id+"')","secondary small")+btn("حذف","deleteItem('activities','"+a.id+"')","danger small")+'</div></article>').join("")+'</div>':"");
};
window.openTask=function(category,edit){
 const old=edit?(db.activities||[]).find(x=>x.id===edit):null;
 const kind=category||old?.category||"واجب منزلي",a=old||{};
 if(!old){
  openModal("إنشاء "+kind,"اختر نوع المهمة ثم مصدرها ليُنشئ الذكاء الاصطناعي المهمة.",'<form onsubmit="generateTaskFromSource(event)"><div class="form-grid">'+
  '<div class="form-field full"><label>نوع المهمة</label><select name="category" id="taskCategory">'+taskKinds.map(k=>'<option '+(k===kind?'selected':'')+'>'+k+'</option>').join("")+'</select></div>'+
  '<div class="form-field full"><label>المصدر</label><select name="sourceType" id="taskSourceType" onchange="midadTaskSourceTypeChanged()"><option value="text">نص</option><option value="video">فيديو</option><option value="file">ملف</option></select></div>'+
  '<div class="form-field full" id="taskTextSource"><label>نص الدرس</label><textarea id="taskSourceText" rows="7" placeholder="الصق نص الدرس هنا..."></textarea></div>'+
  '<div class="form-field full" id="taskVideoSource" style="display:none"><label>رابط YouTube</label><input id="taskSourceUrl" type="url" placeholder="https://www.youtube.com/..."><label style="margin-top:10px">تفريغ الفيديو أو نصه</label><textarea id="taskVideoTranscript" rows="6" placeholder="الصق تفريغ الفيديو هنا؛ الرابط وحده لا يستخرج الكلام تلقائياً."></textarea></div>'+
  '<div class="form-field full" id="taskFileSource" style="display:none"><label>رفع ملف نصي</label><input id="taskSourceFile" type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown" onchange="midadReadTaskFile(this)"><small class="muted">يدعم TXT وMD وCSV وJSON. حوّل PDF أو Word إلى نص قبل رفعه.</small><textarea id="taskFileText" rows="6" placeholder="سيظهر النص المستخرج هنا..." style="margin-top:10px"></textarea></div>'+
  '<p class="muted full" id="taskSourceHint">أدخل نص المصدر ليبني الذكاء الاصطناعي المهمة عليه.</p></div><div class="modal-actions"><button class="btn primary" id="taskGenerateButton">إنشاء المهمة بالذكاء الاصطناعي</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
  return;
 }
 openModal("تعديل المهمة","يمكنك تعديل تفاصيل المهمة المحفوظة.",'<form onsubmit="saveTask(event,\''+(edit||'')+'\')"><div class="form-grid">'+
 '<div class="form-field"><label>نوع المهمة</label><select name="category">'+taskKinds.map(k=>'<option '+(k===kind?'selected':'')+'>'+k+'</option>').join("")+'</select></div>'+
 '<div class="form-field"><label>عنوان المهمة</label><input name="title" required value="'+escTask(a.title||"")+'" placeholder="عنوان واضح ومحدد"></div>'+
 '<div class="form-field"><label>موعد التسليم أو الإنجاز</label><input name="due" type="date" value="'+escTask(a.due||"")+'"></div>'+
 '<div class="form-field"><label>المدة (للاختبار أو الامتحان)</label><input name="duration" type="number" min="1" value="'+escTask(a.duration||"")+'" placeholder="بالدقائق"></div>'+
 '<div class="form-field full"><label>التعليمات والمطلوب</label><textarea name="details" required>'+escTask(a.details||"")+'</textarea></div>'+
 '<div class="form-field full"><label>ملاحظات أو مصادر (اختياري)</label><textarea name="notes">'+escTask(a.notes||"")+'</textarea></div></div><div class="modal-actions"><button class="btn primary">حفظ المهمة</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
};
window.midadTaskSourceTypeChanged=function(){const type=$("taskSourceType")?.value||"text";["taskTextSource","taskVideoSource","taskFileSource"].forEach(id=>{const el=$(id);if(el)el.style.display="none"});const el=$(type==="video"?"taskVideoSource":type==="file"?"taskFileSource":"taskTextSource");if(el)el.style.display="";const hint=$("taskSourceHint");if(hint)hint.textContent=type==="video"?"أدخل رابط YouTube وتفريغ الكلام يدوياً؛ لا نستخرج الصوت تلقائياً حالياً.":type==="file"?"تُقرأ الملفات النصية المدعومة قبل تحليلها.":"أدخل نص المصدر ليبني الذكاء الاصطناعي المهمة عليه."};
window.midadReadTaskFile=async function(input){const file=input?.files?.[0],out=$("taskFileText");if(!file||!out)return;try{if(file.size>2*1024*1024)throw Error("حجم الملف يتجاوز 2 ميغابايت.");out.value=(await file.text()).slice(0,18000);toast("تم استخراج النص من الملف.")}catch(e){out.value="";toast(e.message||"تعذرت قراءة الملف.")}};
window.generateTaskFromSource=async function(e){
 e.preventDefault();const form=e.target,category=$("taskCategory")?.value||"واجب منزلي",type=$("taskSourceType")?.value||"text",content=(type==="file"?$("taskFileText")?.value:type==="video"?$("taskVideoTranscript")?.value:$("taskSourceText")?.value)||"",sourceUrl=type==="video"?$("taskSourceUrl")?.value.trim()||"":"",button=$("taskGenerateButton");
 if(content.trim().length<80){toast(type==="video"?"أدخل تفريغ الفيديو بما لا يقل عن 80 حرفاً.":"أدخل نصاً لا يقل عن 80 حرفاً.");return}
 if(type==="video"&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(sourceUrl)){toast("أدخل رابط YouTube صحيحاً يبدأ بـ HTTPS.");return}
 if(!db?.aiEndpoint){toast("لم يُضبط رابط الذكاء الاصطناعي في إعدادات مِداد.");return}
 if(button){button.disabled=true;button.textContent="يجري إنشاء المهمة..."}
 try{
  const response=await fetch(db.aiEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"task",taskCategory,category,content,sourceUrl,sourceType:type})});
  const payload=await response.json();if(!response.ok)throw Error(payload.error||"تعذر إنشاء المهمة.");
  const result=payload.result||payload,details=[result.instructions||"",...(Array.isArray(result.sections)?result.sections.map(x=>(x.heading||"")+(x.content?"\n"+x.content:"")):[]),...(Array.isArray(result.questions)?result.questions.map((q,i)=>(i+1)+". "+(q.question||q.q||"")+(q.answer?"\nالإجابة النموذجية: "+q.answer:"")):[])].filter(Boolean).join("\n\n");
  const item={id:taskId(),kind:"task",category,title:result.title||category,details,notes:"المصدر: "+(type==="video"?"رابط YouTube وتفريغ الفيديو":type==="file"?"ملف نصي":"نص")+(sourceUrl?"\n"+sourceUrl:""),sourceType:type,sourceUrl,generatedData:result,created:new Date().toISOString()};
  db.activities=db.activities||[];db.activities.push(item);save();closeModal();render();toast("تم إنشاء المهمة وحفظها.");
 }catch(err){toast(err.message||"تعذر إنشاء المهمة.");if(button){button.disabled=false;button.textContent="إنشاء المهمة بالذكاء الاصطناعي"}}
};
window.saveTask=function(e,edit){
 e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());
 const item={...(edit?(db.activities||[]).find(x=>x.id===edit):{}),id:edit||taskId(),kind:"task",...v};
 if(edit){const i=db.activities.findIndex(x=>x.id===edit);if(i>=0)db.activities[i]=item}else db.activities.push(item);
 save();closeModal();render();toast("تم حفظ المهمة بنجاح");
};
window.viewTask=function(id){
 const t=(db.activities||[]).find(x=>x.id===id&&x.kind==="task");if(!t)return;
 const details='<div class="lesson-preview"><h2>'+escTask(t.title)+'</h2><p><b>النوع:</b> '+escTask(t.category)+'</p><p><b>المادة:</b> '+escTask(t.subject||"—")+'　 <b>المستوى:</b> '+escTask(t.level||"—")+'</p><p><b>موعد التسليم:</b> '+escTask(t.due||"غير محدد")+'</p><hr><h3>التعليمات والمطلوب</h3><p>'+escTask(t.details).replace(/\n/g,"<br>")+'</p>'+(t.notes?'<hr><h3>ملاحظات ومصادر</h3><p>'+escTask(t.notes).replace(/\n/g,"<br>")+'</p>':"")+'</div><div class="modal-actions"><button class="btn primary" onclick="window.print()">طباعة</button><button class="btn light" onclick="closeModal()">إغلاق</button></div>';
 openModal(escTask(t.title),"تفاصيل المهمة",details,true);
};
window.deleteTask=function(id){if(!confirm("هل تريد حذف هذه المهمة؟"))return;db.activities=db.activities.filter(x=>x.id!==id);save();render();toast("تم حذف المهمة")};
})();