const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {};
const food = Array.from({ length: 200 }, (_, i) => ({
  id: i, x: Math.random() * 2000, y: Math.random() * 2000
}));

io.on('connection', (socket) => {
  players[socket.id] = {
    x: 1000, y: 1000, mass: 10, name: 'Player',
    color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  };

  socket.on('move', ({ dx, dy }) => {
    const p = players[socket.id];
    if (!p) return;
    const spd = Math.max(1.5, 6 - Math.sqrt(p.mass) * 0.3);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    p.x = Math.max(0, Math.min(2000, p.x + (dx / len) * spd));
    p.y = Math.max(0, Math.min(2000, p.y + (dy / len) * spd));

    for (let i = 0; i < food.length; i++) {
      const f = food[i];
      if (Math.hypot(p.x - f.x, p.y - f.y) < Math.sqrt(p.mass) * 4.5) {
        p.mass += 1;
        food[i] = { id: f.id, x: Math.random() * 2000, y: Math.random() * 2000 };
      }
    }

    for (const id in players) {
      if (id === socket.id) continue;
      const o = players[id];
      if (p.mass < o.mass * 1.1) continue;
      if (Math.hypot(p.x - o.x, p.y - o.y) < Math.sqrt(p.mass) * 3.5) {
        p.mass += Math.floor(o.mass * 0.8);
        o.mass = 10;
        o.x = Math.random() * 1800 + 100;
        o.y = Math.random() * 1800 + 100;
        io.to(id).emit('respawn');
      }
    }
  });

  socket.on('setName', name => { if (players[socket.id]) players[socket.id].name = String(name).slice(0, 16); });
  socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => io.emit('state', { players, food }), 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Game running at http://localhost:' + PORT));