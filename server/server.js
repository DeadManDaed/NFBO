// server/server.js
require('dotenv').config();
const http = require('http');
const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || 'development'})`);
});

// Gestion propre du shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
