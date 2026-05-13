// routes/registration.js
const express = require("express");
const axios = require("axios");
const db = require("../src/db");

const router = express.Router();

const VALID_STATUSES = new Set([
  "Regular", "Irregular", "LOA", "Dropout", "Kickout", "Graduated", "Transferred", "Inactive"
]);

/* --------------------------------------------------
FACE VALIDATION
-------------------------------------------------- */

router.post("/validate-face", async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || images.length !== 5) {
      return res.status(400).json({
        error: "Exactly 5 images required"
      });
    }

    console.log("Validating faces for registration...");

    const response = await axios.post(
      "http://127.0.0.1:8000/generate-embedding",
      { images }
    );

    console.log("Python response:", response.data);

    // Check if we have embeddings
    if (
      !response.data ||
      response.data.success !== true ||
      !response.data.embeddings ||
      response.data.embeddings.length === 0
    ) {
      return res.status(400).json({
        error: "Face not detected properly. Please retake photos."
      });
    }

    // Check if we have all 5 embeddings
    if (response.data.embeddings.length !== 5) {
      return res.status(400).json({
        error: `Only ${response.data.embeddings.length} out of 5 faces were detected. Please retake all photos.`
      });
    }

    // UPDATED: Lower quality threshold for initial registration
    const qualityScores = response.data.quality_scores || [];
    const MIN_QUALITY = 0.30;  // Lowered from 0.55 to 0.30
    
    console.log(`Quality scores: ${qualityScores.map(q => q.toFixed(3)).join(", ")}`);
    
    const lowQualityIndices = qualityScores
      .map((q, idx) => q < MIN_QUALITY ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (lowQualityIndices.length > 0) {
      const positions = ["center", "left", "right", "up", "down"];
      const failedPoses = lowQualityIndices.map(i => positions[i]).join(", ");
      
      // Only warn, don't block registration
      console.warn(`⚠️ Low quality for poses: ${failedPoses} (${qualityScores.map(q => q.toFixed(3)).join(", ")})`);
      console.warn(`⚠️ Continuing with registration but recognition may be affected`);
    }

    res.json({
      message: "Face validated successfully",
      embeddings_detected: response.data.embeddings.length,
      quality_scores: qualityScores,
      warning: "Face quality is lower than recommended. Please ensure good lighting for best recognition."
    });

  } catch (error) {
    console.error("VALIDATION ERROR:", error);
    res.status(500).json({
      error: "Face validation failed: " + (error.response?.data?.detail || error.message)
    });
  }
});
/* --------------------------------------------------
VALIDATE FRAME
-------------------------------------------------- */

router.post("/validate-frame", async (req, res) => {
  try {
    const { image, expected_pose } = req.body;

    if (!image) {
      return res.status(400).json({ error: "image is required" });
    }

    // Forward to Python face service
    const response = await axios.post(
      "http://127.0.0.1:8000/validate-frame",
      {
        image,
        expected_pose: expected_pose || "center",
      },
      {
        // Tight timeout — this endpoint must be fast.
        // If Python takes >1.5s something is wrong; don't block the UI.
        timeout: 1500,
      }
    );
 
    // Pass Python's response straight through to the frontend
    // Shape: { face_detected, glasses_detected, pose_ok, pose_label, message }
    res.json(response.data);
 
  } catch (error) {
    // On timeout or Python error, return a safe "not ready" response.
    // The frontend handles this gracefully — it just keeps the check as failed.
    console.error("validate-frame error:", error.message);
    res.json({
      face_detected:    false,
      glasses_detected: false,
      pose_ok:          false,
      pose_label:       "error",
      message:          "Validation service unavailable",
    });
  }
});


/* --------------------------------------------------
REGISTER STUDENT with Quality Check
-------------------------------------------------- */

/* --------------------------------------------------
REGISTER STUDENT with Quality Check
-------------------------------------------------- */

/* --------------------------------------------------
REGISTER STUDENT or ADD FACE TO EXISTING STUDENT
-------------------------------------------------- */

router.post("/register", async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const {
      student_id,
      first_name,
      last_name,
      middle_name,
      extension_name,   
      college_department,
      program,
      year_level,
      section,
      status,
      email,       
      images
    } = req.body;

    if (!student_id) {
      throw new Error("Missing required student data");
    }

    // Only require section when creating a new student record.
    // Existing students can register face images without resubmitting full profile data.
    const [existingStudents] = await connection.query(
      "SELECT * FROM students WHERE student_id = ?",
      [student_id]
    );
    const studentExists = existingStudents.length > 0;

    if (!studentExists && !section) {
      throw new Error("Section is required");
    }

    console.log("=".repeat(60));
    console.log("REGISTRATION REQUEST");
    console.log("Student ID:", student_id);
    console.log("Student exists:", studentExists);
    console.log("Has face images:", images && images.length === 5);
    console.log("=".repeat(60));

    const hasFaceImages = images && Array.isArray(images) && images.length === 5;

    /* -----------------------------
       CASE 1: STUDENT DOES NOT EXIST - Insert new student
    ----------------------------- */
    if (!studentExists) {
      console.log("New student - inserting record...");
      
      // Validate required fields for new student
      if (!first_name || !last_name) {
        throw new Error("First name and last name are required for new student registration");
      }
      
      // Validate program_id (required - NOT NULL in database)
      let programId = null;
      if (program) {
        if (typeof program === 'object' && program.id) {
          programId = parseInt(program.id);
        } else if (typeof program === 'string' || typeof program === 'number') {
          programId = parseInt(program);
        }
      }
      
      if (!programId || isNaN(programId) || programId <= 0) {
        console.error("Invalid program ID received:", program);
        throw new Error("Valid program selection is required");
      }
      
      // Validate year_level (required - NOT NULL in database)
      let yearLevelNum = null;
      if (year_level) {
        yearLevelNum = parseInt(year_level);
      }
      
      if (!yearLevelNum || isNaN(yearLevelNum) || yearLevelNum < 1 || yearLevelNum > 4) {
        console.error("Invalid year level received:", year_level);
        throw new Error("Valid year level (1-4) is required");
      }
      
      // Sanitize string fields
      const sanitizedEmail = email?.trim().toLowerCase() || null;
      const sanitizedFirstName = first_name?.trim().toUpperCase();
      const sanitizedLastName = last_name?.trim().toUpperCase();
      const sanitizedMiddleName = middle_name?.trim().toUpperCase() || null;
      const sanitizedExtensionName = extension_name?.trim() || null;
      const sanitizedSection = section?.trim() || null;
      const sanitizedStatus = status?.trim() || "Regular";
      
      // Validate required fields
      if (!sanitizedFirstName) {
        throw new Error("First name is required");
      }
      if (!sanitizedLastName) {
        throw new Error("Last name is required");
      }
      
      console.log("Inserting new student:", student_id);
      
      // Insert new student
      await connection.query(
        `INSERT INTO students
        (student_id, email, first_name, last_name, middle_name, extension_name,
          program_id, year_level, section, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_id,
          sanitizedEmail,   
          sanitizedFirstName,
          sanitizedLastName,
          sanitizedMiddleName,
          sanitizedExtensionName,
          programId,
          yearLevelNum,
          sanitizedSection,
          sanitizedStatus
        ]
      );
      
      console.log("✓ New student inserted");
    } else {
      /* -----------------------------
         CASE 2: STUDENT EXISTS - Skip student insert, just update if needed
      ----------------------------- */
      console.log("Student already exists - will only add face embeddings");
      
      // Optionally update student info if provided (for editing)
      const student = existingStudents[0];
      const updates = [];
      const updateValues = [];
      
      if (first_name && first_name !== student.first_name) {
        updates.push("first_name = ?");
        updateValues.push(first_name.trim().toUpperCase());
      }
      if (last_name && last_name !== student.last_name) {
        updates.push("last_name = ?");
        updateValues.push(last_name.trim().toUpperCase());
      }
      if (middle_name !== undefined && middle_name !== student.middle_name) {
        updates.push("middle_name = ?");
        updateValues.push(middle_name.trim().toUpperCase() || null);
      }
      if (extension_name !== undefined && extension_name !== student.extension_name) {
        updates.push("extension_name = ?");
        updateValues.push(extension_name.trim() || null);
      }
      if (program && parseInt(program) !== student.program_id) {
        updates.push("program_id = ?");
        updateValues.push(parseInt(program));
      }
      if (year_level && parseInt(year_level) !== student.year_level) {
        updates.push("year_level = ?");
        updateValues.push(parseInt(year_level));
      }

      if (section && section !== student.section) {
        updates.push("section = ?");
        updateValues.push(section);
      }

      if (status && status !== student.status) {
        updates.push("status = ?");
        updateValues.push(status.trim());
      }
      if (email && email !== student.email) {
        updates.push("email = ?");
        updateValues.push(email.trim().toLowerCase());
      }
      
      if (updates.length > 0) {
        updateValues.push(student_id);
        await connection.query(
          `UPDATE students SET ${updates.join(", ")} WHERE student_id = ?`,
          updateValues
        );
        console.log("✓ Student information updated");
      }
    }

    /* -----------------------------
       FACE EMBEDDINGS (for both cases)
    ----------------------------- */
    if (hasFaceImages) {
      console.log("Processing face images...");
      
      // Delete existing face embeddings for this student (if any)
      const [existingEmbeddings] = await connection.query(
        "SELECT COUNT(*) as count FROM student_face_embeddings WHERE student_id = ?",
        [student_id]
      );
      
      if (existingEmbeddings[0].count > 0) {
        console.log(`Found ${existingEmbeddings[0].count} existing embeddings, deleting...`);
        await connection.query(
          "DELETE FROM student_face_embeddings WHERE student_id = ?",
          [student_id]
        );
      }

      /* CALL PYTHON API */
      const response = await axios.post(
        "http://127.0.0.1:8000/generate-embedding",
        { images },
        { timeout: 30000 }
      );

      console.log("Python response success:", response.data.success);
      console.log("Embeddings count:", response.data.embeddings?.length);

      const embeddings = response.data.embeddings;
      const qualityScores = response.data.quality_scores || [];

      /* VALIDATE EMBEDDINGS */
      if (!response.data.success) {
        throw new Error("Face detection failed: " + (response.data.message || "Unknown error"));
      }

      if (!embeddings || embeddings.length !== 5) {
        throw new Error(`Expected 5 face embeddings, got ${embeddings?.length || 0}. Please ensure all 5 pose photos are clear.`);
      }

      // Check minimum quality
      const MIN_QUALITY = 0.75;
      const lowQualityIndices = qualityScores
        .map((q, idx) => q < MIN_QUALITY ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (lowQualityIndices.length > 0) {
        const positions = ["center", "left", "right", "up", "down"];
        const failedPoses = lowQualityIndices.map(i => positions[i]).join(", ");
        console.warn(`⚠️ Low quality for poses: ${failedPoses}`);
        console.warn(`Scores: ${qualityScores.map(q => q.toFixed(3)).join(", ")}`);
      }

      /* FACE POSITIONS */
      const positions = ["center", "left", "right", "up", "down"];

      /* SAVE ALL EMBEDDINGS */
      for (let i = 0; i < embeddings.length; i++) {
        const emb = embeddings[i];
        const quality = qualityScores[i] || 0;

        if (!emb || emb.length !== 512) {
          console.error(`Invalid embedding size for pose ${positions[i]}: ${emb?.length || 0}`);
          continue;
        }

        await connection.query(
          `INSERT INTO student_face_embeddings
           (student_id, face_position, face_embedding, quality)
           VALUES (?, ?, ?, ?)`,
          [
            student_id,
            positions[i],
            JSON.stringify(emb),
            quality
          ]
        );
        
        console.log(`✓ Saved ${positions[i]} pose (quality: ${quality.toFixed(3)})`);
      }

      console.log(`All face embeddings saved. Qualities: ${qualityScores.map(q => q.toFixed(3)).join(", ")}`);
    } else {
      console.log("No face images provided");
    }

    await connection.commit();
    console.log("✓ Transaction committed successfully");

    res.json({
      message: studentExists ? "Face registered successfully" : "Student registered successfully",
      has_face_data: hasFaceImages
    });

  } catch (err) {
    if (connection) {
      await connection.rollback();
      console.log("Transaction rolled back");
    }

    console.error("=".repeat(60));
    console.error("REGISTER ERROR:", err.message);
    console.error(err.stack);
    console.error("=".repeat(60));

    res.status(500).json({
      message: err.message || "Registration failed"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
/* --------------------------------------------------
GET ALL STUDENTS
-------------------------------------------------- */

router.get("/students", async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT
        s.student_id,
        s.email,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.program_id,
        s.year_level,
        s.section,
        s.status,
        s.is_archived,
        s.created_at,
        s.updated_at,
        p.program_name,
        p.program_code,
        d.dept_name AS college_department,
        d.dept_code
      FROM students s
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE s.is_archived = 0
      ORDER BY s.created_at DESC
    `);

    res.json(rows);

  } catch (error) {

    console.error("FETCH ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch students"
    });

  }

});


/* --------------------------------------------------
BULK ARCHIVE BY STATUS
-------------------------------------------------- */
router.put("/students/archive-by-status", async (req, res) => {
  const { status } = req.body;
  
  // Allowed archive statuses - REMOVED "Graduated" because promotion handles it
  const ARCHIVABLE_STATUSES = ["LOA", "Dropout", "Kickout", "Transferred"];
  
  if (!status || !ARCHIVABLE_STATUSES.includes(status)) {
    return res.status(400).json({ 
      message: `Invalid status. Allowed archive statuses: ${ARCHIVABLE_STATUSES.join(", ")}` 
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE students
         SET is_archived = 1, archived_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(status) = LOWER(?)`,
      [status, status]
    );

    res.json({
      message: `Archived ${result.affectedRows} ${result.affectedRows === 1 ? "student" : "students"} with status ${status}`,
      count: result.affectedRows
    });
  } catch (err) {
    console.error("BULK ARCHIVE ERROR:", err);
    res.status(500).json({ message: "Bulk archive failed" });
  }
});


/* --------------------------------------------------
UPDATE STUDENT STATUS
-------------------------------------------------- */

router.put("/students/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    const {
      first_name, last_name, middle_name, extension_name,
      program_id, year_level, status, section
    } = req.body;
 
    // ── Validate status ──────────────────────────────────────────────────────
    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${[...VALID_STATUSES].join(", ")}`,
      });
    }
 
    // Handle program_id - prevent NaN
    let finalProgramId = null;
    if (program_id !== null && program_id !== undefined && program_id !== '') {
      const parsed = parseInt(program_id);
      if (!isNaN(parsed)) {
        finalProgramId = parsed;
      }
    }
 
    const [result] = await db.query(
      `UPDATE students
       SET first_name = ?, last_name = ?, middle_name = ?,
           extension_name = ?, program_id = ?,
           year_level = ?, section = ?, status = ?, is_archived = 0, archived_status = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ?`,
      [
        first_name?.trim().toUpperCase()    || null,
        last_name?.trim().toUpperCase()     || null,
        middle_name?.trim().toUpperCase()   || null,
        extension_name?.trim()             || null,
        finalProgramId,  // ← Use this instead of parseInt(program_id)
        year_level,
        section,
        status,
        student_id,
      ]
    );
 
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
 
    res.json({ message: "Student updated successfully", student_id, status });
 
  } catch (err) {
    console.error("[PUT /students/:id]", err);
    res.status(500).json({ message: "Failed to update student" });
  }
});



/* --------------------------------------------------
GET ARCHIVED STUDENTS
-------------------------------------------------- */

router.get("/archived-students", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.student_id,
        s.email,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.extension_name,
        s.program_id,  -- ← MAKE SURE THIS LINE EXISTS
        d.dept_name AS college_department,
        p.program_name,
        s.year_level,
        s.section,
        COALESCE(s.archived_status, s.status) AS status,
        s.is_archived,
        s.created_at,
        s.updated_at
      FROM students s
      LEFT JOIN programs p ON s.program_id = p.id
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE s.is_archived = 1
      ORDER BY s.updated_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("FETCH ARCHIVED ERROR:", error);
    res.status(500).json({ message: "Failed to fetch archived students" });
  }
});

module.exports = router;