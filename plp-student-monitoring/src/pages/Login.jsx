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
  };

  return (
    <div className="login-container">
      <LuScanFace   title="Go To Entry-Exit Students" className="top-left-icon"/>

      <div className="login-content">
        <div className="logined">
          <img src={logo} alt="Logo" className="login-icon" />
          <div className="login-header">
            <h1>LOG IN</h1>
          </div>
        </div>

        <div className="login-box">
         <form className="login-form" onSubmit={handleLogin}>
  <div className="input-group">
    <label htmlFor="username">Email</label>
    <input
      id="username"
      type="text"
      placeholder="example@gmail.com"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />
  </div>

  <div className="input-group password-container">
    <label htmlFor="password">Password</label>
    <input
      id="password"
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <span className="show-password"></span>
  </div>

  <button type="submit">LOGIN</button>
</form>


          <p className="footer-text">
            ENTRANCE AND EXIT MONITORING SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
