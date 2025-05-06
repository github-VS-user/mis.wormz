const socket = io("https://miswormz.fly.dev");

let myId = null;
let players = {};
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

// Resize canvas to full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let username = "";
let pos = { x: 500, y: 500 };

document.getElementById("playButton").addEventListener("click", () => {
  username = document.getElementById("usernameInput").value.trim();
  if (username === "") return alert("Choisis un pseudo, sale lombric 😏");

  document.getElementById("menu").style.display = "none";
  canvas.style.display = "block";

  socket.emit("new_player", { username });
});

// ✅ Si le serveur est full
socket.on("server_full", () => {
  alert("Serveur plein ! Attends qu'un ver parte 🐍");
  location.reload();
});

// ✅ Si le joueur est kick AFK
socket.on("afk_kick", () => {
  alert("T'es resté trop longtemps AFK, dégage 💤");
  location.reload();
});

// ✅ Initialisation
socket.on("init", (data) => {
  myId = data.id;
  players = data.players;
  requestAnimationFrame(drawLoop);
});

// ✅ Nouveau joueur
socket.on("player_joined", ({ id, player }) => {
  players[id] = player;
});

// ✅ Déplacement
socket.on("player_moved", ({ id, x, y }) => {
  if (players[id]) {
    players[id].x = x;
    players[id].y = y;
  }
});

// ✅ Déconnexion
socket.on("player_left", ({ id }) => {
  delete players[id];
});

// 🎮 Mouvements souris
canvas.addEventListener("mousemove", (e) => {
  pos.x += (e.clientX - canvas.width / 2) * 0.05;
  pos.y += (e.clientY - canvas.height / 2) * 0.05;

  socket.emit("move", { x: pos.x, y: pos.y });
});

// 🎨 Dessin du jeu
function drawLoop() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let id in players) {
    const p = players[id];
    const x = canvas.width / 2 + (p.x - pos.x);
    const y = canvas.height / 2 + (p.y - pos.y);

    // Cercle du ver
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = id === myId ? "#0f0" : "#fff";
    ctx.fill();

    // Pseudo
    ctx.fillStyle = "#aaa";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.username, x, y - 15);
  }

  requestAnimationFrame(drawLoop);
}
