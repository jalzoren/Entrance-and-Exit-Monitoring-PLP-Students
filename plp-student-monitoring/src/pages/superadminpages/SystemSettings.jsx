import React, { useState } from 'react';
import '../../css/SystemSettings.css';

// ─── Default department list ───────────────────────────────────────────────────
const DEFAULT_DEPARTMENTS = [
  'College of Computer Studies',
  'College of Engineering',
  'College of Business',
  'College of Arts and Sciences',
  'College of Education',
  'College of Nursing',
];

// ─── DepartmentSelect ──────────────────────────────────────────────────────────
// Reusable dropdown with inline "＋ Add New Department" capability
function DepartmentSelect({ value, onChange, departments, onAddDepartment }) {
  const [showAddField, setShowAddField] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [error, setError] = useState('');

  const handleSelectChange = (e) => {
    if (e.target.value === '__add_new__') {
      setShowAddField(true);
      setNewDeptName('');
      setError('');
    } else {
      onChange(e.target.value);
    }
  };

  const handleConfirmAdd = () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      setError('Department name cannot be empty.');
      return;
    }
    if (departments.map((d) => d.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError('This department already exists.');
      return;
    }
    onAddDepartment(trimmed);
    onChange(trimmed);
    setShowAddField(false);
    setNewDeptName('');
    setError('');
  };

  const handleCancelAdd = () => {
    setShowAddField(false);
    setNewDeptName('');
    setError('');
  };

  return (
    <div className="dept-select-container">
      <div className="modal-select-wrapper">
        <select
          name="department"
          value={showAddField ? '__add_new__' : value}
          onChange={handleSelectChange}
          className="modal-select"
        >
          <option value="">Select department</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
          <option value="__add_new__">＋ Add New Department…</option>
        </select>
        <span className="select-arrow">▾</span>
      </div>

      {showAddField && (
        <div className="dept-add-panel">
          <p className="dept-add-title">New Department Name</p>
          <input
            type="text"
            className={`modal-input dept-add-input${error ? ' input-error' : ''}`}
            placeholder="e.g. College of Law"
            value={newDeptName}
            onChange={(e) => { setNewDeptName(e.target.value); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
              if (e.key === 'Escape') handleCancelAdd();
            }}
            autoFocus
          />
          {error && <p className="dept-add-error">{error}</p>}
          <div className="dept-add-actions">
            <button type="button" className="dept-btn-cancel" onClick={handleCancelAdd}>Cancel</button>
            <button type="button" className="dept-btn-confirm" onClick={handleConfirmAdd}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Program Modal ────────────────────────────────────────────────────────
function EditProgramModal({ program, onClose, onSave, departments, onAddDepartment }) {
  const [form, setForm] = useState({
    programCode: program?.programCode || '',
    programName: program?.programName || '',
    department: program?.department || '',
    programType: program?.programType || 'Undergraduate',
    programStatus: program?.programStatus || 'Active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!form.programCode || !form.programName || !form.department) {
      alert('Please fill in all required fields.');
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Program</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-field-grid">
            <div className="modal-field">
              <label className="modal-label">Program Code <span className="required">*</span></label>
              <input type="text" name="programCode" value={form.programCode} onChange={handleChange} className="modal-input" placeholder="e.g. BSCS" />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Name <span className="required">*</span></label>
              <input type="text" name="programName" value={form.programName} onChange={handleChange} className="modal-input" placeholder="e.g. Bachelor of Science in Computer Science" />
            </div>

            {/* Department — spans full width */}
            <div className="modal-field modal-field-full">
              <label className="modal-label">Department <span className="required">*</span></label>
              <DepartmentSelect
                value={form.department}
                onChange={(val) => setForm((prev) => ({ ...prev, department: val }))}
                departments={departments}
                onAddDepartment={onAddDepartment}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Type <span className="required">*</span></label>
              <div className="modal-select-wrapper">
                <select name="programType" value={form.programType} onChange={handleChange} className="modal-select">
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Status <span className="required">*</span></label>
              <div className="modal-select-wrapper">
                <select name="programStatus" value={form.programStatus} onChange={handleChange} className="modal-select">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add New Program Modal ─────────────────────────────────────────────────────
function AddProgramModal({ onClose, onAdd, departments, onAddDepartment }) {
  const [form, setForm] = useState({
    programCode: '',
    programName: '',
    department: '',
    programType: 'Undergraduate',
    programStatus: 'Active',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    if (!form.programCode || !form.programName || !form.department) {
      alert('Please fill in all required fields.');
      return;
    }
    onAdd(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Program</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-field-grid">
            <div className="modal-field">
              <label className="modal-label">Program Code <span className="required">*</span></label>
              <input type="text" name="programCode" value={form.programCode} onChange={handleChange} className="modal-input" placeholder="e.g. BSCS" />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Name <span className="required">*</span></label>
              <input type="text" name="programName" value={form.programName} onChange={handleChange} className="modal-input" placeholder="e.g. Bachelor of Science in Computer Science" />
            </div>

            {/* Department — spans full width */}
            <div className="modal-field modal-field-full">
              <label className="modal-label">Department <span className="required">*</span></label>
              <DepartmentSelect
                value={form.department}
                onChange={(val) => setForm((prev) => ({ ...prev, department: val }))}
                departments={departments}
                onAddDepartment={onAddDepartment}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Type <span className="required">*</span></label>
              <div className="modal-select-wrapper">
                <select name="programType" value={form.programType} onChange={handleChange} className="modal-select">
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Status <span className="required">*</span></label>
              <div className="modal-select-wrapper">
                <select name="programStatus" value={form.programStatus} onChange={handleChange} className="modal-select">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save" onClick={handleAdd}>Add Program</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Program Tab ──────────────────────────────────────────────────────────
const ROWS_PER_PAGE = 10;

function EditProgramTab() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Shared department list — both modals read and write to this same state
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);

  const [programs, setPrograms] = useState([
    { id: 1, programCode: 'BSCS', programName: 'Bachelor of Science in Computer Science', department: 'College of Computer Studies', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 2, programCode: 'BSIT', programName: 'Bachelor of Science in Information Technology', department: 'College of Computer Studies', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 3, programCode: 'MSCS', programName: 'Master of Science in Computer Science', department: 'College of Computer Studies', programType: 'Graduate', programStatus: 'Inactive', dateCreated: '2023-08-15' },
    { id: 4, programCode: 'BSECE', programName: 'Bachelor of Science in Electronics Engineering', department: 'College of Engineering', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 5, programCode: 'BSME', programName: 'Bachelor of Science in Mechanical Engineering', department: 'College of Engineering', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
    { id: 6, programCode: 'MBA', programName: 'Master of Business Administration', department: 'College of Business', programType: 'Graduate', programStatus: 'Active', dateCreated: '2023-09-01' },
    { id: 7, programCode: 'BSN', programName: 'Bachelor of Science in Nursing', department: 'College of Nursing', programType: 'Undergraduate', programStatus: 'Active', dateCreated: '2023-06-01' },
  ]);

  const [editingProgram, setEditingProgram] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Reset to page 1 whenever search changes
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = programs.filter((p) =>
    [p.programCode, p.programName, p.department, p.programType, p.programStatus]
      .join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSaveEdit = (updated) => {
    setPrograms((prev) => prev.map((p) => (p.id === editingProgram.id ? { ...p, ...updated } : p)));
  };

  const handleAddProgram = (newProg) => {
    setPrograms((prev) => [...prev, { ...newProg, id: Date.now(), dateCreated: new Date().toISOString().split('T')[0] }]);
  };

  const handleAddDepartment = (name) => {
    setDepartments((prev) => [...prev, name]);
  };

  return (
    <div className="edit-program-tab">
      <div className="ep-topbar">
        <input type="text" className="ep-search" placeholder="Search" value={search} onChange={handleSearchChange} />
        <button className="ep-add-btn" onClick={() => setShowAddModal(true)}>+ Add New Program</button>
      </div>

      <div className="ep-table-wrapper">
        <table className="ep-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Program Code</th>
              <th>Program Name</th>
              <th>College/Department</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((prog, idx) => (
                <tr key={prog.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{prog.programCode}</td>
                  <td>{prog.programName}</td>
                  <td>{prog.department}</td>
                  <td><span className={`type-badge ${prog.programType === 'Graduate' ? 'graduate' : 'undergrad'}`}>{prog.programType}</span></td>
                  <td><span className={`status-badge ${prog.programStatus === 'Active' ? 'active' : 'inactive'}`}>{prog.programStatus}</span></td>
                  <td>{prog.dateCreated}</td>
                  <td><button className="ep-edit-btn" onClick={() => setEditingProgram(prog)}>Edit</button></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="ep-empty">No programs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="ep-pagination">
        <button
          className="ep-page-btn ep-page-nav"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          ← Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`ep-page-btn ep-page-num ${safePage === page ? 'ep-page-active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}

        <button
          className="ep-page-btn ep-page-nav"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next →
        </button>
      </div>

      {editingProgram && (
        <EditProgramModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
          onSave={handleSaveEdit}
          departments={departments}
          onAddDepartment={handleAddDepartment}
        />
      )}

      {showAddModal && (
        <AddProgramModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProgram}
          departments={departments}
          onAddDepartment={handleAddDepartment}
        />
      )}
    </div>
  );
}

// ─── Main SystemSettings ───────────────────────────────────────────────────────
function SystemSettings() {
  const [activeTab, setActiveTab] = useState('General Settings');
  const [settings, setSettings] = useState({
    recognitionConfidence: 85,
    rescanCooldown: 5,
    manualInputTimeLimit: 30,
    recognitionTimeout: 10,
    entryWindowStart: '06:00',
    entryWindowEnd: '21:00',
    exitWindowStart: '06:00',
    exitWindowEnd: '23:00',
    blockEntryOutsideWindow: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const tabs = ['General Settings', 'Archive', 'Edit Program', 'Regular and Irregular'];

  return (
    <div className="system-settings">
      <header className="header-card">
        <h1>SYSTEM SETTINGS</h1>
        <p className="subtitle">Dashboard / System Settings</p>
      </header>
      <hr className="header-divider" />

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>

        {activeTab === 'General Settings' && (
          <>
            <div className="settings-section">
              <h2 className="section-title">FACIAL RECOGNITION SETTINGS</h2>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">RECOGNITION CONFIDENCE THRESHOLD</label><span className="setting-description">Minimum match accuracy before entry is accepted</span></div>
                <div className="setting-control"><div className="input-with-unit"><input type="number" name="recognitionConfidence" value={settings.recognitionConfidence} onChange={handleInputChange} className="number-input" min="1" max="100" /><span className="unit">%</span></div></div>
              </div>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">RECOGNITION TIMEOUT</label><span className="setting-description">Seconds before switching to manual ID fallback</span></div>
                <div className="setting-control"><div className="input-with-unit"><input type="number" name="recognitionTimeout" value={settings.recognitionTimeout} onChange={handleInputChange} className="number-input" min="5" max="60" /><span className="unit">seconds</span></div></div>
              </div>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">RE-SCAN COOLDOWN</label><span className="setting-description">Prevents duplicate log entries for same student</span></div>
                <div className="setting-control"><div className="input-with-unit"><input type="number" name="rescanCooldown" value={settings.rescanCooldown} onChange={handleInputChange} className="number-input" min="1" max="60" /><span className="unit">minutes</span></div></div>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">MANUAL ID INPUT SETTINGS</h2>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">MANUAL INPUT TIME LIMIT</label><span className="setting-description">Seconds given to a student to type their ID</span></div>
                <div className="setting-control"><div className="input-with-unit"><input type="number" name="manualInputTimeLimit" value={settings.manualInputTimeLimit} onChange={handleInputChange} className="number-input" min="5" max="120" /><span className="unit">seconds</span></div></div>
              </div>
            </div>

            <div className="settings-section">
              <h2 className="section-title">GATE SETTINGS</h2>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">CAMPUS ENTRY WINDOW</label><span className="setting-description">Allowed time range for student entry</span></div>
                <div className="setting-control"><div className="time-range"><input type="time" name="entryWindowStart" value={settings.entryWindowStart} onChange={handleInputChange} className="time-input" /><span className="time-separator">to</span><input type="time" name="entryWindowEnd" value={settings.entryWindowEnd} onChange={handleInputChange} className="time-input" /></div></div>
              </div>
              <div className="setting-item">
                <div className="setting-info"><label className="setting-label">CAMPUS EXIT WINDOW</label><span className="setting-description">Allowed time range for student exit</span></div>
                <div className="setting-control"><div className="time-range"><input type="time" name="exitWindowStart" value={settings.exitWindowStart} onChange={handleInputChange} className="time-input" /><span className="time-separator">to</span><input type="time" name="exitWindowEnd" value={settings.exitWindowEnd} onChange={handleInputChange} className="time-input" /></div></div>
              </div>
              <div className="setting-item checkbox-item">
                <div className="setting-info"><label className="setting-label">Block Entry Outside Entry Window</label><span className="setting-description">System restricts scanning outside the defined entry time range</span></div>
                <div className="setting-control"><label className="switch"><input type="checkbox" name="blockEntryOutsideWindow" checked={settings.blockEntryOutsideWindow} onChange={handleInputChange} /><span className="slider round"></span></label></div>
              </div>
            </div>

            <div className="save-settings">
              <button className="save-button" onClick={() => alert('Settings saved successfully!')}>SAVE SETTINGS</button>
            </div>
          </>
        )}

        {activeTab === 'Edit Program' && <EditProgramTab />}

        {(activeTab === 'Archive' || activeTab === 'Regular and Irregular') && (
          <div className="tab-placeholder"><p>No content available for <strong>{activeTab}</strong> yet.</p></div>
        )}
      </div>
    </div>
  );
}

export default SystemSettings;