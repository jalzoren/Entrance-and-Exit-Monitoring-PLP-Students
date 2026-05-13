// SystemSettings.jsx - Updated with Archived Users tab and notification badges
import React, { useState, useEffect } from 'react';
import GeneralSettings     from './GeneralSettings';
import EditProgramTab      from './EditProgramTab';
import ArchivedStudents    from './ArchivedStudents';
import ArchivedPrograms    from './ArchivedPrograms';
import ArchivedDepartments from './ArchivedDepartments';
import ArchivedUsers       from './ArchivedUsers'; // Import the new component
import DepartmentsTab      from './DepartmentsTab';
import "../../../css/SystemSettings.css";
import "../../../css/GeneralSettings.css";
// Define the tabs for the system settings

const TABS = [
  'General Settings',
  'Departments',
  'Programs',
  'Archived Students',
  'Archived Programs',
  'Archived Departments',
  'Archived Users', // Add this new tab
];

function SystemSettings() {
  const [activeTab, setActiveTab] = useState('General Settings');
  const [notificationBadge, setNotificationBadge] = useState(0);

  // Fetch academic info to check for notifications
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const acadRes = await fetch('/api/settings/academic-year');
        if (acadRes.ok) {
          const acad = await acadRes.json();
          let badges = 0;

          // Check if school year has started or ended
          if (acad.schoolYearStarted) badges++;
          if (acad.schoolYearEnded) badges++;

          // Check if semester has started or ended
          if (acad.semesterStarted) badges++;
          if (acad.semesterEnded) badges++;

          setNotificationBadge(badges);
        }
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    checkNotifications();
    // Check every 5 minutes
    const interval = setInterval(checkNotifications, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='systemsettings'>
      <header className="header-card">
        <h1>SYSTEM SETTINGS</h1>
        <p className="subtitle">Dashboard / System Settings</p>
      </header>

      <div className="system-settings">
        <div className="settings-container">

          {/* Tab bar */}
          <div className="settings-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'General Settings' && notificationBadge > 0 && (
                  <span className="notification-badge">{notificationBadge > 9 ? '9+' : notificationBadge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'General Settings'    && <GeneralSettings />}
          {activeTab === 'Departments'          && <DepartmentsTab />}
          {activeTab === 'Programs'             && <EditProgramTab />}
          {activeTab === 'Archived Students'    && <ArchivedStudents />}
          {activeTab === 'Archived Programs'    && <ArchivedPrograms />}
          {activeTab === 'Archived Departments' && <ArchivedDepartments />}
          {activeTab === 'Archived Users'       && <ArchivedUsers />}

        </div>
      </div>
    </div>
  );
}

export default SystemSettings;