const app = require('./app');
const config = require('./config');
const { logger } = require('logging_middleware');

const startServer = () => {
  try {
    const server = app.listen(config.PORT, () => {
      logger.info(`Notification Microservice started successfully`, {
        port: config.PORT,
        env: process.env.NODE_ENV || 'development'
      });
    });

    // Handle asynchronous port errors (like EADDRINUSE)
    server.on('error', (error) => {
      logger.error('Server encountered an error', { error });
      process.exit(1);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully.');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server synchronously', { error });
    process.exit(1);
  }
};

const server = startServer();

module.exports = server;
