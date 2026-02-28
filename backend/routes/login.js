const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

// Create database connection using env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eems',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Login endpoint - using email onlysss
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Changed from username to email
    console.log('Login attempt for email:', email);

    // Query the admins table using email only
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND password = ?',
      [email, password]
    );

    if (rows.length > 0) {
      // Login successful
      const user = rows[0];
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword
      });
    } else {
      // Login failed
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

module.exports = router;