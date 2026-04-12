import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function ArchivedPrograms() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [programmType, setProgramType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedPrograms, setArchivedPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ── Fetch departments ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/departments');
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // ── Fetch archived programs ────────────────────────────────────────────
  useEffect(() => {
    fetchArchivedPrograms();
  }, []);

  const fetchArchivedPrograms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/programs/archived');
      setArchivedPrograms(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching archived programs:', err);
      setError(err.response?.data?.message || 'Failed to load archived programs');
      setArchivedPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedPrograms.filter((program) => {
    const matchesSearch = [program.programCode, program.programName, program.department]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesCollege = college === '' || program.department === college;
    const matchesType = programmType === '' || program.programType === programmType;
    return matchesSearch && matchesCollege && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleRestoreClick = (program) => {
    setSelectedProgram(program);
    setShowRestoreModal(true);
  };

  const handleRestoreConfirm = async () => {
    try {
      setRestoring(true);

      // Send restore request to backend with Active status
      await axios.patch(`http://localhost:5000/api/programs/${selectedProgram.id}`, {
        programStatus: 'Active'
      });

      // Remove from archived list
      setArchivedPrograms((prev) => prev.filter((p) => p.id !== selectedProgram.id));

      Swal.fire({
        title: 'Success',
        html: `<p><strong>"${selectedProgram.programName}"</strong> has been restored successfully!</p>`,
        icon: 'success',
        confirmButtonText: 'Done'
      });

      setShowRestoreModal(false);
      setSelectedProgram(null);

    } catch (err) {
      console.error('Restore error:', err);
      Swal.fire({
        title: 'Restore Failed',
        text: err.response?.data?.message || 'Something went wrong. Please try again.',
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setRestoring(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  };

  const getTypeBadgeClass = (type) => {
    switch(type?.toLowerCase()) {
      case 'undergraduate': return 'undergraduate';
      case 'graduate': return 'graduate';
      default: return '';
    }
  };

  return (
    <div className="archive-tab">
      {/* Search and Filter Bar */}
      <div className="tab-topbar">
        <input
          type="text"
          className="tab-search"
          placeholder="Search by Program Code, Name, or Department..."
          value={search}
          onChange={handleSearchChange}
        />
        <select 
          value={college} 
          onChange={(e) => setCollege(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.dept_name}>
              {dept.dept_name}
            </option>
          ))}
        </select>
        <select 
          value={programmType} 
          onChange={(e) => setProgramType(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Types</option>
          <option value="Undergraduate">Undergraduate</option>
          <option value="Graduate">Graduate</option>
        </select>
        <span className="result-count">Total: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Program Code</th>
              <th>Program Name</th>
              <th>Department</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="tab-empty">Loading archived programs...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="tab-empty" style={{ color: 'red' }}>Error: {error}</td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((program, idx) => (
                <tr key={program.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{program.programCode}</td>
                  <td>
                    <span title={program.programName} style={{ cursor: 'pointer' }}>
                      {program.programName.length > 25 ? `${program.programName.substring(0, 25)}...` : program.programName}
                    </span>
                  </td>
                  <td>{program.department}</td>
                  <td>
                    <span className={`type-badge ${program.programType === 'Graduate' ? 'graduate' : 'undergrad'}`}>
                      {program.programType}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${program.programStatus === 'Active' ? 'active' : 'inactive'}`}>
                      {program.programStatus}
                    </span>
                  </td>
                  <td>{program.dateCreated || 'N/A'}</td>
                  <td>
                    <button
                      className="btn-restore"
                      onClick={() => handleRestoreClick(program)}
                      title="Restore program"
                      disabled={restoring}
                    >
                      <MdRestore /> Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="tab-empty">No archived programs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="tab-pagination">
        <button
          className="page-btn page-nav"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          ← Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`page-btn page-num ${safePage === page ? 'page-active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        <button
          className="page-btn page-nav"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next →
        </button>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && selectedProgram && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Restore Program</h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-field modal-full-width">
                <label className="modal-label">Program to Restore</label>
                <div style={{
                  padding: '12px 14px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  <div><strong>Code:</strong> {selectedProgram.programCode}</div>
                  <div><strong>Name:</strong> {selectedProgram.programName}</div>
                  <div><strong>Department:</strong> {selectedProgram.department}</div>
                  <div><strong>Type:</strong> {selectedProgram.programType}</div>
                  <div><strong>Status:</strong> Active</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleRestoreConfirm}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : (<><MdRestore style={{ marginRight: '5px' }} /> Restore Program</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchivedPrograms;
