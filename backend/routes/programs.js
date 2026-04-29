// program.js
const express = require('express');
const pool = require("../src/db"); 
const router = express.Router();

// Helper function to get Philippine Time
const getPHDate = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString().split('T')[0];
};

const getPHDateTime = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString().slice(0, 19).replace('T', ' ');
};

// ============ DEPARTMENT ROUTES ============

// Get all departments (with optional search and status filter)
router.get('/departments', async (req, res) => {
    try {
        const { search, status } = req.query;
        
        let query = 'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE 1=1';
        let params = [];
        
        if (search) {
            query += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (status && status !== 'All') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY dept_name ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get single department by ID
router.get('/departments/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new department
router.post('/departments', async (req, res) => {
    try {
        const { dept_code, dept_name, status } = req.body;
        const created_at = getPHDateTime();
        const updated_at = getPHDateTime();
        
        if (!dept_code || !dept_name) {
            return res.status(400).json({ error: 'Department code and name are required' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO departments (dept_code, dept_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [dept_code.toUpperCase(), dept_name, status || 'Active', created_at, updated_at]
        );
        
        const [newDepartment] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [result.insertId]
        );
        
        res.status(201).json(newDepartment[0]);
    } catch (error) {
        console.error('Error adding department:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Department code or name already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Update department
router.put('/departments/:id', async (req, res) => {
    try {
        const { dept_code, dept_name, status } = req.body;
        const updated_at = getPHDateTime();
        
        if (!dept_code || !dept_name) {
            return res.status(400).json({ error: 'Department code and name are required' });
        }
        
        const [result] = await pool.query(
            'UPDATE departments SET dept_code = ?, dept_name = ?, status = ?, updated_at = ? WHERE id = ?',
            [dept_code.toUpperCase(), dept_name, status, updated_at, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const [updatedDepartment] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [req.params.id]
        );
        
        res.json(updatedDepartment[0]);
    } catch (error) {
        console.error('Error updating department:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Department code or name already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ FIXED: Get affected counts before archiving department ============
router.get('/departments/:id/archive-impact', async (req, res) => {
    try {
        console.log('📊 Archive impact check for department ID:', req.params.id);
        
        const [dept] = await pool.query(
            'SELECT dept_name FROM departments WHERE id = ?',
            [req.params.id]
        );
        
        if (dept.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const deptName = dept[0].dept_name;
        console.log('📊 Department name:', deptName);
        
        const [programsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM programs WHERE department_id = ? AND program_status = "Active"',
            [req.params.id]
        );
        
        const [studentsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM students s INNER JOIN programs p ON s.program_id = p.id WHERE p.department_id = ? AND s.status != "Inactive"',
            [req.params.id]
        );
        
        console.log('📊 Programs count:', programsCount[0].count);
        console.log('📊 Students count:', studentsCount[0].count);
        
        res.json({
            programsCount: programsCount[0].count || 0,
            studentsCount: studentsCount[0].count || 0
        });
    } catch (error) {
        console.error('Error fetching archive impact:', error);
        res.status(500).json({ 
            programsCount: 0, 
            studentsCount: 0, 
            error: error.message 
        });
    }
});

// Archive department (cascades to programs and students)
router.patch('/departments/:id/archive', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const updated_at = getPHDateTime();
        
        const [dept] = await connection.query(
            'SELECT dept_name FROM departments WHERE id = ?',
            [req.params.id]
        );
        
        if (dept.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const deptName = dept[0].dept_name;
        
        const [deptResult] = await connection.query(
            'UPDATE departments SET status = "Inactive", updated_at = ? WHERE id = ?',
            [updated_at, req.params.id]
        );
        
        if (deptResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const [programsResult] = await connection.query(
            'UPDATE programs SET program_status = "Inactive" WHERE department_id = ? AND program_status = "Active"',
            [req.params.id]
        );
        
        const [studentsResult] = await connection.query(
            'UPDATE students s INNER JOIN programs p ON s.program_id = p.id SET s.status = "Inactive" WHERE p.department_id = ? AND s.status != "Inactive"',
            [req.params.id]
        );
        
        await connection.commit();
        
        res.json({ 
            message: 'Department and all associated programs/students archived successfully',
            affectedPrograms: programsResult.affectedRows,
            affectedStudents: studentsResult.affectedRows
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving department with cascade:', error);
        res.status(500).json({ error: 'Database error during cascading archive' });
    } finally {
        connection.release();
    }
});

// Get affected counts before archiving program
router.get('/programs/:id/archive-impact', async (req, res) => {
    try {
        const [program] = await pool.query(
            'SELECT program_name FROM programs WHERE id = ?',
            [req.params.id]
        );
        
        if (program.length === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const programName = program[0].program_name;
        
        const [studentsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE program_id = ? AND status != "Inactive"',
            [req.params.id]
        );
        
        res.json({
            studentsCount: studentsCount[0].count || 0
        });
    } catch (error) {
        console.error('Error fetching archive impact:', error);
        res.json({
            studentsCount: 0
        });
    }
});

// Get total departments count
router.get('/departments/total/count', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as total FROM departments');
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching departments count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get total programs count
router.get('/programs/total/count', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as total FROM programs');
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching programs count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Restore department
router.patch('/departments/:id/restore', async (req, res) => {
    try {
        const updated_at = getPHDateTime();
        
        const [result] = await pool.query(
            'UPDATE departments SET status = "Active", updated_at = ? WHERE id = ?',
            [updated_at, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json({ message: 'Department restored successfully' });
    } catch (error) {
        console.error('Error restoring department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete department permanently
router.delete('/departments/:id', async (req, res) => {
    try {
        const [programs] = await pool.query(
            `SELECT COUNT(*) as count FROM programs WHERE department_id = ?`,
            [req.params.id]
        );
        
        if (programs[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete department with existing programs. Archive or reassign programs first.' 
            });
        }
        
        const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get active departments only
router.get('/departments/active', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, dept_code, dept_name FROM departments WHERE status = "Active" ORDER BY dept_name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching active departments:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get active programs only
router.get('/programs/active', async (req, res) => {
    try {
        const { department } = req.query;
        
        let query = `
            SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name
            FROM programs p
            JOIN departments d ON p.department_id = d.id
            WHERE d.status = "Active" AND p.program_status = "Active"
        `;
        let params = [];
        
        if (department) {
            query += ' AND d.id = ?';
            params.push(department);
        }
        
        query += ' ORDER BY p.program_name ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching active programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ PROGRAM ROUTES ============

// Get all programs
router.get('/programs', async (req, res) => {
    try {
        const { search, department, program_type, program_status } = req.query;
        
        let query = 'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE 1=1';
        let params = [];
        
        if (search) {
            query += ' AND (p.program_code LIKE ? OR p.program_name LIKE ? OR d.dept_name LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (department) {
            query += ' AND p.department_id = ?';
            params.push(department);
        }
        
        if (program_type && program_type !== 'All') {
            query += ' AND p.program_type = ?';
            params.push(program_type);
        }
        
        if (program_status && program_status !== 'All') {
            query += ' AND p.program_status = ?';
            params.push(program_status);
        }
        
        query += ' ORDER BY p.id DESC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get archived programs
router.get('/programs/archived', async (req, res) => {
    try {
        const { search, department, program_type } = req.query;
        
        let query = 'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.program_status = "Inactive"';
        let params = [];
        
        if (search) {
            query += ' AND (p.program_code LIKE ? OR p.program_name LIKE ? OR d.dept_name LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (department && department !== 'All') {
            query += ' AND p.department_id = ?';
            params.push(department);
        }
        
        if (program_type && program_type !== 'All') {
            query += ' AND p.program_type = ?';
            params.push(program_type);
        }
        
        query += ' ORDER BY p.id DESC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching archived programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get single program by ID
router.get('/programs/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new program
router.post('/programs', async (req, res) => {
    try {
        const { program_code, program_name, department_id, program_type, program_status, duration } = req.body;
        const dateCreated = getPHDate();
        
        const [result] = await pool.query(
            'INSERT INTO programs (program_code, program_name, department_id, program_type, program_status, duration, date_created) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [program_code, program_name, department_id, program_type, program_status, duration, dateCreated]
        );
        
        const [newProgram] = await pool.query(
            'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?',
            [result.insertId]
        );
        res.status(201).json(newProgram[0]);
    } catch (error) {
        console.error('Error adding program:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Program code already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Update program
router.put('/programs/:id', async (req, res) => {
    try {
        const { program_code, program_name, department_id, program_type, program_status, duration } = req.body;
        
        const [result] = await pool.query(
            `UPDATE programs SET 
             program_code = ?, 
             program_name = ?, 
             department_id = ?, 
             program_type = ?, 
             program_status = ?,
             duration = ?
             WHERE id = ?`,
            [program_code, program_name, department_id, program_type, program_status, duration, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [updatedProgram] = await pool.query(
            'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?',
            [req.params.id]
        );
        res.json(updatedProgram[0]);
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Partial update program
router.patch('/programs/:id', async (req, res) => {
    try {
        const { program_status } = req.body;
        
        if (!program_status) {
            return res.status(400).json({ error: 'program_status is required' });
        }
        
        const [result] = await pool.query(
            'UPDATE programs SET program_status = ? WHERE id = ?',
            [program_status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [updatedProgram] = await pool.query(
            'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?',
            [req.params.id]
        );
        res.json(updatedProgram[0]);
    } catch (error) {
        console.error('Error updating program status:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Archive program with cascade to students
router.patch('/programs/:id/archive', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const [program] = await connection.query(
            'SELECT program_name, id FROM programs WHERE id = ?',
            [req.params.id]
        );
        
        if (program.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const programId = program[0].id;
        
        const [progResult] = await connection.query(
            'UPDATE programs SET program_status = "Inactive" WHERE id = ?',
            [programId]
        );
        
        const [studentsResult] = await connection.query(
            'UPDATE students SET status = "Inactive" WHERE program_id = ? AND status != "Inactive"',
            [programId]
        );
        
        await connection.commit();
        
        res.json({ 
            message: 'Program and all associated students archived successfully',
            affectedStudents: studentsResult.affectedRows
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving program with cascade:', error);
        res.status(500).json({ error: 'Database error during cascading archive' });
    } finally {
        connection.release();
    }
});

// Restore program
router.patch('/programs/:id/restore', async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE programs SET program_status = "Active" WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [restoredProgram] = await pool.query(
            'SELECT p.id, p.program_code, p.program_name, p.department_id, p.program_type, p.program_status, p.duration, p.date_created, d.dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id WHERE p.id = ?',
            [req.params.id]
        );
        
        res.json(restoredProgram[0]);
    } catch (error) {
        console.error('Error restoring program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get count of ACTIVE departments only
router.get('/departments/active/count', async (req, res) => {
    try {
        const [result] = await pool.query(
            'SELECT COUNT(*) as total FROM departments WHERE status = "Active"'
        );
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching active departments count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get count of ACTIVE programs only
router.get('/programs/active/count', async (req, res) => {
    try {
        const [result] = await pool.query(
            'SELECT COUNT(*) as total FROM programs WHERE program_status = "Active"'
        );
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching active programs count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;