// EditProgramModal.jsx
import React, { useState } from 'react';
import DepartmentSelect from './DepartmentSelect';
import Swal from 'sweetalert2';
import '../../../css/GlobalModal.css';

function EditProgramModal({ program, onClose, onSave, departments, onDepartmentAdded }) {
  const [form, setForm] = useState({
    program_code: program.program_code,
    program_name: program.program_name,
    department_id: program.department_id,
    program_type: program.program_type,
    program_status: program.program_status,
    duration: program.duration,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (deptId) => {
    setForm((prev) => ({ ...prev, department_id: deptId }));
  };

  const handleAddDepartment = async (newDepartment) => {
    Swal.fire({
      title: 'Adding Department...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const response = await fetch('http://localhost:5000/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept_name: newDepartment })
      });
      
      if (!response.ok) throw new Error('Failed to add department');
      
      const newDept = await response.json();
      
      Swal.fire({
        icon: 'success',
        title: 'Department Added!',
        text: `${newDepartment} has been added successfully.`,
        timer: 1500,
        showConfirmButton: false
      });
      
      if (onDepartmentAdded) {
        const deptResponse = await fetch('http://localhost:5000/api/departments');
        const updatedDepts = await deptResponse.json();
        onDepartmentAdded(updatedDepts);
      }
      
      setForm((prev) => ({ ...prev, department_id: newDept.id }));
      
    } catch (error) {
      console.error('Error adding department:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: 'Could not add department. It might already exist.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  const handleSave = () => {
    if (!form.program_code || !form.program_name || !form.department_id || !form.duration) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in all required fields including duration.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Program</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Program Code <span className="required">*</span></label>
              <input 
                type="text" 
                name="program_code" 
                value={form.program_code} 
                onChange={handleChange} 
                className="modal-input" 
                placeholder="e.g. BSCS" 
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Department <span className="required">*</span></label>
              <DepartmentSelect
                value={form.department_id}
                onChange={handleDepartmentChange}
                departments={departments}
                onAddDepartment={handleAddDepartment}
              />
            </div>

            <div className="modal-field modal-full-width">
              <label className="modal-label">Program Name <span className="required">*</span></label>
              <input 
                type="text" 
                name="program_name" 
                value={form.program_name} 
                onChange={handleChange} 
                className="modal-input" 
                placeholder="e.g. Bachelor of Science in Computer Science" 
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Type <span className="required">*</span></label>
              <select name="program_type" value={form.program_type} onChange={handleChange} className="modal-select">
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            <div className="modal-field">
              <label className="modal-label">Duration (Years) <span className="required">*</span></label>
              <input 
                type="number" 
                name="duration" 
                value={form.duration} 
                onChange={handleChange} 
                className="modal-input" 
                placeholder="e.g. 4"
                min="1"
                max="10"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Status <span className="required">*</span></label>
              <select name="program_status" value={form.program_status} onChange={handleChange} className="modal-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default EditProgramModal;