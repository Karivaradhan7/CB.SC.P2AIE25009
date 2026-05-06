require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || 'http://20.207.122.201/evaluation-service/notifications',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret',
};


