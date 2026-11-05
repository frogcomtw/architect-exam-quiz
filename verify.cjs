const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
class Element {
  constructor(){this.hidden=false;this.value='';this.checked=false;this.children=[];this.style={};this.attrs={};this.clientHeight=1400;this.classList={add:()=>{}};}
  replaceChildren(){this.children=[];}
  append(...items){this.children.push(...items);}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  querySelector(){return this.button ||= new Element();}
  showModal(){this.open=true;}
  close(){this.open=false;}
  set src(v){this.attrs.src=v;}
}
const els = new Map();
const get = id => {if(!els.has(id))els.set(id,new Element());return els.get(id);};
const memory = {};
const c = vm.createContext({window:{scrollTo(){}},document:{getElementById:get,createElement:()=>new Element()},
  localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},setInterval(){},alert:()=>{throw Error('Unexpected alert');},console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'questions.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),c);
function run(code){return vm.runInContext(code,c);}
get('mode').value='practice';get('amount').value='10';
run('begin(0)');assert.equal(run('state.ids.length'),10);
run("selectChoice('D'); $('checkAnswer').onclick()");assert.equal(run('isCorrect(current())'),true);
run("state.index=1;renderQuestion();selectChoice('A');$('checkAnswer').onclick()");assert.equal(run('saved.wrong.includes(current().id)'),true);
run('finish()');assert.equal(run('state.finished'),true);assert.match(get('resultScore').innerHTML,/10<small>/);
run('renderHome()');assert.equal(get('home').hidden,false);
run("begin(0,['0-27']);selectChoice('B');selectChoice('D');$('checkAnswer').onclick()");assert.equal(run('isCorrect(current())'),true);
run("begin(1,['1-5']);selectChoice('A');selectChoice('C');$('checkAnswer').onclick()");assert.equal(run('isCorrect(current())'),true);
run("begin(2,['2-17']);finish()");assert.equal(run('isCorrect(current())'),true);
run("begin(2,['2-49']);selectChoice('A');selectChoice('B')");assert.equal(run('response().choice'),'B');
get('mode').value='exam';run('begin(1)');run("selectChoice('A');$('checkAnswer').onclick()");assert.equal(get('answerLink').hidden,true);assert.equal(get('feedback').textContent,'答案已儲存，可在交卷前修改。');
run('renderHome()');get('resumeButton').onclick();assert.equal(run('state.responses[current().id].choice'),'A');
run('finish()');assert.equal(run('state.finished'),true);get('reviewList').children[0].children[2].onclick();assert.equal(get('answerLink').hidden,false);
const data=c.window.QUIZ_DATA;assert.equal(data.reduce((sum,s)=>sum+s.count,0),240);
for(const s of data){for(const q of s.questions){assert.ok(fs.existsSync(path.join(__dirname,q.image)));assert.ok(q.top>0&&q.top<100);assert.ok(q.answers.length>0);}assert.ok(fs.existsSync(path.join(__dirname,s.paper)));assert.ok(fs.existsSync(path.join(__dirname,s.key)));}
console.log('PASS: 240 questions, original images/PDF links, scoring, corrected answer combinations, unconditional credit, exam answer hiding, resume and review.');
