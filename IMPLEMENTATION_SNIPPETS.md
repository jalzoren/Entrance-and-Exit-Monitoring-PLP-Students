# Implementation Code Snippets - Ready to Apply

This file contains exact code changes for each file. Copy and adapt these to your codebase.

---

## backend/routes/registration.js

### Change 1: Insert Student (Around Line 152)

**BEFORE:**
```javascript
const sql = `INSERT INTO students (
  email, first_name, last_name, middle_name, extension_name,
  college_department, program_name, year_level, status, is_archived
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

db.query(sql, [
  email,
  firstName,
  lastName,
  middleName,
  extensionName,
  college,      // OLD: college_department as string
  program,      // OLD: program_name as string
  yearLevel,
  'Regular',
  0
], callback);
```

**AFTER:**
```javascript
const sql = `INSERT INTO students (
  email, first_name, last_name, middle_name, extension_name,
  program_id, year_level, status, is_archived
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

db.query(sql, [
  email,
  firstName,
  lastName,
  middleName,
  extensionName,
  parseInt(program),  // NEW: program_id as number
  yearLevel,
  'Regular',
  0
], callback);
```

### Change 2: Update Student (Around Line 364)

**BEFORE:**
```javascript
const updateSql = `UPDATE students 
  SET first_name = ?, last_name = ?, middle_name = ?, 
      extension_name = ?, college_department = ?, program_name = ?,
      year_level = ?, status = ?
  WHERE student_id = ?`;

db.query(updateSql, [
  firstName,
  lastName,
  middleName,
  extensionName,
  college,           // OLD
  program,           // OLD
  yearLevel,
  status,
  studentId
], callback);
```

**AFTER:**
```javascript
const updateSql = `UPDATE students 
  SET first_name = ?, last_name = ?, middle_name = ?, 
      extension_name = ?, program_id = ?,
      year_level = ?, status = ?
  WHERE student_id = ?`;

db.query(updateSql, [
  firstName,
  lastName,
  middleName,
  extensionName,
  parseInt(program),  // NEW: program_id
  yearLevel,
  status,
  studentId
], callback);
```

### Change 3: Fetch Student for Display (Around Line 281)

**BEFORE:**
```javascript
const sql = `SELECT student_id, first_name, last_name, middle_name,
  extension_name, email, program_name, college_department, year_level, status
  FROM students WHERE student_id = ?`;
```

**AFTER:**
```javascript
const sql = `SELECT 
  s.student_id, s.first_name, s.last_name, s.middle_name,
  s.extension_name, s.email, s.program_id, s.year_level, s.status,
  p.program_name, p.program_code,
  d.dept_name, d.dept_code, d.id AS dept_id
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?`;
```

---

## backend/routes/analytics.js

### Change 1: On-Campus Users (Around Line 355)

**BEFORE:**
```javascript
const onCampusQuery = `
  SELECT latest.student_id, s.college_department
  FROM (
    SELECT student_id, MAX(log_id) as max_id 
    FROM entry_exit_logs 
    WHERE action = 'ENTRY' 
    GROUP BY student_id
  ) latest
  JOIN entry_exit_logs e ON latest.max_id = e.log_id
  JOIN students s ON latest.student_id = s.student_id
`;

const onCampusRows = await db.query(onCampusQuery);
onCampusRows.forEach(r => console.log(`   → ${r.student_id} | ${r.college_department}`));
```

**AFTER:**
```javascript
const onCampusQuery = `
  SELECT 
    latest.student_id,
    d.dept_name AS college_department,
    d.dept_code,
    p.program_name
  FROM (
    SELECT student_id, MAX(log_id) as max_id 
    FROM entry_exit_logs 
    WHERE action = 'ENTRY' 
    GROUP BY student_id
  ) latest
  INNER JOIN entry_exit_logs e ON latest.max_id = e.log_id
  INNER JOIN students s ON latest.student_id = s.student_id
  INNER JOIN programs p ON s.program_id = p.id
  INNER JOIN departments d ON p.department_id = d.id
`;

const onCampusRows = await db.query(onCampusQuery);
onCampusRows.forEach(r => console.log(`   → ${r.student_id} | ${r.college_department}`));
```

### Change 2: Department Totals (Around Line 375)

**BEFORE:**
```javascript
const deptTotalsQuery = `
  SELECT college_department, COUNT(*) AS total 
  FROM students 
  WHERE status != 'Inactive' 
  GROUP BY college_department
`;

const deptTotals = await db.query(deptTotalsQuery);
const deptTotalMap = new Map(deptTotals.map(r => [r.college_department, Number(r.total)]));
```

**AFTER:**
```javascript
const deptTotalsQuery = `
  SELECT 
    d.dept_name AS college_department,
    d.id AS dept_id,
    COUNT(*) AS total
  FROM students s
  INNER JOIN programs p ON s.program_id = p.id
  INNER JOIN departments d ON p.department_id = d.id
  WHERE s.status != 'Inactive'
  GROUP BY d.id, d.dept_name
  ORDER BY d.dept_name
`;

const deptTotals = await db.query(deptTotalsQuery);
const deptTotalMap = new Map(deptTotals.map(r => [r.college_department, Number(r.total)]));
```

### Change 3: On-Campus by Department (Around Line 385)

**BEFORE:**
```javascript
onCampusRows.forEach(r => {
  const dept = r.college_department;
  if (!result.byDepartment[dept]) {
    result.byDepartment[dept] = { on_campus: 0, total: 0 };
  }
  result.byDepartment[dept].on_campus++;
});
```

**AFTER:**
```javascript
onCampusRows.forEach(r => {
  const dept = r.college_department;
  if (!result.byDepartment[dept]) {
    result.byDepartment[dept] = { 
      on_campus: 0, 
      total: 0,
      dept_code: r.dept_code
    };
  }
  result.byDepartment[dept].on_campus++;
});
```

### Change 4: Report Data with Department (Around Line 533-534)

**BEFORE:**
```javascript
const reportQuery = `SELECT 
  s.student_id, s.first_name, s.last_name, s.college_department,
  s.program_name, s.year_level,
  e.action, e.log_time
FROM students s
LEFT JOIN entry_exit_logs e ON s.student_id = e.student_id
WHERE ${whereConditions}`;

if (dept) { logsQuery += ' AND s.college_department = ?'; params.push(dept); }
```

**AFTER:**
```javascript
const reportQuery = `SELECT 
  s.student_id, s.first_name, s.last_name,
  d.dept_name, d.dept_code,
  p.program_name, p.program_code, s.year_level,
  e.action, e.log_time
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN entry_exit_logs e ON s.student_id = e.student_id
WHERE ${whereConditions}`;

if (dept) { logsQuery += ' AND d.dept_name = ?'; params.push(dept); }
```

### Change 5: Department Listing (Around Line 548)

**BEFORE:**
```javascript
const deptQuery = `SELECT college_department, COUNT(*) AS total FROM students WHERE status != 'Inactive' GROUP BY college_department`;
const deptTotals = await db.query(deptQuery);
const deptTotalMap = new Map(deptTotals.map(r => [r.college_department, Number(r.total)]));
```

**AFTER:**
```javascript
const deptQuery = `
  SELECT 
    d.dept_name AS college_department,
    d.dept_code,
    COUNT(*) AS total 
  FROM students s
  INNER JOIN programs p ON s.program_id = p.id
  INNER JOIN departments d ON p.department_id = d.id
  WHERE s.status != 'Inactive' 
  GROUP BY d.id, d.dept_name
`;
const deptTotals = await db.query(deptQuery);
const deptTotalMap = new Map(deptTotals.map(r => [r.college_department, Number(r.total)]));
```

---

## backend/routes/recognize.js

### Change: Get Student Info (Around Line 129)

**BEFORE:**
```javascript
const sql = `SELECT first_name, last_name, college_department FROM students WHERE student_id = ?`;
const [studentInfo] = await db.query(sql, [studentId]);

// ... later in response
department:  studentInfo.college_department ?? 'N/A',
```

**AFTER:**
```javascript
const sql = `SELECT 
  s.first_name, 
  s.last_name,
  d.dept_name AS college_department,
  d.dept_code,
  p.program_name,
  p.program_code
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?`;

const [studentInfo] = await db.query(sql, [studentId]);

// ... later in response
department:  studentInfo.college_department ?? 'N/A',
program: studentInfo.program_name ?? 'N/A',
```

---

## backend/routes/qrScan.js

### Change: Get Student for QR (Around Line 137)

**BEFORE:**
```javascript
// Assume student object has these fields
const collegeDept = student.college_department || "Not Specified";
const course = student.program_name || "Not Specified";
```

**AFTER:**
```javascript
// First, fetch with JOIN if not already done
if (!student.college_department) {
  const sql = `
    SELECT 
      s.first_name, s.last_name,
      d.dept_name, d.dept_code,
      p.program_name, p.program_code
    FROM students s
    LEFT JOIN programs p ON s.program_id = p.id
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE s.student_id = ?
  `;
  [student] = await db.query(sql, [studentId]);
}

const collegeDept = student.dept_name || "Not Specified";
const course = student.program_name || "Not Specified";
```

---

## backend/routes/programs.js

### Change 1: Check Department Usage (Around Line 155)

**BEFORE:**
```javascript
const countSql = `SELECT COUNT(*) as count FROM students WHERE college_department = ? AND status != "Inactive"`;
db.query(countSql, [departmentName], (err, results) => {
  const count = results[0].count;
  if (count > 0) {
    // Students exist in this department
  }
});
```

**AFTER:**
```javascript
const countSql = `
  SELECT COUNT(*) as count FROM students s
  INNER JOIN programs p ON s.program_id = p.id
  WHERE p.department_id = ? AND s.status != "Inactive"
`;
db.query(countSql, [departmentId], (err, results) => {
  const count = results[0].count;
  if (count > 0) {
    // Students exist in this department
  }
});
```

### Change 2: Update Department Status (Around Line 213)

**BEFORE:**
```javascript
const deactivateSql = `UPDATE students SET status = "Inactive" WHERE college_department = ? AND status != "Inactive"`;
db.query(deactivateSql, [departmentName], (err) => {
  // Deactivated
});
```

**AFTER:**
```javascript
const deactivateSql = `
  UPDATE students s
  INNER JOIN programs p ON s.program_id = p.id
  SET s.status = "Inactive"
  WHERE p.department_id = ? AND s.status != "Inactive"
`;
db.query(deactivateSql, [departmentId], (err) => {
  // Deactivated
});
```

### Change 3: Get Program Name (Around Line 238)

**BEFORE:**
```javascript
db.query(`SELECT programName FROM programs WHERE id = ?`, [programId], (err, results) => {
  const programName = results[0].programName;
});
```

**AFTER:**
```javascript
db.query(`SELECT program_name FROM programs WHERE id = ?`, [programId], (err, results) => {
  const programName = results[0].program_name;
});
```

### Change 4: Get Programs for Display (Add this query)

**NEW - For fetching programs with department info for dropdowns:**
```javascript
db.query(`
  SELECT 
    p.id,
    p.program_code,
    p.program_name,
    p.program_type,
    p.program_status,
    p.department_id,
    d.dept_code,
    d.dept_name
  FROM programs p
  LEFT JOIN departments d ON p.department_id = d.id
  WHERE p.program_status = 'Active'
  ORDER BY d.dept_name, p.program_name
`, (err, results) => {
  // Returns results with snake_case fields for frontend
  res.json(results);
});
```

---

## plp-student-monitoring/src/components/RegisterStudent.jsx

### Change 1: Form Submission (Around Line 428)

**BEFORE:**
```javascript
const formData = {
  student_id: studentId,
  email,
  first_name: firstName,
  last_name: lastName,
  middle_name: middleName,
  extension_name: extensionName,
  college_department: college,    // String value
  program_name: program,          // String value
  year_level: yearLevel
};
```

**AFTER:**
```javascript
const formData = {
  student_id: studentId,
  email,
  first_name: firstName,
  last_name: lastName,
  middle_name: middleName,
  extension_name: extensionName,
  program_id: parseInt(program),  // Numeric ID
  year_level: yearLevel
  // Department is implicit via program_id → programs.department_id
};
```

### Change 2: Program Dropdown (Around Lines 626-627)

**BEFORE:**
```jsx
{programs.map((prog, index) => (
  <option key={index} value={prog.programName || prog.name || prog}>
    {prog.programName || prog.name || prog} {prog.programCode ? `(${prog.programCode})` : ''}
  </option>
))}
```

**AFTER:**
```jsx
{programs.map((prog) => (
  <option key={prog.id} value={prog.id}>
    {prog.program_name} ({prog.program_code})
  </option>
))}
```

---

## plp-student-monitoring/src/components/EditStudent.jsx

### Change 1: State Initialization (Lines 72-73)

**BEFORE:**
```javascript
const [college, setCollege] = useState(student.college_department || "");
const [program, setProgram] = useState(student.program_name || "");
```

**AFTER:**
```javascript
const [college, setCollege] = useState(student.dept_name || "");
const [program, setProgram] = useState(student.program_id || "");
```

### Change 2: Program Validation (Around Line 143)

**BEFORE:**
```javascript
if (program && !filtered.some(p => p.programName === program)) {
  setProgram(filtered.length > 0 ? filtered[0].programName : "");
}
```

**AFTER:**
```javascript
if (program && !filtered.some(p => p.id === parseInt(program))) {
  setProgram(filtered.length > 0 ? filtered[0].id : "");
}
```

### Change 3: Form Submission (Lines 179-180)

**BEFORE:**
```javascript
const updatedStudent = {
  ...student,
  college_department: college,
  program_name: program,
  year_level: yearLevel
};
```

**AFTER:**
```javascript
const updatedStudent = {
  ...student,
  program_id: parseInt(program),
  year_level: yearLevel
  // college_department will be fetched via JOIN in backend
};
```

### Change 4: Program Dropdown (Lines 434-435)

**BEFORE:**
```jsx
<option key={prog.id} value={prog.programName}>
  {prog.programName} ({prog.programCode})
</option>
```

**AFTER:**
```jsx
<option key={prog.id} value={prog.id}>
  {prog.program_name} ({prog.program_code})
</option>
```

---

## plp-student-monitoring/src/pages/adminpages/Students.jsx

### Change 1: Department Filtering (Line 219)

**BEFORE:**
```javascript
const matchDept = !filterDept || s.college_department === filterDept;
```

**AFTER:**
```javascript
const matchDept = !filterDept || s.dept_name === filterDept;
```

### Change 2: Program Filtering (Line 222)

**This stays the same** - assuming data is fetched with JOINs:
```javascript
const matchProg = !filterProgram || s.program_name === filterProgram;
```

### Change 3: Sorting - Department Case (Lines 266-268)

**BEFORE:**
```javascript
case "college_department":
  aVal = a.college_department?.toLowerCase() || "";
  bVal = b.college_department?.toLowerCase() || "";
  break;
```

**AFTER:**
```javascript
case "college_department":
  aVal = a.dept_name?.toLowerCase() || "";
  bVal = b.dept_name?.toLowerCase() || "";
  break;
```

### Change 4: Sorting - Program Case (Line 270)

**This stays the same**:
```javascript
case "program_name":
  aVal = a.program_name?.toLowerCase() || "";
  bVal = b.program_name?.toLowerCase() || "";
  break;
```

### Change 5: Ensure Data Fetch Uses JOINs

**Make sure the backend route that fetches students returns:**
```javascript
// Backend should return students with joined data
SELECT 
  s.student_id, s.first_name, s.last_name,
  s.program_id, s.year_level, s.status,
  p.program_name, p.program_code,
  d.dept_name, d.dept_code, d.id AS dept_id
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE <filters>
```

---

## plp-student-monitoring/src/context/LogContext.jsx

### Change: Department Fallback (Line 124)

**BEFORE:**
```javascript
collegeDept: logData.collegeDept || logData.department || logData.college_department || "Not Specified",
```

**AFTER:**
```javascript
collegeDept: logData.collegeDept || logData.department || logData.dept_name || "Not Specified",
```

---

## Summary of Parameter Mapping

When converting forms from old to new:

```javascript
// OLD FORM STRUCTURE
{
  college_department: "College of Computer Studies",  // String
  program_name: "Bachelor of Science in Information Technology"  // String
}

// NEW FORM STRUCTURE  
{
  program_id: 18  // Numeric ID from programs table
  // college_department derived via: programs[18].department_id → departments[2].dept_name
}
```

When fetching students back:

```javascript
// OLD RESPONSE
{
  college_department: "College of Computer Studies",
  program_name: "Bachelor of Science in Information Technology"
}

// NEW RESPONSE (with JOINs)
{
  program_id: 18,
  program_name: "Bachelor of Science in Information Technology",
  program_code: "BSIT",
  dept_name: "College of Computer Studies",
  dept_code: "CCS"
}
```
