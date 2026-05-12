const express = require('express');
const router  = express.Router();
const db      = require('../src/db');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    console.log('[notifications] Fetching all notifications...');
    
    // 1. Check for students without face registration
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
        const notificationDetail = `${unregiStudentCount} student${unregiStudentCount > 1 ? 's' : ''} need${unregiStudentCount === 1 ? 's' : ''} face registration.`;
        
        // Check if this notification already exists (to avoid duplicates)
        const [existingNotif] = await db.query(`
          SELECT id FROM notifications 
          WHERE type = 'warning' AND title = 'Action Required' AND detail = ?
          ORDER BY created_at DESC LIMIT 1
        `, [notificationDetail]);
        
        // Only insert if no recent notification exists
        if (existingNotif.length === 0) {
          console.log('[notifications] Saving face registration alert to database...');
          await db.query(`
            INSERT INTO notifications (type, icon, title, detail, is_resolved, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `, ['warning', 'exclamation', 'Action Required', notificationDetail, 0]);
        }
      } else {
        // All students have registered - mark old warnings as resolved
        console.log('[notifications] All students registered - marking warnings as resolved...');
        
        // Mark old "Action Required" warnings as resolved
        await db.query(`
          UPDATE notifications 
          SET is_resolved = 1 
          WHERE type = 'warning' AND title = 'Action Required'
        `);
        
        // Check if success notification already exists
        const [existingSuccess] = await db.query(`
          SELECT id FROM notifications 
          WHERE type = 'success' AND title = 'Action Resolved'
          ORDER BY created_at DESC LIMIT 1
        `);
        
        // Only insert if no success notification exists
        if (existingSuccess.length === 0) {
          console.log('[notifications] Creating action resolved notification...');
          await db.query(`
            INSERT INTO notifications (type, icon, title, detail, is_resolved, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `, ['success', 'check', 'Action Resolved', 'All students have completed face registration.', 1]);
        }
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
        is_resolved
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`[notifications] Found ${rows.length} database notifications`);
    
    // 3. Format response: convert is_resolved to unread flag
    const notifications = rows.map(n => ({
      id: n.id,
      type: n.type,           // 'warning', 'info', 'error', 'success'
      icon: n.icon,           // 'exclamation', 'calendar', 'check', etc.
      title: n.title,
      detail: n.detail,
      time: getTimeAgo(n.created_at),
      unread: !n.is_resolved,
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