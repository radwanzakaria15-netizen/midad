(function(){
  let game=null;
  const safe=v=>esc(v==null?"":String(v));
  function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
  function draw(){
    const root=document.getElementById("midad-match-game");if(!root||!game)return;
    const done=game.matched.size===game.items.length;
    root.innerHTML='<div class="match-status"><span>الأزواج الصحيحة: <b>'+game.matched.size+' / '+game.items.length+'</b></span><span>المحاولات: <b>'+game.attempts+'</b></span></div>'+
      (done?'<div class="game-complete"><h3>أحسنت! أكملت اللعبة</h3><p>أنجزت جميع المطابقات في '+game.attempts+' محاولة.</p><button class="btn primary" onclick="restartMidadGame()">العب من جديد</button></div>':
      '<p class="match-instruction">اختر بطاقة سؤال، ثم اختر البطاقة التي تطابقها.</p><div class="match-columns"><div><h4>الأسئلة</h4>'+game.questions.map((x)=>'<button class="match-card '+(game.matched.has(x.id)?"matched":"")+' '+(game.selected===x.id?"selected":"")+'" '+(game.matched.has(x.id)?"disabled":"")+' onclick="pickMidadCard(\'q\','+x.id+')">'+safe(x.text)+'</button>').join("")+'</div><div><h4>الإجابات</h4>'+game.answers.map((x)=>'<button class="match-card '+(game.matched.has(x.id)?"matched":"")+'" '+(game.matched.has(x.id)?"disabled":"")+' onclick="pickMidadCard(\'a\','+x.id+')">'+safe(x.text)+'</button>').join("")+'</div></div><p class="match-feedback" role="status">'+safe(game.feedback||"")+'</p>');
  }
  window.viewActivity=function(idValue){
    const a=db.activities.find(v=>v.id===idValue);if(!a)return;
    const items=(a.items||[]).filter(x=>x.q&&x.a).slice(0,12);
    if(items.length<2){toast("أضف عنصرين صحيحين على الأقل لتشغيل لعبة المطابقة");return}
    game={items:items.map((x,i)=>({id:i,q:String(x.q),a:String(x.a)})),questions:[],answers:[],matched:new Set(),selected:null,attempts:0,feedback:""};
    resetDeck();
    openModal(safe(a.title||"لعبة تعليمية"),"لعبة المطابقة · "+safe(a.subject||"")+' · '+safe(a.level||""),'<div id="midad-match-game" class="midad-match-game"></div><div class="modal-actions"><button class="btn light" type="button" onclick="restartMidadGame()">إعادة اللعبة</button><button class="btn secondary" type="button" onclick="closeModal()">إنهاء</button></div>',true);
    draw();
  };
  function resetDeck(){game.questions=shuffle(game.items.map(x=>({id:x.id,text:x.q})));game.answers=shuffle(game.items.map(x=>({id:x.id,text:x.a})))}
  window.pickMidadCard=function(side,id){
    if(!game||game.matched.has(id))return;
    if(side==="q"){game.selected=id;game.feedback="اختر الإجابة المطابقة.";draw();return}
    if(game.selected===null){game.feedback="ابدأ باختيار بطاقة من عمود الأسئلة.";draw();return}
    game.attempts++;
    if(game.selected===id){game.matched.add(id);game.feedback="إجابة صحيحة! تابع.";game.selected=null}
    else game.feedback="ليست المطابقة الصحيحة. حاول مرة أخرى.";
    draw();
  };
  window.restartMidadGame=function(){if(!game)return;game.matched=new Set();game.selected=null;game.attempts=0;game.feedback="";resetDeck();draw()};
})();