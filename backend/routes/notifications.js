const express = require('express');
const router  = express.Router();
const db      = require('../src/db');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    console.log('[notifications] Fetching all notifications...');
    
    // 1. Check for students without face registration
    let dynamicNotifications = [];
    try {
      const [faceRegRows] = await db.query(`
        SELECT COUNT(DISTINCT s.student_id) AS count 
        FROM students s 
        LEFT JOIN student_face_embeddings sfe ON s.student_id = sfe.student_id 
        WHERE sfe.id IS NULL AND s.is_archived = 0
      `);
      
      const unregiStudentCount = Number(faceRegRows[0]?.count || 0);
      console.log(`[notifications] Unregistered students: ${unregiStudentCount}`);
      
      if (unregiStudentCount > 0) {
        dynamicNotifications.push({
          id: 0, // Special ID for dynamic notifications
          type: 'warning',
          icon: 'exclamation',
          title: 'Action Required',
          detail: `${unregiStudentCount} student${unregiStudentCount > 1 ? 's' : ''} need${unregiStudentCount === 1 ? 's' : ''} face registration.`,
          created_at: new Date(),
          is_read: 0,
        });
      }
    } catch (e) {
      console.log('[notifications] Face registration check failed:', e.message);
    }
    
    // 2. Query notifications from database
    const [rows] = await db.query(`
      SELECT 
        id,
        type,
        icon,
        title,
        detail,
        created_at,
        is_read
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`[notifications] Found ${rows.length} database notifications`);
    
    // 3. Combine dynamic + database notifications
    const allNotifications = [...dynamicNotifications, ...rows];
    
    // 4. Format response: convert is_read to unread flag
    const notifications = allNotifications.map(n => ({
      id: n.id,
      type: n.type,           // 'warning', 'info', 'error', 'success'
      icon: n.icon,           // 'exclamation', 'calendar', 'check', etc.
      title: n.title,
      detail: n.detail,
      time: getTimeAgo(n.created_at),
      unread: !n.is_read,
    }));
    
    res.json({
      data: notifications,
    });
    
  } catch (err) {
    console.error('[notifications] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});

// Helper: convert timestamp to relative time
function getTimeAgo(date) {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now - notifDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

module.exports = router;