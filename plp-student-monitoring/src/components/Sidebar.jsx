import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FiHome,
  FiMonitor,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FiMenu } from "react-icons/fi"; // add FiMenu

import "../componentscss/Sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const menuItems = [
    { icon: <FiHome />, label: "Dashboard", path: "/dashboard" },
    { icon: <FiMonitor />, label: "Real-Time Monitor", path: "/monitor" },
    { icon: <FiFileText />, label: "Entry-Exit Records", path: "/records" },
    { icon: <FiUsers />, label: "Student Management", path: "/students" },
    { icon: <FiBarChart2 />, label: "Analytics & Reports", path: "/analytics" },
  ];

  return (
    <>
      <button
        className={`sidebar-toggle-btn ${isOpen ? "open" : "collapsed"}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        title={isOpen ? "Collapse" : "Expand"}
      >
        <FiMenu size={20} />
      </button>
      <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
          <div className="logo-container">
            {isOpen && (
              <div className="brand-text">
                <img
                  src="../logo3.png" // replace with your image path
                  alt="Logo"
                  className="brand-image"
                />
                <h1 className="brand-title">Entrance and Exit</h1>
                <p className="brand-subtitle">Monitoring System</p>
              </div>
            )}
          </div>

        {/* Navigation */}

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              title={!isOpen ? item.label : undefined}
            >
              <span className="item-icon">{item.icon}</span>
              {isOpen && <span className="item-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="sidebar-user">
          <div className="user-avatar">JB</div>
          {isOpen && (
            <div className="user-details">
              <div className="user-name">Jerimiah Bitancor</div>
              <div className="user-role">EEMS - ADMIN</div>
              <Link to="/" className="profile-link">
                Home
              </Link> 
            </div>
          )}
        </div>

        {/* Toggle button — inside sidebar but positioned dynamically */}
      </aside>
    </>
  );
}
