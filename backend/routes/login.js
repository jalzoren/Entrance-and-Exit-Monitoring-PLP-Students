const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require("../src/db");
const router  = express.Router();

// ============================
// 🔐 Login with Role Validation & Archive Check
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

    // 2️⃣ Fetch user by email - now checking status as well
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

    // 3️⃣ Check if user is archived
    if (user.status === 'archived') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been archived. Please contact the system administrator.'
      });
    }

    // 4️⃣ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 5️⃣ Validate that the selected role matches the user's actual role
    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your account is not registered as "${role}".`
      });
    }

    // 6️⃣ Strip password before storing in session
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

      // 7️⃣ Redirect based on role
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
// 🔍 Check Session (with archive check)
// ============================
router.get('/check-session', async (req, res) => {
  if (!req.session.user) {
    return res.json({ authenticated: false });
  }
  
  try {
    // Check if user is still active in database
    const [rows] = await pool.query(
      'SELECT status FROM admins WHERE email = ?',
      [req.session.user.email]
    );
    
    // If user is archived, destroy session and force logout
    if (rows.length > 0 && rows[0].status === 'archived') {
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
        res.clearCookie('connect.sid');
        return res.json({ 
          authenticated: false, 
          archived: true 
        });
      });
      return;
    }
    
    // User is active, return session data
    res.json({
      authenticated: true,
      user: req.session.user,
      role: req.session.role
    });
    
  } catch (err) {
    console.error('Error checking user status:', err);
    // On error, still return session data (fail open)
    res.json({
      authenticated: true,
      user: req.session.user,
      role: req.session.role
    });
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