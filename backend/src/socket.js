const socketIO = require('socket.io');
const winston = require('winston');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    winston.info(`New client connected: ${socket.id}`);

    // Join constituency room for live updates
    socket.on('join-constituency', (constituency) => {
      socket.join(`constituency-${constituency}`);
      winston.info(`Socket ${socket.id} joined constituency: ${constituency}`);
    });

    // Join admin room
    socket.on('join-admin', () => {
      socket.join('admin-room');
      winston.info(`Socket ${socket.id} joined admin room`);
    });

    // Handle vote event
    socket.on('vote-cast', (data) => {
      // Broadcast to constituency room
      io.to(`constituency-${data.constituency}`).emit('vote-update', data);
      
      // Notify admin room
      io.to('admin-room').emit('admin-vote-alert', {
        ...data,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      winston.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Make io available globally
  global.io = io;
};

// Middleware to attach io to requests
const attachIO = (req, res, next) => {
  req.io = io;
  next();
};

module.exports = {
  initializeSocket,
  attachIO,
  getIO: () => io
};