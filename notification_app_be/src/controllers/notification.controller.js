const notificationService = require('../services/notification.service');
const { logger } = require('logging_middleware');

class NotificationController {
  async getPriorityNotifications(req, res, next) {
    try {
      // TODO: Add rate limiting based on req.user.id to prevent abuse
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      
      logger.info('Fetching notifications', { user: req.user?.id, limit });
      
      const notifications = await notificationService.getPriorityNotifications(limit);
      
      // TODO: Cache the final sorted result in Redis for ~30s
      return res.status(200).json({
        success: true,
        count: notifications.length,
        notifications
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
