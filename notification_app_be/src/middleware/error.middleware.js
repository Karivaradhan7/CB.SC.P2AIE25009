const { logger } = require('logging_middleware');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log the error using the custom logger, not console.log
  logger.error(`Application Error: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    error: err,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : err.message
  });
};

module.exports = {
  errorHandler
};
