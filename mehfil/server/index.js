const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const config = require('./config');
const apiRouter = require('./routes/api');
const setupSockets = require('./sockets/socketHandler');
const radioService = require('./services/radioService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Attach io to express app for route access
app.set('io', io);

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API routes
app.use('/api', apiRouter);

// Serve static frontend assets
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Fallback for SPA routing to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Setup WebSockets
setupSockets(io);

// Initialize Synchronized Radio Service
radioService.init(io);

// Start Server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   📻  MEHFIL — Jahan Har Mood Ka Ek Gaana Hai                ║
║   Full-Stack Realtime Radio & Music Lounge                   ║
║                                                              ║
║   📡 Server Running at: http://localhost:${PORT}             ║
║   🎶 Live API:          http://localhost:${PORT}/api/status     ║
║   ⚡ WebSocket:         Connected via Socket.IO              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('[MEHFIL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[MEHFIL] Unhandled Rejection:', reason);
});
