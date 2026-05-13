// systemSettings.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');
const multer = require('multer');
const path = require('path');

// ── Multer config for logo upload (memory storage for BLOB) ──
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ── Helper: get all settings as a flat object ─────────────────────────────────
async function getAllSettings() {
  const [rows] = await db.query('SELECT `key`, `value` FROM system_settings');
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
}

// ── Helper: Add days to a date string (YYYY-MM-DD)
function dateAddDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (err) {
    console.error('[settings GET]', err);
    res.status(500).json({ message: 'Failed to load settings.' });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
// Body: { key: value, key: value, ... }
router.put('/', async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object')
    return res.status(400).json({ message: 'Invalid settings payload.' });

  try {
    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    const entries = Object.entries(updates);
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO system_settings (\`key\`, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('[settings PUT]', err);
    res.status(500).json({ message: 'Failed to save settings.' });
  }
});

// ── GET /api/settings/gate-status ─────────────────────────────────────────────
// Returns whether current PH time is within entry/exit windows
router.get('/gate-status', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const now      = await getPhTime();

    const hhmm = (d) =>
      `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    const currentTime = hhmm(now);

    const entryOpen = currentTime >= settings.gate_entry_start &&
                      currentTime <= settings.gate_entry_end;
    const exitOpen  = currentTime >= settings.gate_exit_start  &&
                      currentTime <= settings.gate_exit_end;

    // Check if blocking is enabled
    const blockOutsideEnabled = settings.block_outside_window === 'true';

    res.json({
      currentTime,
      currentDateTime: now.toISOString(),
      entryOpen,
      exitOpen,
      entryWindow: `${settings.gate_entry_start} – ${settings.gate_entry_end}`,
      exitWindow:  `${settings.gate_exit_start} – ${settings.gate_exit_end}`,
      blockOutside: blockOutsideEnabled,
      autoExitWillTrigger: !exitOpen && blockOutsideEnabled,
      debugNote: !exitOpen && !blockOutsideEnabled 
        ? 'Gate is outside window but block_outside_window is NOT enabled. Auto-exit requires block_outside_window=true.' 
        : 'Check above for auto-exit readiness.'
    });
  } catch (err) {
    console.error('[gate-status]', err);
    res.status(500).json({ message: 'Failed to get gate status.' });
  }
});

// ── GET /api/settings/academic-year ──────────────────────────────────────────
// Returns current academic year, semester, and whether promotion is due
router.get('/academic-year', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const now      = await getPhTime();
    const today    = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const sem1Start = settings.sem1_start;
    const sem1End   = settings.sem1_end;
    const sem2Start = settings.sem2_start;
    const sem2End   = settings.sem2_end;

    // Auto-detect current semester based on today's date
    let currentSemester = null;
    if (today >= sem1Start && today <= sem1End) currentSemester = '1';
    else if (today >= sem2Start && today <= sem2End) currentSemester = '2';
    else currentSemester = 'Break'; // between semesters

    // Check if promotion is due:
    // Promotion happens at the end of 2nd semester for Regular students
    const promotionDue = today > sem2End && settings.semester === '2';

    // Compliance notifications
    const schoolYearStart = settings.school_year_start;
    const schoolYearEnd = settings.school_year_end;
    const currentYear = now.getFullYear();

    // School year typically runs from August of start year to May/June of end year
    // Check if today is within a few days of school year start (Aug 1)
    const schoolYearStartDate = new Date(schoolYearStart, 7, 1); // August 1st of start year
    const schoolYearEndDate = new Date(schoolYearEnd, 5, 30);    // June 30th of end year
    
    // Check if today is the school year start or within 7 days after
    const schoolYearStarted = today >= schoolYearStart + '-08-01' && 
                             today <= schoolYearStart + '-08-08';
    
    // Check if today is the school year end or within 7 days after
    const schoolYearEnded = today >= schoolYearEnd + '-05-24' && 
                           today <= schoolYearEnd + '-06-07';

    // Check if today is semester start or within 7 days after
    const semesterStarted = (currentSemester === '1' && today >= sem1Start && today <= dateAddDays(sem1Start, 7)) ||
                           (currentSemester === '2' && today >= sem2Start && today <= dateAddDays(sem2Start, 7));

    // Check if today is semester end or within 7 days after
    const semesterEnded = (currentSemester === 'Break' && (
      (today >= sem1End && today <= dateAddDays(sem1End, 7)) ||
      (today >= sem2End && today <= dateAddDays(sem2End, 7))
    ));

    res.json({
      schoolYear:       `${settings.school_year_start}-${settings.school_year_end}`,
      semester:         settings.semester,         // stored/configured
      detectedSemester: currentSemester,           // auto-detected from date
      sem1Start:        sem1Start,
      sem1End:          sem1End,
      sem2Start:        sem2Start,
      sem2End:          sem2End,
      promotionDue,
      today,
      schoolYearStarted,
      schoolYearEnded,
      semesterStarted,
      semesterEnded,
    });
  } catch (err) {
    console.error('[academic-year]', err);
    res.status(500).json({ message: 'Failed to get academic year info.' });
  }
});

// ── POST /api/settings/promote-students ──────────────────────────────────────
router.post('/promote-students', async (req, res) => {
  let connection;
  
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // FIRST: Get the IDs of current 4th year students (to archive later)
    const [fourthYearStudents] = await connection.query(`
      SELECT student_id FROM students
      WHERE status = 'Regular' 
        AND year_level = 4
        AND is_archived = 0
    `);

    // SECOND: Promote Year 1-3 students
    const [promoted] = await connection.query(`
      UPDATE students
      SET year_level = year_level + 1,
          updated_at = NOW()
      WHERE status = 'Regular' 
        AND year_level IN (1, 2, 3)
        AND is_archived = 0
    `);

    // THIRD: Archive ONLY the original 4th year students (NOT the newly promoted ones)
    const [graduated] = await connection.query(`
      UPDATE students
      SET is_archived = 1,
          archived_status = 'Graduated',
          status = 'Graduated',
          updated_at = NOW()
      WHERE student_id IN (?)
    `, [fourthYearStudents.map(s => s.student_id)]);

    await connection.commit();

    console.log(`[Promotion] Promoted: ${promoted.affectedRows} | Archived: ${graduated.affectedRows}`);

    res.json({
      message: 'Student promotion complete.',
      promoted: promoted.affectedRows,
      graduated: graduated.affectedRows,
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('[promote-students]', err);
    res.status(500).json({ message: 'Promotion failed: ' + err.message });
  } finally {
    if (connection) connection.release();
  }
});

// ── GET /api/settings/logo ─────────────────────────────────────────────────
router.get('/logo', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT logo_data, logo_type FROM system_logo WHERE id = 1'
    );
    
    if (rows[0]?.logo_data) {
      const base64Data = rows[0].logo_data.toString('base64');
      const logoUrl = `data:${rows[0].logo_type};base64,${base64Data}`;
      res.json({ logoUrl: logoUrl });
    } else {
      res.json({ logoUrl: null });
    }
  } catch (err) {
    console.error('[logo GET]', err);
    res.status(500).json({ message: 'Failed to get logo' });
  }
});

// ── POST /api/settings/logo ────────────────────────────────────────────────
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const base64Data = req.file.buffer.toString('base64');
    const logoUrl = `data:${req.file.mimetype};base64,${base64Data}`;
    
    // UPDATE existing record (always id=1)
    await db.query(
      `INSERT INTO system_logo (id, logo_data, logo_type) 
       VALUES (1, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       logo_data = VALUES(logo_data), 
       logo_type = VALUES(logo_type)`,
      [req.file.buffer, req.file.mimetype]
    );
    
    res.json({ 
      message: 'Logo uploaded successfully', 
      logoUrl: logoUrl 
    });
    
  } catch (err) {
    console.error('[logo POST]', err);
    res.status(500).json({ message: 'Failed to upload logo' });
  }
});

// ── POST /api/settings/logo/reset ──────────────────────────────────────────
router.post('/logo/reset', async (req, res) => {
  try {
    await db.query(
      'UPDATE system_logo SET logo_data = NULL, logo_type = NULL WHERE id = 1'
    );
    
    res.json({ 
      message: 'Logo reset to default', 
      logoUrl: null 
    });
    
  } catch (err) {
    console.error('[logo RESET]', err);
    res.status(500).json({ message: 'Failed to reset logo' });
  }
});

// ── POST /api/settings/force-gate-closure ──────────────────────────────────────
// Force auto-exit for all unmatched entries (for testing/immediate closure)
router.post('/force-gate-closure', async (req, res) => {
  try {
    const { dayStart, dayEnd } = await require('../src/time').getTodayPhRange(db);
    const { getPhTime } = require('../src/time');

    // Find all students with unmatched ENTRY logs
    const [rows] = await db.query(
      `SELECT DISTINCT eel.student_id
       FROM entry_exit_logs eel
       WHERE eel.action = 'ENTRY'
         AND eel.log_time BETWEEN ? AND ?
         AND eel.student_id NOT IN (
           SELECT student_id FROM entry_exit_logs
           WHERE action = 'EXIT' AND log_time BETWEEN ? AND ?
         )`,
      [dayStart, dayEnd, dayStart, dayEnd]
    );

    if (!rows.length) {
      return res.json({ message: 'No unmatched entries found.', updated: 0 });
    }

    const now = await getPhTime();
    const exitDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const exitTime = `${exitDate} ${now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour12: false })}`;

    // Create or get system authentication record for auto-exits
    const [systemAuthRows] = await db.query(
      `SELECT auth_id FROM authentication WHERE method = 'SYSTEM' AND auth_status = 'AUTO-EXIT' LIMIT 1`
    );

    let systemAuthId;
    if (systemAuthRows.length > 0) {
      systemAuthId = systemAuthRows[0].auth_id;
    } else {
      // Insert a system auth record for auto-exits
      const [authResult] = await db.query(
        `INSERT INTO authentication (method, auth_status, timestamp)
         VALUES ('SYSTEM', 'AUTO-EXIT', ?)`,
        [exitTime]
      );
      systemAuthId = authResult.insertId;
    }

    // Insert EXIT logs for all unmatched entries
    const insertPromises = rows.map(async (row) => {
      await db.query(
        `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time, gate_window_warning, gate_window_reason)
         VALUES (?, ?, 'EXIT', ?, 1, 'Force-closed: Gate closure forced by admin')`,
        [row.student_id, systemAuthId, exitTime]
      );
    });

    await Promise.all(insertPromises);

    console.log(`[force-gate-closure] Applied auto-exit to ${rows.length} students at ${exitTime}`);

    res.json({
      message: `Auto-exit applied to ${rows.length} unmatched student(s).`,
      updated: rows.length,
      exitTime,
      studentIds: rows.map(r => r.student_id)
    });

  } catch (err) {
    console.error('[force-gate-closure]', err);
    res.status(500).json({ message: 'Failed to force gate closure: ' + err.message });
  }
});

module.exports = router;