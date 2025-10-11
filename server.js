// server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');

const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

// Par défaut 4000 (pour laisser 3000 au front en dev)
const port = normalizePort(process.env.PORT || '4000');
app.set('port', port);

const onError = (error) => {
  if (error.syscall !== 'listen') throw error;
  const address = server.address();
  const bind =
    typeof address === 'string' ? `pipe ${address}` : `port: ${port}`;
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges.`);
      process.exit(1);
    case 'EADDRINUSE':
      console.error(`${bind} is already in use.`);
      process.exit(1);
    default:
      throw error;
  }
};

const onListening = () => {
  const address = server.address();
  const bind =
    typeof address === 'string'
      ? `pipe ${address}`
      : `http://localhost:${port}`;
  console.log(`API running on ${bind}`);
};

const server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);
server.listen(port);
