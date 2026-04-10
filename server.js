require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const questionRoutes = require('./routes/questions.routes');
const { seedIfEmpty } = require('./controllers/questions.controller');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173', 'https://100-mexicanos-front.vercel.app'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true,
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  seedIfEmpty();
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173', 'https://100-mexicanos-front.vercel.app'],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/auth.routes');
app.use('/api/questions', questionRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '100 Mexicanos Dijeron API ✅' });
});

// Configuración de WebSockets para Salas
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Unirse a una sala específica
  socket.on('join_room', (roomCode) => {
    socket.join(roomCode);
    console.log(`Usuario ${socket.id} se unió a la sala: ${roomCode}`);
    
    // Opcional: avisar a los demás usuarios de la sala
    socket.to(roomCode).emit('user_joined', { id: socket.id, room: roomCode });
  });

  // Evento simple de chat / interaccion para el room
  socket.on('send_interaction', (data) => {
    // data debe contener { room, message }
    io.to(data.room).emit('receive_interaction', data);
  });

  // Evento de ratón (Remote Cursor)
  socket.on('mouse_move', (data) => {
    // Transmitir cursors sólo a la sala actual de manera "volátil" (descarta paquetes perdidos sin bloquear red)
    if (data.room) {
      socket.volatile.to(data.room).emit('mouse_moved', data);
    }
  });

  // Evento de ocupar lugar en equipo
  socket.on('claim_slot', (data) => {
    // data => { room, team, index, username }
    if (data.room) {
      socket.to(data.room).emit('slot_claimed', data);
    }
  });

  // Evento para desocupar o cambiar de lugar
  socket.on('unclaim_slot', (data) => {
    if (data.room) {
      socket.to(data.room).emit('slot_unclaimed', data);
    }
  });

  // Evento para sincronizar nombre y jugadores del equipo
  socket.on('update_team', (data) => {
    // data => { room, team, teamData }
    if (data.room) {
      socket.to(data.room).emit('team_updated', data);
    }
  });

  // Evento para sincronizar categorías
  socket.on('update_categories', (data) => {
    // data => { room, categories }
    if (data.room) {
      socket.to(data.room).emit('categories_updated', data);
    }
  });

  // Evento para iniciar partida
  socket.on('start_game', (data) => {
    // data => { room, gameState }
    if (data.room) {
      io.to(data.room).emit('game_started', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada.' });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
