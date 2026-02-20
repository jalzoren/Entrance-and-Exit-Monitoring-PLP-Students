// src/pages/ForgotPasswordStep2.jsx  (or same file with conditional step)
import { useState } from "react";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ForgotPasswordStep2() {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleResetPassword = (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log("Resetting password:", { code, newPassword });
    // → Call your backend API here (verify code + reset password)
  };

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  return (
    <div className="login-container">
      <LuScanFace
        title="Go To Entry-Exit Students"
        className="top-left-icon"
      />

      <div className="login-wrapper">
        <div className="login-header-container">
          <img src={logo} alt="System Logo" className="login-icon" />
          <h1 className="logintext">RESET PASSWORD</h1>
        </div>

        <div className="login-card">
          <p className="form-description">
            Enter the code sent to your email and choose a new password.
          </p>

          <form className="login-form" onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="confirm-button">
              Reset Password
            </button>
          </form>

          <div className="form-footer">
            <button type="button" className="back-to-login">
              <a href="/">← Back to Login</a>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}