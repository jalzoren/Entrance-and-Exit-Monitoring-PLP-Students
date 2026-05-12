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

// ── Column definitions ────────────────────────────────────────────────────────
const REQUIRED_COLUMNS = [
  "Student ID",
  "Email",
  "First Name",
  "Last Name",
  "Middle Name",
  "College Department",
  "Program Name",
  "Year Level",
  "Section",
  "Enrollment Status",
];

const OPTIONAL_COLUMNS = ["Extension Name"];

// ── Allowed values ────────────────────────────────────────────────────────────
const VALID_YEAR_LEVELS = {
  "1": 1, "1st": 1,
  "2": 2, "2nd": 2,
  "3": 3, "3rd": 3,
  "4": 4, "4th": 4,
};

const VALID_STATUSES   = ["Inactive", "Regular", "Irregular", "LOA", "Dropout", "Kickout", "Graduated", "Transferred"];
const VALID_EXTENSIONS = ["", "Jr.", "Sr.", "I", "II", "III", "IV"];

// VALID_SECTIONS removed – any text allowed.

const STUDENT_ID_REGEX    = /^\d{2}-\d{5}$/;
const PLPASIG_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@plpasig\.edu\.ph$/i;

// ── Row validator ─────────────────────────────────────────────────────────────
const validateRow = (row, rowNumber, normalizedHeaders, programMap, deptMap) => {
  const errors = [];

  const studentId    = getFieldValue(row, normalizedHeaders, "Student ID");
  const email        = getFieldValue(row, normalizedHeaders, "Email");
  const firstName    = getFieldValue(row, normalizedHeaders, "First Name");
  const lastName     = getFieldValue(row, normalizedHeaders, "Last Name");
  const middleName   = getFieldValue(row, normalizedHeaders, "Middle Name");
  const collegeDept  = getFieldValue(row, normalizedHeaders, "College Department");
  const programName  = getFieldValue(row, normalizedHeaders, "Program Name");
  const yearLevel    = getFieldValue(row, normalizedHeaders, "Year Level");
  const section      = getFieldValue(row, normalizedHeaders, "Section");
  const enrollStatus = getFieldValue(row, normalizedHeaders, "Enrollment Status");
  const extensionName = getFieldValue(row, normalizedHeaders, "Extension Name");

  if (!studentId)    errors.push(`Row ${rowNumber}: Student ID is empty.`);
  if (!email)        errors.push(`Row ${rowNumber}: Email is empty.`);
  if (!firstName)    errors.push(`Row ${rowNumber}: First Name is empty.`);
  if (!middleName)   errors.push(`Row ${rowNumber}: Middle Name is empty.`);
  if (!lastName)     errors.push(`Row ${rowNumber}: Last Name is empty.`);
  if (!collegeDept)  errors.push(`Row ${rowNumber}: College Department is empty.`);
  if (!programName)  errors.push(`Row ${rowNumber}: Program Name is empty.`);
  if (!yearLevel)    errors.push(`Row ${rowNumber}: Year Level is empty.`);
  if (!section)      errors.push(`Row ${rowNumber}: Section is empty.`);
  if (!enrollStatus) errors.push(`Row ${rowNumber}: Enrollment Status is empty.`);

  if (studentId && !STUDENT_ID_REGEX.test(studentId))
    errors.push(`Row ${rowNumber}: Student ID "${studentId}" must follow format YY-NNNNN (e.g. 24-00001).`);

  if (email && !PLPASIG_EMAIL_REGEX.test(email))
    errors.push(`Row ${rowNumber}: Email "${email}" must be a valid @plpasig.edu.ph address.`);

  if (collegeDept) {
    const deptKey = collegeDept.toLowerCase().trim();
    if (!deptMap[deptKey]) {
      errors.push(`Row ${rowNumber}: College Department "${collegeDept}" not found in system. Please check the department name.`);
    }
  }

  if (programName) {
    const progKey = programName.toLowerCase().trim();
    if (!programMap[progKey]) {
      errors.push(`Row ${rowNumber}: Program Name "${programName}" not found in system. Please check the program name.`);
    }
  }

  if (yearLevel && !(yearLevel.toLowerCase() in VALID_YEAR_LEVELS))
    errors.push(`Row ${rowNumber}: Year Level "${yearLevel}" is invalid. Valid options: 1, 2, 3, 4.`);


  if (enrollStatus && !VALID_STATUSES.includes(enrollStatus))
    errors.push(`Row ${rowNumber}: Enrollment Status "${enrollStatus}" is invalid. Valid options: ${VALID_STATUSES.join(", ")}.`);

  if (extensionName && !VALID_EXTENSIONS.includes(extensionName))
    errors.push(`Row ${rowNumber}: Extension Name "${extensionName}" is invalid. Valid options: Jr., Sr., I, II, III, IV.`);

  return errors;
};


// ─── Helper: Normalize column names (case-insensitive) ──────────────────────
const normalizeColumnHeaders = (headers) => {
  const normalized = {};
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    normalized[lowerHeader] = header;
  });
  return normalized;
};

// ─── Helper: Find column by normalized name ──────────────────────────────────
const findColumnByName = (row, normalizedHeaders, targetName) => {
  const target = targetName.toLowerCase().trim();
  for (const [lowerKey, originalKey] of Object.entries(normalizedHeaders)) {
    if (lowerKey === target) {
      return row[originalKey];
    }
  }
  return undefined;
};

// ─── Helper: Get field value from row using normalized headers ──────────────
const getFieldValue = (row, normalizedHeaders, fieldName) => {
  const value = findColumnByName(row, normalizedHeaders, fieldName);
  return (value || "").toString().trim();
};

// ─── POST /api/import-students ────────────────────────────────────────────────
router.post("/import-students", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    // ── Check if file has sheets ──────────────────────────────────────────
    if (!workbook.SheetNames || workbook.SheetNames.length === 0)
      return res.status(400).json({ message: "The uploaded file contains no sheets." });

    // ── Show available sheets if multiple sheets exist ────────────────────
    if (workbook.SheetNames.length > 1) {
      console.log(`File contains ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`);
    }

    // ── Read all sheets and combine data ──────────────────────────────────
    let allRows = [];
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      if (sheetRows.length > 0) {
        allRows = allRows.concat(sheetRows);
      }
    }

    if (allRows.length === 0)
      return res.status(400).json({ message: "All sheets in the file are empty." });

    const rows = allRows;

    // ── Fetch programs and departments from database ───────────────────────
    const [programRows] = await db.query(
      `SELECT p.id, p.program_name, p.department_id, d.dept_name 
       FROM programs p 
       LEFT JOIN departments d ON p.department_id = d.id 
       WHERE p.program_status = 'Active'`
    );

    const [deptRows] = await db.query(
      `SELECT id, dept_name FROM departments WHERE status = 'Active'`
    );

    // ── Build lookup maps ─────────────────────────────────────────────────
    const programMap = {};
    const deptMap = {};

    programRows.forEach(row => {
      programMap[row.program_name.toLowerCase().trim()] = {
        id: row.id,
        dept_id: row.department_id,
        dept_name: row.dept_name
      };
    });

    deptRows.forEach(row => {
      deptMap[row.dept_name.toLowerCase().trim()] = row.id;
    });

    // ── Column presence check (case-insensitive) ──────────────────────────
    const firstRowHeaders = Object.keys(rows[0]);
    const normalizedHeaders = normalizeColumnHeaders(firstRowHeaders);
    
    const missingColumns = REQUIRED_COLUMNS.filter(col => 
      !Object.keys(normalizedHeaders).includes(col.toLowerCase().trim())
    );

    if (missingColumns.length > 0) {
      return res.status(400).json({
        message: `Missing required columns: ${missingColumns.join(", ")}. Please check your file format.`,
      });
    }

    // ── Row-level validation ──────────────────────────────────────────────
    const validationErrors = [];
    rows.forEach((row, index) => {
      validationErrors.push(...validateRow(row, index + 2, normalizedHeaders, programMap, deptMap));
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "File contains validation errors. Please fix them and re-upload.",
        errors:  validationErrors,
      });
    }

    // ── Duplicate checks within the file itself ───────────────────────────
    const fileStudentIds = rows.map(r => getFieldValue(r, normalizedHeaders, "Student ID"));
    const duplicateInFile = fileStudentIds.filter((id, i) => fileStudentIds.indexOf(id) !== i);

    if (duplicateInFile.length > 0) {
      return res.status(400).json({
        message: `Duplicate Student IDs found within the file: ${[...new Set(duplicateInFile)].join(", ")}. Please fix your file before uploading.`,
      });
    }

    const fileEmails = rows.map(r => getFieldValue(r, normalizedHeaders, "Email").toLowerCase());
    const duplicateEmails = fileEmails.filter((e, i) => fileEmails.indexOf(e) !== i);

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        message: `Duplicate Emails found within the file: ${[...new Set(duplicateEmails)].join(", ")}. Please fix your file before uploading.`,
      });
    }

    // ── Database duplicate checks — collect skipped rows, don't reject ────
    const idPlaceholders = fileStudentIds.map(() => "?").join(", ");
    const [existingIdRows] = await db.query(
      `SELECT student_id FROM students WHERE student_id IN (${idPlaceholders})`,
      fileStudentIds
    );
    const existingIdSet = new Set(existingIdRows.map(r => r.student_id));

    const emailPlaceholders = fileEmails.map(() => "?").join(", ");
    const [existingEmailRows] = await db.query(
      `SELECT email FROM students WHERE email IN (${emailPlaceholders})`,
      fileEmails
    );
    const existingEmailSet = new Set(existingEmailRows.map(r => r.email.toLowerCase()));

    // Build the skipped list with a reason for each row
    const skippedRows = [];
    const rowsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row       = rows[i];
      const studentId = getFieldValue(row, normalizedHeaders, "Student ID");
      const email     = getFieldValue(row, normalizedHeaders, "Email").toLowerCase();

      if (existingIdSet.has(studentId)) {
        skippedRows.push({ studentId, reason: "Student ID already exists in the system" });
      } else if (existingEmailSet.has(email)) {
        skippedRows.push({ studentId, reason: `Email "${email}" already exists in the system` });
      } else {
        rowsToInsert.push(row);
      }
    }

    // ── If every row would be skipped, return early with a clear message ──
    if (rowsToInsert.length === 0) {
      return res.status(200).json({
        message:  "No new students were imported — all rows already exist in the system.",
        inserted: 0,
        failed:   0,
        skipped:  skippedRows.length,
        skippedDetails: skippedRows,
        failedDetails:  [],
      });
    }

    // ── Insert the non-duplicate rows ─────────────────────────────────────
    const insertedStudents = [];
    const failedRows       = [];

    for (const row of rowsToInsert) {
      const studentId   = getFieldValue(row, normalizedHeaders, "Student ID");
      const email       = getFieldValue(row, normalizedHeaders, "Email").toLowerCase();
      const firstName   = getFieldValue(row, normalizedHeaders, "First Name");
      const middleName  = getFieldValue(row, normalizedHeaders, "Middle Name");
      const lastName    = getFieldValue(row, normalizedHeaders, "Last Name");
      const collegeDept = getFieldValue(row, normalizedHeaders, "College Department");
      const programName = getFieldValue(row, normalizedHeaders, "Program Name");
      const yearLevel   = VALID_YEAR_LEVELS[getFieldValue(row, normalizedHeaders, "Year Level").toLowerCase()];
      const status      = getFieldValue(row, normalizedHeaders, "Enrollment Status");
      const extName     = getFieldValue(row, normalizedHeaders, "Extension Name") || null;

      const section = getFieldValue(row, normalizedHeaders, "Section");
      if (!section) {
        failedRows.push({ studentId, reason: "Section is empty" });
        continue;
      }


      try {
        // ── Lookup program ID from database ───────────────────────────────
        const progKey = programName.toLowerCase().trim();
        const programData = programMap[progKey];

        if (!programData) {
          failedRows.push({ studentId, reason: `Program "${programName}" not found in database` });
          continue;
        }

        await db.query(
          `INSERT INTO students
             (student_id, email, first_name, last_name, middle_name,
              extension_name, program_id,
              year_level, section, status, is_archived, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [
            studentId,
            email,
            firstName.toUpperCase(),
            lastName.toUpperCase(),
            middleName.toUpperCase() || null,
            extName,
            programData.id,
            yearLevel,
            section,
            status,
          ]
        );
        insertedStudents.push(studentId);
      } catch (dbError) {
        failedRows.push({ studentId, reason: dbError.message });
      }
    }

    return res.status(200).json({
      message: `Import complete. ${insertedStudents.length} student(s) added.${skippedRows.length > 0 ? ` ${skippedRows.length} skipped (already in system).` : ""}`,
      inserted:       insertedStudents.length,
      failed:         failedRows.length,
      skipped:        skippedRows.length,
      skippedDetails: skippedRows,
      failedDetails:  failedRows,
    });

  } catch (error) {
    console.error("Import error:", error);
    return res.status(500).json({ message: error.message || "Server error during import." });
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
    return res.status(200).json({
      count: rows[0].count,
      message: rows[0].count > 0
        ? `There are ${rows[0].count} student(s) that need face registration.`
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
    rows.forEach(r => { faceStatusMap[r.student_id] = r.has_face === 1; });
    return res.status(200).json(faceStatusMap);
  } catch (error) {
    console.error("Face status error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


// ─── POST /api/register-face ──────────────────────────────────────────────────
router.post("/register-face", async (req, res) => {
  let connection;
  try {
    const { student_id, images } = req.body;

    if (!student_id || !images || images.length !== 5)
      return res.status(400).json({ message: "student_id and exactly 5 images are required." });

    const axios    = require("axios");
    const response = await axios.post("http://127.0.0.1:8000/generate-embedding", { images });

    const embeddings =
      response.data.embeddings ||
      (response.data.embedding ? [response.data.embedding] : null);

    if (!response.data.success || !embeddings || embeddings.length !== 5)
      return res.status(400).json({ message: "Face detection failed. Please retake photos." });

    const positions = ["center", "left", "right", "up", "down"];

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM student_face_embeddings WHERE student_id = ?",
      [student_id]
    );

    for (let i = 0; i < embeddings.length; i++) {
      const emb = embeddings[i];
      if (!emb || emb.length !== 512) throw new Error("Invalid embedding size");
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