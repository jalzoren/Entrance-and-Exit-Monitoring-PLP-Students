// LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiLogIn, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import '../css/LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <div className="landing-wrapper">
        {/* Header Section */}
        <div className="landing-header-container">
          <img src="../logoplp.gif" alt="PLP Seal" className="landing-icon" />
          <h1 className="landing-title">
            PAMANTASAN NG LUNGSOD NG PASIG
          </h1>
          <hr className="landing-divider" />
          <div className="landing-subtitle">
            An Integrated Smart Entrance, Exit, and Attendance Monitoring System<br />
            with Data Analytics for Institutional Decision Support
          </div>
        </div>

        {/* Cards Section */}
        <div className="landing-cards-section">
          <div className="landing-cards-prompt">
            Select a mode to proceed
          </div>
          <div className="landing-cards-grid">
            <Link to="/entrance" className="landing-card-link">
              <div className="landing-card">
                <div className="landing-card-icon">
                  <FiArrowRight size={28} />
                </div>
                <div className="landing-card-body">
                  <div className="landing-card-label">Entrance Gateway</div>
                  <div className="landing-card-divider"></div>
                  <div className="landing-card-desc">Monitor and manage incoming individuals with face recognition</div>
                </div>
              </div>
            </Link>

            <Link to="/exit" className="landing-card-link">
              <div className="landing-card">
                <div className="landing-card-icon">
                  <FiArrowLeft size={28} />
                </div>
                <div className="landing-card-body">
                  <div className="landing-card-label">Exit Gateway</div>
                  <div className="landing-card-divider"></div>
                  <div className="landing-card-desc">Track and record outgoing individuals securely</div>
                </div>
              </div>
            </Link>

            <Link to="/login" className="landing-card-link">
              <div className="landing-card">
                <div className="landing-card-icon">
                  <FiLogIn size={28} />
                </div>
                <div className="landing-card-body">
                  <div className="landing-card-label">Log in Portal</div>
                  <div className="landing-card-divider"></div>
                  <div className="landing-card-desc">Access administrative dashboard and system settings</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <div className="landing-footer-text">
            BSIT 3E - 2025-2026 | PLP Smart Campus Monitoring System
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;