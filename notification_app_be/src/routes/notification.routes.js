const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply auth middleware to all notification routes
router.use(verifyToken);

// GET /api/notifications/priority
router.get('/priority', notificationController.getPriorityNotifications);

module.exports = router;
