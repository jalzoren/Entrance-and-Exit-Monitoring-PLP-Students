import React, { useState } from 'react';

export default function GenerateGraduateReportsFilter({ onClose, onGenerate, departments = [] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [section, setSection] = useState('');

  const handleGenerate = () => {
    const filters = {
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      department: department || null,
      program: program || null,
      yearLevel: yearLevel || null,
      section: section || null,
    };
    onGenerate(filters);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 12000 }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 600 }}
      >
        <div style={{ background: '#01311d', padding: '12px 16px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Generate Report for Graduates</h3>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Date From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="modal-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Date To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="modal-input" />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="modal-input">
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.dept_name}>{d.dept_name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Program</label>
            <input value={program} onChange={(e) => setProgram(e.target.value)} className="modal-input" placeholder="Program name (optional)" />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Year Level</label>
              <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className="modal-input">
                <option value="">Any</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#01311d', display: 'block', marginBottom: 6 }}>Section</label>
              <input value={section} onChange={(e) => setSection(e.target.value)} className="modal-input" placeholder="Section (optional)" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #eee' }}>
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleGenerate}
            style={{ background: '#01311d', color: '#fff' }}
          >
            Generate Graduates Reports
          </button>
        </div>
      </div>
    </div>
  );
}
