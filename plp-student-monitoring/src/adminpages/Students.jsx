import React, { useState } from 'react';
import '../css/Students.css';

function Students() {
  const [currentPage, setCurrentPage] = useState(1);
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data for demonstration
  const students = [
    { 
      id: 1, 
      studentId: '2021-001', 
      fullName: 'John Doe', 
      department: 'Engineering', 
      yearLevel: '1st Year', 
      enrollmentStatus: 'Active', 
      dateRegistered: '2024-01-15' 
    },
    { 
      id: 2, 
      studentId: '2021-002', 
      fullName: 'Jane Smith', 
      department: 'Science', 
      yearLevel: '2nd Year', 
      enrollmentStatus: 'Active', 
      dateRegistered: '2023-08-20' 
    },
    { 
      id: 3, 
      studentId: '2021-003', 
      fullName: 'Mike Johnson', 
      department: 'Arts', 
      yearLevel: '3rd Year', 
      enrollmentStatus: 'Active', 
      dateRegistered: '2022-09-10' 
    },
  ];

  const totalPages = 68;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    
    pages.push(
      <button
        key={1}
        className={`page-number ${currentPage === 1 ? 'active' : ''}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );

    if (totalPages >= 2) {
      pages.push(
        <button
          key={2}
          className={`page-number ${currentPage === 2 ? 'active' : ''}`}
          onClick={() => handlePageChange(2)}
        >
          2
        </button>
      );
    }

    if (totalPages >= 3) {
      pages.push(
        <button
          key={3}
          className={`page-number ${currentPage === 3 ? 'active' : ''}`}
          onClick={() => handlePageChange(3)}
        >
          3
        </button>
      );
    }

    pages.push(<span key="ellipsis" className="ellipsis">...</span>);

    if (totalPages >= 67) {
      pages.push(
        <button
          key={67}
          className={`page-number ${currentPage === 67 ? 'active' : ''}`}
          onClick={() => handlePageChange(67)}
        >
          67
        </button>
      );
    }

    if (totalPages >= 68) {
      pages.push(
        <button
          key={68}
          className={`page-number ${currentPage === 68 ? 'active' : ''}`}
          onClick={() => handlePageChange(68)}
        >
          68
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
      </header>
      <hr className="header-divider"></hr>

      {/* Student Management Content */}
      <div className="student-management">
        {/* Controls Section */}
        <div className="controls">
          <button className="sort-button">
            <span className="sort-icon">⬍</span>
            Sort
          </button>

          <select 
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Department</option>
            <option value="engineering">Engineering</option>
            <option value="science">Science</option>
            <option value="arts">Arts</option>
            <option value="business">Business</option>
          </select>

          <select 
            className="filter-select"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
          >
            <option value="">Year Level</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select 
            className="filter-select"
            value={registrationDate}
            onChange={(e) => setRegistrationDate(e.target.value)}
          >
            <option value="">Registration Date</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button className="action-button import-button">
            <span className="icon">📄</span>
            Import
          </button>

          <button className="action-button add-button">
            <span className="icon">➕</span>
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
                <th>Full Name</th>
                <th>College/Department</th>
                <th>Year Level</th>
                <th>Enrollment Status</th>
                <th>Date Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.department}</td>
                  <td>{student.yearLevel}</td>
                  <td>{student.enrollmentStatus}</td>
                  <td>{student.dateRegistered}</td>
                  <td className="action-cell">
                    <a href="#" className="action-link">[Edit]</a>{' '}
                    <a href="#" className="action-link">[Deactivate]</a>{' '}
                    <a href="#" className="action-link">[View Photo]</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="page-numbers">
            {renderPageNumbers()}
          </div>

          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default Students;