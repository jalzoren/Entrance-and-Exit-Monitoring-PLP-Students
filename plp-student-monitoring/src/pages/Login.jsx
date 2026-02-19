import { useState } from "react";
import "../css/Login.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    console.log({ username, password });
    // Later: call real login API here
  };

  return (
    <div className="login-container">
      {/* Floating top-left icon */}
      <LuScanFace
        title="Go To Entry-Exit Students"
        className="top-left-icon"
      />

      {/* Main centered content wrapper */}
      <div className="login-wrapper">
        {/* Logo + Title section */}
        <div className="login-header-container">
          <img src={logo} alt="System Logo" className="login-icon" />
          <h1 className="logintext">LOG IN</h1>
        </div>

        {/* Form card */}
        <div className="login-card">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username">Email</label>
              <input
                id="username"
                type="email"          // ← changed to type="email" (better validation)
                placeholder="example@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group password-container">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="show-password"></span>
            </div>

            <button type="submit" className="login-button">
              LOGIN
            </button>
          </form>

          <div className="form-footer">
            <button type="button" className="forgot-password-button">
              <a href="/forgotpass">Forgot Password?</a>
            </button>

            <p className="footer-text">
              ENTRANCE AND EXIT MONITORING SYSTEM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}