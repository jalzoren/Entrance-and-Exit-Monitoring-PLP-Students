// SystemSettings.jsx - Updated with Archived Users tab
import React, { useState } from 'react';
import GeneralSettings     from './GeneralSettings';
import EditProgramTab      from './EditProgramTab';
import ArchivedStudents    from './ArchivedStudents';
import ArchivedPrograms    from './ArchivedPrograms';
import ArchivedDepartments from './ArchivedDepartments';
import ArchivedUsers       from './ArchivedUsers'; // Import the new component
import DepartmentsTab      from './DepartmentsTab';
import "../../../css/SystemSettings.css";
import "../../../css/GeneralSettings.css";

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

  return (
    <div>
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