const express = require('express');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

// GET all users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT email, fullname, role, created FROM admins ORDER BY created DESC'
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

        // Construct fullname with extension if provided
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
        
        const sql = 'INSERT INTO admins (email, fullname, role, password) VALUES (?, ?, ?, ?)';
        
        const [result] = await pool.query(sql, [email, fullname, role, hashedPassword]);
        
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
        
        // Construct fullname with extension if provided
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

// DELETE user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await pool.query('DELETE FROM admins WHERE email = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
        
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;