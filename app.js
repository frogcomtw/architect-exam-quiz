q.image;'use strict';
const $ = id => document.getElementById(id);
const BANK = window.QUIZ_DATA;
const STORAGE = 'archi-practice-114-v1';
let saved = {wrong: [], session: null};
let storageOK = true;
try { const raw = JSON.parse(localStorage.getItem(STORAGE)); if (raw && Array.isArray(raw.wrong)) saved = raw; } catch { storageOK = false; }
let state = null, reviewMode = false;
const allQuestions = BANK.flatMap(s => s.questions);
const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]));
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify(saved)); }
  catch { storageOK = false; $('savedStatus').textContent = '此瀏覽器無法保存紀錄，仍可正常測驗'; }
}
function show(which) { for (const id of ['home','quiz','results']) $(id).hidden = id !== which; $('homeButton').hidden = which === 'home'; window.scrollTo(0,0); }
function renderHome() {
  show('home');
  $('subjects').replaceChildren();
  const notes = ['80 道測驗題，掌握法規與實務重點。','40 道測驗題，結構觀念與力學演練。','80 道測驗題，材料、構法與施工實務。','40 道測驗題，物理環境與設備整合。'];
  BANK.forEach((s,i) => {
    const el = document.createElement('article'); el.className = 'subject';
    const wrong = saved.wrong.filter(id => id.startsWith(i+'-')).length;
    el.innerHTML = `<div class="subject-number">0${i+1}</div><h3>${s.name}</h3><p>${notes[i]}</p><div class="card-meta"><span>${s.count} 題 · ${i===3?'標準答案':'更正答案'}</span><span>錯題 ${wrong}</span></div><button>開始練習 ↗</button>`;
    el.querySelector('button').onclick = () => begin(s.id); $('subjects').append(el);
  });
  $('resumeBox').hidden = !saved.session || saved.session.finished;
  if (!storageOK) $('savedStatus').textContent = '此瀏覽器無法保存紀錄，仍可正常測驗';
}
function begin(sid, customIds) {
  const mode = customIds ? 'practice' : $('mode').value;
  let ids = customIds ? [...customIds] : BANK[sid].questions.map(q=>q.id);
  if (mode==='wrong') ids = ids.filter(id=>saved.wrong.includes(id));
  if (!ids.length) { alert('此科目前沒有錯題。先完成一次練習，再回來複習。'); return; }
  if (!customIds && $('shuffle').checked) {
    for (let i=ids.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
  }
  if (!customIds && $('amount').value!=='all') ids=ids.slice(0,Number($('amount').value));
  state={sid,ids,mode,index:0,responses:{},started:Date.now(),elapsed:0,finished:false};
  saved.session=state; reviewMode=false; persist(); show('quiz'); renderQuestion();
}
function current() { return byId[state.ids[state.index]]; }
function response(q=current()) { return state.responses[q.id] || {choice:'',checked:false}; }
function isCorrect(q) { const a=response(q).choice; return q.answers.includes('*') || q.answers.includes(a); }
function updateWrong(q) {
  const set = new Set(saved.wrong);
  if (isCorrect(q)) set.delete(q.id); else set.add(q.id);
  saved.wrong=[...set];
}
function answerLabel(q) { return q.answers.includes('*') ? '一律給分' : q.answers.join(' 或 '); }
function positionQuestion() {
  const q=current(), img=$('paperImage');
  $('paperViewer').scrollTop=Math.max(0,img.clientHeight*q.top/100-45);
}
function renderQuestion() {
  const q=current(), s=BANK[state.sid], r=response(q), locked=reviewMode || (state.mode!=='exam' && r.checked);
  $('quizMode').textContent=reviewMode?'ANSWER REVIEW / 作答回顧':state.mode==='exam'?'MOCK EXAM / 模擬測驗':state.mode==='wrong'?'MISTAKE REVIEW / 錯題複習':'DAILY PRACTICE / 即時練習';
  $('quizTitle').textContent=s.name;
  $('counter').textContent=`第 ${state.index+1} / ${state.ids.length} 題 · 原卷第 ${q.number} 題`;
  $('questionTitle').textContent=q.title;
  $('paperLabel').textContent=`114 年官方原卷 · 第 ${q.page} 頁 · 第 ${q.number} 題`;
  $('paperLink').href=s.paper+`#page=${q.page}`;
  $('answerLink').href=s.key; $('answerLink').hidden=!locked;
  $('questionMarker').style.top=q.top+'%';
  const img=$('paperImage'); img.onload=positionQuestion;
  if (img.getAttribute('src')!==q.image) img.src=q.image.startsWith('pages/') ? q.image.slice(6) : q.image; else positionQuestion();
  $('options').replaceChildren();
  for(const letter of ['A','B','C','D']) {
    const btn=document.createElement('button');btn.className='option';btn.textContent=letter;
    btn.setAttribute('aria-label',`選項 ${letter}`);btn.setAttribute('aria-pressed',String(r.choice.includes(letter)));
    if(r.choice.includes(letter))btn.classList.add('selected');
    if(locked) {
      const accepted=q.answers.includes('*')||q.answers.some(a=>a.includes(letter));
      if(accepted)btn.classList.add('correct');
      else if(r.choice.includes(letter))btn.classList.add('incorrect');
      btn.disabled=true;
    }
    btn.onclick=()=>selectChoice(letter);$('options').append(btn);
  }
  $('checkAnswer').hidden=locked;
  $('checkAnswer').disabled=!r.choice;
  $('checkAnswer').textContent=state.mode==='exam'?'儲存此題答案':'確認答案';
  $('feedback').className='';$('feedback').textContent='';
  if(locked) {
    $('feedback').className=isCorrect(q)?'good':'bad';
    $('feedback').textContent=`${isCorrect(q)?'✓ 答對了':'✕ '+(r.choice?'本題答錯':'本題未作答')}。${q.corrected?'依官方更正答案：':'官方答案：'}${answerLabel(q)}。${q.corrected?'可開啟下方官方答案核對更正備註。':''}`;
  } else if(state.mode==='exam' && r.checked) $('feedback').textContent='答案已儲存，可在交卷前修改。';
  $('prevButton').disabled=state.index===0;
  $('nextButton').disabled=state.index===state.ids.length-1;
  $('submitExam').textContent=reviewMode?'返回成績':'結束並交卷';
  renderMap();
}
function selectChoice(letter) {
  const q=current(), r=response(q);
  if(reviewMode || (state.mode!=='exam'&&r.checked))return;
  // Ordinary questions are single-choice. Corrected questions explicitly
  // accepting combination answers support toggling multiple options.
  const multi=q.answers.some(a=>a.length>1 && a!=='*');
  const choice=multi ? [...(r.choice.includes(letter)?r.choice.replace(letter,''):r.choice+letter)].sort().join('') : letter;
  state.responses[q.id]={choice,checked:false};persist();renderQuestion();
}
function renderMap() {
  const done=state.ids.filter(id=>state.responses[id]?.choice).length;
  $('answeredCount').textContent=`${done} / ${state.ids.length}`;
  $('progress').style.width=`${100*done/state.ids.length}%`;
  $('questionMap').replaceChildren();
  state.ids.forEach((id,i)=>{
    const b=document.createElement('button'),q=byId[id],r=response(q);
    b.textContent=i+1;b.title=`原卷第 ${q.number} 題`;
    if(i===state.index){b.classList.add('current');b.setAttribute('aria-current','step');}
    if(r.choice)b.classList.add('answered');
    if((reviewMode || (state.mode!=='exam'&&r.checked))&&!isCorrect(q))b.classList.add('wrong');
    b.onclick=()=>{state.index=i;persist();renderQuestion();};$('questionMap').append(b);
  });
}
function elapsed() { return state?.finished ? state.elapsed : state ? Math.floor((Date.now()-state.started)/1000) : 0; }
function formatTime(s) { return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; }
function finish() {
  $('confirmDialog').close();state.elapsed=elapsed();state.finished=true;
  state.ids.forEach(id=>updateWrong(byId[id])); saved.session=state;persist();renderResults();
}
function renderResults() {
  show('results');
  const correct=state.ids.filter(id=>isCorrect(byId[id])).length;
  const blank=state.ids.filter(id=>!response(byId[id]).choice).length;
  $('resultScore').innerHTML=`${Math.round(correct/state.ids.length*100)}<small> / 100</small>`;
  $('resultSummary').textContent=`答對 ${correct} / ${state.ids.length} 題 · 未作答 ${blank} 題 · 用時 ${formatTime(state.elapsed)}`;
  $('retryWrong').disabled=correct===state.ids.length;
  $('reviewList').replaceChildren();
  state.ids.forEach((id,i)=>{
    const q=byId[id],r=response(q),ok=isCorrect(q),row=document.createElement('div');row.className='review-row';
    const tag=document.createElement('span');tag.className='status'+(ok?'':' bad');tag.textContent=ok?'✓ 正確':r.choice?'✕ 錯誤':'— 未答';
    const title=document.createElement('span');title.textContent=`原卷第 ${q.number} 題　${q.title}`;
    const detail=document.createElement('button');detail.textContent='查看答案／原卷';
    detail.onclick=()=>{state.index=i;reviewMode=true;show('quiz');renderQuestion();};
    row.append(tag,title,detail);$('reviewList').append(row);
  });
}
$('checkAnswer').onclick=()=>{
  const q=current(),r=response(q);if(!r.choice)return;
  r.checked=true;state.responses[q.id]=r;
  if(state.mode!=='exam')updateWrong(q);
  persist();renderQuestion();
};
$('prevButton').onclick=()=>{if(state.index>0){state.index--;persist();renderQuestion();}};
$('nextButton').onclick=()=>{if(state.index<state.ids.length-1){state.index++;persist();renderQuestion();}};
$('jumpQuestion').onclick=positionQuestion;
$('submitExam').onclick=()=>{
  if(reviewMode){renderResults();return;}
  const blank=state.ids.filter(id=>!response(byId[id]).choice).length;
  $('confirmText').textContent=blank?`還有 ${blank} 題未作答。交卷後將公布成績及官方答案。`:'已完成所有題目，交卷後將公布成績及官方答案。';
  $('confirmDialog').showModal();
};
$('cancelSubmit').onclick=()=>$('confirmDialog').close();$('confirmSubmit').onclick=finish;
$('homeButton').onclick=renderHome;$('backHome').onclick=renderHome;
$('resumeButton').onclick=()=>{state=saved.session;reviewMode=false;show('quiz');renderQuestion();};
$('retryWrong').onclick=()=>{const ids=state.ids.filter(id=>!isCorrect(byId[id]));begin(state.sid,ids);};
setInterval(()=>{if(state && !$('quiz').hidden)$('timer').textContent=formatTime(elapsed());},1000);
renderHome();
