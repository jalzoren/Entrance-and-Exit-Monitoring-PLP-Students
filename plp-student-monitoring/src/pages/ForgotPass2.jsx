import { useState } from "react";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = () => {
    console.log("Send code to:", email);
    // here you would call your backend API to send the code
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ 
      email, 
      code, 
      newPassword, 
      confirmPassword 
    });
    // handle verification of code and password reset
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <LuScanFace title="Go To Entry-Exit Students" className="top-left-icon" />

      <div className="login-content">
        <div className="logined">
          <img src={logo} alt="Logo" className="login-icon" />
          <div className="login-header">
            <h1>FORGOT PASSWORD</h1>
          </div>
        </div>

        <div className="login-box">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={toggleShowPassword}
                />
                <span className="checkbox-text">Show Password</span>
              </label>
            </div>

            <button type="submit" className="confirm-button">CONFIRM</button>
          </form>

          <button type="button" className="back-to-home">
            <a href="/">Back to Login</a>
          </button>
        </div>
      </div>
    </div>
  );
}