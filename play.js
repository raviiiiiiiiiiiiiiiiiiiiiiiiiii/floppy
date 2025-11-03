const API = "https://floppy-production.up.railway.app"; // ✅ Update if needed

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");
if(!id) location.href = "/";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreBox = document.getElementById("scoreBox");
const restartUI = document.getElementById("restartUI");
const restartBtn = document.getElementById("restartBtn");

let images = { player:new Image(), pipe:new Image(), bg:new Image(), go:new Image() };
let sounds = { bgm:null, dead:null };

let state = null, lastTime = 0, startedAudio=false;

const PHYS={
  gravity:1000,flapV:-320,maxFall:900,
  pipeSpeedBase:140,pipeAccel:0.01,gap:170,
  spawnInterval:1.6,playerX:90,playerWidthRatio:0.14
};

function fitCanvas(){
  const vw=Math.min(window.innerWidth,420);
  canvas.width=vw;
  canvas.height=Math.max(560,window.innerHeight-20);
}
fitCanvas();
window.addEventListener("resize",fitCanvas);

async function loadGame(){
  const res = await fetch(`${API}/api/game/${id}`);
  const data = await res.json();

  images.player.src=data.player;
  images.pipe.src=data.pipe;
  if(data.bg) images.bg.src=data.bg;
  if(data.goimg) images.go.src=data.goimg;

  if(data.bgm) sounds.bgm=new Audio(data.bgm);
  if(data.dead) sounds.dead=new Audio(data.dead);

  startGame(data.gotext||"You Lost!");
}

function makeState(text){
  const w=canvas.width,h=canvas.height,pw=Math.round(w*PHYS.playerWidthRatio),
        ph=pw;
  return{
    p:{ x:PHYS.playerX,y:h/2-ph/2,w:pw,h:ph,vy:0 },
    pipes:[],speed:PHYS.pipeSpeedBase,
    gap:PHYS.gap,lastSpawn:0,score:0,
    overText:text,running:true,dead:false
  }
}

function spawnPair(){
  const h=canvas.height,minT=40,maxT=h-state.gap-100,
        th=minT+Math.random()*(maxT-minT);
  const id=performance.now();

  state.pipes.push({x:w(),y:0,w:60,h:th,id,passed:false,top:true});
  state.pipes.push({x:w(),y:th+state.gap,w:60,h:h-(th+state.gap),id,passed:false});
}
function w(){return canvas.width+40;}

function flap(){
  if(state.dead) return;
  if(sounds.bgm && !startedAudio){
    startedAudio=true;
    sounds.bgm.play().catch(()=>{});
  }
  state.p.vy = PHYS.flapV;
}

canvas.addEventListener("click",flap);
canvas.addEventListener("touchstart",(e)=>{e.preventDefault();flap();},{passive:false});
restartBtn.addEventListener("click",()=>restart());

function update(dt){
  if(state.dead) return;
  const p=state.p;

  p.vy += PHYS.gravity*dt;
  if(p.vy > PHYS.maxFall) p.vy = PHYS.maxFall;
  p.y += p.vy*dt;

  state.lastSpawn+=dt;
  if(state.lastSpawn>=PHYS.spawnInterval){
    state.lastSpawn=0;spawnPair();
  }

  for(let i=state.pipes.length-1;i>=0;i--){
    const pipe=state.pipes[i];
    pipe.x-=state.speed*dt;
    if(pipe.top && !pipe.passed && pipe.x+pipe.w<p.x){
      state.score++;
      scoreBox.textContent=state.score;
      pipe.passed=true;
    }
    if(pipe.x+pipe.w<-50) state.pipes.splice(i,1);

    if(hit(p,pipe)){die();}
  }

  if(p.y<0 || p.y+p.h>canvas.height) die();

  state.speed+=PHYS.pipeAccel*dt;
}

function hit(a,b){
  return !(b.x>a.x+a.w || b.x+b.w<a.x || b.y>a.y+a.h || b.y+b.h<a.y);
}

function die(){
  if(state.dead) return;
  state.dead=true;state.running=false;
  if(sounds.bgm) sounds.bgm.pause();
  if(sounds.dead) sounds.dead.play().catch(()=>{});
  restartUI.style.display="block";
}

function restart(){
  restartUI.style.display="none";
  scoreBox.textContent="0";
  if(sounds.bgm && startedAudio){
    sounds.bgm.currentTime=0;
    sounds.bgm.play().catch(()=>{});
  }
  state = makeState(state.overText);
}

function render(){
  ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);

  if(images.bg.src && images.bg.complete)
    ctx.drawImage(images.bg,0,0,canvas.width,canvas.height);

  for(const pipe of state.pipes){
    if(images.pipe.complete)
      ctx.drawImage(images.pipe,pipe.x,pipe.y,pipe.w,pipe.h);
    else{
      ctx.fillStyle="#228822";
      ctx.fillRect(pipe.x,pipe.y,pipe.w,pipe.h);
    }
  }
  ctx.drawImage(images.player,state.p.x,state.p.y,state.p.w,state.p.h);
}

function loop(ts){
  if(!lastTime) lastTime=ts;
  const dt=Math.min(0.05,(ts-lastTime)/1000);
  lastTime=ts;

  if(state.running) update(dt);
  render();
  requestAnimationFrame(loop);
}

async function startGame(text){
  state = makeState(text);
  requestAnimationFrame(loop);
}

loadGame();
