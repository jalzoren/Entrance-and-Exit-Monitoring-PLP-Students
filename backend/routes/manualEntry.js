// manualEntry.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { student_id, mode } = req.body; // mode: 'ENTRY' | 'EXIT'

  if (!student_id)
    return res.status(400).json({ message: 'Student ID is required.' });

  if (!mode || !['ENTRY', 'EXIT'].includes(mode))
    return res.status(400).json({ message: 'Invalid mode. Must be ENTRY or EXIT.' });

  try {
    // 1. Find the student
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id.trim()]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Please check your ID.' });

    const student  = rows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;
    const now = getPhTime();

    const today = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    console.log('[now]:', now);
    console.log('[today]:', today);


    const [lastLogs] = await db.query(
      `SELECT action FROM entry_exit_logs
      WHERE student_id = ?
        AND DATE(log_time) = ?
      ORDER BY log_time DESC
      LIMIT 1`,
      [student_id, today]
    );

    console.log('[lastLogs]:', JSON.stringify(lastLogs));
    console.log('[lastAction]:', lastLogs.length ? lastLogs[0].action : 'null - no log found today');

    const lastAction = lastLogs.length ? lastLogs[0].action : null;

    // 3. Validate against mode
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

    // 4. Insert authentication record
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'MANUAL', 'SUCCESS', ?)`,
      [student_id, now]
    );

    // 5. Insert entry/exit log
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
    console.error('[Manual Entry Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;