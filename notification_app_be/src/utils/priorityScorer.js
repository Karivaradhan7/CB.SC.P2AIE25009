// Priority base scores
const PRIORITY_SCORES = {
  PLACEMENT: 30,
  RESULT: 20,
  EVENT: 10
};

/**
 * Calculates a composite priority score for a notification.
 * Combines base score based on type with a recency bonus.
 * 
 * @param {Object} notification - The notification object
 * @returns {number} The calculated score (higher is better)
 */
const calculateScore = (notification) => {
  const typeStr = notification.type ? notification.type.toUpperCase() : 'EVENT';
  const baseScore = PRIORITY_SCORES[typeStr] || PRIORITY_SCORES.EVENT;
  
  // Calculate recency bonus
  let recencyBonus = 0;
  if (notification.createdAt) {
    const createdTime = new Date(notification.createdAt).getTime();
    const now = Date.now();
    const ageInHours = (now - createdTime) / (1000 * 60 * 60);
    
    // Max 10 points bonus, decays by 1 point every hour
    recencyBonus = Math.max(0, 10 - ageInHours);
  }
  
  return baseScore + recencyBonus;
};

/**
 * Gets the top N notifications from an array based on score.
 * 
 * @param {Array} notifications - Array of raw notifications
 * @param {number} limit - Number of top notifications to return
 * @returns {Array} Top notifications sorted by score descending
 */
const getTopNotifications = (notifications, limit = 10) => {
  if (!Array.isArray(notifications)) return [];
  
  // Map to include score for sorting, then sort descending
  const scored = notifications.map(notif => ({
    ...notif,
    _score: calculateScore(notif)
  }));
  
  // Sort by score (descending), fallback to date (descending)
  scored.sort((a, b) => {
    if (b._score !== a._score) {
      return b._score - a._score;
    }
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  // Return top N without the temporary _score field
  return scored.slice(0, limit).map(({ _score, ...rest }) => rest);
};

module.exports = {
  calculateScore,
  getTopNotifications
};
