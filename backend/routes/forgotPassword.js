const express = require('express');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const router = express.Router();

// Database connection
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

// Email transporter setup - USE YOUR APP PASSWORD HERE
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'brcodesender@gmail.com',     // ← Your Gmail address
    pass: 'yfsw bkao cdko dlkm'        // ← The 16-char app password (with or without spaces)
  }
});

// Generate random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Endpoint 1: Send OTP code
router.post('/forgot-password/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Send code request for email:', email);

    // Check if email exists in database
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our records'
      });
    }

    const user = rows[0];
    const resetCode = generateCode();
    const codeExpiry = new Date(Date.now() + 15 * 60000); // 15 minutes

    // Save code to database
    await pool.query(
      'UPDATE admins SET reset_code = ?, code_expiry = ? WHERE admin_id = ?',
      [resetCode, codeExpiry, user.admin_id]
    );

    // Send email with code
    const mailOptions = {
      from: 'your-email@gmail.com',     // Same email here
      to: email,
      subject: 'Password Reset Code - EEMS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>EEMS Password Reset</h2>
          <p>Hello ${user.fullname || 'User'},</p>
          <p>Your verification code is: <strong>${resetCode}</strong></p>
          <p>This code expires in 15 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', email);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      email: email
    });

  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send code. Please try again.'
    });
  }
});

// Endpoint 2: Verify OTP code
router.post('/forgot-password/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ? AND code_expiry > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Code verified successfully'
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Endpoint 3: Reset password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ? AND code_expiry > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    await pool.query(
      'UPDATE admins SET password = ?, reset_code = NULL, code_expiry = NULL WHERE email = ?',
      [newPassword, email]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;