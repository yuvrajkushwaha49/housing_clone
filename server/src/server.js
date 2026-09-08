import http from 'http';
import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { initSocket } from './sockets/index.js';
import { verifyMailTransport } from './helpers/mail.helper.js';
import { logPublicAppUrlOnce } from './helpers/app-url.helper.js';
import './config/db.js';

const server = http.createServer(app);
initSocket(server);

server.listen(config.port, async () => {
  logger.info(`${config.appName} API listening on port ${config.port} [${config.env}]`);
  logPublicAppUrlOnce();
  await verifyMailTransport();
});

function shutdown(signal) {
  logger.info(`${signal} received. Shutting down...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});
