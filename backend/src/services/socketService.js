// Manages the shared Socket.IO instance for real-time events.
// Controllers can access it through getIO() without importing io directly.

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  // ── Auth middleware — runs before every connection is accepted ────────────
  // Rejects any socket that doesn't carry a valid, unexpired access token.
  // The frontend sends the token in socket.handshake.auth.token (set in
  // useSocket.js). Using the same JWT_ACCESS_SECRET as the HTTP protect()
  // middleware keeps the two auth paths consistent.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required — no token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded; // { id, role, iat, exp } — available in handlers
      next();
    } catch {
      next(new Error('Authentication failed — token invalid or expired'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      // intentionally silent — connection churn is normal and noisy in logs
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO was requested before initSocket() was called');
  }
  return io;
}

module.exports = { initSocket, getIO };