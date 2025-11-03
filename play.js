async function load(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(!id){ alert("Invalid link"); return; }

  const res = await fetch(`https://floppy-production.up.railway.app/api/game?id=${id}`);
  const data = await res.json();
  if(!data){ alert("Not found!"); return; }

  localStorage.setItem("floppy_game", JSON.stringify(data));
  window.location.href = "index.html?playMode=1";
}
load();
