// backend/routes/login.js
const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require("../src/db");
const router  = express.Router();

// ============================
// 🔐 Login with Role Validation
// ============================
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Please select an administrative role.'
      });
    }

    // 1️⃣ Valid roles whitelist — reject unknown roles immediately
   const VALID_ROLES = ['Super Admin', 'EEMS Admin', 'EAMS Admin']; 

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected.'
      });
    }

    // 2️⃣ Fetch user by email only (we validate role separately to avoid
    //    leaking which combination of email+role is registered)
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // 3️⃣ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 4️⃣ Validate that the selected role matches the user's actual role
    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your account is not registered as "${role}".`
      });
    }

    // 5️⃣ Strip password before storing in session
    const { password: _, ...userWithoutPassword } = user;

    req.session.user      = userWithoutPassword;
    req.session.userEmail = user.email;
    req.session.role      = user.role;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create session.'
        });
      }

      // 6️⃣ Redirect based on role
      let redirect = '/dashboard';
      if (user.role === 'Super Admin') redirect = '/superdashboard';
      if (user.role === 'EAMS Admin')  redirect = '/eamsdashboard'; 

      res.json({
        success:  true,
        message:  'Login successful',
        user:     userWithoutPassword,
        redirect: redirect
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================
// 🔍 Check Session
// ============================
router.get('/check-session', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
      role: req.session.role
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ============================
// 🚪 Logout
// ============================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

module.exports = router;