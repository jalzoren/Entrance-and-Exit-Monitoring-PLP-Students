// recognize.js
const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const pool    = require("../src/db");
const { cosineSimilarity } = require("../src/utils");
const { getPhTime } = require("../src/time");

router.post("/recognize", async (req, res) => {
  try {
    const { image, mode = 'ENTRY' } = req.body;

    // ── Step 1: Python embedding ──────────────────
    const pyResponse = await axios.post("http://127.0.0.1:8000/generate-embedding", {
      images: [image]
    });

    const data = pyResponse.data;

    if (!data.success || data.embeddings.length === 0) {
      console.log("❌ No face detected");
      return res.json({ recognized: false });
    }

    const capturedEmbedding = data.embeddings[0];

    // ── Step 2: Compare embeddings ────────────────
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding FROM student_face_embeddings"
    );

    let matchedStudentId = null;
    let maxSimilarity    = 0;

    for (const row of rows) {
      const storedEmbedding = JSON.parse(row.face_embedding);
      const sim = cosineSimilarity(capturedEmbedding, storedEmbedding);
      if (sim > 0.75 && sim > maxSimilarity) {
        maxSimilarity    = sim;
        matchedStudentId = row.student_id;
      }
    }

    if (!matchedStudentId) {
      console.log("❌ No match found (below 0.75 threshold)");
      return res.json({ recognized: false });
    }

    console.log(`✅ Matched: ${matchedStudentId} | Similarity: ${(maxSimilarity * 100).toFixed(1)}%`);

    // ── Step 3: Get student info ──────────────────
    const [studentRows] = await pool.query(
      "SELECT * FROM students WHERE student_id = ?",
      [matchedStudentId]
    );

    if (!studentRows.length) {
      console.log(`❌ Student ${matchedStudentId} not found in students table`);
      return res.json({ recognized: false });
    }

    const student  = studentRows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;
    const now      = getPhTime();
    const today    = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    // ── Step 4: Validate mode ─────────────────────
    const [lastLogs] = await pool.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ? AND DATE(log_time) = ?
       ORDER BY log_time DESC LIMIT 1`,
      [matchedStudentId, today]
    );

    const lastAction = lastLogs.length ? lastLogs[0].action : null;
    console.log(`[${mode}] ${fullName} | Last action today: ${lastAction ?? 'NONE'}`);

    if (mode === 'ENTRY' && lastAction === 'ENTRY') {
      console.log(`⚠️ Already entered: ${fullName}`);
      return res.json({ recognized: true, validated: false, action: 'ALREADY_ENTERED', message: `You've already entered the school.`, student: fullName, student_id: matchedStudentId, department: student.college_department });
    }

    if (mode === 'EXIT' && lastAction === 'EXIT') {
      console.log(`⚠️ Already exited: ${fullName}`);
      return res.json({ recognized: true, validated: false, action: 'ALREADY_EXITED', message: `You've already exited the school.`, student: fullName, student_id: matchedStudentId, department: student.college_department });
    }

    if (mode === 'EXIT' && !lastAction) {
      console.log(`⚠️ No entry found today: ${fullName}`);
      return res.json({ recognized: true, validated: false, action: 'NO_ENTRY', message: `No entry record found for today. Please enter first.`, student: fullName, student_id: matchedStudentId, department: student.college_department });
    }

    // ── Step 5: Log entry/exit ────────────────────
    const [authInsert] = await pool.query(
      `INSERT INTO authentication (student_id, method, auth_status, accuracy, duration, timestamp)
       VALUES (?, 'FACIAL', 'SUCCESS', ?, 0, ?)`,
      [matchedStudentId, (maxSimilarity * 100).toFixed(2), now]
    );

    await pool.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time) VALUES (?, ?, ?, ?)`,
      [matchedStudentId, authInsert.insertId, mode, now]
    );

    console.log(`✅ ${mode} logged: ${fullName}`);

    return res.json({
      recognized: true,
      validated:  true,
      action:     mode,
      student:    fullName,
      student_id: matchedStudentId,
      department: student.college_department,
      accuracy:   (maxSimilarity * 100).toFixed(1),
    });

  } catch (err) {
    console.error("❌ Recognition error:", err.message);
    return res.json({ recognized: false });
  }
});

module.exports = router;