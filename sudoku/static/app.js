(() => {
"use strict";

const $ = id => document.getElementById(id);
const home = $("home"), game = $("game"), result = $("result");
let level = "short", size = 4, box = 2;
let puzzle = [], solution = [], board = [];
let selected = -1, seconds = 0, score = 0, mistakes = 0, hints = 3;
let timer = null, paused = false, finished = false;

const names = {short:["SHORT","Quick Sudoku"],medium:["MEDIUM","Classic Sudoku"],large:["LARGE","Huge Sudoku"]};

function timeText(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function symbol(v){return v===0?"":v<=9?String(v):String.fromCharCode(55+v)}

async function newGame(){
  const response = await fetch("/api/new-game?difficulty="+encodeURIComponent(level));
  if(!response.ok) throw new Error("Python server could not create a puzzle.");
  const data = await response.json();
  size=data.size; box=data.box; puzzle=data.puzzle; solution=data.solution;
  board=puzzle.map(r=>r.slice()); selected=-1; seconds=0; mistakes=0; hints=3;
  score=size===4?500:size===9?1000:2200; paused=false; finished=false;
  $("levelName").textContent=names[level][0]; $("title").textContent=names[level][1];
  $("time").textContent="00:00"; $("hints").textContent="3";
  $("pause").textContent="Ⅱ Pause"; $("paused").classList.add("hidden");
  home.classList.add("hidden"); result.classList.add("hidden"); game.classList.remove("hidden");
  render(); stats(); message("Select an empty cell.","");
  clearInterval(timer);
  timer=setInterval(()=>{if(!paused&&!finished){seconds++;$("time").textContent=timeText(seconds);if(seconds%10===0){score=Math.max(0,score-1);stats()}}},1000);
}

function render(){
  const b=$("board"); b.innerHTML=""; b.style.gridTemplateColumns=`repeat(${size},1fr)`;
  for(let r=0;r<size;r++) for(let c=0;c<size;c++){
    const i=r*size+c, el=document.createElement("button");
    el.className="cell "+(puzzle[r][c]?"given":"user"); el.type="button"; el.textContent=symbol(board[r][c]);
    if((c+1)%box===0&&c!==size-1)el.style.borderRight="2px solid #7b89a7";
    if((r+1)%box===0&&r!==size-1)el.style.borderBottom="2px solid #7b89a7";
    el.onclick=()=>select(i); b.appendChild(el);
  }
  const nums=$("numbers"); nums.innerHTML="";
  for(let v=1;v<=size;v++){const n=document.createElement("button");n.className="num";n.type="button";n.textContent=symbol(v);n.onclick=()=>put(v);nums.appendChild(n)}
  highlight();
}

function select(i){if(paused||finished)return;selected=i;highlight();message(puzzle[Math.floor(i/size)][i%size]?"This number is fixed.":"Choose a number.","")}
function highlight(){
  [...$("board").children].forEach((el,i)=>{
    el.classList.remove("selected","related","same");
    if(i===selected)el.classList.add("selected");
    if(selected>=0){
      const r=Math.floor(i/size),c=i%size,sr=Math.floor(selected/size),sc=selected%size;
      if(r===sr||c===sc||(Math.floor(r/box)===Math.floor(sr/box)&&Math.floor(c/box)===Math.floor(sc/box)))el.classList.add("related");
      if(board[r][c]&&board[r][c]===board[sr][sc])el.classList.add("same");
    }
  });
}
function put(v){
  if(paused||finished||selected<0)return;
  const r=Math.floor(selected/size),c=selected%size;
  if(puzzle[r][c])return;
  if(solution[r][c]!==v){
    mistakes++;score=Math.max(0,score-(size===16?40:50));
    $("board").children[selected].classList.add("error");
    setTimeout(()=>$("board").children[selected]?.classList.remove("error"),350);
    stats();message(`Wrong number. ${3-mistakes} mistake${3-mistakes===1?"":"s"} left.`,"bad");
    if(mistakes>=3)finish(false);return;
  }
  board[r][c]=v;$("board").children[selected].textContent=symbol(v);
  score+=size===4?15:size===9?10:5;stats();highlight();message("Correct!","good");
  if(done())finish(true);
}
function erase(){
  if(paused||finished||selected<0)return;
  const r=Math.floor(selected/size),c=selected%size;
  if(!puzzle[r][c]){board[r][c]=0;$("board").children[selected].textContent="";highlight();stats()}
}
function hint(){
  if(paused||finished||hints<=0)return;
  const empty=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!puzzle[r][c]&&!board[r][c])empty.push([r,c]);
  if(!empty.length)return;const [r,c]=empty[Math.floor(Math.random()*empty.length)];
  board[r][c]=solution[r][c];selected=r*size+c;$("board").children[selected].textContent=symbol(board[r][c]);
  hints--;score=Math.max(0,score-(size===16?70:80));$("hints").textContent=hints;stats();highlight();message("Hint used.","good");
  if(done())finish(true);
}
function check(){
  if(finished)return;let empty=0,wrong=0;
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){if(!board[r][c])empty++;else if(board[r][c]!==solution[r][c])wrong++}
  message(empty?`${empty} cells still empty.`:wrong?"There are incorrect entries.":"Puzzle complete!","bad");
  if(!empty&&!wrong)finish(true);
}
function done(){for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(board[r][c]!==solution[r][c])return false;return true}
function stats(){
  let filled=0;board.forEach(row=>row.forEach(v=>{if(v)filled++}));
  $("score").textContent=score;$("mistakes").textContent=`${mistakes} / 3`;$("progress").textContent=Math.round(filled/(size*size)*100)+"%";
}
function message(t,type){$("message").textContent=t;$("message").className="message "+(type||"")}
function pauseGame(){if(finished)return;paused=!paused;$("paused").classList.toggle("hidden",!paused);$("pause").textContent=paused?"▶ Resume":"Ⅱ Pause"}
function finish(win){
  finished=true;clearInterval(timer);
  if(win){score+=Math.max(0,1000-seconds*2)+(3-mistakes)*100;$("resultTitle").textContent="Puzzle solved!";$("resultText").textContent=`You completed ${names[level][1].toLowerCase()} in ${timeText(seconds)}.`}
  else{$("resultTitle").textContent="Game over";$("resultText").textContent="Three mistakes reached. Try a fresh puzzle."}
  $("finalTime").textContent=timeText(seconds);$("finalScore").textContent=Math.max(0,score);$("finalMistakes").textContent=mistakes;
  game.classList.add("hidden");result.classList.remove("hidden");
}

document.querySelectorAll(".level").forEach(b=>b.onclick=()=>{document.querySelectorAll(".level").forEach(x=>x.classList.remove("active"));b.classList.add("active");level=b.dataset.level});
$("start").onclick=newGame;$("newGame").onclick=newGame;$("again").onclick=newGame;$("pause").onclick=pauseGame;$("resume").onclick=pauseGame;
$("erase").onclick=erase;$("hint").onclick=hint;$("check").onclick=check;
$("homeBtn").onclick=()=>{clearInterval(timer);game.classList.add("hidden");result.classList.add("hidden");home.classList.remove("hidden")};
$("change").onclick=()=>{result.classList.add("hidden");home.classList.remove("hidden")};

document.addEventListener("keydown",e=>{
  if(game.classList.contains("hidden")||paused||finished)return;
  if(e.key==="Backspace"||e.key==="Delete"||e.key==="0")erase();
  const n=parseInt(e.key,10);if(n>=1&&n<=Math.min(size,9))put(n);
  if(size===16&&/^[a-gA-G]$/.test(e.key))put(e.key.toUpperCase().charCodeAt(0)-55);
});
})();