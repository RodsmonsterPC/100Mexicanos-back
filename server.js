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
const userCategoriesRoutes = require('./routes/userCategories.routes');

app.use('/api/questions', questionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user-categories', userCategoriesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '100 Mexicanos Dijeron API ✅' });
});

// Variables globales en memoria
const roomStates = {};

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Unirse a una sala específica
  socket.on('join_room', (roomCode) => {
    socket.join(roomCode);
    console.log(`Usuario ${socket.id} se unió a la sala: ${roomCode}`);
    
    // Inicializar estado de la sala si no existe, por defecto 5 jugadores
    if (!roomStates[roomCode]) {
      roomStates[roomCode] = {
        teamA: { name: '', players: ['', '', '', '', ''] },
        teamB: { name: '', players: ['', '', '', '', ''] },
        categories: [],
        gameState: null
      };
    } else {
      // Sincronizar inmediatamente al que recién entra
      socket.emit('sync_room_state', roomStates[roomCode]);
    }

    // Opcional: avisar a los demás usuarios de la sala
    socket.to(roomCode).emit('user_joined', { id: socket.id, room: roomCode });
  });

  // Crear una sala específica con número de jugadores
  socket.on('create_room', (data) => {
    const { roomCode, playersCount } = data;
    socket.join(roomCode);
    console.log(`Usuario ${socket.id} CREÓ la sala: ${roomCode} con ${playersCount} jugadores`);

    const teamSize = playersCount / 2;
    // Inicializar estado de la sala
    roomStates[roomCode] = {
      teamA: { name: '', players: new Array(teamSize).fill('') },
      teamB: { name: '', players: new Array(teamSize).fill('') },
      categories: [],
      gameState: null
    };

    socket.emit('sync_room_state', roomStates[roomCode]);
  });

  // Manejar reconexiones pidiendo datos
  socket.on('request_room_data', (data) => {
    if (data.room && roomStates[data.room]) {
      socket.emit('sync_room_state', roomStates[data.room]);
    }
  });

  // Evento simple de chat / interaccion para el room
  socket.on('send_interaction', (data) => {
    io.to(data.room).emit('receive_interaction', data);
  });

  // Evento de ratón (Remote Cursor)
  socket.on('mouse_move', (data) => {
    if (data.room) socket.volatile.to(data.room).emit('mouse_moved', data);
  });

  // Evento de ocupar lugar en equipo
  socket.on('claim_slot', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         const teamObj = data.team === 'A' ? roomStates[data.room].teamA : roomStates[data.room].teamB;
         if (teamObj && teamObj.players) teamObj.players[data.index] = `LCK:${data.username}`;
      }
      socket.to(data.room).emit('slot_claimed', data);
    }
  });

  // Evento para desocupar o cambiar de lugar
  socket.on('unclaim_slot', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         const teamObj = data.team === 'A' ? roomStates[data.room].teamA : roomStates[data.room].teamB;
         if (teamObj && teamObj.players) teamObj.players[data.index] = '';
      }
      socket.to(data.room).emit('slot_unclaimed', data);
    }
  });

  // Evento para sincronizar nombre y jugadores del equipo
  socket.on('update_team', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         if (data.team === 'A') roomStates[data.room].teamA = data.teamData;
         else if (data.team === 'B') roomStates[data.room].teamB = data.teamData;
      }
      socket.to(data.room).emit('team_updated', data);
    }
  });

  // Eventos para Partida Multijugador en Curso
  socket.on('spin_roulette', (data) => {
    if (data.room) socket.to(data.room).emit('roulette_spun', data);
  });

  socket.on('sync_game_state', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         roomStates[data.room].gameState = { ...roomStates[data.room].gameState, ...data.updates };
      }
      socket.to(data.room).emit('game_state_synced', data);
    }
  });
  
  socket.on('next_question', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         roomStates[data.room].gameState = {
             ...roomStates[data.room].gameState,
             question: data.question,
             revealedAnswers: data.question.answers.map(() => false),
             currentStrikes: 0,
             phase: 'roulette',
             isInputDisabled: true,
             isTimerRunning: false,
             roundOwnerIndex: 0
         };
      }
      io.to(data.room).emit('question_advanced', data);
    }
  });

  socket.on('end_game_winner', (data) => {
    if (data.room) {
      io.to(data.room).emit('go_to_winner', data);
    }
  });

  // Evento para sincronizar categorías
  socket.on('update_categories', (data) => {
    if (data.room) {
      if (roomStates[data.room]) {
         roomStates[data.room].categories = data.categories;
      }
      socket.to(data.room).emit('categories_updated', data);
    }
  });

  // Evento para iniciar partida
  socket.on('start_game', (data) => {
    // data => { room, gameState }
    if (data.room) {
      if (roomStates[data.room]) {
        roomStates[data.room].gameState = data.gameState;
      }
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
