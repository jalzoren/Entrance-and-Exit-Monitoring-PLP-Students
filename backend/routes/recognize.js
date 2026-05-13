// routes/recognize.js (Complete version with ALL failures logged)
const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../src/db");
const { getGateStatus } = require('../src/gateUtils');
const { cosineSimilarity } = require("../src/utils");
const { getTodayPhRange, getPhTime } = require("../src/time");

// Rate limiting cache for failures
const failureCache = new Map(); // Store recent failures per student

// Clean up cache every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of failureCache.entries()) {
    if (now - timestamp > 60000) { // Remove after 1 minute
      failureCache.delete(key);
    }
  }
}, 60000);

// Helper to check if we should log this failure
async function shouldLogFailure(studentId, mode, failureReason) {
  const cacheKey = `${studentId || 'unknown'}_${mode}_${failureReason}`;
  const lastLog = failureCache.get(cacheKey);
  const now = Date.now();
  
  // Only log once per 10 seconds for same failure type (reduced from 60 seconds)
  if (lastLog && (now - lastLog) < 10000) {
    return false;
  }
  
  failureCache.set(cacheKey, now);
  return true;
}

// Complete logging function - logs ALL failures including NO_FACE_DETECTED
async function logAuthentication(data) {
  try {
    // Rate limit failures (but don't skip any type completely)
    if (data.auth_status === 'FAILED') {
      const shouldLog = await shouldLogFailure(
        data.student_id, 
        data.action, 
        data.failure_reason
      );
      if (!shouldLog) {
        console.log(`[Rate Limited] Skipped duplicate ${data.failure_reason} logging`);
        return null;
      }
    }
    
    // INSERT ALL records (including NO_FACE_DETECTED)
    const [result] = await pool.query(
      `INSERT INTO authentication 
      (student_id, method, auth_status, failure_reason, confidence, quality_score, action, processing_time_ms, timestamp)
      VALUES (?, 'FACIAL', ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.student_id || null,
        data.auth_status,
        data.failure_reason || null,
        data.confidence || null,
        data.quality_score || null,
        data.action,
        data.processing_time_ms || null
      ]
    );
    return result.insertId;
  } catch (err) {
    console.error("Failed to log:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/recognize (Complete logging version)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/recognize", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { image, mode } = req.body;

    // ── Gate check ──────────────────────────────────────────────
    const gateStatus = await getGateStatus(mode);
    if (!gateStatus.open) {
      await logAuthentication({
        auth_status: 'FAILED',
        failure_reason: 'GATE_CLOSED',
        action: mode,
        processing_time_ms: Date.now() - startTime
      });
      
      return res.status(403).json({
        recognized: false,
        message: gateStatus.message,
        action: 'GATE_CLOSED',
      });
    }

    // ── Step 1: Send image to Python FastAPI ────────────────────
    let pyResponse;
    try {
      pyResponse = await axios.post("http://127.0.0.1:8000/generate-embedding", {
        images: [image]
      });
    } catch (pyError) {
      console.error("Python service error:", pyError.message);
      await logAuthentication({
        auth_status: 'FAILED',
        failure_reason: 'PYTHON_SERVICE_ERROR',
        action: mode,
        processing_time_ms: Date.now() - startTime
      });
      
      return res.status(503).json({
        recognized: false,
        message: "Face recognition service unavailable"
      });
    }

    const data = pyResponse.data;

    // ── Step 2: Handle NO_FACE_DETECTED (NOW LOGGED) ─────────────
    if (!data.success || data.embeddings.length === 0) {
      console.log("No faces detected - logging failure");
      
      // ALWAYS log NO_FACE_DETECTED (with rate limiting)
      await logAuthentication({
        student_id: null,
        auth_status: 'FAILED',
        failure_reason: 'NO_FACE_DETECTED',
        confidence: null,
        quality_score: null,
        action: mode,
        processing_time_ms: Date.now() - startTime
      });
      
      return res.json({ 
        recognized: false,
        message: "No face detected. Please ensure your face is clearly visible."
      });
    }

    const capturedEmbedding = data.embeddings[0];
    const capturedQuality = data.quality_scores[0] || 0.5;
    console.log("Captured embedding quality:", capturedQuality);

    // ── Step 3: Fetch all stored embeddings ─────────────────────
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position, quality FROM student_face_embeddings"
    );

    // ── Step 4: Compare embeddings ──────────────────────────────
    let matchedStudent = null;
    let maxSimilarity = 0;
    let bestMatchPosition = null;

    for (const dbRow of rows) {
      const storedEmbedding = JSON.parse(dbRow.face_embedding);
      const rawSim = cosineSimilarity(capturedEmbedding, storedEmbedding);
      
      if (rawSim > 0.55 && rawSim > maxSimilarity) {
        maxSimilarity = rawSim;
        matchedStudent = dbRow.student_id;
        bestMatchPosition = dbRow.face_position;
      }
    }

    // ── Step 5: Handle no match (ALWAYS LOG) ───────────────────
    if (!matchedStudent) {
      const confidencePercent = parseFloat((maxSimilarity * 100).toFixed(2));
      let failureReason = 'NO_MATCH_FOUND';
      
      // Determine more specific failure reason
      if (maxSimilarity > 0 && maxSimilarity <= 0.55) {
        failureReason = 'LOW_CONFIDENCE';
      } else if (maxSimilarity === 0) {
        failureReason = 'NO_SIMILARITY';
      }
      
      // ALWAYS log the failure (removed the 0.3 threshold)
      await logAuthentication({
        student_id: null,
        auth_status: 'FAILED',
        failure_reason: failureReason,
        confidence: confidencePercent,
        quality_score: capturedQuality,
        action: mode,
        processing_time_ms: Date.now() - startTime
      });
      
      return res.json({ 
        recognized: false,
        confidence: maxSimilarity,
        message: `Face not recognized (${(maxSimilarity * 100).toFixed(1)}% match).`
      });
    }

    console.log(`Match found: ${matchedStudent} with ${(maxSimilarity*100).toFixed(1)}%`);

    // ── Step 6: Get PH time and check logs ──────────────────────
    const { now, dayStart, dayEnd } = await getTodayPhRange(pool);
    
    const [lastLogRows] = await pool.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ? AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC LIMIT 1`,
      [matchedStudent, dayStart, dayEnd]
    );

    const lastAction = lastLogRows.length ? lastLogRows[0].action : null;
    const confidencePercent = parseFloat((maxSimilarity * 100).toFixed(2));

    // ── Step 7: Business logic validation ────────────────────────
    if ((mode === 'ENTRY' && lastAction === 'ENTRY') ||
        (mode === 'EXIT' && lastAction === 'EXIT') ||
        (mode === 'EXIT' && !lastAction)) {
      
      let failureReason = mode === 'EXIT' && !lastAction ? 'NO_ENTRY_RECORD' : 
                         (mode === 'ENTRY' ? 'DUPLICATE_ENTRY' : 'DUPLICATE_EXIT');
      
      await logAuthentication({
        student_id: matchedStudent,
        auth_status: 'FAILED',
        failure_reason: failureReason,
        confidence: confidencePercent,
        quality_score: capturedQuality,
        action: mode,
        processing_time_ms: Date.now() - startTime
      });
      
      const message = failureReason === 'NO_ENTRY_RECORD' ? 
        'No entry record found. Please enter first.' :
        `You've already ${mode === 'ENTRY' ? 'entered' : 'exited'} the school today.`;
      
      return res.json({ recognized: true, validated: false, message });
    }

    // ── Step 8: SUCCESS - Always log successful attempts ─────────
    const finalAction = mode || (lastAction === 'ENTRY' ? 'EXIT' : 'ENTRY');
    
    // Fetch student details
    const [studentRows] = await pool.query(
      `SELECT s.first_name, s.last_name, d.dept_name AS college_department
       FROM students s
       LEFT JOIN programs p ON s.program_id = p.id
       LEFT JOIN departments d ON p.department_id = d.id
       WHERE s.student_id = ?`,
      [matchedStudent]
    );

    const studentInfo = studentRows[0] ?? {};
    const fullName = studentInfo.first_name
      ? `${studentInfo.last_name}, ${studentInfo.first_name}`
      : matchedStudent;

    // Log successful authentication
    const [authInsert] = await pool.query(
      `INSERT INTO authentication 
      (student_id, method, auth_status, confidence, quality_score, action, processing_time_ms, timestamp)
       VALUES (?, 'FACIAL', 'SUCCESS', ?, ?, ?, ?, NOW())`,
      [matchedStudent, confidencePercent, capturedQuality, finalAction, Date.now() - startTime]
    );

    const warningReason = gateStatus.warning
      ? `${mode === 'ENTRY' ? 'Entry' : 'Exit'} beyond gate hours (${gateStatus.windowStart}–${gateStatus.windowEnd})`
      : null;

    // Log to entry_exit_logs
    await pool.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time, gate_window_warning, gate_window_reason)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [matchedStudent, authInsert.insertId, finalAction, now, gateStatus.warning ? 1 : 0, warningReason]
    );

    return res.json({
      recognized: true,
      validated: true,
      student: fullName,
      student_id: matchedStudent,
      department: studentInfo.college_department ?? 'N/A',
      action: finalAction,
      confidence: maxSimilarity,
      confidence_percent: (maxSimilarity * 100).toFixed(1),
      processing_time_ms: Date.now() - startTime,
    });

  } catch (err) {
    console.error("Recognition Error:", err);
    
    // Log unexpected errors
    await logAuthentication({
      auth_status: 'FAILED',
      failure_reason: 'SYSTEM_ERROR',
      action: req.body.mode || 'UNKNOWN',
      processing_time_ms: Date.now() - startTime
    }).catch(console.error);
    
    return res.status(500).json({ 
      recognized: false, 
      message: "Internal server error" 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recognition/all - Get ALL authentication records
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recognition/all", async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, failure_reason } = req.query;
    
    let query = `
      SELECT 
        auth_id,
        student_id,
        method,
        auth_status,
        action,
        failure_reason,
        confidence,
        processing_time_ms,
        quality_score,
        timestamp
      FROM authentication
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND auth_status = ?`;
      params.push(status);
    }
    
    if (failure_reason) {
      query += ` AND failure_reason = ?`;
      params.push(failure_reason);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM authentication`,
      []
    );
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recognition/stats/summary - Get summary stats
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recognition/stats/summary", async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN auth_status = 'SUCCESS' THEN 1 END) as total_success,
        COUNT(CASE WHEN auth_status = 'FAILED' THEN 1 END) as total_failed,
        ROUND(COUNT(CASE WHEN auth_status = 'SUCCESS' THEN 1 END) * 100.0 / COUNT(*), 2) as accuracy_rate,
        COUNT(DISTINCT DATE(timestamp)) as active_days
      FROM authentication
      WHERE method = 'FACIAL'
        AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // Add failure breakdown
    const [failureBreakdown] = await pool.query(`
      SELECT 
        failure_reason,
        COUNT(*) as count
      FROM authentication
      WHERE auth_status = 'FAILED'
        AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY failure_reason
      ORDER BY count DESC
    `);
    
    res.json({
      ...summary[0],
      failure_breakdown: failureBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;