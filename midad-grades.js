(() => {
"use strict";
const esc=v=>window.esc?window.esc(String(v??"")):String(v??"");
window.midadOpenGradePublisher=function(taskId){
 const task=(db.activities||[]).find(x=>x.id===taskId);
 if(!task||!task.assignment){toast("هذا النشاط غير مسند إلى تلاميذ بعد.");return}
 const a=task.assignment;
 const students=(db.students||[]).filter(st=>a.scope==="student"?st.id===a.studentId:st.classId===a.classId);
 if(!students.length){toast("لا يوجد تلاميذ مرتبطون بهذا الواجب.");return}
 db.grades=db.grades||[];
 const existing=db.grades.filter(g=>g.taskId===taskId);
 const options=students.map(st=>'<option value="'+esc(st.id)+'">'+esc(st.name)+'</option>').join("");
 const rows=existing.map(g=>{const st=students.find(x=>x.id===g.studentId);return st?'<div class="grade-existing-row"><span>'+esc(st.name)+'</span><b>'+esc(g.score)+'/'+esc(g.outOf||20)+'</b><small>'+(g.published?"أُرسلت":"مسودة")+'</small></div>':""}).join("");
 openModal("تصحيح الواجب وإرسال النقاط","اختر التلميذ، أدخل علامته وملاحظتك، ثم أرسل النتيجة لتظهر في فضائه.",'<form id="midadGradeForm"><div class="form-grid"><div class="form-field full"><label>الواجب</label><input value="'+esc(task.title||task.category||"واجب")+'" disabled></div><div class="form-field full"><label>التلميذ</label><select name="studentId" required>'+options+'</select></div><div class="form-field"><label>النقطة</label><input name="score" type="number" min="0" max="100" step="0.25" value="0" required></div><div class="form-field"><label>على</label><input name="outOf" type="number" min="1" max="100" step="0.25" value="20" required></div><div class="form-field full"><label>ملاحظة للطالب (اختيارية)</label><textarea name="feedback" placeholder="أحسنت، أو وضّح ما يحتاج إلى تحسين..."></textarea></div></div><div class="modal-actions"><button class="btn primary">حفظ وإرسال النقطة</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>'+(rows?'<section class="grade-existing"><h4>النقاط المرسلة لهذا الواجب</h4>'+rows+'</section>':""));
 document.getElementById("midadGradeForm").onsubmit=e=>window.midadSaveGrade(e,taskId);
};
window.midadSaveGrade=function(e,taskId){
 e.preventDefault();
 const task=(db.activities||[]).find(x=>x.id===taskId);if(!task?.assignment)return;
 const f=new FormData(e.target),studentId=String(f.get("studentId")||""),score=Number(f.get("score")),outOf=Number(f.get("outOf")),feedback=String(f.get("feedback")||"").trim();
 const st=(db.students||[]).find(x=>x.id===studentId);
 if(!st||!Number.isFinite(score)||!Number.isFinite(outOf)||outOf<=0||score<0||score>outOf){toast("تحقق من التلميذ والنقطة والدرجة الكاملة.");return}
 db.grades=db.grades||[];
 const old=db.grades.find(g=>g.taskId===taskId&&g.studentId===studentId);
 const now=new Date().toISOString();
 const value={id:old?.id||("grade-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),taskId,studentId,classId:st.classId,title:task.title||task.category||"واجب",subject:task.subject||"",score,outOf,feedback,published:true,publishedAt:now,createdAt:old?.createdAt||now};
 if(old)Object.assign(old,value);else db.grades.push(value);
 if(!save())return;
 closeModal();render();toast("تم إرسال النقطة إلى فضاء "+st.name+".");
};
window.midadOpenGradeForStudent=function(studentId){
 const st=(db.students||[]).find(x=>x.id===studentId);if(!st)return;
 openModal("إرسال نقطة إلى "+st.name,"أدخل اسم الواجب والنقطة، وستظهر النتيجة مباشرة في قسم «النقاط» لدى الطالب.",'<form id="midadSingleGradeForm"><div class="form-grid"><div class="form-field full"><label>اسم الواجب أو الاختبار</label><input name="title" required maxlength="120" placeholder="مثال: فرض الفصل الأول"></div><div class="form-field"><label>المادة</label><input name="subject" placeholder="مثال: الرياضيات"></div><div class="form-field"><label>النقطة</label><input name="score" type="number" min="0" max="100" step="0.25" value="0" required></div><div class="form-field"><label>على</label><input name="outOf" type="number" min="1" max="100" step="0.25" value="20" required></div><div class="form-field full"><label>ملاحظة للطالب (اختيارية)</label><textarea name="feedback" placeholder="ملاحظة توجيهية أو تشجيعية..."></textarea></div></div><div class="modal-actions"><button class="btn primary">حفظ وإرسال النقطة</button><button type="button" class="btn light" onclick="closeModal()">إلغاء</button></div></form>');
 document.getElementById("midadSingleGradeForm").onsubmit=e=>window.midadSaveStudentGrade(e,studentId);
};
window.midadSaveStudentGrade=function(e,studentId){
 e.preventDefault();const st=(db.students||[]).find(x=>x.id===studentId);if(!st)return;
 const f=new FormData(e.target),title=String(f.get("title")||"").trim(),subject=String(f.get("subject")||"").trim(),score=Number(f.get("score")),outOf=Number(f.get("outOf")),feedback=String(f.get("feedback")||"").trim();
 if(!title||!Number.isFinite(score)||!Number.isFinite(outOf)||outOf<=0||score<0||score>outOf){toast("تحقق من اسم الواجب والنقطة والدرجة الكاملة.");return}
 db.grades=db.grades||[];const old=db.grades.find(g=>g.studentId===studentId&&!g.taskId&&g.title===title&&g.subject===subject),now=new Date().toISOString();
 const value={id:old?.id||("grade-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),taskId:null,studentId,classId:st.classId,title,subject,score,outOf,feedback,published:true,publishedAt:now,createdAt:old?.createdAt||now};
 if(old)Object.assign(old,value);else db.grades.push(value);
 if(!save())return;closeModal();render();toast("تم إرسال النقطة إلى فضاء "+st.name+".");
};
const css=document.createElement("style");css.textContent=`
.grade-existing{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}.grade-existing h4{margin:0 0 8px;color:var(--deep);font-size:13px}.grade-existing-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12px}.grade-existing-row span{flex:1}.grade-existing-row b{color:#2f7650}.grade-existing-row small{color:var(--muted)}
`;document.head.appendChild(css);
})();
