// src/pages/Dashboard.jsx
import React from "react";
import { FiUsers, FiLogIn, FiLogOut, FiCheckCircle } from "react-icons/fi";
import "../css/Dashboard.css"; // Create this CSS file for styling

function Dashboard() {

  return (
    <div className="dashboard-wrapper">
      <div className="dashb">
       <header className="campus-header">
  <div className="logo-area">
    <div className="university-emblem">
      <img
        className="seal-placeholder"
        src="../logoplp.gif"
        alt="PLP"
      />
    </div>
    <div className="university-info">
      <h1>PAMANTASAN NG LUNGSOD NG PASIG</h1>
      <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
    </div>
  </div>
</header>

      </div>
    </div>
  );
}

export default Dashboard;
