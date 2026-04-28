# Step-by-Step Implementation Checklist

Use this checklist to implement the refactoring in the correct order.

---

## PHASE 1: Backend Core Changes (Priority: CRITICAL)
These must be done first to prevent database errors.

### 1.1 Update All Student Fetch Queries ✓

**Files to modify:**
- [ ] `backend/routes/registration.js` - Lines 281+ (fetch student for display)
- [ ] `backend/routes/analytics.js` - All SELECT queries fetching students
- [ ] `backend/routes/recognize.js` - Line 129
- [ ] `backend/routes/qrScan.js` - Any student SELECT

**Action:** Replace all queries that select `program_name, college_department` with JOINs

```sql
-- Template
SELECT s.*, p.program_name, p.program_code, d.dept_name, d.dept_code
FROM students s
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
```

### 1.2 Fix INSERT Statements ✓

**Files to modify:**
- [ ] `backend/routes/registration.js` - Lines 151-161 (insert new student)

**Action:** Change INSERT to use `program_id` instead of `program_name` and `college_department`

```sql
-- Template
INSERT INTO students (email, first_name, ..., program_id, year_level, ...)
VALUES (?, ?, ?, ?, ...)
```

### 1.3 Fix UPDATE Statements ✓

**Files to modify:**
- [ ] `backend/routes/registration.js` - Lines 364+ (update student)

**Action:** Remove `college_department` and `program_name` from UPDATE, add `program_id`

```sql
-- Template
UPDATE students 
SET first_name = ?, ..., program_id = ?, year_level = ?
WHERE student_id = ?
```

### 1.4 Fix Queries Using college_department in WHERE Clause ✓

**Files to modify:**
- [ ] `backend/routes/analytics.js` - Line 548 (GROUP BY college_department)
- [ ] `backend/routes/programs.js` - Lines 155, 213 (COUNT/UPDATE with college_department)

**Action:** Use JOINs to filter by department via programs table

```sql
-- Template
SELECT ...
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
WHERE p.department_id = ?
```

### 1.5 Fix programName/programCode References ✓

**Files to modify:**
- [ ] `backend/routes/programs.js` - Line 238 (SELECT programName)

**Action:** Change to snake_case `program_name`, `program_code`

---

## PHASE 2: Program Data Endpoint (Priority: HIGH)

This ensures frontend gets correct data format.

### 2.1 Update Program Fetching Endpoint ✓

**Files to modify:**
- [ ] `backend/routes/programs.js` - Add/modify GET endpoint for programs list

**Action:** Ensure programs are returned with snake_case fields and department info

```javascript
// Should return:
{
  id: 18,
  program_code: "BSIT",
  program_name: "Bachelor of Science in Information Technology",
  program_type: "Undergraduate",
  program_status: "Active",
  department_id: 2,
  dept_code: "CCS",
  dept_name: "College of Computer Studies"
}
```

---

## PHASE 3: Frontend Component Updates (Priority: HIGH)

### 3.1 Fix RegisterStudent Component ✓

**File:**
- [ ] `plp-student-monitoring/src/components/RegisterStudent.jsx`

**Changes:**
1. Line 428: Change form data to send `program_id` (number) instead of `program_name`, `college_department`
2. Lines 626-627: Update dropdown to use `prog.id` as value and display `prog.program_name`, `prog.program_code`

### 3.2 Fix EditStudent Component ✓

**File:**
- [ ] `plp-student-monitoring/src/components/EditStudent.jsx`

**Changes:**
1. Line 72-73: Initialize program state with `student.program_id` (number), college with `student.dept_name`
2. Line 143: Update validation to check `p.id === parseInt(program)`
3. Lines 179-180: Update form data to send `program_id`
4. Lines 434-435: Update dropdown to use `prog.id` as value

### 3.3 Fix Students Page ✓

**File:**
- [ ] `plp-student-monitoring/src/pages/adminpages/Students.jsx`

**Changes:**
1. Line 219: Change filter to use `s.dept_name` instead of `s.college_department`
2. Lines 266-268: Change sort case to use `a.dept_name`, `b.dept_name`
3. Ensure backend returns students with joined data (dept_name, program_name, etc.)

### 3.4 Fix LogContext ✓

**File:**
- [ ] `plp-student-monitoring/src/context/LogContext.jsx`

**Changes:**
1. Line 124: Change fallback to `logData.dept_name`

---

## PHASE 4: Additional Queries in Analytics (Priority: MEDIUM)

### 4.1 Update On-Campus Reports ✓

**File:**
- [ ] `backend/routes/analytics.js` - Lines 355+

**Changes:**
- Add JOINs when calculating on-campus users
- Ensure department info comes from departments table

### 4.2 Update Department Statistics ✓

**File:**
- [ ] `backend/routes/analytics.js` - Lines 375+

**Changes:**
- Update GROUP BY queries to use departments table
- Add department code to responses

### 4.3 Update Report Generation ✓

**File:**
- [ ] `backend/routes/analytics.js` - Lines 533+

**Changes:**
- Use JOINs when fetching report data
- Map old field names to new ones in response (college_department ← dept_name)

---

## PHASE 5: Response Mapping (Priority: MEDIUM)

For backward compatibility, map new field names to old ones where frontend expects old names.

### 5.1 In Response Objects ✓

**Pattern:** When returning data to frontend that expects old field names

```javascript
// In backend routes
const response = {
  student_id: row.student_id,
  first_name: row.first_name,
  program_id: row.program_id,
  program_name: row.program_name,      // NEW: from programs table
  college_department: row.dept_name,   // MAP: dept_name → college_department
  dept_code: row.dept_code
};
```

### 5.2 Backward Compatibility (Optional) ✓

If you want to gradually migrate without changing all frontend code:

```javascript
// Keep sending old field name for compatibility
response.college_department = row.dept_name;  // Still send as college_department
response.program_name = row.program_name;     // Still send as program_name

// But also send IDs
response.program_id = row.program_id;
response.dept_id = row.dept_id;
```

---

## PHASE 6: Testing & Validation (Priority: HIGH)

### 6.1 Test Scenarios ✓

- [ ] Create new student → Check INSERT uses program_id
- [ ] Edit student → Check UPDATE changes program_id
- [ ] View student list → Check departments display correctly
- [ ] Register student with face recognition → Check program/department shown correctly
- [ ] QR scan student → Check all info displays correctly
- [ ] Analytics reports → Check department grouping works
- [ ] Import students → Check program_id assignment

### 6.2 Database Validation ✓

```sql
-- Verify no old columns exist in students
DESCRIBE students;  -- Should NOT show program_name, college_department

-- Verify foreign key constraints
SELECT * FROM information_schema.REFERENTIAL_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'eems' AND TABLE_NAME = 'students';

-- Check data integrity
SELECT 
  s.student_id,
  s.program_id,
  p.program_name,
  p.department_id,
  d.dept_name
FROM students s
INNER JOIN programs p ON s.program_id = p.id
INNER JOIN departments d ON p.department_id = d.id
LIMIT 10;
```

### 6.3 API Testing ✓

**Test endpoints:**
- [ ] GET /api/students/list → Returns with dept_name
- [ ] POST /api/students → Creates with program_id
- [ ] PUT /api/students/:id → Updates with program_id
- [ ] GET /api/programs → Returns with program_code (snake_case)
- [ ] GET /api/analytics/onCampusUsers → Groups by dept_name
- [ ] GET /api/analytics/byDepartment → Uses new structure

---

## IMPLEMENTATION ORDER SUMMARY

### Week 1: Foundation
1. **Day 1:** Complete PHASE 1 (Backend core changes)
   - Fix all INSERT/UPDATE queries
   - Fix all SELECT queries with JOINs
   - Test each endpoint individually

2. **Day 2:** Complete PHASE 2 (Program endpoint)
   - Verify programs endpoint returns snake_case
   - Test with frontend

### Week 2: Frontend Migration
3. **Day 3:** Complete PHASE 3 (Frontend components)
   - Update RegisterStudent
   - Update EditStudent
   - Update Students page
   - Test form submissions

4. **Day 4:** Complete PHASE 4 & 5 (Analytics & Response mapping)
   - Update analytics queries
   - Add response mapping for backward compatibility
   - Test all reports

### Week 3: Validation
5. **Day 5:** Complete PHASE 6 (Testing)
   - Run all test scenarios
   - Verify database integrity
   - API testing

---

## Common Issues & Solutions

### Issue 1: "Unknown column 'college_department' in WHERE clause"
**Solution:** Change WHERE clauses to use JOINs:
```sql
-- Before error occurs
-- Update analytics.js to use: WHERE p.department_id = ?
-- Instead of: WHERE college_department = ?
```

### Issue 2: "Foreign key constraint fails"
**Solution:** Ensure program_id exists before inserting:
```javascript
// Validate program_id exists before insert
const validateProgram = `SELECT id FROM programs WHERE id = ?`;
// Run this check before INSERT
```

### Issue 3: Dropdown shows wrong value
**Solution:** Ensure dropdown value is ID (number), not name:
```jsx
// RIGHT: value={prog.id}
// WRONG: value={prog.program_name}
```

### Issue 4: Form sends undefined program_id
**Solution:** Check registration.js state:
```javascript
// program state should be: program = "18" (string from select)
// Convert: parseInt(program) when sending to backend
```

### Issue 5: Old field names in backend response
**Solution:** Map to old field names for compatibility:
```javascript
response.college_department = row.dept_name;
response.program_name = row.program_name;
```

---

## Verification Checklist (Before Going to Production)

- [ ] All INSERT queries removed program_name, college_department columns
- [ ] All UPDATE queries removed program_name, college_department columns
- [ ] All SELECT queries use JOINs when needing department/program info
- [ ] Program dropdown uses program ID as value
- [ ] Form submissions send program_id (number)
- [ ] Student list displays department from joined data
- [ ] Analytics reports group by department correctly
- [ ] No error logs mentioning unknown columns
- [ ] Database queries pass validation
- [ ] Frontend components work with new data structure
- [ ] All 6 phases completed

---

## File Modification Checklist

### Backend Files
- [ ] `backend/routes/registration.js` - Modify INSERT, UPDATE, SELECT
- [ ] `backend/routes/analytics.js` - Update all queries with JOINs
- [ ] `backend/routes/recognize.js` - Update SELECT with JOINs
- [ ] `backend/routes/qrScan.js` - Update SELECT with JOINs
- [ ] `backend/routes/programs.js` - Update SELECT, change programName → program_name

### Frontend Files
- [ ] `plp-student-monitoring/src/components/RegisterStudent.jsx` - Update form/dropdown
- [ ] `plp-student-monitoring/src/components/EditStudent.jsx` - Update state/form/dropdown
- [ ] `plp-student-monitoring/src/pages/adminpages/Students.jsx` - Update filter/sort
- [ ] `plp-student-monitoring/src/context/LogContext.jsx` - Update fallback

**Total Files to Modify: 9**
