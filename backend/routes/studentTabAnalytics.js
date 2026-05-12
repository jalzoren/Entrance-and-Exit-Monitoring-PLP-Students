// backend/routes/studentTabAnalytics.js
const express = require('express');
const router = express.Router();
const db = require('../src/db'); // adjust path if your db.js is elsewhere

/**
 * GET /api/analytics/college-status-summary
 * Returns total students and breakdown (Regular, Irregular, LOA, Graduated, Withdrawn)
 * per college (department) for non‑archived students.
 */
router.get('/college-status-summary', async (req, res) => {
  try {
    console.log('[studentTabAnalytics] Fetching college-wise status breakdown...');

    const [rows] = await db.query(`
      SELECT 
        COALESCE(d.dept_name, 'Unknown Department') AS college,
        d.dept_code AS collegeAbbrev,
        COUNT(*) AS total,
        SUM(CASE WHEN s.status = 'Regular' THEN 1 ELSE 0 END) AS regular,
        SUM(CASE WHEN s.status = 'Irregular' THEN 1 ELSE 0 END) AS irregular,
        SUM(CASE WHEN s.status = 'LOA' THEN 1 ELSE 0 END) AS loa,
        SUM(CASE WHEN s.status = 'Graduated' THEN 1 ELSE 0 END) AS graduated,
        SUM(CASE WHEN s.status IN ('Dropout', 'Kickout', 'Transferred') THEN 1 ELSE 0 END) AS withdrawn
      FROM students s
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE s.is_archived = 0
        AND (s.status IS NULL OR s.status NOT IN ('Inactive'))
      GROUP BY d.id, d.dept_name, d.dept_code
      ORDER BY total DESC
    `);

    console.log(`[studentTabAnalytics] Found ${rows.length} colleges`);
    res.json(rows);
  } catch (err) {
    console.error('[studentTabAnalytics] ERROR in /college-status-summary:', err);
    res.status(500).json({ message: 'Failed to fetch college status summary.' });
  }
});

// You can add other student‑specific analytics endpoints here later
// e.g., router.get('/year-level-distribution', ...)

module.exports = router;