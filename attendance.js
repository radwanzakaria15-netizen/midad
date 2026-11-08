(function(){
  const escText=v=>esc(v==null?"":String(v));
  window.attendancePage=function(){
    const first=db.classes[0]?.id||"";
    const today=dateNow();
    const records=db.attendance.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,40);
    return pageHead("متابعة التلاميذ","الحضور والغياب","اختر القسم والتاريخ، ثم حدّد حالة كل تلميذ واحفظ السجل.")+
      '<section class="card attendance-card"><div class="attendance-toolbar">'+
      '<div class="attendance-field"><label for="attClass">القسم</label><select class="filter" id="attClass" onchange="fillAttendanceClass()"><option value="">اختر القسم</option>'+db.classes.map(c=>'<option value="'+escText(c.id)+'" '+(c.id===first?"selected":"")+'>'+escText(c.name)+'</option>').join("")+'</select></div>'+
      '<div class="attendance-field"><label for="attDate">التاريخ</label><input class="filter" type="date" id="attDate" value="'+today+'" onchange="fillAttendanceClass()"></div>'+
      '<button class="btn primary attendance-save" onclick="saveAttendance()">حفظ سجل اليوم</button></div>'+
      '<div id="attendanceList">'+(db.classes.length?"":"<p class=\"muted\">أنشئ قسماً وأضف إليه التلاميذ أولاً.</p>")+'</div></section>'+
      '<section class="card attendance-history"><div class="section-title"><div><h3>السجلات السابقة</h3><p>آخر حالات الحضور المحفوظة</p></div><span class="pill">'+records.length+' سجل</span></div>'+
      '<div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>التلميذ</th><th>القسم</th><th>الحالة</th></tr></thead><tbody>'+
      (records.map(a=>{const s=db.students.find(x=>x.id===a.studentId),c=db.classes.find(x=>x.id===a.classId);return '<tr><td>'+dateLabel(a.date)+'</td><td>'+escText(s?s.name:"تلميذ محذوف")+'</td><td>'+escText(c?c.name:"—")+'</td><td><span class="attendance-status status-'+(a.status==="غائب"?"absent":a.status==="متأخر"?"late":"present")+'">'+escText(a.status)+'</span></td></tr>'}).join("")||'<tr><td colspan="4" class="muted">لا توجد سجلات سابقة.</td></tr>')+
      '</tbody></table></div></section>';
  };
  window.fillAttendanceClass=function(){
    const sel=document.getElementById("attClass"),list=document.getElementById("attendanceList");
    if(!sel||!list)return;
    const cid=sel.value,date=document.getElementById("attDate")?.value||dateNow();
    if(!cid){list.innerHTML='<p class="muted">اختر القسم لعرض قائمة التلاميذ.</p>';return}
    const students=db.students.filter(s=>s.classId===cid).slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","ar"));
    if(!students.length){list.innerHTML='<p class="muted">لا يوجد تلاميذ في هذا القسم. أضف التلاميذ أولاً من صفحة التلاميذ.</p>';return}
    const current=students.map(s=>{const rec=db.attendance.find(a=>a.studentId===s.id&&a.classId===cid&&a.date===date);return rec?rec.status:"حاضر"});
    const counts={"حاضر":current.filter(x=>x==="حاضر").length,"غائب":current.filter(x=>x==="غائب").length,"متأخر":current.filter(x=>x==="متأخر").length};
    list.innerHTML='<div class="attendance-summary"><span>عدد التلاميذ: <b>'+students.length+'</b></span><span class="sum-present">حاضر: <b id="attPresentCount">'+counts["حاضر"]+'</b></span><span class="sum-absent">غائب: <b id="attAbsentCount">'+counts["غائب"]+'</b></span><span class="sum-late">متأخر: <b id="attLateCount">'+counts["متأخر"]+'</b></span></div>'+
      '<div class="attendance-student-list">'+students.map(s=>{const old=db.attendance.find(a=>a.studentId===s.id&&a.classId===cid&&a.date===date);const v=old?old.status:"حاضر";const sid=escText(s.id);return '<div class="attendance-student"><div class="attendance-student-name"><span class="student-number">'+(students.indexOf(s)+1)+'</span><b>'+escText(s.name)+'</b></div><div class="attendance-options">'+["حاضر","غائب","متأخر"].map((status,i)=>'<label class="attendance-choice choice-'+["present","absent","late"][i]+'"><input type="radio" name="att_'+sid+'" value="'+status+'" '+(v===status?"checked":"")+' onchange="updateAttendanceCounts()"><span>'+status+'</span></label>').join("")+'</div></div>'}).join("")+'</div>';
  };
  window.updateAttendanceCounts=function(){
    const sel=document.getElementById("attClass");if(!sel)return;
    const students=db.students.filter(s=>s.classId===sel.value);
    const values=students.map(s=>document.querySelector('input[name="att_'+s.id+'"]:checked')?.value||"حاضر");
    [["حاضر","attPresentCount"],["غائب","attAbsentCount"],["متأخر","attLateCount"]].forEach(([v,id])=>{const el=document.getElementById(id);if(el)el.textContent=values.filter(x=>x===v).length});
  };
  window.saveAttendance=function(){
    const cid=document.getElementById("attClass")?.value,date=document.getElementById("attDate")?.value||dateNow();
    if(!cid){toast("اختر القسم أولاً");return}
    if(!date){toast("حدد تاريخ الحضور أولاً");return}
    const students=db.students.filter(s=>s.classId===cid);
    if(!students.length){toast("لا يوجد تلاميذ في هذا القسم");return}
    db.attendance=db.attendance.filter(a=>!(a.classId===cid&&a.date===date));
    students.forEach(s=>{const chosen=document.querySelector('input[name="att_'+s.id+'"]:checked');db.attendance.push({id:id(),classId:cid,studentId:s.id,date,status:chosen?chosen.value:"حاضر"})});
    save();render();toast("تم حفظ حالات "+students.length+" تلميذاً");
  };
})();