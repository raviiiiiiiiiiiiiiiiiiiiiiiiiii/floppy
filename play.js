const scoreEl = document.getElementById("score");
const loader = document.getElementById("loader");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let images = { player: new Image(), pipe: new Image() };
let state = null;
let raf;

function fixCanvasSize(){
  const w = Math.min(window.innerWidth, 420);
  const h = Math.max(window.innerHeight - 120, 560);
  canvas.width = w;
  canvas.height = h;
}

function makeState(){
  const pw = canvas.width * 0.14;
  const ph = pw;
  return {
    player: { x: 60, y: canvas.height/2, w: pw, h: ph, vy: 0 },
    score: 0
  };
}

async function loadConfig(){
  const id = new URLSearchParams(location.search).get("id");
  if(!id){ loader.innerText="No Game ID"; return; }
  try{
    const res = await fetch(`https://floppy-production.up.railway.app/api/game/${id}`);
    const data = await res.json();
    if(!data.success){ loader.innerText="Game Not Found"; return; }
    const cfg = data.game.config;

    images.player.src = cfg.player;
    images.pipe.src = cfg.pipe;

    startGame();
  }catch(_){
    loader.innerText="Error loading";
  }
}

function startGame(){
  loader.style.display="none";
  canvas.style.display="block";
  fixCanvasSize();
  state = makeState();
  scoreEl.innerText = "0";
  raf = requestAnimationFrame(loop);
}

function loop(){
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update(){
  state.player.vy += 0.6;
  state.player.y += state.player.vy;
}

function draw(){
  ctx.fillStyle="#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.drawImage(images.player, state.player.x, state.player.y, state.player.w, state.player.h);
}

canvas.addEventListener("click", ()=>{
  state.player.vy = -7;
});

loadConfig();
window.addEventListener("resize", fixCanvasSize);
