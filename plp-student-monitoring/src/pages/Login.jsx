// Login.jsx
import { useState } from "react";
import "../css/Login.css";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { MdAdminPanelSettings, MdSecurity, MdSchool } from "react-icons/md";
import Swal from 'sweetalert2';
import { useAuth } from "../context/AuthContext";

const ROLES = [
  {
    key: 'Super Admin',
    label: 'Super Admin',
    desc: 'Full system access.',
  },
  {
    key: 'EEMS Admin',       
    label: 'EEMS Admin',
    desc: 'Entrance & exit management.',
  },
  {
    key: 'EAMS Admin',        
    label: 'EAMS Admin',
    desc: 'Attendance & scheduling.',
  },
];

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!selectedRole) {
      Swal.fire({
        icon: 'warning',
        title: 'Select a Role',
        text: 'Please select your administrative role before logging in.',
        confirmButtonColor: '#2b5a2b',
      });
      return;
    }

    setLoading(true);

    const result = await login(email, password, selectedRole);

    if (result.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${selectedRole}!`,
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(result.redirect);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: result.message || 'Invalid credentials or role mismatch.',
        confirmButtonColor: '#2b5a2b',
      });
    }

    setLoading(false);
  };

  return (
    <div className="login-container">

      <div className="login-wrapper">
        <div className="login-header-container">
          <img className="login-icon" src="../logoplp.gif" alt="PLP Seal" />
          <h1 className="logintext">LOGIN</h1>
        </div>

        {/* ── Role Selector ── */}
        <div className="login-role-section">
          <p className="login-role-prompt">
            Please select your administrative role to login.
          </p>
          <div className="login-role-grid">
            {ROLES.map(({ key, label, desc }) => (
              <div
                key={key}
                className={`login-role-card ${selectedRole === key ? 'login-role-card--active' : ''}`}
                onClick={() => setSelectedRole(key)}
              >
                <div className="login-role-body">
                  <span className="login-role-label">{label}</span>
                  <div className="login-role-divider" />
                  <span className="login-role-desc">{desc}</span>
                </div>
                {selectedRole === key && (
                  <span className="login-role-check">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Form ── */}
        <div className="login-card">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email" style={{ color: 'white' }}>Email</label>
              <input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" style={{ color: 'white' }}>Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading || !selectedRole}
            >
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>

          <div className="form-footer">
            <div className="footer-links">
              <Link to="/forgotpass" className="forgot-password-link">
                Forgot Password?
              </Link>
            </div>
            <p className="footer-text">ENTRANCE AND EXIT MONITORING SYSTEM</p>
          </div>
        </div>
      </div>
    </div>
  );
}