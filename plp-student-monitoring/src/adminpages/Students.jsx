// frontend/src/adminpages/Students.jsx


import React, { useState, useEffect } from "react";
import "../css/Students.css";
import RegisterStudent from "../components/RegisterStudent";
import ImportStudent from "../components/ImportStudents";
import axios from "axios";
import { FiDownload, FiPlus, FiFilter } from "react-icons/fi";
import { IoMdArrowDropdown } from "react-icons/io";
import { IoNotificationsCircleOutline } from "react-icons/io5";

function Students() {
  const [currentPage, setCurrentPage] = useState(1);
  const [department, setDepartment]  = useState("");
  const [yearLevel, setYearLevel]  = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFaceCount, setPendingFaceCount] = useState(0);

  // ================= FETCH STUDENTS =================
  const fetchStudents = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/students");
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  // ================= FETCH PENDING FACE REGISTRATION COUNT =================
  const fetchPendingFaceReg = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/pending-face-registration"
      );
      setPendingFaceCount(response.data.count);
    } catch (error) {
      console.error("Error fetching pending face registration count:", error);
    }
  };


  useEffect(() => {
    fetchStudents();
    fetchPendingFaceReg();
  }, []);

  // ================= FILTERING =================
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name || ""} ${student.last_name || ""} ${
      student.middle_name || ""
    }`.toLowerCase();

    return (
      (department === "" || student.college_department === department) &&
      (yearLevel === "" || student.year_level === yearLevel) &&
      (registrationDate === "" || student.created_at?.includes(registrationDate)) &&
      (searchQuery === "" ||
        (student.student_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        fullName.includes(searchQuery.toLowerCase()))
    );
  });

  // ================= PAGINATION =================
  const recordsPerPage  = 5;
  const totalPages      = Math.ceil(filteredStudents.length / recordsPerPage);
  const indexOfLastRecord  = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleAddClick = () => {
    setShowRegisterModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    document.body.style.overflow = 'unset';
    // Refresh the list after successful registration
    fetchStudents();
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    document.body.style.overflow = 'unset';
    // Refresh the list after successful import
    fetchStudents();
  };

  const handleImportSuccess = () => {
    fetchStudents();   
    fetchPendingFaceReg();
    handleCloseImportModal();
  };

  // ================= ACTIONS =================
  const handleEdit = (studentId) => {
    console.log('Edit student:', studentId);
    // Add edit functionality here
  };

  const handleStatusChange = async (studentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Regular' ? 'Irregular' : 'Regular';
      // Add API call to update status
      await axios.put(`/api/students/${studentId}`, { status: newStatus });
      
      // Refresh the list
      fetchStudents();
      
      console.log('Student status updated:', studentId, 'New status:', newStatus);
    } catch (err) {
      console.error('Error updating student status:', err);
      alert('Failed to update student status. Please try again.');
    }
  };

  const handleViewPhoto = (studentId) => {
    console.log('View photo for student:', studentId);
    // Add view photo functionality here
  };

  // Helper function to format full name
  const formatFullName = (student) => {
    if (!student) return '';
    
    const firstName = student.first_name || '';
    const lastName = student.last_name || '';
    const middleInitial = student.middle_name ? ` ${student.middle_name.charAt(0)}.` : '';
    
    return `${firstName} ${lastName}${middleInitial}`.trim();
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to get status badge class
  const getStatusBadgeClass = (status) => {
    if (!status) return 'unknown';
    return status.toLowerCase();
  };

  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      if (start > 2) {
        pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
      
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }
    
    return pages;
  };

  return (
    <div>
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">Dashboard / Student Management</p>
        <p className="subtitle">Dashboard / Student Management</p>
      </header>
      <hr className="header-divider"></hr>

      <hr className="header-divider" />

      {/* ================= NOTIFICATION BOX =================*/}
      {pendingFaceCount > 0 && (
        <section className="notification_box">
          <div className="notification_wrapper">
            <h3>
              <IoNotificationsCircleOutline />
            </h3>
            <div className="notification-content">
              <p>
                <strong>Action Required:</strong>{" "}
                There {pendingFaceCount === 1 ? "is" : "are"}{" "}
                <strong>{pendingFaceCount}</strong>{" "}
                student{pendingFaceCount === 1 ? "" : "s"} that{" "}
                {pendingFaceCount === 1 ? "needs" : "need"} face registration.
                Please complete the remaining requirements to finalize the registration and enable entrance and exit verification.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="student-management">
        {/* Controls Section */}
        <div className="controls">
          <button type="button" className="sort-button">
            <FiFilter className="sort-icon" />
            Sort
            <IoMdArrowDropdown className="dropdown-icon" />
          </button>

          <select 
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="College of Nursing">College of Nursing</option>
            <option value="College of Engineering">College of Engineering</option>
            <option value="College of Education">College of Education</option>
            <option value="College of Computer Studies">College of Computer Studies</option>
            <option value="College of Arts and Sciences">College of Arts and Sciences</option>
            <option value="College of Business Administration">College of Business Administration</option>
            <option value="College of Hospitality Management">College of Hospitality Management</option>
          </select>

          <select 
            className="filter-select"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
          >
            <option value="">All Year Levels</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>

          <select 
            className="filter-select"
            value={registrationDate}
            onChange={(e) => setRegistrationDate(e.target.value)}
          >
            <option value="">All Years</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search by name or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button className="action-button import-button" onClick={handleImportClick}>
            <FiDownload className="button-icon" />
            Import
          </button>

          <button className="action-button add-button" onClick={handleAddClick}>
            <FiPlus className="button-icon" />
            Add
          </button>
        </div>

        {/* Table Section */}
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Student ID</th>
                <th>First Name</th>
                <th>Middle Name</th>
                <th>Last Name</th>
                <th>College/Department</th>
                <th>Year Level</th>
                <th>Status</th>
                <th>Date Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No students found
                  </td>
                </tr>
              ) : (
                currentStudents.map((student, index) => (
                  <tr key={student.student_id}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{student.student_id}</td>
                    <td>
                      {student.first_name} {student.middle_name} {student.last_name}
                    </td>
                    <td>{student.college_department}</td>
                    <td>{student.year_level}</td>
                    <td>
                      <span className={`status-badge ${(student.status || "").toLowerCase()}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>{student.created_at?.split("T")[0]}</td>
                    <td>
                      <div className="action-buttons-text">
                        <button
                          className="action-text-btn edit-text-btn"
                          onClick={() => handleEdit(student.student_id)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-text-btn photo-text-btn"
                          onClick={() => handleViewPhoto(student.student_id)}
                        >
                          View Photo
                        </button>
                        <button
                          className={`action-text-btn ${
                            student.status === "Active" ? "deactivate-text-btn" : "activate-text-btn"
                          }`}
                          onClick={() => handleDeactivate(student.student_id, student.status)}
                        >
                          {student.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= PAGINATION ================= */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-number ${currentPage === page ? "active" : ""}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Register Student Modal */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={handleCloseRegisterModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RegisterStudent onClose={handleCloseRegisterModal} onSuccess={fetchStudents} />
          </div>
        </div>
      )}

      {/* Import Student Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ImportStudent
              isOpen={showImportModal}
              onClose={handleCloseImportModal}
              onSuccess={handleImportSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;