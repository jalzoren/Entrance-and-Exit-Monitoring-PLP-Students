// visitor-exit.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getGateStatus } = require('../src/gateUtils');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { qr_data } = req.body;

  if (!qr_data)
    return res.status(400).json({ message: 'No QR data received.' });

  if (!qr_data.startsWith('VISITOR_EXIT:'))
    return res.status(400).json({ message: 'Invalid QR format.' });

  const qrToken = qr_data.replace('VISITOR_EXIT:', '');

  try {
    const [rows] = await db.query(
      `SELECT * FROM visitor_logs
       WHERE qr_token = ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [qrToken]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'QR not found.' });

    const lastLog = rows[0];

    const gateStatus = await getGateStatus('EXIT');
    if (!gateStatus.open) {
      return res.status(403).json({
        message: gateStatus.message,
        action: 'GATE_CLOSED',
      });
    }

    if (lastLog.action === 'EXIT')
      return res.status(409).json({ message: 'This QR has already been used for exit.' });

    const now = await getPhTime(); // ← server time, no arg needed

    const warningReason = gateStatus.warning
      ? `Exit beyond gate hours (${gateStatus.windowStart}–${gateStatus.windowEnd})`
      : null;

    await db.query(
      `INSERT INTO visitor_logs
      (full_name, email, reason, other_reason, action, log_time, qr_token, gate_window_warning, gate_window_reason)
      VALUES (?, ?, ?, ?, 'EXIT', ?, ?, ?, ?)`,
      [
        lastLog.full_name,
        lastLog.email,
        lastLog.reason,
        lastLog.other_reason,
        now,
        qrToken,
        gateStatus.warning ? 1 : 0,
        warningReason
      ]
    );

    return res.json({
      message: `Goodbye ${lastLog.full_name}! Exit recorded.`,
      gateWarning: gateStatus.warning || false,
      gateWarningMessage: gateStatus.warning ? gateStatus.message : undefined,
    });
  } catch (err) {
    console.error('[Visitor Exit Error]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;