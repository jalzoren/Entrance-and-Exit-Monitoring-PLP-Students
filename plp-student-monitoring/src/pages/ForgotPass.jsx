import { useState } from "react";
import "../css/ForgotPass.css"; // <-- use dedicated CSS now
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = () => {
    console.log("Send code to:", email);
    // here you would call your backend API to send the code
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, code });
    // handle verification of code and password reset
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
            <label htmlFor="email">Email</label>
                <div className="input-group-row">
                    <input
                    id="email"
                    className="email-input"
                    type="text"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <a href="/forgot-password-2">
              <button type="button">SUBMIT</button>
            </a>
          </form>

            <button type="button" className="back-to-home">
            <a href="/">Back to Login</a>
            </button>
            
        </div>
      </div>
    </div>
  );
}
