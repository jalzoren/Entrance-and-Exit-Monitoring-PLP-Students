# Database Schema Refactoring Guide

## Overview
Your database has been normalized from a denormalized structure to a properly normalized 3-table hierarchy:
- `students` → `programs` → `departments`

### Schema Changes
```
BEFORE: students(program_name, college_department)
AFTER:  students(program_id) → programs(department_id) → departments()
```

---

## PART A: Code References Found

### Backend Files with Old References

#### 1. **backend/routes/analytics.js** (13 references)
- Line 308, 321: `college_department` in onCampusUsers query
- Line 355, 371, 375, 378, 381, 385: Multiple `college_department` references
- Line 456, 484, 533-534, 543, 548, 553, 560, 599: Additional references

#### 2. **backend/routes/registration.js** (10 references)
- Lines 131, 152, 161, 281-282, 351, 364, 373-374, 409-410
- Uses both `college_department` and `program_name` in INSERT/UPDATE queries

#### 3. **backend/routes/recognize.js** (2 references)
- Line 129: `college_department` in SELECT
- Line 158: Using `college_department` in response

#### 4. **backend/routes/qrScan.js** (2 references)
- Line 137-138: `college_department` and `program_name` in response

#### 5. **backend/routes/programs.js** (3 references)
- Lines 155, 213: Using `college_department` in queries
- Line 238: Querying `programName` (camelCase)

### Frontend Files with Old References

#### 1. **plp-student-monitoring/src/components/RegisterStudent.jsx** (3 references)
- Line 428: Sending `college_department` in form data
- Lines 626-627: Using `prog.programName` and `prog.programCode` (camelCase)

#### 2. **plp-student-monitoring/src/components/EditStudent.jsx** (6 references)
- Lines 72-73: Initializing state from `college_department`, `program_name`
- Line 143: Checking `p.programName`
- Lines 179-180: Sending old field names to backend
- Lines 434-435: Using `programName` and `programCode`

#### 3. **plp-student-monitoring/src/pages/adminpages/Students.jsx** (4 references)
- Lines 219, 222, 266-268, 270: Filtering and sorting by old fields

#### 4. **plp-student-monitoring/src/context/LogContext.jsx** (1 reference)
- Line 124: Fallback to `college_department`

---

## PART B: SQL Query Refactoring Examples

### Old Pattern (Denormalized)
```sql
-- Problematic: Selecting directly from students
SELECT 
  s.student_id, 
  s.program_name, 
  s.college_department
FROM students s;
```

### New Pattern (Normalized with JOINs)
```sql
-- Correct: Use JOINs to get related data
SELECT 
  s.student_id, 
  p.program_name,
  p.program_code,
  d.dept_name AS college_department,
  d.dept_code,
  p.id AS program_id,
  p.department_id
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE s.status != 'Inactive';
```

### Example Refactored Queries

**Query 1: Get student info with program and department**
```sql
SELECT 
  s.student_id,
  s.first_name,
  s.last_name,
  s.year_level,
  p.program_name,
  p.program_code,
  d.dept_name,
  d.dept_code
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?;
```

**Query 2: Count students by department**
```sql
-- OLD (broken - college_department removed)
SELECT college_department, COUNT(*) AS total 
FROM students 
GROUP BY college_department;

-- NEW (correct)
SELECT 
  d.dept_name,
  d.dept_code,
  d.id,
  COUNT(*) AS total
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE s.status != 'Inactive'
GROUP BY d.id, d.dept_name, d.dept_code;
```

**Query 3: Get on-campus students with department**
```sql
-- OLD
SELECT latest.student_id, s.college_department
FROM entry_exit_logs latest
INNER JOIN students s ON latest.student_id = s.student_id
WHERE latest.log_id = (SELECT MAX(log_id) FROM entry_exit_logs WHERE student_id = s.student_id);

-- NEW
SELECT 
  latest.student_id,
  d.dept_name AS department,
  d.dept_code
FROM entry_exit_logs latest
INNER JOIN students s ON latest.student_id = s.student_id
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE latest.log_id = (SELECT MAX(log_id) FROM entry_exit_logs WHERE student_id = s.student_id)
  AND latest.action = 'ENTRY';
```

**Query 4: Update students based on program**
```sql
-- OLD
UPDATE students 
SET status = 'Inactive' 
WHERE college_department = ?;

-- NEW - Update by department via programs relationship
UPDATE students s
INNER JOIN programs p ON s.program_id = p.id
SET s.status = 'Inactive'
WHERE p.department_id = ?;
```

---

## PART C: Update INSERT and UPDATE Logic

### Form Changes: SendingProgram_ID Instead of Program_Name

**Old Form Data (RegisterStudent.jsx - Line 428)**
```javascript
// OLD - Sending old field names
const formData = {
  college_department: college,   // String value - NO LONGER EXISTS
  program_name: program,         // String value - NO LONGER EXISTS
  year_level: yearLevel
};
```

**New Form Data**
```javascript
// NEW - Send program_id (numeric)
const formData = {
  program_id: program,           // Should be the ID from dropdown
  year_level: yearLevel
  // Department is implicit via program_id → programs.department_id
};
```

### Backend Changes: Registration Route (registration.js)

**Old INSERT (Lines 151-161)**
```javascript
// OLD - Trying to insert removed columns
INSERT INTO students (
  email, first_name, last_name, middle_name, extension_name,
  college_department, program_name, year_level, status
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**New INSERT**
```javascript
// NEW - Use program_id instead
INSERT INTO students (
  email, first_name, last_name, middle_name, extension_name,
  program_id, year_level, status
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

**Old UPDATE (Line 364)**
```javascript
// OLD
UPDATE students
SET first_name = ?, last_name = ?, middle_name = ?, extension_name = ?, 
    college_department = ?, program_name = ?,
    year_level = ?
WHERE student_id = ?
```

**New UPDATE**
```javascript
// NEW
UPDATE students
SET first_name = ?, last_name = ?, middle_name = ?, extension_name = ?,
    program_id = ?,
    year_level = ?
WHERE student_id = ?
```

### Dropdown Changes: Display Data from Joined Tables

**Old Dropdown (RegisterStudent.jsx - Lines 626-627)**
```jsx
{programs.map((prog, index) => (
  <option key={index} value={prog.programName || prog.name || prog}>
    {prog.programName || prog.name || prog} {prog.programCode ? `(${prog.programCode})` : ''}
  </option>
))}
```

**New Dropdown - Value is ID, Display uses snake_case**
```jsx
{programs.map((prog) => (
  <option key={prog.id} value={prog.id}>
    {prog.program_name} ({prog.program_code})
  </option>
))}
```

**Backend: Program Retrieval with Department Info (programs.js)**
```javascript
// OLD - Was returning camelCase
SELECT id, programName, programCode FROM programs;

// NEW - Return with proper fields and JOIN to departments
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
ORDER BY d.dept_name, p.program_name;
```

---

## PART D: Complete Code Changes by File

### Backend Changes

#### 1. backend/routes/registration.js
**Insert new student**
```javascript
// Line ~152: Change from college_department, program_name to program_id
INSERT INTO students (
  email, first_name, last_name, middle_name, extension_name,
  program_id, year_level, status, is_archived
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
// Values: [email, firstName, lastName, middleName, extensionName, programId, yearLevel, 'Regular', 0]
```

**Update existing student**
```javascript
// Line ~364: Change UPDATE clause
UPDATE students
SET first_name = ?, 
    last_name = ?, 
    middle_name = ?, 
    extension_name = ?,
    program_id = ?,
    year_level = ?
WHERE student_id = ?
// Values: [firstName, lastName, middleName, extensionName, programId, yearLevel, studentId]
```

**Get student (retrieve with department info)**
```javascript
// When fetching student to display: Use JOIN
SELECT 
  s.student_id, s.email, s.first_name, s.last_name, s.middle_name,
  s.program_id, s.year_level, s.status,
  p.program_name, p.program_code,
  d.dept_name, d.dept_code, d.id AS dept_id
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?
```

#### 2. backend/routes/analytics.js
**On-campus users (Line ~355)**
```javascript
// OLD
SELECT latest.student_id, s.college_department
FROM (
  SELECT student_id, MAX(log_id) as max_id 
  FROM entry_exit_logs 
  WHERE action = 'ENTRY' 
  GROUP BY student_id
) latest
JOIN entry_exit_logs e ON latest.max_id = e.log_id
JOIN students s ON latest.student_id = s.student_id;

// NEW
SELECT 
  latest.student_id,
  d.dept_name AS college_department,
  d.dept_code
FROM (
  SELECT student_id, MAX(log_id) as max_id 
  FROM entry_exit_logs 
  WHERE action = 'ENTRY' 
  GROUP BY student_id
) latest
INNER JOIN entry_exit_logs e ON latest.max_id = e.log_id
INNER JOIN students s ON latest.student_id = s.student_id
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id;
```

**Group by department (Line ~375)**
```javascript
// OLD
SELECT college_department, COUNT(*) AS total FROM students 
WHERE status != 'Inactive' 
GROUP BY college_department

// NEW
SELECT 
  d.dept_name AS college_department,
  COUNT(*) AS total
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE s.status != 'Inactive'
GROUP BY d.id, d.dept_name
ORDER BY d.dept_name;
```

#### 3. backend/routes/recognize.js
**Get student info (Line ~129)**
```javascript
// OLD
SELECT first_name, last_name, college_department FROM students WHERE student_id = ?

// NEW
SELECT 
  s.first_name, 
  s.last_name,
  d.dept_name AS college_department,
  p.program_name
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?
```

#### 4. backend/routes/qrScan.js
**Get student for QR response (Line ~137)**
```javascript
// OLD
const collegeDept = student.college_department || "Not Specified";
const course = student.program_name || "Not Specified";

// NEW - Need to fetch with JOINs
SELECT 
  s.student_id, s.first_name, s.last_name,
  p.program_name, p.program_code,
  d.dept_name, d.dept_code
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?

// Then in response:
const collegeDept = student.dept_name || "Not Specified";
const course = student.program_name || "Not Specified";
```

#### 5. backend/routes/programs.js
**Check department usage (Line ~155)**
```javascript
// OLD
SELECT COUNT(*) as count FROM students WHERE college_department = ? AND status != "Inactive"

// NEW
SELECT COUNT(*) as count FROM students s
INNER JOIN programs p ON s.program_id = p.id
WHERE p.department_id = ? AND s.status != "Inactive"
```

**Update department status (Line ~213)**
```javascript
// OLD
UPDATE students SET status = "Inactive" WHERE college_department = ? AND status != "Inactive"

// NEW
UPDATE students s
INNER JOIN programs p ON s.program_id = p.id
SET s.status = "Inactive"
WHERE p.department_id = ? AND s.status != "Inactive"
```

**Get program info (Line ~238)**
```javascript
// OLD
SELECT programName FROM programs WHERE id = ?

// NEW
SELECT program_name FROM programs WHERE id = ?
```

### Frontend Changes

#### 1. plp-student-monitoring/src/components/RegisterStudent.jsx

**Form submission (Line ~428)**
```javascript
// OLD
const formData = {
  college_department: college,
  program_name: program
};

// NEW
const formData = {
  program_id: parseInt(program),  // program should be the ID from dropdown
  // Department comes implicitly via program_id
};
```

**Program dropdown (Lines 626-627)**
```javascript
// OLD
<option value={prog.programName}>{prog.programName} ({prog.programCode})</option>

// NEW
<option value={prog.id}>{prog.program_name} ({prog.program_code})</option>
```

#### 2. plp-student-monitoring/src/components/EditStudent.jsx

**State initialization (Lines 72-73)**
```javascript
// OLD
const [college, setCollege] = useState(student.college_department || "");
const [program, setProgram] = useState(student.program_name || "");

// NEW - program should now be the ID
const [college, setCollege] = useState(student.dept_name || "");
const [program, setProgram] = useState(student.program_id || "");
```

**Program validation (Line 143)**
```javascript
// OLD
if (program && !filtered.some(p => p.programName === program)) {

// NEW
if (program && !filtered.some(p => p.id === parseInt(program))) {
```

**Form submission (Lines 179-180)**
```javascript
// OLD
college_department: college,
program_name: program,

// NEW
program_id: parseInt(program),  // college is derived via JOIN
```

**Dropdown options (Lines 434-435)**
```javascript
// OLD
<option value={prog.programName}>{prog.programName} ({prog.programCode})</option>

// NEW
<option value={prog.id}>{prog.program_name} ({prog.program_code})</option>
```

#### 3. plp-student-monitoring/src/pages/adminpages/Students.jsx

**Filtering by department (Lines 219, 266-268)**
```javascript
// OLD
const matchDept = !filterDept || s.college_department === filterDept;

// NEW - Filter via department from joined data
const matchDept = !filterDept || s.dept_name === filterDept;
```

**Sorting by department (Lines 266-268)**
```javascript
// OLD
case "college_department":
  aVal = a.college_department?.toLowerCase() || "";
  bVal = b.college_department?.toLowerCase() || "";
  break;

// NEW
case "college_department":
  aVal = a.dept_name?.toLowerCase() || "";
  bVal = b.dept_name?.toLowerCase() || "";
  break;
```

**Filtering by program (Line 222, 270)**
```javascript
// OLD
const matchProg = !filterProgram || s.program_name === filterProgram;

// NEW
const matchProg = !filterProgram || s.program_name === filterProgram;
// (This works the same if fetching with JOINs)
```

#### 4. plp-student-monitoring/src/context/LogContext.jsx

**Fallback department value (Line 124)**
```javascript
// OLD
collegeDept: logData.collegeDept || logData.department || logData.college_department || "Not Specified",

// NEW
collegeDept: logData.collegeDept || logData.department || logData.dept_name || "Not Specified",
```

---

## Summary of Changes

| Aspect | Old | New |
|--------|-----|-----|
| **Table Structure** | `students.program_name`, `students.college_department` | `students.program_id` (FK) |
| **Queries** | Direct column select | JOIN across 3 tables |
| **Column Names** | `programName`, `programCode` | `program_name`, `program_code` |
| **Form Data** | Send program name (string) | Send program_id (number) |
| **Dropdown Value** | Program name string | Program ID (numeric) |
| **Response Data** | Include `program_name`, `college_department` | Include from JOINs as needed |

---

## Verification Checklist

- [ ] All `college_department` references replaced with JOIN to departments
- [ ] All `program_name` direct references use `program_id` with JOIN
- [ ] All `programName` and `programCode` changed to `program_name`, `program_code`
- [ ] Form submissions use `program_id` instead of `program_name`
- [ ] Dropdowns show program with ID as value
- [ ] INSERT queries only reference existing columns
- [ ] UPDATE queries no longer reference deleted columns
- [ ] Student list retrieves data with JOINs
- [ ] Filters work with new column names
- [ ] Frontend state manages program_id correctly
