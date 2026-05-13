// backend/src/gateUtils.js
const { getPhTime } = require('./time');
const db = require("./db");

/**
 * Get the current gate status for ENTRY or EXIT.
 * @param {string} mode - 'ENTRY' or 'EXIT'
 * @returns {Promise<{open: boolean, warning: boolean, message: string, windowStart: string, windowEnd: string}>}
 */
async function getGateStatus(mode) {
  const startKey = mode === 'ENTRY' ? 'gate_entry_start' : 'gate_exit_start';
  const endKey   = mode === 'ENTRY' ? 'gate_entry_end'   : 'gate_exit_end';

  const [rows] = await db.query(
    `SELECT \`key\`, value FROM system_settings
     WHERE \`key\` IN (?, ?, 'block_outside_window')`,
    [startKey, endKey]
  );

  const settings = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  const blockOutside = settings.block_outside_window === 'true';

  const now = await getPhTime(db);          // uses the same pool as time.js
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const start = settings[startKey] || (mode === 'ENTRY' ? '06:00' : '06:00');
  const end   = settings[endKey]   || (mode === 'ENTRY' ? '21:00' : '23:00');

  const isWithinWindow = hhmm >= start && hhmm <= end;

  if (isWithinWindow) {
    return {
      open: true,
      warning: false,
      withinWindow: true,
      message: `Gate is open (${start} – ${end})`,
      windowStart: start,
      windowEnd: end,
    };
  }

  if (!blockOutside) {
    return {
      open: true,
      warning: true,
      withinWindow: false,
      message: `Outside allowed ${mode === 'ENTRY' ? 'entry' : 'exit'} window (${start} – ${end}). Entry/exit allowed but flagged.`,
      windowStart: start,
      windowEnd: end,
    };
  }

  return {
    open: false,
    warning: false,
    withinWindow: false,
    message: `The ${mode === 'ENTRY' ? 'entry' : 'exit'} gate is currently closed (allowed hours: ${start} – ${end}).`,
    windowStart: start,
    windowEnd: end,
  };
}

module.exports = { getGateStatus };