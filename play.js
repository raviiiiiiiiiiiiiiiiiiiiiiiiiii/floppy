const API_BASE = "https://floppy-production.up.railway.app";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusBox = document.getElementById("statusMsg");

let images = { player:new Image(), pipe:new Image(), bg:new Image(), go:new Image() };
let sounds = { bgm:null, dead:null };
let state=null;
let rafId=null;
let lastTime=0;
let startedAudio=false;

const PHYS = {
  gravity:1000, flapV:-320, maxFall:900,
  pipeSpeedBase:140, pipeAccel:0.02,
  gap:180, spawnInterval:1.6,
  playerX:90
};

function getId(){
  const u=new URL(window.location);
  return u.searchParams.get("id");
}

function makeState(goText){
  return{goText,pipes:[],player:{x:PHYS.playerX,y:250,vy:0},dead:false,tSpawn:0,pipeSpeed:PHYS.pipeSpeedBase,score:0}
}

async function loadGame(){
  const id=getId();
  if(!id)return error("Missing Game ID");
  status("Loading Game...");
  const res=await fetch(`${API_BASE}/api/game/${id}`);
  if(!res.ok)return error("Game Not Found");
  const data=await res.json();

  images.player.src=data.config.player;
  images.pipe.src=data.config.pipe;
  images.bg.src=data.config.bg;
  images.go.src=data.config.goImg;
  sounds.bgm=data.config.bgm?new Audio(data.config.bgm):null;
  sounds.dead=data.config.dead?new Audio(data.config.dead):null;

  state=makeState(data.config.goText||"Game Over!");
  status("");

  canvas.style.display="block";
  play();
}

function status(t){statusBox.innerText=t}
function error(t){status(t)}

function flap(){
  if(!state)return;
  if(state.dead){reset();return;}
  if(sounds.bgm&&!startedAudio){startedAudio=true;sounds.bgm.play().catch(()=>{})}
  state.player.vy=PHYS.flapV;
}

function reset(){state=makeState(state.goText)}

function die(){
  state.dead=true;
  if(sounds.bgm)try{sounds.bgm.pause()}catch(e){}
  if(sounds.dead)try{sounds.dead.play()}catch(e){}
}

function loop(ts){
  if(!state)return;
  let dt=(ts-lastTime)/1000;
  lastTime=ts;
  ctx.clearRect(0,0,360,640);
  if(images.bg.src)ctx.drawImage(images.bg,0,0,360,640);
  if(!state.dead){
    state.player.vy+=PHYS.gravity*dt;
    state.player.vy=Math.min(state.player.vy,PHYS.maxFall);
    state.player.y+=state.player.vy*dt;
    state.tSpawn+=dt;
    if(state.tSpawn>=PHYS.spawnInterval){
      state.tSpawn=0;
      const top=Math.random()*200+60;
      state.pipes.push({x:360,top});
    }
    state.pipeSpeed+=PHYS.pipeAccel;
  }
  for(const p of state.pipes){
    if(!state.dead)p.x-=state.pipeSpeed*dt;
    ctx.drawImage(images.pipe,p.x,0,60,p.top);
    ctx.drawImage(images.pipe,p.x,p.top+PHYS.gap,60,640-p.top-PHYS.gap);
    if(state.player.x+40>p.x&&state.player.x<p.x+60&&(state.player.y<p.top||state.player.y+40>p.top+PHYS.gap))die();
  }
  if(state.player.y>600||state.player.y<0)die();
  ctx.drawImage(images.player,state.player.x,state.player.y,40,40);
  rafId=requestAnimationFrame(loop);
}

function play(){
  canvas.addEventListener("touchstart",flap);
  canvas.addEventListener("mousedown",flap);
  if(!rafId)rafId=requestAnimationFrame(loop);
}

loadGame();
