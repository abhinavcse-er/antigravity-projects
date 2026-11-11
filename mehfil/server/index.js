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

// Socket.IO: websocket first, polling fallback remains available for restrictive networks.
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  },
  perMessageDeflate: false,
  maxHttpBufferSize: 1e6,
  pingInterval: 25000,
  pingTimeout: 20000
});

app.set('io', io);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

app.use('/api', apiRouter);

// Serve the app shell with revalidation; allow short-lived caching for static assets.
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath, {
  etag: true,
  lastModified: true,
  maxAge: '5m',
  setHeaders(res, filePath) {
    if (path.basename(filePath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    }
  }
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(clientPath, 'index.html'));
});

setupSockets(io);
radioService.init(io);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`MEHFIL backend listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('[MEHFIL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[MEHFIL] Unhandled Rejection:', reason);
});
