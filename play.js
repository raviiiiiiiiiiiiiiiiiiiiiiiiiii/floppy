// play.js — loads saved config from Railway and runs the game
const API = "https://floppy-production.up.railway.app"; // your server
const params = new URLSearchParams(location.search);
const id = params.get("id");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const gameOverUI = document.getElementById("gameOver");
const goImgWrap = document.getElementById("goImgWrap");
const goTextEl = document.getElementById("goText");
const restartBtn = document.getElementById("restartBtn");
const toMaker = document.getElementById("toMaker");
const backBtn = document.getElementById("back");
const loader = document.getElementById("loader");

if(!id){
  alert("No game id provided.");
  location.href = "/";
}

// physics tuned same as maker
const PHYS = {
  gravity: 1000, flapV: -320, maxFall: 900,
  pipeSpeedBase: 140, pipeAccel: 0.02, gap: 180,
  spawnInterval: 1.6, playerX: 90, playerWidthRatio: 0.14
};

let images = { player: new Image(), pipe: new Image(), bg: new Image(), go: new Image() };
let sounds = { bgm: null, dead: null };
let state = null, lastTs = 0, startedAudio = false, raf = null;

// responsive canvas
function fit(){
  const vw = Math.min(window.innerWidth - 24, 480);
  canvas.width = Math.max(320, vw);
  canvas.height = Math.max(560, Math.round(window.innerHeight - 120));
}
window.addEventListener("resize", fit);

// load JSON config from server
async function fetchConfig(){
  try {
    const res = await fetch(`${API}/api/game/${id}`);
    if(!res.ok) throw new Error("Game not found");
    const cfg = await res.json();
    return cfg;
  } catch (e) {
    console.error(e);
    alert("Failed to load game.");
    location.href = "/";
  }
}

function makeState(goText){
  const w = canvas.width, h = canvas.height;
  const pw = Math.max(28, Math.round(w * PHYS.playerWidthRatio));
  const ph = Math.max(28, Math.round(pw * (images.player.naturalHeight || 1) / (images.player.naturalWidth || pw)));
  return {
    player: { x: PHYS.playerX, y: Math.round(h/2 - ph/2), w: pw, h: ph, vy: 0 },
    pipes: [], pipeSpeed: PHYS.pipeSpeedBase, gap: PHYS.gap,
    lastSpawn: 0, spawnInterval: PHYS.spawnInterval,
    score: 0, running: true, dead: false, goText: goText || "You lost!"
  };
}

// spawn pair
function spawnPair(){
  const h = canvas.height, minTop = 40, maxTop = Math.max(80, h - state.gap - 120);
  const topH = minTop + Math.floor(Math.random() * (Math.max(0, maxTop - minTop) + 1));
  const x = canvas.width + 20;
  const w = Math.max(40, Math.round(canvas.width * 0.16));
  const id = Date.now() + Math.random();
  state.pipes.push({ x, y: 0, w, h: topH, top: true, pairId:id, passed:false });
  state.pipes.push({ x, y: topH + state.gap, w, h: canvas.height - (topH + state.gap), top:false, pairId:id, passed:false });
}

// AABB
function aabb(ax,ay,aw,ah, bx,by,bw,bh){
  return !(bx > ax + aw || bx + bw < ax || by > ay + ah || by + bh < ay);
}

function update(dt){
  if(!state || state.dead) return;

  const p = state.player;
  p.vy += PHYS.gravity * dt;
  if(p.vy > PHYS.maxFall) p.vy = PHYS.maxFall;
  p.y += p.vy * dt;

  state.lastSpawn += dt;
  if(state.lastSpawn >= state.spawnInterval){
    state.lastSpawn = 0;
    spawnPair();
  }

  for(let i=state.pipes.length-1;i>=0;i--){
    const pr = state.pipes[i];
    pr.x -= state.pipeSpeed * dt;
    if(pr.top && !pr.passed && (pr.x + pr.w) < p.x){
      state.score++;
      scoreEl.textContent = state.score;
      pr.passed = true;
      // mark sibling
      for(const q of state.pipes) if(q.pairId === pr.pairId) q.passed = true;
    }
    if(pr.x + pr.w < -60) state.pipes.splice(i,1);
    if(aabb(p.x,p.y,p.w,p.h, pr.x, pr.y, pr.w, pr.h)) { die(); return; }
  }

  if(p.y < 0 || p.y + p.h > canvas.height) { die(); return; }

  state.pipeSpeed += PHYS.pipeAccel * dt;
  if(state.gap > 110) state.gap -= 0.01 * dt;
}

function render(){
  if(!state) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(images.bg.src && images.bg.complete){
    ctx.drawImage(images.bg, 0, 0, images.bg.naturalWidth, images.bg.naturalHeight, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#071018";
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  for(const p of state.pipes){
    if(images.pipe.src && images.pipe.complete){
      if(p.top){
        ctx.save();
        ctx.translate(p.x + p.w/2, p.y + p.h/2);
        ctx.scale(1,-1);
        ctx.drawImage(images.pipe, -p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      } else {
        ctx.drawImage(images.pipe, p.x, p.y, p.w, p.h);
      }
    } else {
      ctx.fillStyle = "#AA4422";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  }

  if(images.player.src && images.player.complete){
    ctx.drawImage(images.player, state.player.x, state.player.y, state.player.w, state.player.h);
  } else {
    ctx.fillStyle = "#FFD92E";
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
  }
}

function loop(ts){
  if(!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if(state && state.running && !state.dead) update(dt);
  if(state) render();
  raf = requestAnimationFrame(loop);
}

function die(){
  if(!state || state.dead) return;
  state.dead = true;
  state.running = false;
  if(sounds.bgm){ try{ sounds.bgm.pause(); sounds.bgm.currentTime = 0; }catch(e){} }
  if(sounds.dead && sounds.dead.src){ try{ sounds.dead.currentTime = 0; sounds.dead.play().catch(()=>{});}catch(e){} }
  showGameOver();
}

function showGameOver(){
  goImgWrap.innerHTML = "";
  if(images.go.src){
    const img = document.createElement("img");
    img.src = images.go.src;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    goImgWrap.appendChild(img);
  }
  goTextEl.textContent = state.goText || "You lost!";
  gameOverUI.style.display = "flex";
}

function hideGameOver(){
  gameOverUI.style.display = "none";
}

function resetForRestart(){
  if(!state) return;
  if(sounds.dead){ try{ sounds.dead.pause(); sounds.dead.currentTime = 0; }catch(e){} }
  const w = canvas.width, h = canvas.height;
  const pw = Math.max(28, Math.round(w * PHYS.playerWidthRatio));
  const ph = Math.max(28, Math.round(pw * (images.player.naturalHeight || 1) / (images.player.naturalWidth || pw)));
  state.player = { x: PHYS.playerX, y: Math.round(h/2 - ph/2), w: pw, h: ph, vy: 0 };
  state.pipes.length = 0;
  state.score = 0;
  state.pipeSpeed = PHYS.pipeSpeedBase;
  state.gap = PHYS.gap;
  state.lastSpawn = 0;
  state.spawnInterval = PHYS.spawnInterval;
  state.running = true;
  state.dead = false;
  scoreEl.textContent = state.score;
  hideGameOver();
  if(sounds.bgm && startedAudio){ try{ sounds.bgm.currentTime = 0; sounds.bgm.play().catch(()=>{}); }catch(e){} }
}

// user input -> flap
function flap(){
  if(!state) return;
  if(state.dead){
    // restart in-game
    resetForRestart();
    return;
  }
  if(sounds.bgm && !startedAudio){
    startedAudio = true;
    try{ sounds.bgm.play().catch(()=>{}); }catch(e){}
  }
  state.player.vy = PHYS.flapV;
}

canvas.addEventListener("click", flap);
canvas.addEventListener("touchstart", (e)=>{ e.preventDefault(); flap(); }, { passive:false });

restartBtn.addEventListener("click", ()=> resetForRestart());
toMaker.addEventListener("click", ()=> location.href = "/");
backBtn.addEventListener("click", ()=> location.href = "/");

// start
(async function init(){
  fit();
  loader.style.display = "block";
  const cfg = await fetchConfig();

  // set images + sounds
  images.player.src = cfg.player || "";
  images.pipe.src = cfg.pipe || "";
  if(cfg.bg) images.bg.src = cfg.bg;
  if(cfg.goImg) images.go.src = cfg.goImg;

  if(cfg.bgm) sounds.bgm = new Audio(cfg.bgm);
  if(cfg.dead) sounds.dead = new Audio(cfg.dead);

  // create state and start
  state = makeState(cfg.goText || "You lost!");
  scoreEl.textContent = "0";
  loader.style.display = "none";
  // start loop
  if(!raf) raf = requestAnimationFrame(loop);
})();
