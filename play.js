const scoreEl = document.getElementById("score");
const loader = document.getElementById("loader");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let images = { player: new Image(), pipe: new Image(), bg: new Image(), go: new Image() };
let sounds = { bgm: null, dead: null };
let state = null;
let last = 0;
let raf = null;
let startedAudio = false;

// physics
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

// game state
function makeState(goText){
  const playerW = canvas.width * PHYS.playerWidthRatio;
  const aspect = images.player.width / images.player.height;
  const playerH = playerW / (aspect || 1);

  return {
    player: { x: PHYS.playerX, y: canvas.height/2, vy: 0, w: playerW, h: playerH },
    pipes: [],
    t: 0,
    nextSpawn: PHYS.spawnInterval,
    score: 0,
    dead: false,
    goText
  };
}

// load config from DB
async function loadGame(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(!id){
    loader.innerText = "Missing game ID";
    return;
  }

  try{
    const res = await fetch(`https://floppy-production.up.railway.app/api/game/${id}`);
    const data = await res.json();
    if(!data.success || !data.game){
      loader.innerText = "Game Not Found";
      return;
    }
    const cfg = data.game.config;

    images.player.src = cfg.player;
    images.pipe.src = cfg.pipe;
    images.bg.src = cfg.bg || "";
    images.go.src = cfg.goImg || "";
    if(cfg.bgm) sounds.bgm = new Audio(cfg.bgm);
    if(cfg.dead) sounds.dead = new Audio(cfg.dead);

    setup(cfg.goText);
  }catch(e){
    loader.innerText = "Network error";
  }
}

// NEW IMAGE LOAD HANDLING 🚀
function setup(goText){
  // ✅ fail-safe timeout if image events fail
  let started = false;
  const startGame = ()=>{
    if(started) return;
    started = true;
    loader.style.display = "none";
    state = makeState(goText || "You lost!");
    scoreEl.textContent = "0";
    if(!raf) raf = requestAnimationFrame(loop);
  };

  // ✅ Start after max 2 seconds ANYWAY
  setTimeout(startGame, 2000);

  // ✅ Try normal load first
  images.player.onload = startGame;
  images.pipe.onload = startGame;
}

function loop(ts){
  let dt = (ts - last) / 1000;
  last = ts;
  if(!state || dt > 0.1) { if(!raf) raf = requestAnimationFrame(loop); return; }

  update(dt);
  draw();
  if(!raf) raf = requestAnimationFrame(loop);
}

function update(dt){
  if(state.dead) return;
  const p = state.player;

  p.vy = Math.min(p.vy + PHYS.gravity * dt, PHYS.maxFall);
  p.y += p.vy * dt;

  state.t += dt;
  if(state.t > state.nextSpawn){
    state.t = 0;
    state.nextSpawn = PHYS.spawnInterval;
    state.pipes.push({
      x: canvas.width + 20,
      offset: (Math.random() * 260) - 130
    });
  }

  for(const pipe of state.pipes){
    pipe.x -= PHYS.pipeSpeedBase * dt;
  }

  // remove offscreen pipes
  state.pipes = state.pipes.filter(p=>p.x > -100);
}

function draw(){
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const p = state.player;
  if(images.player.width>0){
    ctx.drawImage(images.player, p.x, p.y, p.w, p.h);
  }
}

// tap control
canvas.addEventListener("click", () => {
  if(!state) return;
  if(state.dead) return;
  state.player.vy = PHYS.flapV;
});

loadGame();
