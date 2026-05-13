// routes/recognize.js (Optimized version with rate limiting)
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
  
  // Only log once per minute for same failure type
  if (lastLog && (now - lastLog) < 60000) {
    return false;
  }
  
  failureCache.set(cacheKey, now);
  return true;
}

// Optimized logging function
async function logAuthentication(data) {
  try {
    // Don't log NO_FACE_DETECTED at all (too noisy)
    if (data.failure_reason === 'NO_FACE_DETECTED') {
      console.log('[Skipped] NO_FACE_DETECTED not logged to save space');
      return null;
    }
    
    // Rate limit other failures
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
// POST /api/recognize (Optimized)
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
    const pyResponse = await axios.post("http://127.0.0.1:8000/generate-embedding", {
      images: [image]
    });

    const data = pyResponse.data;

    if (!data.success || data.embeddings.length === 0) {
      console.log("No faces detected");
      
      // Don't log NO_FACE_DETECTED - too noisy!
      // Just return response without database write
      
      return res.json({ 
        recognized: false,
        message: "No face detected. Please ensure your face is clearly visible."
      });
    }

    const capturedEmbedding = data.embeddings[0];
    const capturedQuality = data.quality_scores[0] || 0.5;
    console.log("Captured embedding quality:", capturedQuality);

    // ── Step 2: Fetch all stored embeddings ─────────────────────
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position, quality FROM student_face_embeddings"
    );

    // ── Step 3: Compare embeddings ──────────────────────────────
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

    // ── Step 4: Handle no match (rate limited) ───────────────────
    if (!matchedStudent) {
      const confidencePercent = parseFloat((maxSimilarity * 100).toFixed(2));
      let failureReason = maxSimilarity > 0 && maxSimilarity <= 0.55 ? 'LOW_CONFIDENCE' : 'NO_MATCH_FOUND';
      
      // Only log if confidence is above 30% (meaningful attempt)
      if (maxSimilarity > 0.3) {
        await logAuthentication({
          auth_status: 'FAILED',
          failure_reason: failureReason,
          confidence: confidencePercent,
          quality_score: capturedQuality,
          action: mode,
          processing_time_ms: Date.now() - startTime
        });
      }
      
      return res.json({ 
        recognized: false,
        confidence: maxSimilarity,
        message: `Face not recognized (${(maxSimilarity * 100).toFixed(1)}% match).`
      });
    }

    console.log(`Match found: ${matchedStudent} with ${(maxSimilarity*100).toFixed(1)}%`);

    // ── Step 5: Get PH time and check logs ──────────────────────
    const { now, dayStart, dayEnd } = await getTodayPhRange(pool);
    
    const [lastLogRows] = await pool.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ? AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC LIMIT 1`,
      [matchedStudent, dayStart, dayEnd]
    );

    const lastAction = lastLogRows.length ? lastLogRows[0].action : null;
    const confidencePercent = parseFloat((maxSimilarity * 100).toFixed(2));

    // ── Step 6: Business logic validation ────────────────────────
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

    // ── Step 7: SUCCESS - Always log successful attempts ─────────
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

    // Log to entry_exit_logs
    await pool.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time, gate_window_warning)
      VALUES (?, ?, ?, ?, ?)`,
      [matchedStudent, authInsert.insertId, finalAction, now, gateStatus.warning ? 1 : 0]
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
    return res.status(500).json({ 
      recognized: false, 
      message: "Internal server error" 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recognition/stats/summary - Get summary stats without heavy queries
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
    
    res.json(summary[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;