// Socket.IO terminal — real-time deploy log streaming
// Rooms: deploy:{deployId}
// Events: log:line, log:done, log:error

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Join a deploy room
    socket.on('deploy:join', (deployId) => {
      socket.join(`deploy:${deployId}`);
      console.log(`[Socket] ${socket.id} joined deploy:${deployId}`);
    });

    socket.on('deploy:leave', (deployId) => {
      socket.leave(`deploy:${deployId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};

// Helper: emit a log line to a deploy room
const emitLog = (deployId, line, type = 'info') => {
  global.io?.to(`deploy:${deployId}`).emit('log:line', {
    text: line,
    type, // info | success | error | warn | cmd
    timestamp: new Date().toISOString()
  });
};

const emitDone = (deployId, success, summary = '') => {
  global.io?.to(`deploy:${deployId}`).emit('log:done', { success, summary });
};

const emitError = (deployId, message) => {
  global.io?.to(`deploy:${deployId}`).emit('log:error', { message });
};

module.exports.emitLog = emitLog;
module.exports.emitDone = emitDone;
module.exports.emitError = emitError;
