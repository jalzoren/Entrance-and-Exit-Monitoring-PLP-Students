// Users.jsx - Updated version
import React, { useState, useEffect } from "react";
import "../../css/Users.css";
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiShield, FiUserCheck, FiArchive } from "react-icons/fi";
import AddUser from "../../components/AddUser";
import EditUser from "../../components/EditUser";
import Swal from 'sweetalert2';
import { useAuth } from "../../context/AuthContext";

function Users() {
  const { user } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  
  // New state for selection
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
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
          created: user.created
        };
      });
      
      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to load users. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const stats = {
    total: users.length,
    superAdmin: users.filter(u => u.role === "Super Admin").length,
    eemsAdmin: users.filter(u => u.role === "EEMS Admin").length,
    eamsAdmin: users.filter(u => u.role === "EAMS Admin").length,
  };

  const handleUserAdded = (newUser) => {
    const nameParts = newUser.fullname.split(', ');
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
    
    const transformedUser = {
      email: newUser.email,
      full_name: newUser.fullname,
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      role: newUser.role,
      created: newUser.created
    };
    
    setUsers(prevUsers => [transformedUser, ...prevUsers]);
    setShowAddUser(false);
    
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'User has been added successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleEdit = (email) => {
    console.log("Editing user with email:", email);
    setSelectedUserEmail(email);
    setShowEditUser(true);
  };

  const handleUserUpdated = (updatedUser) => {
    const nameParts = updatedUser.fullname.split(', ');
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
    
    const transformedUser = {
      email: updatedUser.email,
      full_name: updatedUser.fullname,
      firstName: firstName,
      lastName: lastName,
      middleName: middleName,
      role: updatedUser.role,
      created: updatedUser.created
    };
    
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.email === transformedUser.email ? transformedUser : user
      )
    );
    
    setShowEditUser(false);
    setSelectedUserEmail(null);
    
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'User has been updated successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Archive single user (replaces delete)
  const handleArchive = async (email, fullName) => {
    const result = await Swal.fire({
      title: 'Archive User?',
      text: `Are you sure you want to archive ${fullName}? They will be moved to Archived Users.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, archive it!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      Swal.fire({
        title: 'Archiving...',
        text: 'Please wait',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch(`http://localhost:5000/api/users/archive/${encodeURIComponent(email)}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive user');
      }
      
      Swal.close();
      setUsers(prevUsers => prevUsers.filter(user => user.email !== email));
      
      Swal.fire({
        icon: 'success',
        title: 'Archived!',
        text: 'User has been archived successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error archiving user:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to archive user. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  // Bulk archive users
  const handleBulkArchive = async () => {
    if (selectedUsers.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Selection',
        text: 'Please select at least one user to archive.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    const result = await Swal.fire({
      title: 'Archive Selected Users?',
      text: `Are you sure you want to archive ${selectedUsers.size} user(s)? They will be moved to Archived Users.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, archive them!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      Swal.fire({
        title: 'Archiving...',
        text: 'Please wait',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await fetch('http://localhost:5000/api/users/archive/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ emails: Array.from(selectedUsers) })
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive users');
      }
      
      const data = await response.json();
      
      Swal.close();
      setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.has(user.email)));
      setSelectedUsers(new Set());
      setSelectAll(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Archived!',
        text: `${data.count} user(s) have been archived successfully.`,
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (err) {
      console.error('Error archiving users:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to archive users. Please try again.',
        confirmButtonColor: '#3085d6'
      });
    }
  };

  // Handle individual checkbox selection
  const handleSelectUser = (email) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === filteredUsers.length && filteredUsers.length > 0);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      const newSelected = new Set(currentUsers.map(user => user.email));
      setSelectedUsers(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesSearch = searchQuery === "" ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Clear selections when changing page
      setSelectedUsers(new Set());
      setSelectAll(false);
    }
  };

  return (
    <div className="users">
      <header className="header-card">
        <h1>USER MANAGEMENT</h1>
        <p className="subtitle">Dashboard / User Management</p>
      </header>

      <hr className="header-divider" />

      {/* STAT CARDS */}
      <div className="stats-container users-stats">
        <div className="stat-card total-users">
          <div className="stat-icon"><FiUsers /></div>
          <div className="stat-details">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>

        <div className="stat-card super-admin">
          <div className="stat-icon"><FiShield /></div>
          <div className="stat-details">
            <h3>Super Admin</h3>
            <p className="stat-number">{stats.superAdmin}</p>
          </div>
        </div>

        <div className="stat-card eems-admin">
          <div className="stat-icon"><FiUserCheck /></div>
          <div className="stat-details">
            <h3>EEMS Admin</h3>
            <p className="stat-number">{stats.eemsAdmin}</p>
          </div>
        </div>

        <div className="stat-card eams-admin">
          <div className="stat-icon"><FiUserCheck /></div>
          <div className="stat-details">
            <h3>EAMS Admin</h3>
            <p className="stat-number">{stats.eamsAdmin}</p>
          </div>
        </div>
      </div>

      <div className="user-management">
        <div className="controls">
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="EEMS Admin">EEMS Admin</option>
            <option value="EAMS Admin">EAMS Admin</option>
            <option value="Super Admin">Super Admin</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            className="action-button add-button"
            onClick={() => setShowAddUser(true)}
          >
            <FiPlus className="button-icon" />
            Add User
          </button>

          {/* Bulk Archive Button */}
          {selectedUsers.size > 0 && (
            <button
              className="action-button archive-button"
              onClick={handleBulkArchive}
              style={{
                backgroundColor: '#d33',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiArchive className="button-icon" />
              Archive Selected ({selectedUsers.size})
            </button>
          )}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      disabled={currentUsers.length === 0}
                    />
                  </th>
                  <th>No.</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((user, index) => (
                    <tr key={user.email}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.email)}
                          onChange={() => handleSelectUser(user.email)}
                        />
                      </td>
                      <td>{indexOfFirstRecord + index + 1}</td>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role.replace(/\s+/g, '-').toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(user.email)}
                          title="Edit User"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button
                          className="archive-btn"
                          onClick={() => handleArchive(user.email, user.full_name)}
                          title="Archive User"
                          style={{
                            backgroundColor: '#d33',
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          <FiArchive /> Archive
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && filteredUsers.length > 0 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`page-number ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}

        {showAddUser && (
          <AddUser 
            onClose={() => setShowAddUser(false)}
            onUserAdded={handleUserAdded}
          />
        )}

        {showEditUser && selectedUserEmail && (
          <EditUser
            onClose={() => {
              setShowEditUser(false);
              setSelectedUserEmail(null);
            }}
            onUserUpdated={handleUserUpdated}
            userEmail={selectedUserEmail}
          />
        )}
      </div>
    </div>
  );
}

export default Users;