const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

// Email transporter using .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Generate random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===============================
// 1️⃣ Send OTP Code
// ===============================
router.post('/forgot-password/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    const user = rows[0];
    const resetCode = generateCode();
    const codeExpiry = new Date(Date.now() + 15 * 60000); // 15 mins

    await pool.query(
      'UPDATE admins SET reset_code = ?, code_expiry = ? WHERE admin_id = ?',
      [resetCode, codeExpiry, user.admin_id]
    );

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Password Reset Code - EEMS',
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.fullname || 'User'},</p>
        <p>Your verification code is:</p>
        <h1>${resetCode}</h1>
        <p>This code expires in 15 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: 'Verification code sent'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to send code'
    });
  }
});

// ===============================
// 2️⃣ Verify Code
// ===============================
router.post('/forgot-password/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ?',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code'
      });
    }

    const user = rows[0];
    const now = new Date();
    const expiry = new Date(user.code_expiry);

    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: 'Code has expired'
      });
    }

    res.json({
      success: true,
      message: 'Code verified'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// ===============================
// 3️⃣ Reset Password
// ===============================
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Check if user exists with this code
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ?',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    const user = rows[0];
    const now = new Date();
    const expiry = new Date(user.code_expiry);

    // Check if code expired
    if (expiry < now) {
      return res.status(400).json({
        success: false,
        message: 'Code has expired'
      });
    }

    // Validate password strength (optional)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset code fields
    await pool.query(
      'UPDATE admins SET password = ?, reset_code = NULL, code_expiry = NULL WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;