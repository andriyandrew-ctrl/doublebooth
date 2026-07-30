const { io } = require('../client/node_modules/socket.io-client');

const SERVER_URL = 'https://photobooth-onrender-com.onrender.com/';

console.log(`Connecting to signaling server at: ${SERVER_URL}`);

const socketA = io(SERVER_URL);

socketA.on('connect', () => {
  console.log(`Socket A connected. ID: ${socketA.id}`);
  
  // Create a room
  console.log('Socket A emitting create-room...');
  socketA.emit('create-room', { name: 'Alice' });
});

socketA.on('room-created', ({ roomId, users }) => {
  console.log(`Room created successfully! Code: ${roomId}`);
  console.log('Current users:', users);

  // Now, connect Socket B and try to join
  console.log('Connecting Socket B...');
  const socketB = io(SERVER_URL);

  socketB.on('connect', () => {
    console.log(`Socket B connected. ID: ${socketB.id}`);
    console.log(`Socket B emitting join-room for code: ${roomId}...`);
    socketB.emit('join-room', { roomId, name: 'Bob' });
  });

  socketB.on('room-joined', ({ roomId: joinedRoomId, users: updatedUsers }) => {
    console.log(`Socket B joined room successfully! Room: ${joinedRoomId}`);
    console.log('Updated users:', updatedUsers);
    
    // Test ready state synchronization
    console.log('Socket A setting ready state...');
    socketA.emit('set-ready', { roomId, ready: true });
  });

  socketB.on('users-updated', ({ users: syncedUsers }) => {
    console.log('Socket B received users-updated event:', syncedUsers);
    
    // Clean up connections
    console.log('Simulation successful! Closing connections.');
    socketA.disconnect();
    socketB.disconnect();
    process.exit(0);
  });

  socketB.on('room-error', ({ message }) => {
    console.error('Socket B failed to join room:', message);
    socketA.disconnect();
    socketB.disconnect();
    process.exit(1);
  });
});

socketA.on('connect_error', (err) => {
  console.error('Socket A connection error:', err.message);
  process.exit(1);
});
