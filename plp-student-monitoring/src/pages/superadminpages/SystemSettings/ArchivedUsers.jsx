// ArchivedUsers.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { MdRestore } from 'react-icons/md';
import { FiUsers, FiShield, FiUserCheck } from 'react-icons/fi';
import '../../../css/GlobalModal.css';
import '../../../css/SystemSettings.css';

const ROWS_PER_PAGE = 10;

function ArchivedUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);

  // Stats calculation
  const stats = useMemo(() => ({
    total: archivedUsers.length,
    superAdmin: archivedUsers.filter(u => u.role === "Super Admin").length,
    eemsAdmin: archivedUsers.filter(u => u.role === "EEMS Admin").length,
    eamsAdmin: archivedUsers.filter(u => u.role === "EAMS Admin").length,
  }), [archivedUsers]);

  useEffect(() => {
    fetchArchivedUsers();
  }, []);

  const fetchArchivedUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users/archived/all', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch archived users');
      }
      const data = await response.json();
      
      const transformedUsers = data.map(user => {
        const nameParts = user.fullname.split(', ');
        const lastName = nameParts[0] || '';
        const firstAndMiddle = nameParts[1] ? nameParts[1].split(' ') : [];
        
        let firstName = '';
        let middleName = '';
        
        if (firstAndMiddle.length > 1) {
          middleName = firstAndMiddle.pop();
          firstName = firstAndMiddle.join(' ');
        } else {
          firstName = firstAndMiddle[0] || '';
          middleName = '';
        }
        
        return {
          email: user.email,
          full_name: user.fullname,
          firstName: firstName,
          lastName: lastName,
          middleName: middleName,
          role: user.role,
          created: user.created,
          archived_at: user.archived_at
        };
      });
      
      setArchivedUsers(transformedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching archived users:', err);
      setError('Failed to load archived users');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (email, fullName) => {
    const result = await Swal.fire({
      title: 'Restore User?',
      text: `Are you sure you want to restore ${fullName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore it!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      setRestoring(true);
      Swal.fire({
        title: 'Restoring...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch(`http://localhost:5000/api/users/restore/${encodeURIComponent(email)}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore user');
      }
      
      Swal.close();
      setArchivedUsers(prevUsers => prevUsers.filter(user => user.email !== email));
      
      Swal.fire({
        icon: 'success',
        title: 'Restored!',
        text: 'User has been restored successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error restoring user:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to restore user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const filteredUsers = archivedUsers.filter((user) => {
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesSearch = search === "" ||
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredUsers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  return (
    <div className="archive-tab">
      {/* Stats Cards */}
      <div className="stats-container users-stats" style={{ marginBottom: '20px' }}>
        <div className="stat-card total-users">
          <div className="stat-icon"><FiUsers /></div>
          <div className="stat-details">
            <h3>Archived Users</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>

        <div className="stat-card super-admin">
          <div className="stat-icon"><FiShield /></div>
          <div className="stat-details">
            <h3>Archived Super Admin</h3>
            <p className="stat-number">{stats.superAdmin}</p>
          </div>
        </div>

        <div className="stat-card eems-admin">
          <div className="stat-icon"><FiUserCheck /></div>
          <div className="stat-details">
            <h3>Archived EEMS Admin</h3>
            <p className="stat-number">{stats.eemsAdmin}</p>
          </div>
        </div>

        <div className="stat-card eams-admin">
          <div className="stat-icon"><FiUserCheck /></div>
          <div className="stat-details">
            <h3>Archived EAMS Admin</h3>
            <p className="stat-number">{stats.eamsAdmin}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="tab-topbar">
        <input
          type="text"
          className="tab-search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select 
          value={roleFilter} 
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        >
          <option value="">All Roles</option>
          <option value="Super Admin">Super Admin</option>
          <option value="EEMS Admin">EEMS Admin</option>
          <option value="EAMS Admin">EAMS Admin</option>
        </select>
        <span className="result-count">Total: {filteredUsers.length}</span>
      </div>

      {/* Table */}
      <div className="tab-table-wrapper">
        <table className="tab-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Archived Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="tab-empty">Loading archived users...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="tab-empty" style={{ color: 'red' }}>Error: {error}</td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((user, idx) => (
                <tr key={user.email}>
                  <td>{(safePage - 1) * ROWS_PER_PAGE + idx + 1}</td>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{formatDate(user.archived_at)}</td>
                  <td>
                    <button
                      className="btn-restore"
                      onClick={() => handleRestore(user.email, user.full_name)}
                      title="Restore user"
                      disabled={restoring}
                    >
                      <MdRestore /> Restore
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="tab-empty">No archived users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="tab-pagination">
          <button
            className="page-btn page-nav"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            ← Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (safePage <= 3) {
              pageNum = i + 1;
            } else if (safePage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = safePage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                className={`page-btn page-num ${safePage === pageNum ? 'page-active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="page-btn page-nav"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default ArchivedUsers;