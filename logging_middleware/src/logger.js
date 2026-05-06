const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  let logString = `[${timestamp}] [${level}] ${message}`;
  if (Object.keys(meta).length > 0) {
    // Handle error objects inside meta gracefully
    if (meta.error instanceof Error) {
        meta.error = {
            message: meta.error.message,
            stack: meta.error.stack
        };
    }
    logString += ` | ${JSON.stringify(meta)}`;
  }
  return logString + '\n';
};

const writeLog = (level, message, meta = {}) => {
  const logMessage = formatMessage(level, message, meta);
  // Using process.stdout.write instead of console.log as per requirements
  if (level === logLevels.ERROR) {
    process.stderr.write(logMessage);
  } else {
    process.stdout.write(logMessage);
  }
};

const logger = {
  info: (message, meta) => writeLog(logLevels.INFO, message, meta),
  warn: (message, meta) => writeLog(logLevels.WARN, message, meta),
  error: (message, meta) => writeLog(logLevels.ERROR, message, meta),
};

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`Incoming Request`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration
    });
  });
  
  next();
};

module.exports = {
  logger,
  requestLogger
};
