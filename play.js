// ✅ FINAL STABLE PLAY.JS

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const loader = document.getElementById("loader");
const scoreEl = document.getElementById("score");

let images = { player: new Image(), pipe: new Image(), bg: new Image(), go: new Image() };
let sounds = { bgm: null, dead: null };
let state = null;
let lastTime = 0;
let raf;
let startedAudio = false;

const PHYS = {
  gravity: 1000,
  flapV: -320,
  maxFall: 900,
  pipeSpeedBase: 140,
  pipeAccel: 0.02,
  gap: 180,
  spawnInterval: 1.6,
  playerX: 90,
  playerWidthRatio: 0.14
};

function fitCanvas(){
  const w = Math.min(window.innerWidth - 10, 420);
  const h = Math.max(window.innerHeight - 140, 560);
  canvas.width = w;
  canvas.height = h;
}

function makeState(goTxt){
  const w = canvas.width;
  const h = canvas.height;
  const pw = Math.round(w * PHYS.playerWidthRatio);
  const ph = pw;

  return {
    player: { x: PHYS.playerX, y: Math.round(h/2-ph/2), w: pw, h: ph, vy: 0 },
    pipes: [],
    pipeSpeed: PHYS.pipeSpeedBase,
    gap: PHYS.gap,
    lastSpawn: 0,
    spawnInterval: PHYS.spawnInterval,
    score: 0,
    running: true,
    dead: false,
    goText: goTxt || "You lost!"
  };
}

async function loadGame(){
  const id = new URLSearchParams(location.search).get("id");
  if(!id){ loader.innerText = "Bad ID"; return; }

  try{
    const res = await fetch(`https://floppy-production.up.railway.app/api/game/${id}`);
    const data = await res.json();
    if(!data.success){ loader.innerText = "Game Missing"; return; }
    const cfg = data.game.config;

    images.player.src = cfg.player;
    images.pipe.src = cfg.pipe;
    images.bg.src = cfg.bg || "";
    images.go.src = cfg.goImg || "";

    if(cfg.bgm) sounds.bgm = new Audio(cfg.bgm);
    if(cfg.dead) sounds.dead = new Audio(cfg.dead);

    images.player.onload = start;
  }catch(e){
    loader.innerText="Load Error";
  }
}

function start(){
  loader.style.display="none";
  canvas.style.display="block";
  document.getElementById("overlay").style.display="flex";
  fitCanvas();

  state = makeState();
  scoreEl.innerText = "0";
  lastTime = 0;
  raf = requestAnimationFrame(loop);

  canvas.addEventListener("click", tap);
  canvas.addEventListener("touchstart", tap, {passive:false});
}

function tap(){
  if(state.dead){
    resetGame();
    return;
  }
  // Enable sound after first tap
  if(sounds.bgm && !startedAudio){
    startedAudio = true;
    try{ sounds.bgm.play(); }catch(e){}
  }
  state.player.vy = PHYS.flapV;
}

function resetGame(){
  if(sounds.dead){ try{ sounds.dead.pause(); sounds.dead.currentTime=0; }catch(e){} }
  if(sounds.bgm && startedAudio){
    try{ sounds.bgm.currentTime=0; sounds.bgm.play(); }catch(e){}
  }
  state = makeState();
  scoreEl.innerText="0";
}

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;
  if(state.running && !state.dead) update(dt);
  draw();
  raf = requestAnimationFrame(loop);
}

function spawnPipe(){
  const h = canvas.height;
  const min = 40;
  const max = h - state.gap - 120;
  const topH = Math.floor(Math.random()*(max-min))+min;
  const x = canvas.width + 20;
  const id = Date.now()+Math.random();
  const w = Math.round(canvas.width*0.16);

  state.pipes.push({x,y:0,w,h:topH,top:true,pair:id,passed:false});
  state.pipes.push({x,y:topH+state.gap,w,h:h-(topH+state.gap),top:false,pair:id,passed:false});
}

function update(dt){
  state.player.vy += PHYS.gravity * dt;
  if(state.player.vy > PHYS.maxFall) state.player.vy = PHYS.maxFall;
  state.player.y += state.player.vy * dt;

  state.lastSpawn += dt;
  if(state.lastSpawn >= state.spawnInterval){
    state.lastSpawn=0;
    spawnPipe();
  }

  for(let i=state.pipes.length-1; i>=0; i--){
    const p = state.pipes[i];
    p.x -= state.pipeSpeed * dt;
    if(p.top && !p.passed && (p.x+p.w) < state.player.x){
      state.score++; state.pipeSpeed += 1;
      scoreEl.innerText = state.score;
      p.passed = true;
      for(const q of state.pipes) if(q.pair===p.pair) q.passed=true;
    }
    if(p.x+p.w < -50) state.pipes.splice(i,1);
  }

  if(checkDeath()) die();
}

function draw(){
  ctx.fillStyle="#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(const p of state.pipes){
    ctx.drawImage(images.pipe,p.x,p.y,p.w,p.h);
  }

  ctx.drawImage(images.player,state.player.x,state.player.y,state.player.w,state.player.h);
}

function checkDeath(){
  const p = state.player;
  if(p.y <=0 || p.y+p.h >= canvas.height) return true;
  for(const x of state.pipes){
    if(p.x<p.x+x.w && p.x+p.w>x.x && p.y<p.y+x.h && p.y+p.h>x.y) return true;
  }
  return false;
}

function die(){
  state.dead=true;
  if(sounds.bgm){ try{ sounds.bgm.pause(); }catch(e){} }
  if(sounds.dead){ try{ sounds.dead.currentTime=0; sounds.dead.play(); }catch(e){} }
}

window.addEventListener("resize", fitCanvas);
loadGame();
