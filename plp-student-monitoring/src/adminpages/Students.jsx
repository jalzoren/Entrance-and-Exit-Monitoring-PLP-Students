import React, { useState } from 'react';
import '../css/Students.css';

function Students() {
  const [currentPage, setCurrentPage] = useState(1);
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data for demonstration - expanded to 15 students
  const allStudents = [
    { id: 1, studentId: '2021-001', fullName: 'John Doe', department: 'Engineering', yearLevel: '1st Year', enrollmentStatus: 'Active', dateRegistered: '2024-01-15' },
    { id: 2, studentId: '2021-002', fullName: 'Jane Smith', department: 'Science', yearLevel: '2nd Year', enrollmentStatus: 'Active', dateRegistered: '2023-08-20' },
    { id: 3, studentId: '2021-003', fullName: 'Mike Johnson', department: 'Arts', yearLevel: '3rd Year', enrollmentStatus: 'Active', dateRegistered: '2022-09-10' },
    { id: 4, studentId: '2021-004', fullName: 'Emily Brown', department: 'Business', yearLevel: '4th Year', enrollmentStatus: 'Active', dateRegistered: '2024-02-01' },
    { id: 5, studentId: '2021-005', fullName: 'David Wilson', department: 'Engineering', yearLevel: '2nd Year', enrollmentStatus: 'Inactive', dateRegistered: '2023-11-12' },
    { id: 6, studentId: '2021-006', fullName: 'Sarah Garcia', department: 'Science', yearLevel: '1st Year', enrollmentStatus: 'Active', dateRegistered: '2024-01-20' },
    { id: 7, studentId: '2021-007', fullName: 'James Martinez', department: 'Arts', yearLevel: '3rd Year', enrollmentStatus: 'Active', dateRegistered: '2023-05-15' },
    { id: 8, studentId: '2021-008', fullName: 'Lisa Anderson', department: 'Business', yearLevel: '2nd Year', enrollmentStatus: 'Active', dateRegistered: '2023-09-08' },
    { id: 9, studentId: '2021-009', fullName: 'Robert Taylor', department: 'Engineering', yearLevel: '4th Year', enrollmentStatus: 'Inactive', dateRegistered: '2022-12-03' },
    { id: 10, studentId: '2021-010', fullName: 'Maria Thomas', department: 'Science', yearLevel: '3rd Year', enrollmentStatus: 'Active', dateRegistered: '2024-01-05' },
    { id: 11, studentId: '2021-011', fullName: 'Charles Lee', department: 'Arts', yearLevel: '1st Year', enrollmentStatus: 'Active', dateRegistered: '2024-02-10' },
    { id: 12, studentId: '2021-012', fullName: 'Patricia White', department: 'Business', yearLevel: '2nd Year', enrollmentStatus: 'Active', dateRegistered: '2023-10-22' },
    { id: 13, studentId: '2021-013', fullName: 'Joseph Harris', department: 'Engineering', yearLevel: '3rd Year', enrollmentStatus: 'Inactive', dateRegistered: '2023-07-18' },
    { id: 14, studentId: '2021-014', fullName: 'Nancy Clark', department: 'Science', yearLevel: '4th Year', enrollmentStatus: 'Active', dateRegistered: '2023-06-14' },
    { id: 15, studentId: '2021-015', fullName: 'Thomas Lewis', department: 'Arts', yearLevel: '2nd Year', enrollmentStatus: 'Active', dateRegistered: '2024-01-30' },
  ];

  // Pagination settings
  const recordsPerPage = 5;
  const totalPages = Math.ceil(allStudents.length / recordsPerPage);

  // Get current students for the page
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentStudents = allStudents.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than max visible
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
      // Always show first page
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      // Calculate start and end of visible pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at the beginning
      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      }
      
      // Adjust if at the end
      if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push(<span key="ellipsis1" className="ellipsis">...</span>);
      }
      
      // Add middle pages
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
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="ellipsis">...</span>);
      }
      
      // Always show last page
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
              {currentStudents.map((student, index) => (
                <tr key={student.id}>
                  <td>{indexOfFirstRecord + index + 1}</td>
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