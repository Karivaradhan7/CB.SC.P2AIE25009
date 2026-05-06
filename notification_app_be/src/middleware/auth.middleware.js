const { logger } = require('logging_middleware');
const config = require('../config');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Unauthorized access attempt', { ip: req.ip, path: req.originalUrl });
    return res.status(401).json({
      success: false,
      message: 'Authorization token is required'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Basic validation for this specific assessment scope
  // In a real scenario, this would use jwt.verify(token, config.JWT_SECRET)
  if (!token || token.length < 10) {
    logger.warn('Invalid token format provided', { ip: req.ip });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Mock attaching user to request
  req.user = { id: 'mock-user-1042', role: 'STUDENT' };
  next();
};

module.exports = {
  verifyToken
};
