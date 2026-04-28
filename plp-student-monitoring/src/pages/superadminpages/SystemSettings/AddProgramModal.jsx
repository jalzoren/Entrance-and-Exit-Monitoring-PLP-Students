// AddProgramModal.jsx
import React, { useState } from 'react';
import DepartmentSelect from './DepartmentSelect';
import Swal from 'sweetalert2';
import '../../../css/GlobalModal.css';

function AddProgramModal({ onClose, onAdd, departments, onDepartmentAdded }) {
  const [form, setForm] = useState({
    program_code: '',
    program_name: '',
    department_id: '',
    program_type: 'Undergraduate',
    program_status: 'Active',
    duration: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (dept) => {
    setForm((prev) => ({ ...prev, department: dept }));
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
      
      Swal.fire({
        icon: 'success',
        title: 'Department Added!',
        text: `${newDepartment} has been added successfully.`,
        timer: 1500,
        showConfirmButton: false
      });
      
      if (onDepartmentAdded) {
        const deptResponse = await fetch('http://localhost:5000/api/departments/active');
        const updatedDepts = await deptResponse.json();
        onDepartmentAdded(updatedDepts);
      }
      
      setForm((prev) => ({ ...prev, department: newDepartment }));
      
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

  const handleAdd = async () => {
    if (isAdding) return;
    
    if (!form.program_code || !form.program_name || !form.department_id || !form.duration) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in all required fields including duration.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    setIsAdding(true);
    
    Swal.fire({
      title: 'Adding Program...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      const response = await fetch('http://localhost:5000/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!response.ok) throw new Error('Failed to add program');
      
      const newProgram = await response.json();
      
      onClose();
      
      await Swal.fire({
        icon: 'success',
        title: 'Program Added!',
        text: `${form.program_name} has been added successfully.`,
        timer: 2000,
        showConfirmButton: false
      });
      
      onAdd(newProgram);
      
    } catch (error) {
      console.error('Error adding program:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed!',
        text: 'Program code might already exist. Please use a different code.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Program</h2>
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

            <div className="modal-field modal-full-width">
              <label className="modal-label">Department <span className="required">*</span></label>
              <DepartmentSelect
                value={form.department_id}
                onChange={(id) => setForm(prev => ({ ...prev, department_id: id }))}
                departments={departments}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Program Type <span className="required">*</span></label>
              <select 
                name="program_type" 
                value={form.program_type} 
                onChange={handleChange} 
                className="modal-select"
              >
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
              <select 
                name="program_status" 
                value={form.program_status} 
                onChange={handleChange} 
                className="modal-select"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn-save" onClick={handleAdd} disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Program'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddProgramModal;