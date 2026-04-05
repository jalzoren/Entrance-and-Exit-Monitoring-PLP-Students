// qrScan.js
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


  const match = qr_data.match(/\[([^\]]+)\]/);

  console.log('[QR Raw Data]:', JSON.stringify(qr_data));
  console.log('[QR Extracted ID]:', match ? match[1].trim() : 'NO MATCH FOUND');

  if (!match)
    return res.status(400).json({
      message: 'Invalid QR code format. Could not read student ID.',
    });

  const student_id = match[1].trim(); 

  console.log('[DB Query student_id]:', student_id);

  try {
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Invalid QR code.' });

    const student  = rows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;
    const now = getPhTime();

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

    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'QR Code', 'SUCCESS', ?)`,
      [student_id, now]
    );

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