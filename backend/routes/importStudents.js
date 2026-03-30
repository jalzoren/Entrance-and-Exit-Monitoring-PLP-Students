// backend/routes/importStudents.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const XLSX    = require("xlsx");
const db      = require("../src/db");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const allowedExts = [".csv", ".xlsx"];
    const fileExt = "." + file.originalname.split(".").pop().toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv and .xlsx files are allowed."), false);
    }
  },
});

// Required columns — Extension Name is NOT here (it is optional)
const REQUIRED_COLUMNS = [
  "Student ID",
  "Email",          
  "First Name",
  "Last Name",
  "Middle Name",
  "College Department",
  "Year Level",
  "Enrollment Status",
];

// Optional columns — present in validation but never cause rejection if empty or absent
const OPTIONAL_COLUMNS = ["Extension Name"];

const VALID_DEPARTMENTS = [
  "College of Nursing",
  "College of Engineering",
  "College of Education",
  "College of Computer Studies",
  "College of Business Administration",
  "College of Arts and Sciences",
  "College of Hospitality Management",
];

const VALID_YEAR_LEVELS = {
  "1": 1, "1st": 1,
  "2": 2, "2nd": 2,
  "3": 3, "3rd": 3,
  "4": 4, "4th": 4,
};

const VALID_STATUSES = ["Inactive", "Regular", "Irregular"];
// Extension Name — allowed values when provided (empty string = no extension)
const VALID_EXTENSIONS = ["", "Jr.", "Sr.", "I", "II", "III", "IV"];
const STUDENT_ID_REGEX = /^\d{2}-\d{5}$/;
const PLPASIG_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@plpasig\.edu\.ph$/i;

const validateRow = (row, rowNumber) => {
  const errors = [];

  const studentId      = (row["Student ID"]        || "").toString().trim();
  const email = (row["Email"] || "").toString().trim();
  const firstName      = (row["First Name"]         || "").toString().trim();
  const lastName       = (row["Last Name"]          || "").toString().trim();
  const middleName     = (row["Middle Name"]        || "").toString().trim();
  const collegeDept    = (row["College Department"] || "").toString().trim();
  const yearLevel      = (row["Year Level"]         || "").toString().trim();
  const enrollmentStatus = (row["Enrollment Status"] || "").toString().trim();

  // Extension Name: optional — validate value only when the column exists AND has a value
  const extensionName  = (row["Extension Name"]     || "").toString().trim();

  // ── Required field presence ────────────────────────────────────────────────
  if (!studentId)        errors.push(`Row ${rowNumber}: Student ID is empty.`);
  if (!email) errors.push(`Row ${rowNumber}: Email is empty.`);
  if (!firstName)        errors.push(`Row ${rowNumber}: First Name is empty.`);
  if (!middleName)       errors.push(`Row ${rowNumber}: Middle Name is empty.`);
  if (!lastName)         errors.push(`Row ${rowNumber}: Last Name is empty.`);
  if (!collegeDept)      errors.push(`Row ${rowNumber}: College Department is empty.`);
  if (!yearLevel)        errors.push(`Row ${rowNumber}: Year Level is empty.`);
  if (!enrollmentStatus) errors.push(`Row ${rowNumber}: Enrollment Status is empty.`);

  // ── Required field format validation ──────────────────────────────────────
  if (studentId && !STUDENT_ID_REGEX.test(studentId)) {
    errors.push(
      `Row ${rowNumber}: Student ID "${studentId}" must follow format YY-NNNNN (e.g. 24-00001).`
    );
  }

  if (email && !PLPASIG_EMAIL_REGEX.test(email)) {
    errors.push(
      `Row ${rowNumber}: Email "${email}" must be a valid @plpasig.edu.ph address (e.g. delacruz_juan@plpasig.edu.ph).`
    );
  }

  if (collegeDept && !VALID_DEPARTMENTS.includes(collegeDept)) {
    errors.push(
      `Row ${rowNumber}: College Department "${collegeDept}" is invalid. ` +
      `Valid options: ${VALID_DEPARTMENTS.join(", ")}.`
    );
  }

  if (yearLevel && !(yearLevel.toLowerCase() in VALID_YEAR_LEVELS)) {
    errors.push(
      `Row ${rowNumber}: Year Level "${yearLevel}" is invalid. Valid options: 1, 2, 3, 4.`
    );
  }

  if (enrollmentStatus && !VALID_STATUSES.includes(enrollmentStatus)) {
    errors.push(
      `Row ${rowNumber}: Enrollment Status "${enrollmentStatus}" is invalid. ` +
      `Valid options: ${VALID_STATUSES.join(", ")}.`
    );
  }

  // ── Optional field validation — only when a value is present ──────────────
  if (extensionName && !VALID_EXTENSIONS.includes(extensionName)) {
    errors.push(
      `Row ${rowNumber}: Extension Name "${extensionName}" is invalid. ` +
      `Valid options: Jr., Sr., I, II, III, IV (or leave empty).`
    );
  }

  return errors;
};


// ─── POST /api/import-students ────────────────────────────────────────────────

router.post("/import-students", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const workbook  = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (rows.length === 0) {
      return res.status(400).json({ message: "The uploaded file is empty." });
    }

    const fileColumns = Object.keys(rows[0]);

    // Only the REQUIRED columns are checked for presence.
    // Extension Name is optional — it may or may not be in the file.
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !fileColumns.includes(col));

    if (missingColumns.length > 0) {
      return res.status(400).json({
        message:
          `Missing required columns: ${missingColumns.join(", ")}. ` +
          `Please check your file format.`,
      });
    }

    const validationErrors = [];
    rows.forEach((row, index) => {
      validationErrors.push(...validateRow(row, index + 2));
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "File contains validation errors. Please fix them and re-upload.",
        errors:  validationErrors,
      });
    }

    // Duplicate checks — Student ID and Email must be unique within the file AND against the database
    const fileStudentIds   = rows.map((row) => row["Student ID"].toString().trim());
    const duplicatesInFile = fileStudentIds.filter(
      (id, index) => fileStudentIds.indexOf(id) !== index
    );

    if (duplicatesInFile.length > 0) {
      return res.status(400).json({
        message: `Duplicate Student IDs found within the file: ${[...new Set(duplicatesInFile)].join(", ")}.`,
      });
    }

    const fileEmails = rows.map((row) => row["Email"].toString().trim().toLowerCase());
    const duplicateEmails = fileEmails.filter(
      (email, index) => fileEmails.indexOf(email) !== index
    );

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        message: `Duplicate Emails found within the file: ${[...new Set(duplicateEmails)].join(", ")}.`,
      });
    }

    const placeholders   = fileStudentIds.map(() => "?").join(", ");
    const [existingRows] = await db.query(
      `SELECT student_id FROM students WHERE student_id IN (${placeholders})`,
      fileStudentIds
    );

    if (existingRows.length > 0) {
      const existingIds = existingRows.map((r) => r.student_id);
      return res.status(400).json({
        message: `These Student IDs already exist in the database: ${existingIds.join(", ")}.`,
      });
    }

    const emailPlaceholders = fileEmails.map(() => "?").join(", ");
    const [existingEmails] = await db.query(
      `SELECT email FROM students WHERE email IN (${emailPlaceholders})`,
      fileEmails
    );

    if (existingEmails.length > 0) {
      const taken = existingEmails.map((r) => r.email);
      return res.status(400).json({
        message: `These Emails already exist in the database: ${taken.join(", ")}.`,
      });
    }

    const insertedStudents = [];
    const failedRows       = [];

    for (const row of rows) {
      const studentId         = row["Student ID"].toString().trim();
      const firstName         = row["First Name"].toString().trim();
      const middleName        = row["Middle Name"].toString().trim();
      const lastName          = row["Last Name"].toString().trim();
      const collegeDepartment = row["College Department"].trim();
      const yearLevel         = VALID_YEAR_LEVELS[row["Year Level"].toString().trim().toLowerCase()];
      const status            = row["Enrollment Status"].trim();
      // Extension Name: read if column exists, default to empty string if absent
      const extensionName     = (row["Extension Name"] || "").toString().trim();

      try {
        await db.query(
          `INSERT INTO students
            (student_id, email, first_name, last_name, middle_name, extension_name,
            college_department, year_level, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            studentId,
            email.toLowerCase(),
            firstName.toUpperCase(),
            lastName.toUpperCase(),
            middleName.toUpperCase() || null,
            extensionName || null,          // already read from row["Extension Name"]
            collegeDepartment,
            yearLevel,
            status
          ]
        );
        insertedStudents.push(studentId);
      } catch (dbError) {
        failedRows.push({ studentId, error: dbError.message });
      }
    }

    return res.status(200).json({
      message:        `Import complete. ${insertedStudents.length} student(s) added successfully.`,
      inserted:       insertedStudents.length,
      failed:         failedRows.length,
      failedDetails:  failedRows,
      pendingFaceReg: insertedStudents.length,
    });

  } catch (error) {
    console.error("Import error:", error);
    return res.status(500).json({
      message: error.message || "Server error during import.",
    });
  }
});


// ─── GET /api/pending-face-registration ──────────────────────────────────────

router.get("/pending-face-registration", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM students
       WHERE student_id NOT IN (
         SELECT DISTINCT student_id FROM student_face_embeddings
       )`
    );
    const count = rows[0].count;
    return res.status(200).json({
      count,
      message: count > 0
        ? `There are ${count} student(s) that need face registration.`
        : null,
    });
  } catch (error) {
    console.error("Pending face registration error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// ─── GET /api/students-face-status ───────────────────────────────────────────

router.get("/students-face-status", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.student_id,
              IF(sfe.student_id IS NOT NULL, 1, 0) AS has_face
       FROM students s
       LEFT JOIN (
         SELECT DISTINCT student_id FROM student_face_embeddings
       ) sfe ON s.student_id = sfe.student_id`
    );
    const faceStatusMap = {};
    rows.forEach((r) => { faceStatusMap[r.student_id] = r.has_face === 1; });
    return res.status(200).json(faceStatusMap);
  } catch (error) {
    console.error("Face status error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// ─── POST /api/register-face ──────────────────────────────────────────────────
// Called by EditStudent.jsx when registering a face for an already-saved student.
// Mirrors the face-embedding logic in registration.js but skips re-inserting
// student info (student already exists in the DB).

router.post("/register-face", async (req, res) => {
  let connection;
  try {
    const { student_id, images } = req.body;

    if (!student_id || !images || images.length !== 5) {
      return res.status(400).json({ message: "student_id and exactly 5 images are required." });
    }

    // Call Python to generate embeddings
    const axios    = require("axios");
    const response = await axios.post(
      "http://127.0.0.1:8000/generate-embedding",
      { images }
    );

    const embeddings =
      response.data.embeddings ||
      (response.data.embedding ? [response.data.embedding] : null);

    if (!response.data.success || !embeddings || embeddings.length !== 5) {
      return res.status(400).json({ message: "Face detection failed. Please retake photos." });
    }

    const positions = ["center", "left", "right", "up", "down"];

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Remove any stale embeddings for this student before inserting fresh ones
    await connection.query(
      "DELETE FROM student_face_embeddings WHERE student_id = ?",
      [student_id]
    );

    for (let i = 0; i < embeddings.length; i++) {
      const emb = embeddings[i];
      if (!emb || emb.length !== 512) {
        throw new Error("Invalid embedding size");
      }
      await connection.query(
        `INSERT INTO student_face_embeddings (student_id, face_position, face_embedding)
         VALUES (?, ?, ?)`,
        [student_id, positions[i], JSON.stringify(emb)]
      );
    }

    await connection.commit();

    return res.json({ message: "Face registered successfully." });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("REGISTER-FACE ERROR:", err);
    return res.status(500).json({ message: err.message || "Face registration failed." });
  } finally {
    if (connection) connection.release();
  }
});


module.exports = router;