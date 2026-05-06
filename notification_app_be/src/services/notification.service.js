const axios = require('axios');
const config = require('../config');
const { getTopNotifications } = require('../utils/priorityScorer');
const { logger } = require('logging_middleware');

class NotificationService {
  /**
   * Fetches raw notifications from the external evaluation service
   * @returns {Promise<Array>} Array of notification objects
   */
  async fetchExternalNotifications() {
    try {
      logger.info('Fetching external notifications', { url: config.EXTERNAL_API_URL });
      
      const response = await axios.get(config.EXTERNAL_API_URL);
      
      // Handle the nested structure from the external API if it wraps data
      // Adjust based on actual external API response shape
      const notifications = response.data?.notifications || response.data || [];
      
      logger.info(`Successfully fetched ${notifications.length} external notifications`);
      return notifications;
    } catch (error) {
      logger.error('Failed to fetch external notifications', { error: error.message });
      // Return empty array to degrade gracefully instead of crashing the endpoint
      return [];
    }
  }

  /**
   * Retrieves the top priority notifications for the campus feed
   * @param {number} limit - Number of notifications to return
   * @returns {Promise<Array>} Sorted and limited array of notifications
   */
  async getPriorityNotifications(limit = 10) {
    const rawNotifications = await this.fetchExternalNotifications();
    const topNotifications = getTopNotifications(rawNotifications, limit);
    return topNotifications;
  }
}

module.exports = new NotificationService();
