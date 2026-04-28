# Visual Reference: Before & After Comparison

A quick visual guide to understand all changes at a glance.

---

## Database Schema Evolution

### Old Schema (Denormalized)
```
┌─────────────────────────┐
│      students           │
├─────────────────────────┤
│ student_id (PK)         │
│ email                   │
│ first_name              │
│ last_name               │
│ program_name ❌ REMOVED │ ← Now uses program_id
│ college_department ❌   │ ← Derived from programs/departments
│ year_level              │
│ status                  │
└─────────────────────────┘
```

### New Schema (Normalized)
```
┌─────────────────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│      students               │      │     programs         │      │   departments       │
├─────────────────────────────┤      ├──────────────────────┤      ├─────────────────────┤
│ student_id (PK)             │      │ id (PK)              │      │ id (PK)             │
│ email                       │      │ department_id (FK)───┼──────→│ dept_code           │
│ first_name                  │      │ program_code ✓       │      │ dept_name           │
│ last_name                   │      │ program_name ✓       │      │ status              │
│ program_id (FK) ✓───────────┼──────→│ program_type         │      │ created_at          │
│ year_level                  │      │ program_status       │      │ updated_at          │
│ status                      │      │ duration             │      └─────────────────────┘
│ created_at                  │      └──────────────────────┘
│ updated_at                  │
└─────────────────────────────┘
```

**Relationships:**
- `students.program_id` → `programs.id`
- `programs.department_id` → `departments.id`

---

## Data Flow Comparison

### Old Flow (Direct Column Access)
```
Frontend Form                Backend Query              Database
    ↓                            ↓                         ↓
[program_name: "BSIT"]  →  INSERT students(program_name)  →  Students table
                            ✗ Now invalid!
```

### New Flow (Foreign Key)
```
Frontend Form                Backend Query                Database
    ↓                            ↓                           ↓
[program_id: 18]  →  INSERT students(program_id=18)  →  Students table
                        ↓
                    Lookup programs.id=18 ✓
```

---

## Query Evolution

### Simple Student Lookup

**Before: Direct Access**
```sql
SELECT student_id, program_name, college_department
FROM students
WHERE student_id = ?
```
❌ Fails: These columns don't exist anymore

**After: With JOINs**
```sql
SELECT s.student_id, p.program_name, d.dept_name
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE s.student_id = ?
```
✓ Works: Gets data from related tables

---

## Dropdown Data Comparison

### What Frontend Receives

**Before (Old Structure):**
```javascript
[
  { 
    id: 18,
    programName: "Bachelor of Science in Information Technology",  // ❌ camelCase
    programCode: "BSIT"                                            // ❌ camelCase
  },
  { 
    id: 19,
    programName: "Bachelor of Science in Computer Science",
    programCode: "BSCS"
  }
]
```

**After (New Structure):**
```javascript
[
  { 
    id: 18,
    program_name: "Bachelor of Science in Information Technology",  // ✓ snake_case
    program_code: "BSIT",                                           // ✓ snake_case
    program_type: "Undergraduate",
    program_status: "Active",
    department_id: 2,
    dept_code: "CCS",
    dept_name: "College of Computer Studies"
  },
  { 
    id: 19,
    program_name: "Bachelor of Science in Computer Science",
    program_code: "BSCS",
    program_type: "Undergraduate",
    program_status: "Active",
    department_id: 2,
    dept_code: "CCS",
    dept_name: "College of Computer Studies"
  }
]
```

### Dropdown Implementation

**Before:**
```jsx
<select>
  {programs.map(p => (
    <option value={p.programName}>
      {p.programName} ({p.programCode})  {/* ❌ Using name as value */}
    </option>
  ))}
</select>
```

**After:**
```jsx
<select>
  {programs.map(p => (
    <option value={p.id}>
      {p.program_name} ({p.program_code})  {/* ✓ Using ID as value */}
    </option>
  ))}
</select>
```

---

## Form Submission Comparison

### Register Student Form

**Before: Sending Strings**
```javascript
const formData = {
  email: "student@example.com",
  first_name: "John",
  last_name: "Doe",
  college_department: "College of Computer Studies",  // ❌ String value
  program_name: "Bachelor of Science in IT",          // ❌ String value
  year_level: 3
};

// Backend receives string, tries to INSERT into college_department column
// ❌ FAILS: Column doesn't exist!
```

**After: Sending IDs**
```javascript
const formData = {
  email: "student@example.com",
  first_name: "John",
  last_name: "Doe",
  program_id: 18,  // ✓ Numeric ID
  year_level: 3
  // college_department derived automatically via program_id → programs.department_id
};

// Backend receives ID, INSERTs into program_id column
// ✓ SUCCESS: Foreign key validates it exists in programs table
```

---

## Backend Response Mapping

### What Student Object Looks Like

**Before: From Database**
```javascript
{
  student_id: "23-00298",
  email: "bitancor@example.com",
  first_name: "JERIMIAH",
  last_name: "BITANCOR",
  program_name: "Bachelor of Science in Computer Science",  // ❌ Direct column
  college_department: "College of Computer Studies",        // ❌ Direct column
  year_level: 3,
  status: "Regular"
}
```
❌ Causes errors when trying to fetch (column doesn't exist)

**After: From Database with JOINs**
```javascript
{
  student_id: "23-00298",
  email: "bitancor@example.com",
  first_name: "JERIMIAH",
  last_name: "BITANCOR",
  program_id: 19,                                           // ✓ Foreign key ID
  program_name: "Bachelor of Science in Computer Science", // ✓ From programs table
  program_code: "BSCS",                                     // ✓ From programs table
  college_department: "College of Computer Studies",       // ✓ Mapped from dept_name
  dept_name: "College of Computer Studies",                // ✓ From departments table
  dept_code: "CCS",                                         // ✓ From departments table
  year_level: 3,
  status: "Regular"
}
```
✓ All data accessible via JOINs

---

## Analytics Report Comparison

### On-Campus Users by Department

**Before: GROUP BY Direct Column**
```sql
SELECT college_department, COUNT(*) as count
FROM students
GROUP BY college_department
```
❌ FAILS: Column doesn't exist

**After: GROUP BY via JOINs**
```sql
SELECT d.dept_name as college_department, COUNT(*) as count
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
GROUP BY d.id
```
✓ Works: Gets department name from departments table

**Result:**
```javascript
Before: ❌ Error
After:  ✓ [
  { college_department: "College of Computer Studies", count: 5 },
  { college_department: "College of Engineering", count: 3 },
  { college_department: "College of Nursing", count: 2 }
]
```

---

## INSERT/UPDATE Statement Changes

### INSERT Student

**Before:**
```sql
INSERT INTO students 
(email, first_name, last_name, college_department, program_name, year_level)
VALUES (?, ?, ?, ?, ?, ?)
❌ ERROR: Unknown column 'college_department'
```

**After:**
```sql
INSERT INTO students 
(email, first_name, last_name, program_id, year_level)
VALUES (?, ?, ?, ?, ?)
✓ SUCCESS: program_id links to programs table
```

### UPDATE Student

**Before:**
```sql
UPDATE students 
SET college_department = ?, program_name = ?, year_level = ?
WHERE student_id = ?
❌ ERROR: Unknown column
```

**After:**
```sql
UPDATE students 
SET program_id = ?, year_level = ?
WHERE student_id = ?
✓ SUCCESS: Only existing columns updated
```

---

## Frontend State Management Comparison

### RegisterStudent Component

**Before: String-based Program**
```javascript
const [program, setProgram] = useState("");

// When form submitted
const data = {
  program_name: program  // ❌ "Bachelor of Science in IT"
};
```

**After: ID-based Program**
```javascript
const [program, setProgram] = useState("");

// When form submitted
const data = {
  program_id: parseInt(program)  // ✓ 18 (from select value)
};
```

### EditStudent Component

**Before:**
```javascript
const [program, setProgram] = useState(student.program_name || "");
// program = "Bachelor of Science in IT"

// Validation check
if (program && !filtered.some(p => p.programName === program)) {  // ❌ Comparing strings
}
```

**After:**
```javascript
const [program, setProgram] = useState(student.program_id || "");
// program = "18"

// Validation check  
if (program && !filtered.some(p => p.id === parseInt(program))) {  // ✓ Comparing IDs
}
```

---

## Column Naming Convention

### Naming Changes Across the System

| Item | Before | After | Type |
|------|--------|-------|------|
| Programs table field | `programName` | `program_name` | Column rename |
| Programs table field | `programCode` | `program_code` | Column rename |
| Students table field | `college_department` | ❌ Removed | Column removed |
| Students table field | `program_name` | ❌ Removed | Column removed |
| Students table new field | - | `program_id` | Column added |
| Backend response | (old fields) | (new fields + mapped old) | Data structure |
| Frontend dropdown option value | Program name (string) | Program ID (number) | Dropdown value |

---

## Data Integrity Comparison

### Sample Student Record

**Before (If you tried to query now):**
```
student_id: 23-00298
first_name: JERIMIAH
last_name: BITANCOR
program_name: NULL  ❌ Column doesn't exist
college_department: NULL  ❌ Column doesn't exist
year_level: 3
```

**After (Actual data):**
```
student_id: 23-00298
first_name: JERIMIAH
last_name: BITANCOR
program_id: 19  ✓ Valid foreign key to programs table
year_level: 3

// When JOINed:
→ programs[19]: {
    id: 19,
    program_name: "Bachelor of Science in Computer Science",
    program_code: "BSCS",
    department_id: 2
  }

// When further JOINed:
→ departments[2]: {
    id: 2,
    dept_name: "College of Computer Studies",
    dept_code: "CCS"
  }
```

---

## Error Prevention Map

### Common Errors Before Fix

| Error | Root Cause | After Fix |
|-------|-----------|-----------|
| "Unknown column 'college_department'" | Querying removed column | Use JOIN to departments |
| "Unknown column 'program_name' in WHERE" | Filtering on removed column | Use JOIN to programs |
| Student shows "null" for department | Column doesn't exist | Fetch via JOIN |
| Dropdown shows nothing | Receiving old camelCase fields | API returns snake_case |
| Form submission fails | Sending string instead of ID | Send numeric program_id |
| Analytics breaks | GROUP BY removed column | GROUP BY joined table |

---

## Migration Path Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  OLD SYSTEM (BREAKING)                      │
│  students(program_name, college_department)                │
│                           ↓                                  │
│                  MIGRATION PERIOD                           │
│  Fix queries → Update forms → Change responses             │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NEW SYSTEM (WORKING)                              │   │
│  │  students(program_id) → programs(department_id)    │   │
│  │  Normalized, scalable, maintainable ✓             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Table

### For Each Source File

| File | Change Type | From | To | Complexity |
|------|-------------|------|----|----|
| registration.js | INSERT | program_name, college_department | program_id | Low |
| registration.js | UPDATE | Same | Same | Low |
| registration.js | SELECT | Direct columns | JOINs | Medium |
| analytics.js | SELECT | Group by college_department | Group by dept_name | Medium |
| analytics.js | SELECT | Select college_department | Select via JOIN | Medium |
| recognize.js | SELECT | Direct columns | JOINs | Low |
| qrScan.js | SELECT | Direct columns | JOINs | Low |
| programs.js | SELECT | programName | program_name | Low |
| RegisterStudent.jsx | Form | Send program_name | Send program_id | Low |
| RegisterStudent.jsx | Dropdown | Value=name, display=name | Value=id, display=name | Low |
| EditStudent.jsx | State | program_name string | program_id number | Medium |
| EditStudent.jsx | Form | Send program_name | Send program_id | Low |
| EditStudent.jsx | Dropdown | Value=name | Value=id | Low |
| Students.jsx | Filter | college_department | dept_name | Low |
| Students.jsx | Sort | college_department | dept_name | Low |
| LogContext.jsx | Fallback | college_department | dept_name | Low |

**Complexity Legend:**
- Low: Simple find & replace (1-2 minutes)
- Medium: Requires logic understanding (5-10 minutes)
- High: Complex refactoring (15+ minutes)

---

## Testing Verification Map

```
Input Test                  Expected Outcome          Pass/Fail
─────────────────────────────────────────────────────────────
Create student              INSERT succeeds            □
  ↓ send program_id         student.program_id set     □
  
Edit student                UPDATE succeeds            □
  ↓ send program_id         student.program_id updated □

View student list           Returns dept_name          □
  ↓ fetch with JOINs        Not college_department     □

Filter by department        Matches correctly          □
  ↓ filter by dept_name     Using new column names     □

Register with face          Shows dept & program       □
  ↓ fetch with JOINs        All info available         □

Analytics report            Groups by dept             □
  ↓ GROUP BY via JOIN       No "unknown column" errors □

QR scan                     Shows all info             □
  ↓ fetch with JOINs        program, dept, year level  □

Import students             Assigns program_id         □
  ↓ INSERT with ID          References valid programs  □
```
