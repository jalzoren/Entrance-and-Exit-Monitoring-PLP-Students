import { useState } from "react";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = (e) => {
    e.preventDefault(); // prevent page reload when clicking Send
    console.log("Send code to:", email);
    // → Later: call API here + show loading / success message
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, code });
    // → Later: verify code → redirect to reset password page
  };

  return (
    <div className="login-container">
      <LuScanFace
        title="Go To Entry-Exit Students"
        className="top-left-icon"
      />

      <div className="login-content">
        <div className="logined">
          <img src={logo} alt="Logo" className="login-icon" />
          <div className="login-header">
            <h1 className="logintext">FORGOT PASSWORD</h1>
          </div>
        </div>

        <div className="login-box">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-group-row">
                <input
                  id="email"
                  className="email-input"
                  type="email"           // changed from text → better validation
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="send-code-button"
                  onClick={handleSendCode}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="code">Code</label>
              <input
                id="code"
                type="text"
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            {/* Changed <a> wrapping button → better semantics */}
            <button type="submit" className="submit-button">
              SUBMIT
            </button>
          </form>

          <button type="button" className="back-to-home">
            <a href="/">Back to Login</a>
          </button>
            <p className="footer-text">
              ENTRANCE AND EXIT MONITORING SYSTEM
            </p>
        </div>
        
      </div>
      
    </div>
  );
}