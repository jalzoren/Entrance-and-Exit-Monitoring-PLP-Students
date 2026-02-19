// src/pages/ForgotPassword.jsx  (Step 1)
import { useState } from "react";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSendCode = (e) => {
    e.preventDefault();
    console.log("Sending reset code to:", email);
    // → Call your backend API here (e.g. axios.post('/api/forgot-password', { email }))
    // → Show success message or go to next step after success
  };

  return (
    <div className="login-container">
      <LuScanFace
        title="Go To Entry-Exit Students"
        className="top-left-icon"
      />

      <div className="login-wrapper">
        <div className="login-header-container">
          <img src={logo} alt="System Logo" className="login-icon" />
          <h1 className="logintext">FORGOT PASSWORD</h1>
        </div>

        <div className="login-card">
          <p className="form-description">
            Enter your email address and we'll send you a verification code.
          </p>

          <form className="login-form" onSubmit={handleSendCode}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-button">
                <input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="send-code-button">
                  Send Code
                </button>
              </div>
            </div>
          </form>

          <div className="form-footer">
            <button type="button" className="back-to-login">
              <a href="/">Back to Login</a>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}