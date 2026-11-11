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
 const kind=category||old?.category||"واجب منزلي";
 const a=old||{};
 openModal(old?"تعديل المهمة":"إنشاء "+kind,"أدخل تفاصيل المهمة وتعليماتها.",'<form onsubmit="saveTask(event,\''+(edit||'')+'\')"><div class="form-grid">'+
 '<div class="form-field"><label>نوع المهمة</label><select name="category">'+taskKinds.map(k=>'<option '+(k===kind?'selected':'')+'>'+k+'</option>').join("")+'</select></div>'+
 '<div class="form-field"><label>عنوان المهمة</label><input name="title" required value="'+escTask(a.title||"")+'" placeholder="عنوان واضح ومحدد"></div>'+
 '<div class="form-field"><label>المادة</label><input name="subject" value="'+escTask(a.subject||"")+'" placeholder="مثال: اللغة العربية"></div>'+
 '<div class="form-field"><label>المستوى</label><input name="level" value="'+escTask(a.level||"")+'" placeholder="مثال: السنة الرابعة ابتدائي"></div>'+
 '<div class="form-field"><label>موعد التسليم أو الإنجاز</label><input name="due" type="date" value="'+escTask(a.due||"")+'"></div>'+
 '<div class="form-field"><label>المدة (للاختبار أو الامتحان)</label><input name="duration" type="number" min="1" value="'+escTask(a.duration||"")+'" placeholder="بالدقائق"></div>'+
 '<div class="form-field full"><label>التعليمات والمطلوب</label><textarea name="details" required placeholder="اكتب المطلوب من التلاميذ بالتفصيل...">'+escTask(a.details||"")+'</textarea></div>'+
 '<div class="form-field full"><label>ملاحظات أو مصادر (اختياري)</label><textarea name="notes" placeholder="مصادر البحث أو ملاحظات إضافية...">'+escTask(a.notes||"")+'</textarea></div></div><div class="modal-actions"><button class="btn primary">حفظ المهمة</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
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