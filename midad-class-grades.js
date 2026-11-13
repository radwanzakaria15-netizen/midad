(function(){
"use strict";
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
const kinds=["واجب","امتحان","اختبار","معدل المادة"];
const getClass=id=>(db.classes||[]).find(c=>c.id===id);
const getStudents=id=>(db.students||[]).filter(s=>s.classId===id);
function classSubjects(cl){cl.subjects=Array.isArray(cl.subjects)?cl.subjects:[];return cl.subjects}
function classCard(cl){
 const subjects=classSubjects(cl);
 return '<article class="item-card midad-grade-class"><div class="item-top"><div class="item-symbol">▤</div><span class="pill">'+getStudents(cl.id).length+' تلميذ</span></div><h3>'+esc(cl.name)+'</h3><p>المواد المتاحة لهذا القسم</p><div class="midad-grade-subjects">'+(subjects.length?subjects.map(x=>'<span class="pill blue">'+esc(x)+'</span>').join(""):'<small class="muted">لم تُضف مواد بعد</small>')+'</div><div class="item-actions"><button class="btn light small" onclick="window.midadAddClassSubject(\''+esc(cl.id)+'\')">＋ إضافة مواد</button><button class="btn primary small" onclick="window.midadOpenClassGradeBook(\''+esc(cl.id)+'\')">إرسال نقطة</button></div></article>';
}
window.midadOpenClassGradesHome=function(){
 const classes=db.classes||[];
 openModal("إدارة النقاط","اختر الفوج لإدارة المواد وإرسال نقاط التلاميذ.",'<div class="midad-grade-home">'+(classes.length?'<div class="cards">'+classes.map(classCard).join("")+'</div>':'<div class="empty"><strong>لا توجد أفواج بعد</strong><span>أنشئ قسماً أولاً من إدارة الأقسام.</span></div>')+'</div>',true);
};
window.midadAddClassSubject=function(classId){
 const cl=getClass(classId);if(!cl)return;
 openModal("إضافة مواد — "+cl.name,"أضف مادة واحدة أو عدة مواد، كل مادة في سطر مستقل.",'<form id="midadAddSubjectsForm"><div class="form-field"><label>أسماء المواد</label><textarea name="subjects" required placeholder="اللغة العربية\nالرياضيات\nاللغة الفرنسية"></textarea></div><div class="modal-actions"><button class="btn primary">حفظ المواد</button><button type="button" class="btn light" onclick="window.midadOpenClassGradesHome()">رجوع</button></div></form>');
 document.getElementById("midadAddSubjectsForm").onsubmit=e=>{
  e.preventDefault();
  const values=String(new FormData(e.target).get("subjects")||"").split(/[\n،,;]+/).map(x=>x.trim()).filter(Boolean);
  const list=classSubjects(cl);let added=0;
  values.forEach(v=>{if(!list.some(x=>x.toLocaleLowerCase("ar")===v.toLocaleLowerCase("ar"))){list.push(v);added++}});
  if(!added){toast("المواد المدخلة موجودة مسبقاً.");return}
  if(!save())return;
  toast("تمت إضافة "+added+" مادة إلى "+cl.name+".");
  window.midadOpenClassGradesHome();
 };
};
window.midadOpenClassGradeBook=function(classId){
 const cl=getClass(classId);if(!cl)return;
 const students=getStudents(classId),subjects=classSubjects(cl);
 if(!students.length){toast("لا يوجد تلاميذ في هذا الفوج.");return}
 if(!subjects.length){window.midadAddClassSubject(classId);return}
 const subjectOptions=subjects.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
 const rows=students.map(st=>'<tr><td class="student-name">'+esc(st.name)+'</td><td><input class="filter midad-grade-score" type="number" name="score_'+esc(st.id)+'" min="0" max="100" step="0.25" placeholder="—" required></td></tr>').join("");
 openModal("إرسال نقاط — "+cl.name,"اختر المادة ونوع التقييم، ثم أدخل نقطة كل تلميذ واضغط إرسال.",'<form id="midadClassGradeForm"><div class="form-grid"><div class="form-field"><label>المادة</label><select name="subject" required>'+subjectOptions+'</select></div><div class="form-field"><label>نوع النقطة</label><select name="kind" id="midadClassGradeKind">'+kinds.map(x=>'<option value="'+x+'">'+x+'</option>').join("")+'</select></div><div class="form-field full" id="midadGradeTitleField"><label>عنوان الواجب / الامتحان / الاختبار</label><input name="title" maxlength="120" placeholder="مثال: تقويم الفصل الأول"></div><div class="form-field"><label>العلامة على</label><input name="outOf" type="number" min="1" max="100" step="0.25" value="20" required></div></div><div class="midad-grade-roster"><div class="section-title"><h3>قائمة التلاميذ</h3><span class="pill">'+students.length+' تلميذ</span></div><div class="table-wrap"><table><thead><tr><th>التلميذ</th><th>النقطة</th></tr></thead><tbody>'+rows+'</tbody></table></div></div><div class="modal-actions"><button class="btn primary">حفظ وإرسال النقاط</button><button type="button" class="btn light" onclick="window.midadOpenClassGradesHome()">رجوع</button></div></form>');
 const form=document.getElementById("midadClassGradeForm"),kind=form.elements.kind,titleField=document.getElementById("midadGradeTitleField");
 const syncTitle=()=>{const average=kind.value==="معدل المادة";titleField.style.display=average?"none":"grid";form.elements.title.required=!average;if(average)form.elements.title.value="معدل المادة"};
 kind.addEventListener("change",syncTitle);syncTitle();
 form.onsubmit=e=>{
  e.preventDefault();
  const data=new FormData(form),subject=String(data.get("subject")||""),type=String(data.get("kind")||""),outOf=Number(data.get("outOf"));
  const title=type==="معدل المادة"?"معدل المادة":String(data.get("title")||"").trim();
  if(!title||!Number.isFinite(outOf)||outOf<=0){toast("أدخل عنوان التقييم والدرجة الكاملة بشكل صحيح.");return}
  const now=new Date().toISOString();db.grades=db.grades||[];let count=0;
  for(const st of students){
   const raw=data.get("score_"+st.id);if(raw===null||String(raw).trim()==="")continue;
   const score=Number(raw);if(!Number.isFinite(score)||score<0||score>outOf){toast("تحقق من نقاط التلميذ: "+st.name);return}
  }
  for(const st of students){
   const raw=data.get("score_"+st.id);if(raw===null||String(raw).trim()==="")continue;
   const score=Number(raw);
   const old=db.grades.find(g=>g.classId===classId&&g.studentId===st.id&&g.subject===subject&&g.kind===type&&g.title===title&&!g.taskId);
   const grade={id:old?.id||("grade-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)),taskId:null,studentId:st.id,classId,subject,kind:type,title,score,outOf,feedback:"",published:true,publishedAt:now,createdAt:old?.createdAt||now};
   if(old)Object.assign(old,grade);else db.grades.push(grade);count++;
  }
  if(!count){toast("أدخل نقطة تلميذ واحد على الأقل.");return}
  if(!save())return;
  closeModal();render();toast("تم إرسال "+count+" نقطة إلى فضاءات التلاميذ.");
 };
};
const style=document.createElement("style");
style.textContent=`
.midad-grade-home .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
.midad-grade-class{display:flex;flex-direction:column;gap:10px}
.midad-grade-class h3{margin:0}.midad-grade-class p{margin:0}
.midad-grade-subjects{display:flex;gap:6px;flex-wrap:wrap;min-height:25px}
.midad-grade-roster{margin-top:16px}.midad-grade-roster .section-title{margin-bottom:9px}
.midad-grade-score{width:105px;min-width:85px;text-align:center}
@media(max-width:760px){.midad-grade-home .cards{grid-template-columns:1fr}.midad-grade-score{width:100%}}
`;
document.head.appendChild(style);
})();