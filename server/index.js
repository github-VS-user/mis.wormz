const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const players = {};
const food = [];
const MAX_PLAYERS = 40;
const MAP_SIZE = 2000;

function randomPos() {
  return { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE };
}

function spawnFood() {
  while (food.length < 100) {
    food.push(randomPos());
  }
}
spawnFood();

io.on("connection", (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit("full");
    socket.disconnect();
    return;
  }

  let lastInput = Date.now();

  socket.on("newPlayer", ({ username }) => {
    players[socket.id] = {
      username,
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      vx: 0,
      vy: 0,
      body: [],
      length: 20
    };
    socket.emit("init", socket.id);
  });

  socket.on("input", (target) => {
    const p = players[socket.id];
    if (!p) return;
    lastInput = Date.now();

    const dx = target.x - 500;
    const dy = target.y - 300;
    const angle = Math.atan2(dy, dx);
    p.vx = Math.cos(angle) * 2;
    p.vy = Math.sin(angle) * 2;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });

  setInterval(() => {
    const now = Date.now();

    for (let id in players) {
      const p = players[id];
      if (now - lastInput > 30000) {
        delete players[id];
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      p.body.unshift({ x: p.x, y: p.y });
      if (p.body.length > p.length) p.body.pop();

      // Collision with food
      food.forEach((f, i) => {
        const dist = Math.hypot(f.x - p.x, f.y - p.y);
        if (dist < 10) {
          p.length += 2;
          food.splice(i, 1);
        }
      });
    }

    io.emit("state", { players, food });
    spawnFood();
  }, 1000 / 20);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
