(function(){
"use strict";
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
const kinds=["واجب","امتحان","اختبار","معدل المادة"];
const getClass=id=>(db.classes||[]).find(c=>c.id===id);
const getStudents=id=>(db.students||[]).filter(s=>s.classId===id);
function classSubjects(cl){cl.subjects=Array.isArray(cl.subjects)?cl.subjects:[];return cl.subjects}
function classCard(cl){
 const subjects=classSubjects(cl);
 return '<article class="item-card midad-grade-class"><div class="item-top"><div class="item-symbol">▤</div><span class="pill">'+getStudents(cl.id).length+' تلميذ</span></div><h3>'+esc(cl.name)+'</h3><p>المواد المتاحة لهذا القسم</p><div class="midad-grade-subjects">'+(subjects.length?subjects.map(x=>'<span class="pill blue">'+esc(x)+'</span>').join(""):'<small class="muted">لم تُضف مواد بعد</small>')+'</div><div class="item-actions"><button class="btn light small" onclick="window.midadAddClassSubject(\''+esc(cl.id)+'\')">＋ إضافة مواد</button><button class="btn primary small" onclick="window.midadOpenClassGradeBook(\''+esc(cl.id)+'\')">رفع نقاط</button></div></article>';
}
window.midadOpenClassGradesHome=function(){
 const all=db.grades||[],viewed=all.filter(g=>g.published&&g.viewedAt).length;
 openModal("إدارة النقاط","اختر المهمة التي تريد تنفيذها.",'<div class="midad-grade-home"><div class="midad-grade-actions"><button class="btn primary" onclick="window.midadOpenGradeUpload()">＋ رفع نقاط</button><button class="btn light" onclick="window.midadOpenGradeRegister()">النقاط المرسلة ('+all.length+')</button></div><div class="midad-grade-summary"><span>إجمالي النقاط: <b>'+all.length+'</b></span><span>اطّلع عليها الطلاب: <b>'+viewed+'</b></span><span>بانتظار الاطلاع: <b>'+Math.max(0,all.filter(g=>g.published).length-viewed)+'</b></span></div></div>',true);
};
window.midadOpenGradeUpload=function(){
 const classes=db.classes||[];
 openModal("رفع نقاط","اختر الفوج لإدخال نقاط التلاميذ وإرسالها.",'<div class="midad-grade-home">'+(classes.length?'<div class="cards">'+classes.map(classCard).join("")+'</div>':'<div class="empty"><strong>لا توجد أفواج بعد</strong><span>أنشئ قسماً أولاً من إدارة الأقسام.</span></div>')+'<div class="modal-actions"><button class="btn light" onclick="window.midadOpenClassGradesHome()">رجوع</button></div></div>',true);
};
window.midadOpenGradeRegister=function(){
 const grades=(db.grades||[]).slice().sort((a,b)=>(b.publishedAt||b.createdAt||"").localeCompare(a.publishedAt||a.createdAt||""));
 const rows=grades.map(g=>{
  const st=(db.students||[]).find(s=>s.id===g.studentId),cl=getClass(g.classId);
  const status=g.viewedAt?'<span class="pill green">اطّلع عليها</span>':'<span class="pill rose">لم يطّلع عليها</span>';
  return '<tr><td>'+esc(st?.name||"تلميذ محذوف")+'</td><td>'+esc(cl?.name||"—")+'</td><td>'+esc(g.subject||"—")+'</td><td>'+esc(g.title||g.kind||"—")+'</td><td><b>'+esc(g.score)+' / '+esc(g.outOf||20)+'</b></td><td>'+status+'</td><td><div class="item-actions"><button class="btn light small" onclick="window.midadEditGrade(\''+esc(g.id)+'\')">تعديل</button><button class="btn danger small" onclick="window.midadDeleteGrade(\''+esc(g.id)+'\')">حذف</button></div></td></tr>';
 }).join("");
 openModal("النقاط المرسلة","راجع العلامات وعدّلها أو احذفها. حالة الاطلاع تُسجّل عندما يفتح الطالب قسم النقاط.",'<div class="midad-grade-register"><div class="toolbar"><input class="field-search" id="midadGradeSearch" placeholder="ابحث باسم التلميذ أو المادة..." oninput="window.midadFilterGradeRows(this.value)"><select class="filter" id="midadGradeClassFilter" onchange="window.midadFilterGradeRows(document.getElementById(\'midadGradeSearch\').value)"><option value="">كل الأفواج</option>'+(db.classes||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("")+'</select></div><div class="table-wrap"><table><thead><tr><th>التلميذ</th><th>الفوج</th><th>المادة</th><th>التقييم</th><th>النقطة</th><th>حالة الاطلاع</th><th>إجراء</th></tr></thead><tbody id="midadGradeRows">'+(rows||'<tr><td colspan="7">لا توجد نقاط مرسلة بعد.</td></tr>')+'</tbody></table></div><div class="modal-actions"><button class="btn light" onclick="window.midadOpenClassGradesHome()">رجوع</button></div></div>',true);
};
window.midadFilterGradeRows=function(q){
 const term=String(q||"").trim().toLocaleLowerCase("ar"),cid=document.getElementById("midadGradeClassFilter")?.value||"";
 document.querySelectorAll("#midadGradeRows tr").forEach(row=>{row.style.display=(!term||row.textContent.toLocaleLowerCase("ar").includes(term))&&(!cid||row.children[1]?.textContent===(getClass(cid)?.name||""))?"":"none"});
};
window.midadEditGrade=function(gradeId){
 const g=(db.grades||[]).find(x=>x.id===gradeId);if(!g)return;
 openModal("تعديل النقطة","سيظهر التعديل في سجل الطالب بعد حفظه.",'<form id="midadEditGradeForm"><div class="form-grid"><div class="form-field"><label>المادة</label><input name="subject" value="'+esc(g.subject||"")+'" required></div><div class="form-field"><label>نوع التقييم</label><select name="kind">'+kinds.map(k=>'<option '+(g.kind===k?'selected':'')+'>'+k+'</option>').join("")+'</select></div><div class="form-field full"><label>عنوان التقييم</label><input name="title" value="'+esc(g.title||"")+'" required></div><div class="form-field"><label>النقطة</label><input name="score" type="number" min="0" step=".25" max="'+Number(g.outOf||20)+'" value="'+Number(g.score)+'" required></div><div class="form-field"><label>العلامة على</label><input name="outOf" type="number" min="1" max="100" step=".25" value="'+Number(g.outOf||20)+'" required></div><div class="form-field full"><label>ملاحظة للأستاذ (اختيارية)</label><input name="feedback" value="'+esc(g.feedback||"")+'"></div></div><div class="modal-actions"><button class="btn primary">حفظ التعديل</button><button type="button" class="btn light" onclick="window.midadOpenGradeRegister()">إلغاء</button></div></form>');
 document.getElementById("midadEditGradeForm").onsubmit=e=>{
  e.preventDefault();const d=new FormData(e.target),outOf=Number(d.get("outOf")),score=Number(d.get("score"));
  if(!Number.isFinite(outOf)||outOf<=0||!Number.isFinite(score)||score<0||score>outOf){toast("تحقق من النقطة والدرجة الكاملة.");return}
  Object.assign(g,{subject:String(d.get("subject")).trim(),kind:String(d.get("kind")),title:String(d.get("title")).trim(),score,outOf,feedback:String(d.get("feedback")||"").trim(),updatedAt:new Date().toISOString()});
  if(!save())return;toast("تم تعديل النقطة.");window.midadOpenGradeRegister();
 };
};
window.midadDeleteGrade=function(gradeId){
 const g=(db.grades||[]).find(x=>x.id===gradeId);if(!g)return;
 if(!confirm("هل تريد حذف هذه النقطة نهائياً من السجل؟"))return;
 db.grades=db.grades.filter(x=>x.id!==gradeId);if(!save())return;toast("تم حذف النقطة.");window.midadOpenGradeRegister();
};
window.midadAddClassSubject=function(classId){
 const cl=getClass(classId);if(!cl)return;
 openModal("إضافة مواد — "+cl.name,"أضف مادة واحدة أو عدة مواد، كل مادة في سطر مستقل.",'<form id="midadAddSubjectsForm"><div class="form-field"><label>أسماء المواد</label><textarea name="subjects" required placeholder="اللغة العربية&#10;الرياضيات&#10;اللغة الفرنسية"></textarea></div><div class="modal-actions"><button class="btn primary">حفظ المواد</button><button type="button" class="btn light" onclick="window.midadOpenGradeUpload()">رجوع</button></div></form>');
 document.getElementById("midadAddSubjectsForm").onsubmit=e=>{
  e.preventDefault();const values=String(new FormData(e.target).get("subjects")||"").split(/[\n،,;]+/).map(x=>x.trim()).filter(Boolean);
  const list=classSubjects(cl);let added=0;values.forEach(v=>{if(!list.some(x=>x.toLocaleLowerCase("ar")===v.toLocaleLowerCase("ar"))){list.push(v);added++}});
  if(!added){toast("المواد المدخلة موجودة مسبقاً.");return}if(!save())return;toast("تمت إضافة "+added+" مادة إلى "+cl.name+".");window.midadOpenGradeUpload();
 };
};
window.midadOpenClassGradeBook=function(classId){
 const cl=getClass(classId);if(!cl)return;
 const students=getStudents(classId),subjects=classSubjects(cl);
 if(!students.length){toast("لا يوجد تلاميذ في هذا الفوج.");return}
 if(!subjects.length){window.midadAddClassSubject(classId);return}
 const subjectOptions=subjects.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
 const rows=students.map(st=>'<tr><td class="student-name">'+esc(st.name)+'</td><td><input class="filter midad-grade-score" type="number" name="score_'+esc(st.id)+'" min="0" max="100" step="0.25" placeholder="—"></td></tr>').join("");
 openModal("رفع نقاط — "+cl.name,"اختر المادة ونوع التقييم، ثم أدخل نقاط التلاميذ الذين تريد إرسالها.",'<form id="midadClassGradeForm"><div class="form-grid"><div class="form-field"><label>المادة</label><select name="subject" required>'+subjectOptions+'</select></div><div class="form-field"><label>نوع النقطة</label><select name="kind" id="midadClassGradeKind">'+kinds.map(x=>'<option value="'+x+'">'+x+'</option>').join("")+'</select></div><div class="form-field full" id="midadGradeTitleField"><label>عنوان الواجب / الامتحان / الاختبار</label><input name="title" maxlength="120" placeholder="مثال: تقويم الفصل الأول"></div><div class="form-field"><label>العلامة على</label><input name="outOf" type="number" min="1" max="100" step="0.25" value="20" required></div></div><div class="midad-grade-roster"><div class="section-title"><h3>قائمة التلاميذ</h3><span class="pill">'+students.length+' تلميذ</span></div><div class="table-wrap"><table><thead><tr><th>التلميذ</th><th>النقطة</th></tr></thead><tbody>'+rows+'</tbody></table></div></div><div class="modal-actions"><button class="btn primary">حفظ وإرسال النقاط</button><button type="button" class="btn light" onclick="window.midadOpenGradeUpload()">رجوع</button></div></form>');
 const form=document.getElementById("midadClassGradeForm"),kind=form.elements.kind,titleField=document.getElementById("midadGradeTitleField");
 const syncTitle=()=>{const average=kind.value==="معدل المادة";titleField.style.display=average?"none":"grid";form.elements.title.required=!average;if(average)form.elements.title.value="معدل المادة"};
 kind.addEventListener("change",syncTitle);syncTitle();
 form.onsubmit=e=>{
  e.preventDefault();const data=new FormData(form),subject=String(data.get("subject")||""),type=String(data.get("kind")||""),outOf=Number(data.get("outOf"));
  const title=type==="معدل المادة"?"معدل المادة":String(data.get("title")||"").trim();
  if(!title||!Number.isFinite(outOf)||outOf<=0){toast("أدخل عنوان التقييم والدرجة الكاملة بشكل صحيح.");return}
  const now=new Date().toISOString();db.grades=db.grades||[];let count=0;
  for(const st of students){const raw=data.get("score_"+st.id);if(raw===null||String(raw).trim()==="")continue;const score=Number(raw);if(!Number.isFinite(score)||score<0||score>outOf){toast("تحقق من نقاط التلميذ: "+st.name);return}}
  for(const st of students){
   const raw=data.get("score_"+st.id);if(raw===null||String(raw).trim()==="")continue;
   const score=Number(raw),old=db.grades.find(g=>g.classId===classId&&g.studentId===st.id&&g.subject===subject&&g.kind===type&&g.title===title&&!g.taskId);
   const grade={id:old?.id||("grade-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)),taskId:null,studentId:st.id,classId,subject,kind:type,title,score,outOf,feedback:old?.feedback||"",published:true,publishedAt:now,createdAt:old?.createdAt||now,viewedAt:old?.viewedAt||null};
   if(old)Object.assign(old,grade);else db.grades.push(grade);count++;
  }
  if(!count){toast("أدخل نقطة تلميذ واحد على الأقل.");return}
  if(!save())return;closeModal();render();toast("تم تسجيل وإرسال "+count+" نقطة. ستظهر حالة الاطلاع في سجل النقاط.");
 };
};
const style=document.createElement("style");
style.textContent='.midad-grade-home .cards{grid-template-columns:repeat(2,minmax(0,1fr))}.midad-grade-class{display:flex;flex-direction:column;gap:10px}.midad-grade-class h3{margin:0}.midad-grade-class p{margin:0}.midad-grade-subjects{display:flex;gap:6px;flex-wrap:wrap;min-height:25px}.midad-grade-score{width:105px;min-width:85px;text-align:center}.midad-grade-actions{display:flex;gap:10px;flex-wrap:wrap}.midad-grade-actions .btn{flex:1;min-width:150px}.midad-grade-summary{display:flex;gap:10px;flex-wrap:wrap;margin-top:15px}.midad-grade-summary span{background:#f5ece2;border-radius:12px;padding:10px 12px;font-size:12px;color:var(--deep)}.midad-grade-register .item-actions{min-width:145px}.midad-grade-register .item-actions .btn{flex:1}@media(max-width:760px){.midad-grade-home .cards{grid-template-columns:1fr}.midad-grade-score{width:100%}.midad-grade-register .table-wrap{max-height:55vh}}';
document.head.appendChild(style);
})();