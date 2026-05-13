// routes/analytics.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getTodayPhRange, getPhTime } = require('../src/time');
const { getGateStatus } = require('../src/gateUtils');

const formatStudentName = (row) => {
  const lastName = row.last_name?.trim();
  const firstName = row.first_name?.trim();
  const middleName = row.middle_name?.trim();

  if (lastName && (firstName || middleName)) {
    return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`;
  }

  return [firstName, middleName, lastName].filter(Boolean).join(' ') || row.student_id || 'Unknown';
};

const formatYearLevel = (yearLevel) => {
  const numericLevel = Number(yearLevel);

  if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
    return 'Not Specified';
  }

  const suffix = numericLevel === 1 ? 'st' : numericLevel === 2 ? 'nd' : numericLevel === 3 ? 'rd' : 'th';
  return `${numericLevel}${suffix} Year`;
};

const formatMethod = (method) => {
  if (method === 'FACIAL') return 'Face Recognition';
  if (method === 'MANUAL') return 'Manual Entry';
  if (method === 'QR') return 'QR Code';
  return 'Unknown';
};

const formatActionLabel = (action) => (action === 'EXIT' ? 'Exit' : 'Entrance');

const formatVisitorReason = (reason, otherReason) => {
  if (reason === 'Other' && otherReason?.trim()) {
    return otherReason.trim();
  }

  return reason || 'Not Specified';
};

const markUnexitedStudentsAsGateClosedWarning = async (rangeStart, rangeEnd) => {
  console.log(`[markUnexitedStudentsAsGateClosedWarning] 🔍 STARTING AUTO-EXIT CHECK`);
  console.log(`  Report range: ${rangeStart} → ${rangeEnd}`);
  
  const gateStatus = await getGateStatus('EXIT');
  
  console.log(`[markUnexitedStudentsAsGateClosedWarning] Gate status: ${gateStatus.open ? 'OPEN' : 'CLOSED'}`);
  console.log(`  Message: ${gateStatus.message}`);
  console.log(`  Window: ${gateStatus.windowStart} – ${gateStatus.windowEnd}`);
  
  if (gateStatus.open) {
    console.log(`[markUnexitedStudentsAsGateClosedWarning] ❌ Gate is OPEN - auto-exit skipped`);
    return { updated: 0, gateStatus };
  }

  const { dayStart, dayEnd } = await getTodayPhRange(db);
  
  console.log(`[markUnexitedStudentsAsGateClosedWarning] Today range: ${dayStart} → ${dayEnd}`);
  console.log(`[markUnexitedStudentsAsGateClosedWarning] Checking if report covers full day...`);

  if (rangeStart > dayStart || rangeEnd < dayEnd) {
    console.log(`[markUnexitedStudentsAsGateClosedWarning] ❌ Range does not cover full day - auto-exit skipped`);
    console.log(`  Range: ${rangeStart} → ${rangeEnd}`);
    console.log(`  Day: ${dayStart} → ${dayEnd}`);
    return { updated: 0, gateStatus };
  }

  console.log(`[markUnexitedStudentsAsGateClosedWarning] ✅ Full day covered - proceeding with auto-exit`);

  const [rows] = await db.query(
    `SELECT eel.student_id, eel.log_id
     FROM entry_exit_logs eel
     JOIN (
       SELECT student_id, MAX(log_time) AS max_log_time
       FROM entry_exit_logs
       WHERE log_time BETWEEN ? AND ?
       GROUP BY student_id
     ) latest ON latest.student_id = eel.student_id AND latest.max_log_time = eel.log_time
     WHERE eel.action = 'ENTRY'
       AND (eel.gate_window_warning <> 1 OR eel.gate_window_reason IS NULL OR LOWER(eel.gate_window_reason) NOT LIKE ?)`,
    [dayStart, dayEnd, 'still inside (%']
  );

  console.log(`[markUnexitedStudentsAsGateClosedWarning] Found ${rows.length} unmatched ENTRY logs:`);
  rows.forEach(row => console.log(`  → Student ${row.student_id} (log_id: ${row.log_id})`));

  if (!rows.length) {
    console.log(`[markUnexitedStudentsAsGateClosedWarning] ❌ No unmatched entries - auto-exit skipped`);
    return { updated: 0, gateStatus };
  }

  const now = await getPhTime(db);
  const exitDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const exitTime = `${exitDate} ${now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour12: false })}`;

  console.log(`[markUnexitedStudentsAsGateClosedWarning] Current time: ${exitTime}`);

  // Create or get system authentication record for auto-exits
  const [systemAuthRows] = await db.query(
    `SELECT auth_id FROM authentication WHERE method = 'SYSTEM' AND auth_status = 'AUTO-EXIT' LIMIT 1`
  );

  let systemAuthId;
  if (systemAuthRows.length > 0) {
    systemAuthId = systemAuthRows[0].auth_id;
    console.log(`[markUnexitedStudentsAsGateClosedWarning] Using existing system auth record: ${systemAuthId}`);
  } else {
    // Insert a system auth record for auto-exits
    const [authResult] = await db.query(
      `INSERT INTO authentication (method, auth_status, timestamp)
       VALUES ('SYSTEM', 'AUTO-EXIT', ?)`,
      [exitTime]
    );
    systemAuthId = authResult.insertId;
    console.log(`[markUnexitedStudentsAsGateClosedWarning] Created new system auth record: ${systemAuthId}`);
  }

  // Insert EXIT logs for unmatched entries
  console.log(`[markUnexitedStudentsAsGateClosedWarning] Inserting ${rows.length} EXIT logs...`);
  const insertPromises = rows.map(async (row) => {
    console.log(`  → Creating EXIT for student ${row.student_id}`);
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time, gate_window_warning, gate_window_reason)
       VALUES (?, ?, 'EXIT', ?, 1, 'Auto-exit: Gate closed – no exit recorded')`,
      [row.student_id, systemAuthId, exitTime]
    );
  });

  await Promise.all(insertPromises);

  console.log(`[markUnexitedStudentsAsGateClosedWarning] ✅ Auto-exit completed for ${rows.length} student(s)`);

  return { updated: rows.length, gateStatus };
};

// ── GET /api/analytics/metrics ────────────────────────────────────────────────
router.get('/metrics', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/METRICS] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/metrics] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/metrics] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/metrics] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    // ── DEBUG: Check all logs in database (no filter) ────────────────────
    console.log('\n🔍 [DEBUG] Checking ALL logs in entry_exit_logs table:');
    const [allLogs] = await db.query(`SELECT student_id, action, log_time FROM entry_exit_logs ORDER BY log_time DESC LIMIT 20`);
    console.log(`   Total recent logs (last 20): ${allLogs.length}`);
    allLogs.forEach(log => console.log(`   → ${log.student_id} | ${log.action} | ${log.log_time}`));

    // ── DEBUG: Intermediate query - see what logs fall in our window ──────
    console.log('\n🔍 [DEBUG] Logs within time window:');
    const [logsInWindow] = await db.query(`
      SELECT student_id, action, log_time
      FROM entry_exit_logs
      WHERE log_time BETWEEN ? AND ?
      ORDER BY log_time DESC
    `, [dayStart, dayEnd]);
    console.log(`   Found ${logsInWindow.length} logs in window [${dayStart} → ${dayEnd}]`);
    logsInWindow.forEach(log => console.log(`   → ${log.student_id} | ${log.action} | ${log.log_time}`));

    // ── DEBUG: Show the subquery result (before filtering) ────────────────
    console.log('\n🔍 [DEBUG] Last action per student (before filtering):');
    const [subqueryResult] = await db.query(`
      SELECT student_id,
        GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ',') AS all_actions,
        SUBSTRING_INDEX(
          GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
          ',', 1
        ) AS last_action,
        MAX(log_time) AS latest_log_time
      FROM entry_exit_logs
      WHERE log_time BETWEEN ? AND ?
      GROUP BY student_id
      ORDER BY latest_log_time DESC
    `, [dayStart, dayEnd]);
    console.log(`   Found ${subqueryResult.length} students:`);
    subqueryResult.forEach(row => 
      console.log(`   → ${row.student_id} | all_actions=[${row.all_actions}] | last_action=${row.last_action} | latest=${row.latest_log_time}`)
    );

    // ── Students currently on campus (last log today = ENTRY) ────────────
    console.log('\n🔍 [DEBUG] Counting students with last_action = ENTRY:');
    const [onCampusRows] = await db.query(`
      SELECT COUNT(*) AS on_campus
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      WHERE last_action = 'ENTRY'
    `, [dayStart, dayEnd]);
    console.log(`   Result: ${onCampusRows[0].on_campus} students on campus`);
    console.log('[analytics/metrics] onCampus result:', onCampusRows[0]);

    // ── (Removed - now part of DEBUG section above) ────────────────────

    // ── Today's total entries ────────────────────────────────────────────
    console.log('\n🔍 [DEBUG] Counting ENTRY actions:');
    const [entriesRows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM entry_exit_logs
      WHERE action = 'ENTRY' AND log_time BETWEEN ? AND ?
    `, [dayStart, dayEnd]);
    console.log(`   Total ENTRY actions today: ${entriesRows[0].total}`);
    console.log('[analytics/metrics] totalEntries:', entriesRows[0].total);

    // ── Facial recognition success rate today ────────────────────────────
    console.log('\n🔍 [DEBUG] Facial recognition stats:');
    const [facialRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) AS success
      FROM authentication
      WHERE method = 'FACIAL' AND timestamp BETWEEN ? AND ?
    `, [dayStart, dayEnd]);
    console.log(`   Total FACIAL attempts: ${facialRows[0].total}, Success: ${facialRows[0].success}`);
    console.log('[analytics/metrics] facial auth:', facialRows[0]);

    const facialTotal     = Number(facialRows[0].total);
    const facialSuccess   = Number(facialRows[0].success);
    const authSuccessRate = facialTotal > 0
      ? Math.round((facialSuccess / facialTotal) * 100) : 0;

    // ── Peak entry hour today ────────────────────────────────────────────
    console.log('\n🔍 [DEBUG] Peak entry hour:');
    const [peakRows] = await db.query(`
      SELECT HOUR(log_time) AS hour, COUNT(*) AS total
      FROM entry_exit_logs
      WHERE action = 'ENTRY' AND log_time BETWEEN ? AND ?
      GROUP BY HOUR(log_time)
      ORDER BY total DESC
      LIMIT 1
    `, [dayStart, dayEnd]);
    console.log(`   Peak hour result: ${peakRows.length > 0 ? `${peakRows[0].hour}:00 with ${peakRows[0].total} entries` : 'none'}`);
    console.log('[analytics/metrics] peakHour:', peakRows[0] ?? 'none');

    const peakHour = peakRows.length > 0
      ? { hour: peakRows[0].hour, total: Number(peakRows[0].total) } : null;

    // ── Total registered active students ────────────────────────────────
    // ── Visitors currently on campus (last action = ENTRY) ────────────
            console.log('\n🔍 [DEBUG] Counting visitors currently inside:');

            const [visitorOnCampusRows] = await db.query(`
              SELECT COUNT(*) AS on_campus
              FROM (
                SELECT visitor_id,
                  SUBSTRING_INDEX(
                    GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
                    ',', 1
                  ) AS last_action
                FROM visitor_logs
                WHERE log_time BETWEEN ? AND ?
                GROUP BY visitor_id
              ) latest
              WHERE last_action = 'ENTRY'
            `, [dayStart, dayEnd]);

            console.log(`   Visitors on campus: ${visitorOnCampusRows[0].on_campus}`);

            console.log('\n🔍 [DEBUG] Total active students:');
            const [totalStudentsRows] = await db.query(
              `SELECT COUNT(*) AS total FROM students WHERE status != 'Inactive'`
            );
            console.log(`   Total active students: ${totalStudentsRows[0].total}`);
            console.log('[analytics/metrics] totalStudents:', totalStudentsRows[0].total);

            // ── System-level counts for metric cards ─────────────────────────
            console.log('\n🔍 [DEBUG] Fetching system-level counts for metric cards...');
            let totalUsers = 0, totalSuperAdmins = 0, totalEEMSAdmins = 0, totalEAMSAdmins = 0;
            let totalDepartments = 0, totalPrograms = 0;
            let archivedUsers = 0, archivedStudents = 0, archivedDepartments = 0, archivedPrograms = 0;
            
            try {
              const [totalUsersRows] = await db.query(`SELECT COUNT(*) AS total FROM admins WHERE status IS NULL OR status != 'archived'`);
              totalUsers = Number(totalUsersRows[0]?.total || 0);
              console.log('   ✅ totalUsers:', totalUsers);
            } catch (e) { console.log('   ❌ totalUsers query failed:', e.message); }
            
            try {
              const [superAdminRows] = await db.query(`SELECT COUNT(*) AS total FROM admins WHERE role = 'Super Admin' AND (status IS NULL OR status != 'archived')`);
              totalSuperAdmins = Number(superAdminRows[0]?.total || 0);
              console.log('   ✅ totalSuperAdmins:', totalSuperAdmins);
            } catch (e) { console.log('   ❌ totalSuperAdmins query failed:', e.message); }
            
            try {
              const [eemsAdminRows] = await db.query(`SELECT COUNT(*) AS total FROM admins WHERE role = 'EEMS Admin' AND (status IS NULL OR status != 'archived')`);
              totalEEMSAdmins = Number(eemsAdminRows[0]?.total || 0);
              console.log('   ✅ totalEEMSAdmins:', totalEEMSAdmins);
            } catch (e) { console.log('   ❌ totalEEMSAdmins query failed:', e.message); }
            
            try {
              const [eamsAdminRows] = await db.query(`SELECT COUNT(*) AS total FROM admins WHERE role = 'EAMS Admin' AND (status IS NULL OR status != 'archived')`);
              totalEAMSAdmins = Number(eamsAdminRows[0]?.total || 0);
              console.log('   ✅ totalEAMSAdmins:', totalEAMSAdmins);
            } catch (e) { console.log('   ❌ totalEAMSAdmins query failed:', e.message); }
            
            try {
              const [deptCountRows] = await db.query(`SELECT COUNT(*) AS total FROM departments WHERE status IS NULL OR status != 'Inactive'`);
              totalDepartments = Number(deptCountRows[0]?.total || 0);
              console.log('   ✅ totalDepartments:', totalDepartments);
            } catch (e) { console.log('   ❌ totalDepartments query failed:', e.message); }
            
            try {
              const [programCountRows] = await db.query(`SELECT COUNT(*) AS total FROM programs WHERE program_status IS NULL OR program_status != 'Inactive'`);
              totalPrograms = Number(programCountRows[0]?.total || 0);
              console.log('   ✅ totalPrograms:', totalPrograms);
            } catch (e) { console.log('   ❌ totalPrograms query failed:', e.message); }
            
            try {
              const [archivedUsersRows] = await db.query(`SELECT COUNT(*) AS total FROM admins WHERE status = 'archived'`);
              archivedUsers = Number(archivedUsersRows[0]?.total || 0);
              console.log('   ✅ archivedUsers:', archivedUsers);
            } catch (e) { console.log('   ❌ archivedUsers query failed:', e.message); }
            
            try {
              const [archivedStudentsRows] = await db.query(`SELECT COUNT(*) AS total FROM students WHERE is_archived = 1`);
              archivedStudents = Number(archivedStudentsRows[0]?.total || 0);
              console.log('   ✅ archivedStudents:', archivedStudents);
            } catch (e) { console.log('   ❌ archivedStudents query failed:', e.message); }
            
            try {
              const [archivedDeptRows] = await db.query(`SELECT COUNT(*) AS total FROM departments WHERE status = 'Inactive'`);
              archivedDepartments = Number(archivedDeptRows[0]?.total || 0);
              console.log('   ✅ archivedDepartments:', archivedDepartments);
            } catch (e) { console.log('   ❌ archivedDepartments query failed:', e.message); }
            
            try {
              const [archivedProgRows] = await db.query(`SELECT COUNT(*) AS total FROM programs WHERE program_status = 'Inactive'`);
              archivedPrograms = Number(archivedProgRows[0]?.total || 0);
              console.log('   ✅ archivedPrograms:', archivedPrograms);
            } catch (e) { console.log('   ❌ archivedPrograms query failed:', e.message); }
            console.log('   system counts → users:', totalUsers, 'super:', totalSuperAdmins, 'eems:', totalEEMSAdmins, 'eams:', totalEAMSAdmins, 'depts:', totalDepartments, 'programs:', totalPrograms);
            console.log('   archived items → users:', archivedUsers, 'students:', archivedStudents, 'depts:', archivedDepartments, 'programs:', archivedPrograms);

            const payload = {
              onCampus:        Number(onCampusRows[0].on_campus),
              totalEntries:    Number(entriesRows[0].total),
              totalStudents:   Number(totalStudentsRows[0].total),
              authSuccessRate,
              peakHour,

              // system metric cards
              totalUsers,
              totalSuperAdmins,
              totalEEMSAdmins,
              totalEAMSAdmins,
              totalDepartments,
              totalPrograms,
              
              // archived items
              archivedUsers,
              archivedStudents,
              archivedDepartments,
              archivedPrograms,

              visitorsOnCampus: Number(visitorOnCampusRows[0].on_campus),
            };
            console.log('\n✅ [ANALYTICS/METRICS] FINAL RESPONSE:');
            console.log('   onCampus:', payload.onCampus);
            console.log('   totalEntries:', payload.totalEntries);
            console.log('   totalStudents:', payload.totalStudents);
            console.log('   authSuccessRate:', payload.authSuccessRate);
            console.log('   peakHour:', payload.peakHour);
            console.log('[analytics/metrics] → responding with:', payload);
            console.log('   visitors:', payload.visitors);
            console.log('   totalUsers:', payload.totalUsers);
            console.log('   totalSuperAdmins:', payload.totalSuperAdmins);
            console.log('   totalEEMSAdmins:', payload.totalEEMSAdmins);
            console.log('   totalEAMSAdmins:', payload.totalEAMSAdmins);
            console.log('   totalDepartments:', payload.totalDepartments);
            console.log('   totalPrograms:', payload.totalPrograms);
            console.log('   archivedUsers:', payload.archivedUsers);
            console.log('   archivedStudents:', payload.archivedStudents);
            console.log('   archivedDepartments:', payload.archivedDepartments);
            console.log('   archivedPrograms:', payload.archivedPrograms);

            res.json(payload);

  } catch (err) {
    console.error('[analytics/metrics] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch metrics.' });
  }
});

// ── GET /api/analytics/traffic?days=7|30|365 ─────────────────────────────────
router.get('/traffic', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  console.log('[analytics/traffic] Fetching traffic for days:', days);

  try {
    let rows;

    if (days <= 30) {
      [rows] = await db.query(`
        SELECT
          DATE(log_time) AS period,
          action,
          COUNT(*)       AS total
        FROM entry_exit_logs
        WHERE log_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND log_time <= NOW()
        GROUP BY DATE(log_time), action
        ORDER BY period ASC
      `, [days]);
    } else {
      [rows] = await db.query(`
        SELECT
          DATE_FORMAT(log_time, '%Y-%m') AS period,
          action,
          COUNT(*)                       AS total
        FROM entry_exit_logs
        WHERE log_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          AND log_time <= NOW()
        GROUP BY DATE_FORMAT(log_time, '%Y-%m'), action
        ORDER BY period ASC
      `);
    }

    console.log('[analytics/traffic] Raw DB rows:', rows.length);
    rows.forEach(r => console.log('  →', r.period, r.action, r.total));

    // Pivot into { date, entrance, exit }
    const map = new Map();
    rows.forEach(row => {
      const key = row.period instanceof Date
        ? row.period.toISOString().slice(0, 10)
        : String(row.period);
      if (!map.has(key)) map.set(key, { date: key, entrance: 0, exit: 0 });
      if (row.action === 'ENTRY') map.get(key).entrance = Number(row.total);
      if (row.action === 'EXIT')  map.get(key).exit     = Number(row.total);
    });

    // Fill missing days with 0s so chart is always continuous
    if (days <= 30) {
      const filled = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        filled.set(key, map.get(key) ?? { date: key, entrance: 0, exit: 0 });
      }
      const result = Array.from(filled.values());
      console.log('[analytics/traffic] → responding with', result.length, 'days');
      return res.json(result);
    }

    const result = Array.from(map.values());
    console.log('[analytics/traffic] → responding with', result.length, 'months');
    res.json(result);

  } catch (err) {
    console.error('[analytics/traffic] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch traffic data.' });
  }
});

// ── GET /api/analytics/college-distribution ───────────────────────────────────
router.get('/college-distribution', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/COLLEGE-DISTRIBUTION] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/college-distribution] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/college-distribution] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/college-distribution] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    console.log('\n🔍 [DEBUG] Getting students on campus with college info:');
    const [rows] = await db.query(`
      SELECT d.dept_name AS name, COUNT(*) AS value
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      JOIN students s ON s.student_id = latest.student_id
      JOIN programs p ON s.program_id = p.id
      JOIN departments d ON p.department_id = d.id
      WHERE latest.last_action = 'ENTRY'
      GROUP BY d.id, d.dept_name
      ORDER BY value DESC
    `, [dayStart, dayEnd]);

    console.log(`   Result rows: ${rows.length}`);
    rows.forEach(r => console.log(`   → ${r.name}: ${r.value} students`));
    console.log('✅ [ANALYTICS/COLLEGE-DISTRIBUTION] Responding:', rows.map(r => ({ name: r.name, value: Number(r.value) })));

    res.json(rows.map(r => ({ name: r.name, value: Number(r.value) })));

  } catch (err) {
    console.error('[analytics/college-distribution] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch college distribution.' });
  }
});

// ── GET /api/analytics/departments ───────────────────────────────────────────
router.get('/departments', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/DEPARTMENTS] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/departments] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/departments] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/departments] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    console.log('\n🔍 [DEBUG] Getting on-campus students by department:');
    const [onCampusRows] = await db.query(`
      SELECT latest.student_id, d.dept_name AS college_department
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      JOIN students s ON s.student_id = latest.student_id
      JOIN programs p ON s.program_id = p.id
      JOIN departments d ON p.department_id = d.id
      WHERE latest.last_action = 'ENTRY'
    `, [dayStart, dayEnd]);

    console.log(`   On-campus students found: ${onCampusRows.length}`);
    onCampusRows.forEach(r => console.log(`   → ${r.student_id} | ${r.college_department}`));

    console.log('\n🔍 [DEBUG] Getting total students per department:');
    const [totalRows] = await db.query(`
      SELECT d.dept_name AS college_department, COUNT(*) AS total
      FROM students s
      JOIN programs p ON s.program_id = p.id
      JOIN departments d ON p.department_id = d.id
      WHERE s.status != 'Inactive'
      GROUP BY d.id, d.dept_name
    `);
    console.log(`   Total departments: ${totalRows.length}`);
    const totalMap = new Map(totalRows.map(r => [r.college_department, Number(r.total)]));

    const deptMap = new Map();
    onCampusRows.forEach(r => {
      const dept = r.college_department;
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });

    const totalOnCampus = Array.from(deptMap.values()).reduce((s, v) => s + v, 0);

    const data = Array.from(deptMap, ([dept, count]) => ({
      fullCollegeName: dept,
      collegeName:     dept,
      presenceNow:     count,
      totalStudents:   totalMap.get(dept) ?? 0,
      percentage:      totalOnCampus > 0 ? Math.round((count / totalOnCampus) * 100) : 0,
    })).sort((a, b) => b.presenceNow - a.presenceNow);

    console.log(`\n✅ [ANALYTICS/DEPARTMENTS] FINAL RESPONSE (${data.length} departments):`);
    data.forEach(d => console.log(`   → ${d.collegeName}: ${d.presenceNow}/${d.totalStudents} (${d.percentage}%)`));
    res.json(data);

  } catch (err) {
    console.error('[analytics/departments] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch department data.' });
  }
});

// ── GET /api/analytics/auth-methods ──────────────────────────────────────────
router.get('/auth-methods', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        method,
        COUNT(*) AS attempts,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) AS success
      FROM authentication
      GROUP BY method
      ORDER BY attempts DESC
    `);

    console.log('[analytics/auth-methods] Raw rows:', rows.length);
    rows.forEach(r => console.log('  →', r.method, 'attempts:', r.attempts, 'success:', r.success));

    const data = rows.map((r, i) => ({
      id:          i + 1,
      method:      r.method === 'FACIAL' ? 'Facial Recognition'
                 : r.method === 'MANUAL' ? 'Manual Input' : 'QR Scan',
      attempts:    Number(r.attempts),
      success:     Number(r.success),
      successRate: Number(r.attempts) > 0
        ? `${Math.round((Number(r.success) / Number(r.attempts)) * 100)}% (${r.success}/${r.attempts})`
        : '0%',
    }));

    res.json(data);

  } catch (err) {
    console.error('[analytics/auth-methods] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch auth method data.' });
  }
});

// ── GET /api/analytics/records ───────────────────────────────────────────────
router.get('/records', async (req, res) => {
  try {
    const [studentRows] = await db.query(`
      SELECT
        eel.log_id,
        eel.student_id,
        eel.action,
        eel.log_time,
        s.first_name,
        s.last_name,
        s.middle_name,
        d.dept_name AS college_department,
        s.year_level,
        a.method
      FROM entry_exit_logs eel
      LEFT JOIN students s ON s.student_id = eel.student_id
      LEFT JOIN programs p ON p.id = s.program_id
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN authentication a ON a.auth_id = eel.auth_id
      ORDER BY eel.log_time DESC, eel.log_id DESC
    `);

    const [visitorRows] = await db.query(`
      SELECT
        visitor_id,
        full_name,
        email,
        reason,
        other_reason,
        action,
        log_time,
        qr_token
      FROM visitor_logs
      ORDER BY log_time DESC, visitor_id DESC
    `);

    const students = studentRows.map((row) => ({
      id: row.log_id,
      timestamp: row.log_time,
      studentId: row.student_id,
      name: formatStudentName(row),
      collegeDept: row.college_department || 'Not Specified',
      yearLevel: formatYearLevel(row.year_level),
      action: row.action,
      actionLabel: formatActionLabel(row.action),
      method: formatMethod(row.method),
      methodCode: row.method || 'UNKNOWN',
    }));

    const visitors = visitorRows.map((row) => ({
      id: row.visitor_id,
      timestamp: row.log_time,
      visitorId: row.visitor_id,
      name: row.full_name || 'Unknown',
      email: row.email || 'Not Specified',
      reason: row.reason || 'Not Specified',
      otherReason: row.other_reason || '',
      visitReason: formatVisitorReason(row.reason, row.other_reason),
      action: row.action,
      actionLabel: formatActionLabel(row.action),
      qrToken: row.qr_token || '',
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      studentCount: students.length,
      visitorCount: visitors.length,
      students,
      visitors,
    });
  } catch (err) {
    console.error('[analytics/records] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch entry and exit records.' });
  }
});

// ── GET /api/analytics/report ────────────────────────────────────────────────
router.get('/report', async (req, res) => {
  try {
    const { 
      from, to, dept, program, yearLevel, section, reportType, actionType 
    } = req.query;
    
    console.log('[analytics/report] Raw input:', { from, to, dept, program, yearLevel, section, reportType, actionType });
    
    // Parse dates correctly (handle DD/MM/YYYY format from frontend)
    let rangeStart, rangeEnd;
    
    if (from && to) {
      let fromDate, toDate;
      
      if (from.includes('/')) {
        const fromParts = from.split('/');
        fromDate = `${fromParts[2]}-${fromParts[1]}-${fromParts[0]}`;
      } else {
        fromDate = from;
      }
      
      if (to.includes('/')) {
        const toParts = to.split('/');
        toDate = `${toParts[2]}-${toParts[1]}-${toParts[0]}`;
      } else {
        toDate = to;
      }
      
      rangeStart = `${fromDate} 00:00:00`;
      rangeEnd = `${toDate} 23:59:59`;
    } else {
      const { dayStart, dayEnd } = await getTodayPhRange();
      rangeStart = dayStart;
      rangeEnd = dayEnd;
    }

    console.log('[analytics/report] Final range:', rangeStart, '→', rangeEnd);

    const currentGateStatus = await getGateStatus('EXIT');
    const { updated: gateClosedWarningsUpdated } = await markUnexitedStudentsAsGateClosedWarning(rangeStart, rangeEnd);
    if (gateClosedWarningsUpdated > 0) {
      console.log(`[analytics/report] Applied gate-closed warning to ${gateClosedWarningsUpdated} unmatched student entry log(s)`);
    }

    // ── FOR VISITOR REPORTS ─────────────────────────────────────────────────
    if (reportType === 'visitors') {
      let visitorQuery = `
        SELECT 
          visitor_id,
          full_name,
          email,
          reason,
          other_reason,
          action,
          log_time,
          qr_token,
        gate_window_warning,
        gate_window_reason
        FROM visitor_logs vl
        WHERE log_time BETWEEN ? AND ?
      `;
      
      const visitorParams = [rangeStart, rangeEnd];
      
      if (actionType && actionType !== 'both') {
        visitorQuery += ' AND action = ?';
        visitorParams.push(actionType.toUpperCase());
      }
      
      visitorQuery += ' ORDER BY log_time DESC';
      
      const [visitorRows] = await db.query(visitorQuery, visitorParams);
      
      const visitorLogs = visitorRows.map((row, i) => ({
        no: i + 1,
        dateTime: new Date(row.log_time).toLocaleString('en-PH', { hour12: true }),
        name: row.full_name,
        email: row.email || 'N/A',
        reason: row.reason === 'Other' ? row.other_reason : row.reason,
        action: row.action === 'ENTRY' ? 'Entrance' : 'Exit',
        qrToken: row.qr_token || 'N/A',
        gateWindowWarning: row.gate_window_warning === 1,
        gateWindowReason: row.gate_window_reason || null
      }));
      
      const entryLogs = visitorLogs.filter(log => log.action === 'Entrance');
      const exitLogs = visitorLogs.filter(log => log.action === 'Exit');
      
      return res.json({
        generatedAt: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        dateRange: `${rangeStart.slice(0,10)} to ${rangeEnd.slice(0,10)}`,
        totalVisitors: visitorRows.length,
        currentOnCampus: 0,
        totalEntries: entryLogs.length,
        totalExits: exitLogs.length,
        visitorLogs: visitorLogs,
        entryLogs: entryLogs,
        exitLogs: exitLogs,
        collegeData: [],
        authData: [],
        methodData: [],
        trafficChartData: [],
        studentLogs: [],
        gateStatus: currentGateStatus
      });
    }

    // ── FOR STUDENT REPORTS ─────────────────────────────────────────────────
    
    // STEP 1: Get students with all filters
    let studentsQuery = `
      SELECT 
        s.student_id,
        s.year_level,
        s.section,
        COALESCE(d.dept_name, 'Unknown Department') AS college_department,
        COALESCE(p.program_name, 'Unknown') AS program_name
      FROM students s
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE (s.status != 'Inactive' OR s.status IS NULL)
    `;
    
    const studentParams = [];
    
    if (dept && dept !== 'all' && dept !== '') {
      studentsQuery += ' AND d.dept_name = ?';
      studentParams.push(dept);
    }
    if (program && program !== '') {
      studentsQuery += ' AND p.program_name = ?';
      studentParams.push(program);
    }
    if (yearLevel && yearLevel !== '') {
      studentsQuery += ' AND s.year_level = ?';
      studentParams.push(parseInt(yearLevel));
    }
    if (section && section !== '') {
      studentsQuery += ' AND s.section = ?';
      studentParams.push(section);
    }
    
    const [students] = await db.query(studentsQuery, studentParams);
    
    // Calculate department totals
    const departmentTotals = new Map();
    students.forEach(student => {
      const deptName = student.college_department;
      departmentTotals.set(deptName, (departmentTotals.get(deptName) || 0) + 1);
    });
    
    const totalStudentsCount = students.length;
    
    console.log('[analytics/report] Department totals:', Array.from(departmentTotals.entries()));

    // STEP 2: Get logs with filters
    let logsQuery = `
      SELECT
        eel.log_id, 
        eel.student_id, 
        eel.action, 
        eel.log_time,
        COALESCE(s.first_name, 'Unknown') AS first_name,
        COALESCE(s.last_name, 'Unknown') AS last_name,
        COALESCE(d.dept_name, 'Unknown Department') AS college_department,
        COALESCE(p.program_name, 'Unknown') AS program_name,
        COALESCE(s.year_level, 'N/A') AS year_level,
        COALESCE(s.section, 'N/A') AS section,
        a.method, 
        a.auth_status, 
        a.accuracy,
        eel.gate_window_warning,
        eel.gate_window_reason
      FROM entry_exit_logs eel
      LEFT JOIN students s ON s.student_id = eel.student_id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN authentication a ON a.auth_id = eel.auth_id
      WHERE eel.log_time BETWEEN ? AND ?
    `;
    
    const logParams = [rangeStart, rangeEnd];
    
    // Add all filters to logs query
    if (dept && dept !== 'all' && dept !== '') {
      logsQuery += ' AND d.dept_name = ?';
      logParams.push(dept);
    }
    if (program && program !== '') {
      logsQuery += ' AND p.program_name = ?';
      logParams.push(program);
    }
    if (yearLevel && yearLevel !== '') {
      logsQuery += ' AND s.year_level = ?';
      logParams.push(parseInt(yearLevel));
    }
    if (section && section !== '') {
      logsQuery += ' AND s.section = ?';
      logParams.push(section);
    }
    if (actionType && actionType !== 'both') {
      logsQuery += ' AND eel.action = ?';
      logParams.push(actionType.toUpperCase());
    }
    
    logsQuery += ' ORDER BY eel.log_time DESC';
    
    const [logRows] = await db.query(logsQuery, logParams);
    
    console.log('[analytics/report] Found logs:', logRows.length);

    // STEP 3: Calculate current students on campus
    const studentLastActions = new Map();
    const studentDeptMap = new Map();
    
    // First, get department for each student from students table
    students.forEach(student => {
      studentDeptMap.set(student.student_id, student.college_department);
    });
    
    logRows.forEach(log => {
      const studentId = log.student_id;
      const logTime = new Date(log.log_time);
      const current = studentLastActions.get(studentId);
      
      if (!current || logTime > current.time) {
        studentLastActions.set(studentId, {
          action: log.action,
          time: logTime,
          department: studentDeptMap.get(studentId) || log.college_department,
          student: log
        });
      }
    });
    
    let currentOnCampus = 0;
    const departmentPresence = new Map();
    
    studentLastActions.forEach((value, studentId) => {
      if (value.action === 'ENTRY') {
        currentOnCampus++;
        const dept = value.department;
        if (dept) {
          departmentPresence.set(dept, (departmentPresence.get(dept) || 0) + 1);
        }
      }
    });

    // STEP 4: Build collegeData array
    const allDepartments = Array.from(departmentTotals.keys()).sort();
    
    const collegeDataArray = [];
    
    for (const deptName of allDepartments) {
      const totalEnrolled = departmentTotals.get(deptName) || 0;
      const presentNow = departmentPresence.get(deptName) || 0;
      
      collegeDataArray.push({
        name: deptName,
        fullCollegeName: deptName,
        collegeName: deptName,
        presentNow: presentNow,
        totalEnrolled: totalEnrolled,
        totalStudents: totalEnrolled,
        percentagePresent: totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0,
        percentageOfCampus: 0
      });
    }
    
    const totalPresentOnCampus = collegeDataArray.reduce((sum, d) => sum + d.presentNow, 0);
    const finalCollegeData = collegeDataArray.map(d => ({
      ...d,
      percentageOfCampus: totalPresentOnCampus > 0 ? (d.presentNow / totalPresentOnCampus) * 100 : 0
    })).sort((a, b) => b.presentNow - a.presentNow);

    // STEP 5: Build method distribution and auth data
    const methodMap = new Map();
    const authSuccessMap = new Map();
    
    logRows.forEach(r => {
      const method = r.method === 'FACIAL' ? 'Facial Recognition'
                   : r.method === 'MANUAL' ? 'Manual Input' 
                   : r.method === 'QR' ? 'QR Scan' 
                   : 'Unknown';
      methodMap.set(method, (methodMap.get(method) || 0) + 1);
      
      if (!authSuccessMap.has(method)) {
        authSuccessMap.set(method, { attempts: 0, success: 0 });
      }
      const stats = authSuccessMap.get(method);
      stats.attempts++;
      if (r.auth_status === 'SUCCESS') {
        stats.success++;
      }
      authSuccessMap.set(method, stats);
    });
    
    const methodData = Array.from(methodMap, ([name, count]) => ({
      name,
      count,
      total: logRows.length,
      percentage: logRows.length > 0 ? (count / logRows.length) * 100 : 0
    }));
    
    const authData = Array.from(authSuccessMap, ([method, stats], i) => ({
      id: i + 1,
      method: method,
      attempts: stats.attempts,
      success: stats.success,
      successRate: stats.attempts > 0 ? Math.round((stats.success / stats.attempts) * 100) : 0
    }));

    // STEP 6: Build traffic chart data
    const trafficMap = new Map();
    logRows.forEach(r => {
      const date = new Date(r.log_time).toLocaleDateString('en-CA');
      if (!trafficMap.has(date)) {
        trafficMap.set(date, { date, entrance: 0, exit: 0 });
      }
      if (r.action === 'ENTRY') {
        trafficMap.get(date).entrance++;
      } else if (r.action === 'EXIT') {
        trafficMap.get(date).exit++;
      }
    });
    
    const trafficChartData = Array.from(trafficMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    const highestDay = trafficChartData.length
      ? trafficChartData.reduce((a, b) => b.entrance > a.entrance ? b : a) : null;
    const lowestDay = trafficChartData.length
      ? trafficChartData.reduce((a, b) => b.entrance < a.entrance ? b : a) : null;

    // STEP 7: Build student logs
    const studentLogs = logRows.map((r, i) => ({
      no: i + 1,
      dateTime: new Date(r.log_time).toLocaleString('en-PH', { hour12: true }),
      studentId: r.student_id,
      name: `${r.last_name}, ${r.first_name}`,
      department: r.college_department,
      program: r.program_name,
      yearLevel: r.year_level,
      section: r.section,
      action: r.action === 'ENTRY' ? 'Entrance' : 'Exit',
      method: r.method === 'FACIAL' ? 'Facial Recognition'
            : r.method === 'MANUAL' ? 'Manual Input'
            : r.method === 'QR' ? 'QR Scan'
            : 'Unknown',
      accuracy: r.accuracy ? `${r.accuracy}%` : 'N/A',
      gateWindowWarning: r.gate_window_warning === 1,
      gateWindowReason: r.gate_window_reason || null
    }));

    const entryLogs = studentLogs.filter(log => log.action === 'Entrance');
    const exitLogs = studentLogs.filter(log => log.action === 'Exit');

    res.json({
      generatedAt: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      dateRange: `${rangeStart.slice(0,10)} to ${rangeEnd.slice(0,10)}`,
      totalStudents: totalStudentsCount,
      currentOnCampus: currentOnCampus,
      totalEntries: entryLogs.length,
      totalExits: exitLogs.length,
      collegeData: finalCollegeData,
      authData: authData,
      methodData: methodData,
      trafficChartData: trafficChartData,
      trafficData: {
        highest: highestDay ? `${highestDay.date} (${highestDay.entrance} entries)` : 'N/A',
        lowest: lowestDay ? `${lowestDay.date} (${highestDay.entrance} entries)` : 'N/A',
      },
      studentLogs: studentLogs,
      entryLogs: entryLogs,
      exitLogs: exitLogs,
      gateStatus: currentGateStatus
    });

  } catch (err) {
    console.error('[analytics/report] ERROR:', err);
    res.status(500).json({ message: 'Failed to generate report data.', error: err.message });
  }
});


router.get('/visitor-stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT action, COUNT(*) AS total
      FROM visitor_logs
      GROUP BY action
    `);

    const data = {
      ENTRY: 0,
      EXIT: 0,
    };

    rows.forEach(r => {
      data[r.action] = Number(r.total);
    });

    res.json([
      { name: 'Entry', value: data.ENTRY },
      { name: 'Exit', value: data.EXIT },
    ]);

  } catch (err) {
    console.error('[visitor-stats] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch visitor stats.' });
  }
});


// ── GET /api/analytics/logs ───────────────────────────────────────────────
// Fetches entry and exit logs with filters
// Query params: from, to, dept, actionType, yearLevel, enrollmentStatus
router.get('/logs', async (req, res) => {
  try {
    const { from, to, dept, actionType, yearLevel, enrollmentStatus } = req.query;
    
    console.log('[analytics/logs] Fetching logs with filters:', { from, to, dept, actionType, yearLevel, enrollmentStatus });
    
    // Build the query using entry_exit_logs table (matching your records endpoint)
    let query = `
      SELECT 
        eel.log_id as id,
        eel.student_id,
        eel.action,
        eel.log_time as dateTime,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.year_level,
        s.enrollment_status,
        d.dept_name as department,
        a.method,
        a.auth_status,
        a.accuracy
      FROM entry_exit_logs eel
      LEFT JOIN students s ON s.student_id = eel.student_id
      LEFT JOIN programs p ON p.id = s.program_id
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN authentication a ON a.auth_id = eel.auth_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Apply date range filter
    if (from && to) {
      query += ` AND DATE(eel.log_time) BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    // Apply department filter
    if (dept && dept !== 'all') {
      query += ` AND d.dept_name = ?`;
      params.push(dept);
    }
    
    // Apply action type filter
    if (actionType && actionType !== 'both') {
      query += ` AND eel.action = ?`;
      params.push(actionType.toUpperCase());
    }
    
    // Apply year level filter
    if (yearLevel && yearLevel !== 'all') {
      query += ` AND s.year_level = ?`;
      params.push(yearLevel);
    }
    
    // Apply enrollment status filter
    if (enrollmentStatus && enrollmentStatus !== 'all') {
      query += ` AND s.enrollment_status = ?`;
      params.push(enrollmentStatus);
    }
    
    query += ` ORDER BY eel.log_time DESC LIMIT 5000`;
    
    console.log('[analytics/logs] Executing query with params:', params);
    
    const [logs] = await db.query(query, params);
    
    console.log(`[analytics/logs] Found ${logs.length} total logs`);
    
    // Format the logs to match what your frontend expects
    const formattedLogs = logs.map(log => ({
      id: log.id,
      studentId: log.student_id,
      name: formatStudentName(log),
      department: log.department || 'Not Specified',
      yearLevel: formatYearLevel(log.year_level),
      enrollmentStatus: log.enrollment_status || 'Not Specified',
      action: log.action,
      method: formatMethod(log.method),
      dateTime: log.dateTime,
      timestamp: log.dateTime,
      authStatus: log.auth_status,
      accuracy: log.accuracy
    }));
    
    // Separate entry and exit logs
    const entryLogs = formattedLogs.filter(log => 
      log.action === 'ENTRY' || log.action === 'ENTRANCE'
    );
    const exitLogs = formattedLogs.filter(log => 
      log.action === 'EXIT'
    );
    
    console.log(`[analytics/logs] Entry logs: ${entryLogs.length}, Exit logs: ${exitLogs.length}`);
    
    res.json({
      success: true,
      entryLogs,
      exitLogs,
      total: formattedLogs.length,
      filters: { from, to, dept, actionType, yearLevel, enrollmentStatus }
    });
    
  } catch (error) {
    console.error('[analytics/logs] ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch logs',
      message: error.message,
      entryLogs: [],
      exitLogs: []
    });
  }
});
// ── GET /api/analytics/overall-success-rate ─────────────────────────────────
// Returns the overall facial recognition success rate across all time
router.get('/overall-success-rate', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/OVERALL-SUCCESS-RATE] Calculating overall success rate...');
    
    const [result] = await db.query(`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) as successful
      FROM authentication
      WHERE method = 'FACIAL'
    `);
    
    const totalAttempts = Number(result[0]?.total_attempts || 0);
    const successful = Number(result[0]?.successful || 0);
    const successRate = totalAttempts > 0 ? Math.round((successful / totalAttempts) * 100) : 0;
    
    // Also get detailed daily stats for trend chart
    const [dailyStats] = await db.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as attempts,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
        ROUND(SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
      FROM authentication
      WHERE method = 'FACIAL'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `);
    
    console.log(`[overall-success-rate] Total attempts: ${totalAttempts}, Successful: ${successful}, Rate: ${successRate}%`);
    
    res.json({
      success_rate: successRate,
      total_attempts: totalAttempts,
      successful: successful,
      daily_stats: dailyStats
    });
    
  } catch (err) {
    console.error('[analytics/overall-success-rate] ERROR:', err);
    res.status(500).json({ 
      success_rate: 0, 
      total_attempts: 0, 
      successful: 0,
      error: err.message 
    });
  }
});


// ── GET /api/analytics/visitor-logs ─────────────────────────────────────────
// ── GET /api/analytics/visitor-logs ─────────────────────────────────────────
router.get('/visitor-logs', async (req, res) => {
  try {
    console.log('[analytics/visitor-logs] Fetching visitor logs...');
    
    const [rows] = await db.query(`
      SELECT 
        visitor_id,
        full_name,
        email,
        reason,
        other_reason,
        action,
        log_time,
        qr_token
      FROM visitor_logs
      ORDER BY log_time DESC
      LIMIT 50
    `);

    console.log(`[analytics/visitor-logs] Found ${rows.length} records`);
    res.json(rows);
  } catch (err) {
    console.error('[analytics/visitor-logs] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch visitor logs.', error: err.message });
  }
});

// ── GET /api/analytics/student-pairing ─────────────────────────────────────────
// Fetches students with their entry and exit times paired together
router.get('/student-pairing', async (req, res) => {
  try {
    const { from, to, dept } = req.query;
    
    console.log('[analytics/student-pairing] Fetching paired entry-exit records...');
    
    let rangeStart, rangeEnd;
    
    if (from && to) {
      let fromDate = from.includes('/') ? from.split('/').reverse().join('-') : from;
      let toDate = to.includes('/') ? to.split('/').reverse().join('-') : to;
      rangeStart = `${fromDate} 00:00:00`;
      rangeEnd = `${toDate} 23:59:59`;
    } else {
      const { dayStart, dayEnd } = await getTodayPhRange();
      rangeStart = dayStart;
      rangeEnd = dayEnd;
    }
    
    console.log(`[analytics/student-pairing] Date range: ${rangeStart} to ${rangeEnd}`);
    
    // Get ALL logs ordered by student and time
    let logsQuery = `
      SELECT 
        eel.student_id,
        eel.log_time,
        eel.action,
        a.method as auth_method,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.year_level,
        COALESCE(d.dept_name, 'Unknown Department') as department
      FROM entry_exit_logs eel
      LEFT JOIN students s ON s.student_id = eel.student_id
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN authentication a ON a.auth_id = eel.auth_id
      WHERE eel.log_time BETWEEN ? AND ?
    `;
    
    const queryParams = [rangeStart, rangeEnd];
    
    if (dept && dept !== 'all' && dept !== '') {
      logsQuery += ` AND d.dept_name = ?`;
      queryParams.push(dept);
    }
    
    logsQuery += ` ORDER BY eel.student_id, eel.log_time ASC`;
    
    const [allLogs] = await db.query(logsQuery, queryParams);
    console.log(`[analytics/student-pairing] Found ${allLogs.length} total logs`);
    
    // Helper functions
    function getYearSuffix(level) {
      const num = parseInt(level);
      if (isNaN(num)) return 'th';
      if (num === 1) return 'st';
      if (num === 2) return 'nd';
      if (num === 3) return 'rd';
      return 'th';
    }
    
    function formatMethod(method) {
      if (!method) return 'Unknown';
      const upperMethod = method.toUpperCase();
      if (upperMethod === 'FACIAL') return 'Face Recognition';
      if (upperMethod === 'MANUAL') return 'Manual Input';
      if (upperMethod === 'QR') return 'QR Scan';
      return method;
    }
    
    function formatStudentName(student) {
      const lastName = student.last_name?.trim() || '';
      const firstName = student.first_name?.trim() || '';
      const middleName = student.middle_name?.trim() || '';
      
      if (lastName && (firstName || middleName)) {
        return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`;
      } else if (firstName || middleName || lastName) {
        return [firstName, middleName, lastName].filter(Boolean).join(' ');
      }
      return student.student_id;
    }
    
    // Process logs using a queue-based approach
    const studentMap = new Map();
    
    for (const log of allLogs) {
      const studentId = log.student_id;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: studentId,
          name: formatStudentName(log),
          department: log.department || 'Not Specified',
          yearLevel: log.year_level ? `${log.year_level}${getYearSuffix(log.year_level)} Year` : 'N/A',
          entryQueue: [], // Queue of entries without exits
          sessions: []
        });
      }
      
      const student = studentMap.get(studentId);
      const logTime = new Date(log.log_time);
      const logMethod = formatMethod(log.auth_method);
      const formattedTime = logTime.toLocaleString('en-PH', { hour12: true });
      
      if (log.action === 'ENTRY') {
        // Add entry to queue
        student.entryQueue.push({
          time: formattedTime,
          method: logMethod,
          rawTime: logTime
        });
        
      } else if (log.action === 'EXIT') {
        // Try to find the most recent unmatched entry BEFORE this exit
        let matchedEntry = null;
        let matchedIndex = -1;
        
        // Find the latest entry that occurred BEFORE this exit
        for (let i = student.entryQueue.length - 1; i >= 0; i--) {
          if (student.entryQueue[i].rawTime < logTime) {
            matchedEntry = student.entryQueue[i];
            matchedIndex = i;
            break;
          }
        }
        
        if (matchedEntry) {
          // Found matching entry - create a session
          const isAutoExit = log.gate_window_reason && log.gate_window_reason.includes('Auto-exit');
          const status = isAutoExit ? 'Auto Exit (Gate closed – no exit recorded)' : 'Left Campus';
          student.sessions.push({
            entryTime: matchedEntry.time,
            entryMethod: matchedEntry.method,
            exitTime: formattedTime,
            exitMethod: logMethod,
            status
          });
          // Remove the matched entry from queue
          student.entryQueue.splice(matchedIndex, 1);
        } else {
          // Exit without matching entry (exit occurred before any entry in this period)
          student.sessions.push({
            entryTime: '—',
            entryMethod: '—',
            exitTime: formattedTime,
            exitMethod: logMethod,
            status: 'Exit Only'
          });
        }
      }
    }
    
    // After processing all logs, any remaining entries in queue are still inside
    for (const [studentId, student] of studentMap.entries()) {
      for (const entry of student.entryQueue) {
        student.sessions.push({
          entryTime: entry.time,
          entryMethod: entry.method,
          exitTime: '—',
          exitMethod: '—',
          status: 'Inside Campus'
        });
      }
      
      // Sort sessions by entry time (or exit time if no entry)
      student.sessions.sort((a, b) => {
        const timeA = a.entryTime !== '—' ? a.entryTime : a.exitTime;
        const timeB = b.entryTime !== '—' ? b.entryTime : b.exitTime;
        return timeA.localeCompare(timeB);
      });
    }
    
    // Build final records with session numbers
    const pairedRecords = [];
    
    for (const [studentId, student] of studentMap.entries()) {
      student.sessions.forEach((session, idx) => {
        pairedRecords.push({
          studentId: student.studentId,
          name: student.name,
          department: student.department,
          yearLevel: student.yearLevel,
          sessionNumber: idx + 1,
          entryTime: session.entryTime,
          entryMethod: session.entryMethod,
          exitTime: session.exitTime,
          exitMethod: session.exitMethod,
          status: session.status
        });
      });
    }
    
    // Sort by student name then session number
    pairedRecords.sort((a, b) => {
      if (a.name === b.name) {
        return a.sessionNumber - b.sessionNumber;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Add sequential numbering
    pairedRecords.forEach((record, index) => {
      record.no = index + 1;
    });
    
    const stats = {
      completed: pairedRecords.filter(r => r.status === 'Left Campus').length,
      inside: pairedRecords.filter(r => r.status === 'Inside Campus').length,
      exitOnly: pairedRecords.filter(r => r.status === 'Exit Only').length,
      gateClosedNoExit: pairedRecords.filter(r => r.status === 'Auto Exit (Gate closed – no exit recorded)').length
    };
    
    console.log(`[analytics/student-pairing] Total sessions: ${pairedRecords.length}`);
    console.log(`[analytics/student-pairing] - Completed: ${stats.completed}`);
    console.log(`[analytics/student-pairing] - Inside: ${stats.inside}`);
    console.log(`[analytics/student-pairing] - Exit only: ${stats.exitOnly}`);
    
    res.json({
      success: true,
      totalRecords: pairedRecords.length,
      completedCount: stats.completed,
      stillInsideCount: stats.inside,
      exitOnlyCount: stats.exitOnly,
      dateRange: `${rangeStart.slice(0,10)} to ${rangeEnd.slice(0,10)}`,
      records: pairedRecords
    });
    
  } catch (err) {
    console.error('[analytics/student-pairing] ERROR:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch student pairing data',
      error: err.message 
    });
  }
});

// GET /api/programs?department=xxx
// ============================================================
// ADD THESE ENDPOINTS TO YOUR BACKEND
// ============================================================

// GET /api/departments - Fetch all active department

// GET /api/programs - Fetch programs filtered by department// GET /api/programs - Fetch programs filtered by department
// Replace your /programs route with this debug version
router.get('/programs', async (req, res) => {
  try {
    const { department } = req.query;
    console.log('[api/programs] ========== START ==========');
    console.log('[api/programs] Received department parameter:', department);
    
    // First, check what departments exist
    const [allDepts] = await db.query(`SELECT id, dept_name FROM departments`);
    console.log('[api/programs] All departments in DB:', allDepts);
    
    // First, get the department_id from the department name
    let deptId = null;
    if (department && department !== '') {
      const [deptRows] = await db.query(
        `SELECT id FROM departments WHERE dept_name = ?`,
        [department]
      );
      console.log('[api/programs] Department query result:', deptRows);
      
      if (deptRows.length > 0) {
        deptId = deptRows[0].id;
        console.log('[api/programs] Found department_id:', deptId);
      } else {
        console.log('[api/programs] Department NOT found in DB for:', department);
        return res.json([]);
      }
    }
    
    // Now fetch programs using department_id
    let query = `
      SELECT 
        p.id, 
        p.program_code, 
        p.program_name, 
        p.program_type,
        p.department_id
      FROM programs p
      WHERE (p.program_status = 'Active' OR p.program_status IS NULL)
    `;
    
    const params = [];
    
    if (deptId) {
      query += ` AND p.department_id = ?`;
      params.push(deptId);
    }
    
    query += ` ORDER BY p.program_name`;
    
    console.log('[api/programs] Executing SQL:', query);
    console.log('[api/programs] With params:', params);
    
    const [rows] = await db.query(query, params);
    console.log('[api/programs] Found programs:', rows.length, rows);
    res.json(rows);
  } catch (err) {
    console.error('[api/programs] ERROR:', err);
    res.status(500).json([]);
  }
});

// GET /api/sections - Fetch sections filtered by program and year level
router.get('/sections', async (req, res) => {
  try {
    const { program, yearLevel } = req.query;
    console.log('[api/sections] Received - program:', program, 'yearLevel:', yearLevel);
    
    let query = `
      SELECT DISTINCT 
        s.section,
        s.year_level
      FROM students s
      LEFT JOIN programs p ON s.program_id = p.id
      WHERE s.section IS NOT NULL AND s.section != ''
    `;
    
    const params = [];
    
    if (program && program !== '') {
      query += ` AND p.program_name = ?`;
      params.push(program);
    }
    if (yearLevel && yearLevel !== '') {
      query += ` AND s.year_level = ?`;
      params.push(parseInt(yearLevel));
    }
    
    query += ` ORDER BY s.section`;
    
    const [rows] = await db.query(query, params);
    console.log('[api/sections] Found:', rows.length, 'sections');
    res.json(rows);
  } catch (err) {
    console.error('[api/sections] ERROR:', err);
    res.status(500).json([]);
  }
});

// Add to your analytics routes
router.get('/api/analytics/current-students', async (req, res) => {
  try {
    // Query students who have entered but not exited
    // This should match the logic used in your metrics endpoint
    const [currentStudents] = await db.query(`
      SELECT 
        student_id, year_level
      FROM entry_exit_logs
      WHERE action = 'ENTRY'
        AND student_id NOT IN (
          SELECT student_id FROM entry_exit_logs 
          WHERE action = 'EXIT'
        )
    `);
    
    res.json({
      onCampus: currentStudents.length,
      students: currentStudents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;