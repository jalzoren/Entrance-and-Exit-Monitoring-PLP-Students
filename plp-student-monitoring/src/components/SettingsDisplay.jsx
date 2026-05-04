// SettingsDisplay.jsx
// Component to display Academic Year and Gate Settings on admin dashboard
import React, { useState, useEffect } from 'react';
import { FaCalendar, FaClock } from 'react-icons/fa';

function SettingsDisplay() {
  const [academicInfo, setAcademicInfo] = useState(null);
  const [gateStatus, setGateStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [acadRes, gateRes] = await Promise.all([
          fetch('/api/settings/academic-year'),
          fetch('/api/settings/gate-status'),
        ]);

        if (acadRes.ok) {
          const acad = await acadRes.json();
          setAcademicInfo(acad);
        }

        if (gateRes.ok) {
          const gate = await gateRes.json();
          setGateStatus(gate);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Refresh every minute
    const interval = setInterval(loadSettings, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !academicInfo || !gateStatus) {
    return null;
  }

  return (
    <div className="settings-display-container">
      {/* ── ACADEMIC YEAR & SEMESTER SECTION ── */}
      <div className="settings-display-card academic-card">
        <div className="settings-display-header">
          <FaCalendar className="settings-display-icon" />
          <h3>Academic Information</h3>
        </div>
        <div className="settings-display-content">
          <div className="settings-display-row">
            <span className="settings-display-label">School Year:</span>
            <span className="settings-display-value">{academicInfo.schoolYear}</span>
          </div>
          <div className="settings-display-row">
            <span className="settings-display-label">Current Semester:</span>
            <span className="settings-display-value">
              {academicInfo.detectedSemester === 'Break'
                ? 'Semester Break'
                : `${academicInfo.detectedSemester === '1' ? '1st' : '2nd'} Semester`}
            </span>
          </div>
          {academicInfo.detectedSemester === '1' && (
            <div className="settings-display-row">
              <span className="settings-display-label">Sem 1 Period:</span>
              <span className="settings-display-value">
                {academicInfo.sem1Start} to {academicInfo.sem1End}
              </span>
            </div>
          )}
          {academicInfo.detectedSemester === '2' && (
            <div className="settings-display-row">
              <span className="settings-display-label">Sem 2 Period:</span>
              <span className="settings-display-value">
                {academicInfo.sem2Start} to {academicInfo.sem2End}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── GATE SETTINGS SECTION ── */}
      <div className="settings-display-card gate-card">
        <div className="settings-display-header">
          <FaClock className="settings-display-icon" />
          <h3>Gate Settings</h3>
        </div>
        <div className="settings-display-content">
          <div className="settings-display-row">
            <span className="settings-display-label">Entry Window:</span>
            <span className={`settings-display-value ${gateStatus.entryOpen ? 'gate-open' : 'gate-closed'}`}>
              {gateStatus.entryWindow} {gateStatus.entryOpen ? '(Open)' : '(Closed)'}
            </span>
          </div>
          <div className="settings-display-row">
            <span className="settings-display-label">Exit Window:</span>
            <span className={`settings-display-value ${gateStatus.exitOpen ? 'gate-open' : 'gate-closed'}`}>
              {gateStatus.exitWindow} {gateStatus.exitOpen ? '(Open)' : '(Closed)'}
            </span>
          </div>
          <div className="settings-display-row">
            <span className="settings-display-label">Current Time:</span>
            <span className="settings-display-value">{gateStatus.currentTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsDisplay;
