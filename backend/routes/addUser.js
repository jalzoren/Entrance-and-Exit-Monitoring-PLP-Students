const express = require('express');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

// ============== ARCHIVE ROUTES (put FIRST to avoid route conflicts) ==============

// BULK ARCHIVE users
router.put('/users/archive/bulk', async (req, res) => {
    try {
        const { emails } = req.body;
        
        console.log('Bulk archive request:', emails);
        
        if (!emails || !emails.length) {
            return res.status(400).json({ error: 'No users selected' });
        }
        
        const placeholders = emails.map(() => '?').join(',');
        const [result] = await pool.query(
            `UPDATE admins SET status = 'archived', archived_at = NOW() 
             WHERE email IN (${placeholders})`,
            emails
        );
        
        res.json({ 
            message: `${result.affectedRows} user(s) archived successfully`,
            count: result.affectedRows
        });
        
    } catch (err) {
        console.error('Error bulk archiving users:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// GET archived users
router.get('/users/archived/all', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT email, fullname, role, created, archived_at FROM admins WHERE status = "archived" ORDER BY archived_at DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching archived users:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ARCHIVE single user
router.put('/users/archive/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.query(
            'UPDATE admins SET status = "archived", archived_at = NOW() WHERE email = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User archived successfully' });
        
    } catch (err) {
        console.error('Error archiving user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// RESTORE user from archive
router.put('/users/restore/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.query(
            'UPDATE admins SET status = "active", archived_at = NULL WHERE email = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User restored successfully' });
        
    } catch (err) {
        console.error('Error restoring user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============== REGULAR CRUD ROUTES ==============

// GET all active users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT email, fullname, role, created FROM admins WHERE status = "active" OR status IS NULL ORDER BY created DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET single user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.query(
            'SELECT email, fullname, role, created FROM admins WHERE email = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST create new user
router.post('/users', async (req, res) => {
    try {
        const { lastName, firstName, middleName, extension, email, role, password } = req.body;
        
        if (!lastName || !firstName || !email || !role || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let fullname;
        if (middleName && extension) {
            fullname = `${lastName}, ${firstName} ${middleName} ${extension}`;
        } else if (middleName) {
            fullname = `${lastName}, ${firstName} ${middleName}`;
        } else if (extension) {
            fullname = `${lastName}, ${firstName} ${extension}`;
        } else {
            fullname = `${lastName}, ${firstName}`;
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const sql = 'INSERT INTO admins (email, fullname, role, password, status) VALUES (?, ?, ?, ?, ?)';
        
        const [result] = await pool.query(sql, [email, fullname, role, hashedPassword, 'active']);
        
        const [newUser] = await pool.query(
            'SELECT email, fullname, role, created FROM admins WHERE email = ?',
            [email]
        );
        
        res.status(201).json(newUser[0]);
        
    } catch (err) {
        console.error('Error creating user:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lastName, firstName, middleName, extension, email, role, password } = req.body;
        
        if (!lastName || !firstName || !email || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        let fullname;
        if (middleName && extension) {
            fullname = `${lastName}, ${firstName} ${middleName} ${extension}`;
        } else if (middleName) {
            fullname = `${lastName}, ${firstName} ${middleName}`;
        } else if (extension) {
            fullname = `${lastName}, ${firstName} ${extension}`;
        } else {
            fullname = `${lastName}, ${firstName}`;
        }
        
        let sql;
        let params;
        
        if (password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            sql = 'UPDATE admins SET fullname = ?, role = ?, password = ? WHERE email = ?';
            params = [fullname, role, hashedPassword, id];
        } else {
            sql = 'UPDATE admins SET fullname = ?, role = ? WHERE email = ?';
            params = [fullname, role, id];
        }
        
        const [result] = await pool.query(sql, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User updated successfully' });
        
    } catch (err) {
        console.error('Error updating user:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;