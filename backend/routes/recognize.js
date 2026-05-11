// routes/recognize.js
const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const pool    = require("../src/db");
const { getGateStatus } = require('../src/gateUtils');
const { cosineSimilarity }        = require("../src/utils");
const { getTodayPhRange, getPhTime } = require("../src/time"); // ← added getPhTime


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/recognize
// ─────────────────────────────────────────────────────────────────────────────
router.post("/recognize", async (req, res) => {
  try {
    const { image, mode } = req.body;

    // ── Gate check ──────────────────────────────────────────────
    const gateStatus = await getGateStatus(mode);
    if (!gateStatus.open) {
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
      console.log("No faces detected or embedding failed");
      return res.json({ recognized: false });
    }

    const capturedEmbedding = data.embeddings[0];
    console.log("Captured embedding quality:", data.quality_scores[0]);

    // ── Step 2: Fetch all stored embeddings ─────────────────────
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position, quality FROM student_face_embeddings"
    );
    console.log("Number of stored embeddings:", rows.length);

    // ── Step 3: Compare embeddings ──────────────────────────────
    let matchedStudent = null;
    let maxSimilarity = 0;
    let bestMatchPosition = null;

  // In your recognize.js, update the comparison logic
  for (const dbRow of rows) {
    const storedEmbedding = JSON.parse(dbRow.face_embedding);
    const storedQuality = dbRow.quality || 0.5;
    
    // Calculate base similarity
    const sim = cosineSimilarity(capturedEmbedding, storedEmbedding);
    
    // Weight by quality of stored embedding (better quality = more trustworthy)
    const qualityWeight = 0.3 + (storedQuality * 0.4); // Range: 0.5 to 0.7
    const weightedSim = sim * qualityWeight;
    
    console.log(`Comparing student ${dbRow.student_id} (${dbRow.face_position}, quality: ${storedQuality.toFixed(3)}): ${sim.toFixed(3)} -> weighted: ${weightedSim.toFixed(3)}`);

    // Use lower threshold for testing
    if (sim > 0.60 && sim > maxSimilarity) {
      maxSimilarity = sim;
      matchedStudent = dbRow.student_id;
      bestMatchPosition = dbRow.face_position;
      bestMatchQuality = storedQuality;
    }
  }

    if (!matchedStudent) {
      console.log(`No matching student found. Best similarity: ${maxSimilarity.toFixed(3)}`);
      return res.json({ 
        recognized: false,
        message: `Face not recognized (confidence: ${(maxSimilarity * 100).toFixed(1)}%)` 
      });
    }

    console.log(`Match found: ${matchedStudent} with similarity ${maxSimilarity.toFixed(3)} (${bestMatchPosition})`);

    // ── Step 4: Get server-authoritative PH time ─────────────────
    const { now, dayStart, dayEnd } = await getTodayPhRange(pool);
    console.log('[recognize] PH now:', now.toString());

    // ── Step 5: Get last log for today ──────────────────────────
    const [lastLogRows] = await pool.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ?
         AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [matchedStudent, dayStart, dayEnd]
    );

    const lastAction = lastLogRows.length ? lastLogRows[0].action : null;
    console.log(`[recognize] student ${matchedStudent} lastAction today: ${lastAction ?? 'none'}`);

    // ── Step 6: Validate against mode ───────────────────────────
    if (mode === 'ENTRY' && lastAction === 'ENTRY') {
      return res.json({ 
        recognized: true, 
        validated: false, 
        message: `You've already entered the school today.` 
      });
    }
    if (mode === 'EXIT' && lastAction === 'EXIT') {
      return res.json({ 
        recognized: true, 
        validated: false, 
        message: `You've already exited the school today.` 
      });
    }
    if (mode === 'EXIT' && !lastAction) {
      return res.json({ 
        recognized: true, 
        validated: false, 
        message: `No entry record found for today. Please enter first.` 
      });
    }

    // ── Step 7: Determine action ─────────────────────────────────
    const action = mode || (lastAction === 'ENTRY' ? 'EXIT' : 'ENTRY');
    console.log(`Student ${matchedStudent} authenticated. Action: ${action}`);

    // ── Step 8: Fetch student details ────────────────────────────
    const [studentRows] = await pool.query(
      `SELECT 
        s.first_name, 
        s.last_name,
        d.dept_name AS college_department,
        d.dept_code,
        p.program_name,
        p.program_code
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

    // ── Step 9: Insert authentication record ─────────────────────
    const [authInsert] = await pool.query(
      `INSERT INTO authentication (student_id, method, auth_status, accuracy, duration, timestamp)
       VALUES (?, 'FACIAL', 'SUCCESS', ?, ?, ?)`,
      [matchedStudent, (maxSimilarity * 100).toFixed(2), 0, now]
    );

    // ── Step 10: Insert entry/exit log ───────────────────────────
    await pool.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time, gate_window_violation)
      VALUES (?, ?, ?, ?, ?)`,
      [matchedStudent, authInsert.insertId, action, now, gateStatus.warning ? 1 : 0]
    );

    // ── Step 11: Respond to React UI ─────────────────────────────
    return res.json({
      recognized: true,
      validated: true,
      student: fullName,
      student_id: matchedStudent,
      department: studentInfo.college_department ?? 'N/A',
      action,
      confidence: maxSimilarity,
      gateWarning: gateStatus.warning || false,
      gateWarningMessage: gateStatus.warning ? gateStatus.message : undefined,
    });

  } catch (err) {
    console.error("Recognition Error:", err);
    console.error("Stack trace:", err.stack);
    return res.status(500).json({ 
      recognized: false, 
      message: "Internal server error",
      error: err.message 
    });
  }
});

module.exports = router;