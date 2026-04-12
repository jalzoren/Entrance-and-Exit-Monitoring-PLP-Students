import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { MdRestore } from 'react-icons/md';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function ArchivedDepartments() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedDepartments, setArchivedDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ── Fetch archived departments on component mount ──────────────────────────
  useEffect(() => {
    fetchArchivedDepartments();
  }, []);

  const fetchArchivedDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/departments?status=Inactive');
      if (!response.ok) throw new Error('Failed to fetch archived departments');
      const data = await response.json();
      setArchivedDepartments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching archived departments:', err);
      setError('Failed to load archived departments');
      setArchivedDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const filtered = archivedDepartments.filter((dept) => {
    const matchesSearch = [dept.dept_code, dept.dept_name]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleRestoreClick = (dept) => {
    setSelectedDepartment(dept);
    setShowRestoreModal(true);
  };

  const handleRestoreConfirm = async () => {
    try {
      setRestoring(true);

      // Send restore request to backend with Active status
      const response = await fetch(`http://localhost:5000/api/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept_code: selectedDepartment.dept_code,
          dept_name: selectedDepartment.dept_name,
          status: 'Active'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore department');
      }

      // Remove from archived list
      setArchivedDepartments((prev) => prev.filter((d) => d.id !== selectedDepartment.id));

      Swal.fire({
        title: 'Success',
        html: `<p><strong>"${selectedDepartment.dept_name}"</strong> has been restored successfully!</p>`,
        icon: 'success',
        confirmButtonText: 'Done'
      });

      setShowRestoreModal(false);
      setSelectedDepartment(null);

    } catch (err) {
      console.error('Restore error:', err);
      Swal.fire({
        title: 'Restore Failed',
        text: err.message || 'Something went wrong. Please try again.',
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="archive-tab">
      {/* Search Bar */}
      <div className="tab-topbar">
        <input
          type="text"
          className="tab-search"
          placeholder="Search by Department Code or Name..."
          value={search}
          onChange={handleSearchChange}
        />
        <span className="result-count">Total: {filtered.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Department Code</th>
              <th>Department Name</th>
              <th>Status</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="tab-empty">Loading archived departments...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="tab-empty" style={{ color: 'red' }}>Error: {error}</td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((dept, idx) => (
                <tr key={dept.id}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{dept.dept_code || 'N/A'}</td>
                  <td>{dept.dept_name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${dept.status === 'Active' ? 'active' : 'inactive'}`}>
                      {dept.status}
                    </span>
                  </td>
                  <td>
                    {dept.created_at
                      ? new Date(dept.created_at).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <button
                      className="btn-restore"
                      onClick={() => handleRestoreClick(dept)}
                      title="Restore department"
                      disabled={restoring}
                    >
                      <MdRestore /> Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="tab-empty">No archived departments found.</td>
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
      {showRestoreModal && selectedDepartment && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Restore Department</h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-field modal-full-width">
                <label className="modal-label">Department to Restore</label>
                <div style={{
                  padding: '12px 14px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  <div><strong>Code:</strong> {selectedDepartment.dept_code}</div>
                  <div><strong>Name:</strong> {selectedDepartment.dept_name}</div>
                  <div><strong>Status:</strong> Active</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleRestoreConfirm}
                disabled={restoring}
              >
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArchivedDepartments;
