// DepartmentSelect.jsx – FIXED VERSION
import React from 'react';

function DepartmentSelect({ 
  value, 
  onChange, 
  departments = [], 
  placeholder = "Select Department",
  disabled = false 
}) {
  return (
    <div className="dept-select-container">
      <div className="modal-select-wrapper">
        <select
          name="department_id"      
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}   
          className="modal-select"
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          
          {departments.map((dept) => {
            const deptId   = dept.id;
            const deptName = dept.dept_name;

            return (
              <option key={deptId} value={deptId}>
                {deptName}
              </option>
            );
          })}
        </select>
        <span className="select-arrow">▾</span>
      </div>
    </div>
  );
}

export default DepartmentSelect;