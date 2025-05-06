const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());

// Show basic message when visiting backend in browser
app.get("/", (req, res) => {
  res.send("🧠 MIS WORMZ BACKEND IS RUNNING");
});

const players = {};
const food = [];
const MAX_PLAYERS = 40;
const MAP_SIZE = 2000;
const FOOD_COUNT = 100;
const TICK_RATE = 1000 / 20; // 20 updates per second
const AFK_TIMEOUT = 30 * 1000; // 30 seconds

function randomPos() {
  return { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE };
}

function spawnFood() {
  while (food.length < FOOD_COUNT) {
    food.push(randomPos());
  }
}
spawnFood();

io.on("connection", (socket) => {
  // Max player limit
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit("full");
    socket.disconnect();
    return;
  }

  // Store last input for AFK detection
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

  const interval = setInterval(() => {
    const now = Date.now();

    for (let id in players) {
      const p = players[id];
      if (!p) continue;

      // AFK timeout
      if (now - lastInput > AFK_TIMEOUT) {
        delete players[id];
        continue;
      }

      // Movement
      p.x += p.vx;
      p.y += p.vy;

      // Body handling
      p.body.unshift({ x: p.x, y: p.y });
      if (p.body.length > p.length) p.body.pop();

      // Eat food
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i];
        const dist = Math.hypot(f.x - p.x, f.y - p.y);
        if (dist < 10) {
          p.length += 2;
          food.splice(i, 1);
        }
      }
    }

    io.emit("state", { players, food });
    spawnFood();
  }, TICK_RATE);

  socket.on("disconnect", () => {
    clearInterval(interval);
    delete players[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 MIS WORMZ backend running on port ${PORT}`));
