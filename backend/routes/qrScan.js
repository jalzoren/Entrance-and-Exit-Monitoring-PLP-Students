const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { qr_data, mode } = req.body;

  if (!qr_data)
    return res.status(400).json({ message: 'No QR data received.' });

  if (!mode || !['ENTRY', 'EXIT'].includes(mode))
    return res.status(400).json({ message: 'Invalid mode. Must be ENTRY or EXIT.' });

  const now = getPhTime();

  try {
    // ── VISITOR EXIT ───────────────────────────────
    if (qr_data.startsWith('VISITOR_EXIT:')) {
      if (mode !== 'EXIT') {
        return res.status(400).json({ message: 'Visitor QR can only be used for EXIT.' });
      }

      const qrToken = qr_data.split(':')[1];

      // Check if visitor exists and has not exited yet
      const [rows] = await db.query(
        'SELECT * FROM visitor_logs WHERE qr_token = ? AND action = "ENTRY"',
        [qrToken]
      );

      if (!rows.length) {
        return res.status(409).json({ message: 'Visitor already exited or QR invalid.' });
      }

      const visitor = rows[0];

      // Update visitor log to EXIT
      await db.query(
        'UPDATE visitor_logs SET action = "EXIT", log_time = ? WHERE visitor_id = ?',
        [now, visitor.visitor_id]
      );

      return res.json({
        message: `EXIT recorded for visitor ${visitor.full_name}.`,
        action: 'EXIT',
        student: visitor.full_name,   // unify key with student for frontend
      });
    }

    // ── STUDENT ENTRY/EXIT ─────────────────────────
    const match = qr_data.match(/\[([^\]]+)\]/);
    if (!match) {
      return res.status(400).json({
        message: 'Invalid QR code format. Could not read student ID.',
      });
    }

    const student_id = match[1].trim();

    const [studentRows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (!studentRows.length)
      return res.status(404).json({ message: 'Student not found. Invalid QR code.' });

    const student  = studentRows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;

    const today = now.getFullYear() + '-' +
                  String(now.getMonth() + 1).padStart(2, '0') + '-' +
                  String(now.getDate()).padStart(2, '0');

    const [lastLogs] = await db.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ? AND DATE(log_time) = ?
       ORDER BY log_time DESC LIMIT 1`,
      [student_id, today]
    );

    const lastAction = lastLogs.length ? lastLogs[0].action : null;

    if (mode === 'ENTRY' && lastAction === 'ENTRY') {
      return res.status(409).json({
        message: `You've already entered the school.`,
        action: 'ALREADY_ENTERED',
      });
    }

    if (mode === 'EXIT' && lastAction === 'EXIT') {
      return res.status(409).json({
        message: `You've already exited the school.`,
        action: 'ALREADY_EXITED',
      });
    }

    if (mode === 'EXIT' && !lastAction) {
      return res.status(409).json({
        message: `No entry record found for today. Please enter first.`,
        action: 'NO_ENTRY',
      });
    }

    // Record authentication
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'QR Code', 'SUCCESS', ?)`,
      [student_id, now]
    );

    // Insert entry/exit log
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [student_id, authResult.insertId, mode, now]
    );

    return res.json({
      message: `${mode} recorded for ${fullName}.`,
      action: mode,
      student: fullName,
      department: student.college_department,
    });

  } catch (err) {
    console.error('[QR Scan Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;