const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from React build directory (client/dist)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'OK', time: new Date() });
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // Increase payload limit to 10MB for base64 images
});

// Room state: roomId -> { id, users: [ { id, name, ready } ] }
const rooms = new Map();

// Helper to generate 6 digit code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. CREATE ROOM
  socket.on('create-room', ({ name }) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const room = {
      id: roomId,
      users: [{ id: socket.id, name, ready: false }]
    };
    rooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room-created', { roomId, users: room.users });
    console.log(`Room ${roomId} created by user ${name} (${socket.id})`);
  });

  // 2. JOIN ROOM
  socket.on('join-room', ({ roomId, name }) => {
    const code = roomId.toUpperCase();
    if (!rooms.has(code)) {
      socket.emit('room-error', { message: 'Room not found.' });
      return;
    }

    const room = rooms.get(code);
    if (room.users.length >= 2) {
      socket.emit('room-error', { message: 'Room is full (max 2 people).' });
      return;
    }

    room.users.push({ id: socket.id, name, ready: false });
    socket.join(code);

    // Notify the joiner
    socket.emit('room-joined', { roomId: code, users: room.users });
    // Notify the other user in the room
    socket.to(code).emit('peer-joined', { users: room.users });

    console.log(`User ${name} (${socket.id}) joined Room ${code}`);
  });

  // 3. READY STATUS
  socket.on('set-ready', ({ roomId, ready }) => {
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const user = room.users.find(u => u.id === socket.id);
    if (user) {
      user.ready = ready;
      io.to(roomId).emit('users-updated', { users: room.users });
      console.log(`User ${socket.id} in Room ${roomId} set ready to ${ready}`);
    }
  });

  // 4. WEBRTC SIGNALING RELAY
  socket.on('webrtc-signal', ({ roomId, signal }) => {
    // Relays offers, answers, and ICE candidates to the other user in the room
    socket.to(roomId).emit('webrtc-signal', { signal, senderId: socket.id });
  });

  // 5. SESSION SYNC (Countdown & capturing)
  socket.on('start-countdown', ({ roomId }) => {
    if (!rooms.has(roomId)) return;
    io.to(roomId).emit('countdown-started');
    console.log(`Countdown started for Room ${roomId}`);
  });

  // Forward captured photo frame to the peer
  // Since we take 4 photos, we match them by index (0, 1, 2, 3)
  socket.on('share-photo', ({ roomId, photoIndex, dataUrl }) => {
    if (!rooms.has(roomId)) return;
    socket.to(roomId).emit('peer-photo-shared', { photoIndex, dataUrl });
    console.log(`User ${socket.id} shared photo index ${photoIndex} in Room ${roomId}`);
  });

  // Filter selection synchronization
  socket.on('select-filter', ({ roomId, filterClass }) => {
    if (!rooms.has(roomId)) return;
    socket.to(roomId).emit('peer-filter-selected', { filterClass });
  });

  // Frame selection synchronization
  socket.on('select-frame', ({ roomId, frameClass }) => {
    if (!rooms.has(roomId)) return;
    socket.to(roomId).emit('peer-frame-selected', { frameClass });
  });

  // Restart / Reset booth session
  socket.on('reset-session', ({ roomId }) => {
    if (!rooms.has(roomId)) return;
    io.to(roomId).emit('session-reset');
    console.log(`Session reset in Room ${roomId}`);
  });

  // 6. DISCONNECT
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.users = room.users.filter(u => u.id !== socket.id);
        
        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          // Notify remaining user
          socket.to(roomId).emit('peer-left', { users: room.users });
          // Reset their ready states
          room.users.forEach(u => u.ready = false);
          io.to(roomId).emit('users-updated', { users: room.users });
          console.log(`User ${socket.id} left Room ${roomId}. 1 user remaining.`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// React router fallback: serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Photobooth signaling server running on port ${PORT}`);
});
