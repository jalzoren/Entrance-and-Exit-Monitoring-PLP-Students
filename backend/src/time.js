// time.js - Handles time-related utilities and routes for the application
const express = require("express");
const router  = express.Router();
const db      = require("./db");

/**
 * Returns the current time as a JavaScript Date, sourced from MySQL's NOW().
 * mysql2 returns DATETIME columns as JS Date objects; their UTC epoch is set
 * according to the `timezone` option in db.js (e.g. '+08:00').
 */
async function getPhTime(pool) {
  const connection = pool || db;
  const [rows] = await connection.query("SELECT NOW() AS ph_now");
  return new Date(rows[0].ph_now);
}

/**
 * Returns { now, dayStart, dayEnd } where dayStart/dayEnd delimit today in
 * Philippine time (Asia/Manila, UTC+8), regardless of the Node.js process
 * timezone or the MySQL server timezone.
 *
 * FIX: The previous version used getFullYear()/getDate() which reads the
 * LOCAL Node.js timezone — on UTC servers this can resolve to yesterday's
 * Philippine date, making every BETWEEN query return 0 rows.
 *
 * The fix is `toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })` which
 * always produces a YYYY-MM-DD string in Philippine time.
 */
async function getTodayPhRange(pool) {
  const connection = pool || db;

  // ── Diagnostic query: let us see exactly what MySQL thinks the time is ──
  const [diagRows] = await connection.query(`
    SELECT
      NOW()                    AS server_now,
      @@global.time_zone       AS global_tz,
      @@session.time_zone      AS session_tz
  `);

  const serverNow  = diagRows[0].server_now;  // JS Date from mysql2
  const globalTz   = diagRows[0].global_tz;
  const sessionTz  = diagRows[0].session_tz;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[🕐 TIME.JS - TIMEZONE DEBUG]');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[time.js] MySQL NOW()          :', serverNow);
  console.log('[time.js] MySQL global TZ      :', globalTz);
  console.log('[time.js] MySQL session TZ     :', sessionTz);
  console.log('[time.js] JS Date ISO (UTC)    :', serverNow instanceof Date
    ? serverNow.toISOString() : String(serverNow));
  console.log('[time.js] Node.js TZ env       :', process.env.TZ || 'not set (system default)');
  console.log('[time.js] Node.js local string :', serverNow instanceof Date
    ? serverNow.toLocaleString() : String(serverNow));

  // ── Convert JS Date → Philippine date string (always correct, timezone-safe)
  // en-CA locale formats as YYYY-MM-DD which is exactly what we need for SQL.
  const now = serverNow instanceof Date ? serverNow : new Date(serverNow);

  const phDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const phTimeStr = now.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' });

  const dayStart = `${phDateStr} 00:00:00`;
  const dayEnd   = `${phDateStr} 23:59:59`;

  console.log('[time.js] PH date string       :', phDateStr);
  console.log('[time.js] PH time string       :', phTimeStr);
  console.log('[time.js] dayStart             :', dayStart);
  console.log('[time.js] dayEnd               :', dayEnd);
  console.log('═══════════════════════════════════════════════════════════════');

  return { now, dayStart, dayEnd };
}

// ── GET /api/time ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    console.log('\n⏰ [GET /api/time] Request received');
    const { now, dayStart, dayEnd } = await getTodayPhRange();
    
    const response = {
      success:    true,
      serverTime: now.toISOString(),
      phTime:     now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      dayStart,
      dayEnd,
    };
    
    console.log('✅ [GET /api/time] Responding with:', {
      serverTime: response.serverTime,
      phTime: response.phTime,
      dayStart: response.dayStart,
      dayEnd: response.dayEnd
    });
    
    res.json(response);
  } catch (error) {
    console.error("[time.js] ❌ Error fetching server time:", error.message);
    console.error("[time.js] Stack trace:", error.stack);
    res.status(500).json({ success: false, message: "Failed to fetch server time", error: error.message });
  }
});

module.exports = { getPhTime, getTodayPhRange, router };