// pages/adminpages/Students.jsx
import React, { useState, useEffect, useMemo } from "react";
import "../../css/Students.css";
import RegisterStudent from "../../components/RegisterStudent";
import ImportStudent   from "../../components/ImportStudents";
import EditStudent     from "../../components/EditStudent";
import axios from "axios";
import Swal from 'sweetalert2';
import { FaUserGraduate } from "react-icons/fa";
import { BsPersonFillDash } from "react-icons/bs";
import { BsPersonFillSlash } from "react-icons/bs";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { FiDownload, FiPlus, FiFilter, FiArchive } from "react-icons/fi";
import {
  BsPersonFillExclamation,
  BsPersonFillCheck,
  BsFillPeopleFill,
  BsPersonDash,
} from "react-icons/bs";
import { IoMdArrowDropdown } from "react-icons/io";
import { IoNotificationsCircleOutline } from "react-icons/io5";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "Regular",     label: "Regular"     },
  { value: "Irregular",   label: "Irregular"   },
  { value: "LOA",         label: "LOA (Leave of Absence)" },
  { value: "Dropout",     label: "Dropout"     },
  { value: "Kickout",     label: "Kickout"     },
  { value: "Graduated",   label: "Graduated"   },
  { value: "Transferred", label: "Transferred" },
];

const getCollegeColor = (collegeAbbrev) => {
  const colorMap = {
    "CAS": "#9b59b6",     // College of Arts and Sciences - Purple
    "CBA": "#f1c40f",     // College of Business and Accountancy - Yellow
    "CCS": "#95a5a6",     // College of Computer Studies - Gray
    "COED": "#3498db",     // College of Education - Blue
    "COE": "#e67e22",     // College of Engineering - Orange
    "CIHM": "#e74c3c",    // College of International Hospitality Management - Red
    "LAW": "#8B4513",     // College of Law - Brown
    "CON": "#fd79a8",     // College of Nursing - Pink
  };
  return colorMap[collegeAbbrev] || "#95a5a6"; // Default gray if college not found
};

const ALL_STATUSES = [
  "Regular", "Irregular", "LOA", "Dropout", "Kickout", "Graduated", "Transferred", "Inactive",
];

// Which statuses count as "active / on-campus eligible"
const ACTIVE_STATUSES = ["Regular", "Irregular", "LOA"];

function statusBadgeClass(status) {
  if (!status) return "unknown";
  switch (status) {
    case "Regular":    return "regular";
    case "Irregular":  return "irregular";
    case "LOA":        return "loa";
    case "Dropout":    return "dropout";
    case "Kickout":    return "kickout";
    case "Graduated":  return "graduated";
    case "Transferred":return "transferred";
    case "Inactive":   return "inactive";
    default:           return "unknown";
  }
}

// ─── Batch-year helper ────────────────────────────────────────────────────────
// "23-00298"  →  "2023"
function batchYearFromId(studentId) {
  const prefix = studentId?.split("-")[0];
  if (!prefix || prefix.length !== 2) return null;
  return `20${prefix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Students() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [students,        setStudents]        = useState([]);
  const [faceStatusMap,   setFaceStatusMap]   = useState({});
  const [pendingFaceCount,setPendingFaceCount] = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // ── Filter option lists (fetched from DB) ─────────────────────────────────
  const [deptOptions,    setDeptOptions]    = useState([]);
  const [programOptions, setProgramOptions] = useState([]);

  // ── Active filter values ──────────────────────────────────────────────────
  const [filterDept,       setFilterDept]       = useState("");
  const [filterProgram,    setFilterProgram]     = useState("");
  const [filterYearLevel,  setFilterYearLevel]   = useState("");
  const [filterBatchYear,  setFilterBatchYear]   = useState("");
  const [filterStatus,     setFilterStatus]      = useState("");
  const [filterFaceStatus, setFilterFaceStatus]  = useState("");
  const [searchQuery,      setSearchQuery]       = useState("");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal,   setShowImportModal]   = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [editingStudent,    setEditingStudent]    = useState(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage,   setCurrentPage]   = useState(1);
  const recordsPerPage = 10;

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sortColumn, setSortColumn] = useState("last_name");
  const [sortDirection, setSortDirection] = useState("asc");

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  // ── College status chart data ───────────────────────────────────────────────
  const [collegeStatusData, setCollegeStatusData] = useState([]);
  const [collegeChartLoading, setCollegeChartLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────

  const fetchCollegeStatus = async () => {
    setCollegeChartLoading(true);
    try {
      const res = await axios.get("/api/analytics/college-status-summary");
      setCollegeStatusData(res.data);
    } catch (err) {
      console.error("Failed to load college status:", err);
    } finally {
      setCollegeChartLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/students");
      setStudents(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setError(
        err.code === "ERR_NETWORK"
          ? "Cannot connect to server."
          : "Failed to load students."
      );
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaceStatus = async () => {
    try {
      const res = await axios.get("/api/students-face-status");
      setFaceStatusMap(res.data || {});
    } catch { /* silent */ }
  };

  const fetchPendingFace = async () => {
    try {
      const res = await axios.get("/api/pending-face-registration");
      setPendingFaceCount(res.data.count || 0);
    } catch { /* silent */ }
  };

  const fetchFilterOptions = async () => {
    try {
      const [deptRes, progRes] = await Promise.all([
        fetch("/api/departments?status=Active"),
        fetch("/api/programs?programStatus=Active"),
      ]);
      const depts = await deptRes.json();
      const progs = await progRes.json();
      setDeptOptions(Array.isArray(depts) ? depts : []);
      setProgramOptions(Array.isArray(progs) ? progs : []);
    } catch (err) {
      console.error("[Students] filter options fetch error:", err);
    }
  };

  const refreshAll = () => {
    fetchStudents();
    fetchFaceStatus();
    fetchPendingFace();
    fetchCollegeStatus();
  };

  useEffect(() => {
    refreshAll();
    fetchFilterOptions();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [
    searchQuery, filterDept, filterProgram,
    filterYearLevel, filterBatchYear, filterStatus, filterFaceStatus,
  ]);

  useEffect(() => {
    setFilterProgram("");
  }, [filterDept]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────

  const programsForFilter = useMemo(() => {
    if (!filterDept) return programOptions;
    return programOptions.filter(p => p.dept_name === filterDept);
  }, [filterDept, programOptions]);

  const batchYearOptions = useMemo(() => {
    const set = new Set(
      students.map(s => batchYearFromId(s.student_id)).filter(Boolean)
    );
    return [...set].sort((a, b) => b - a);
  }, [students]);

  // ── Stats (still needed for the summary legend) ───────────────────────────
  const stats = useMemo(() => ({
    total:       students.length,
    regular:     students.filter(s => s.status === "Regular").length,
    irregular:   students.filter(s => s.status === "Irregular").length,
    loa:         students.filter(s => s.status === "LOA").length,
    graduated:   students.filter(s => s.status === "Graduated").length,
    transferred: students.filter(s => s.status === "Transferred").length,
    withdrawn:   students.filter(s => s.status === "Dropout" || s.status === "Kickout").length,
    inactive:    students.filter(s => s.status === "Inactive").length,
  }), [students]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        s.first_name?.toLowerCase().includes(q)  ||
        s.last_name?.toLowerCase().includes(q)   ||
        s.student_id?.toLowerCase().includes(q);
      const matchDept    = !filterDept    || s.dept_name    === filterDept;
      const matchProg    = !filterProgram || s.program_name === filterProgram;
      const matchYear    = !filterYearLevel || String(s.year_level) === filterYearLevel;
      const matchBatch   = !filterBatchYear || batchYearFromId(s.student_id) === filterBatchYear;
      const matchStatus  = !filterStatus  || s.status === filterStatus;
      const hasFace      = faceStatusMap[s.student_id] === true;
      const matchFace    =
        !filterFaceStatus ||
        (filterFaceStatus === "registered" &&  hasFace) ||
        (filterFaceStatus === "missing"    && !hasFace);
      return matchSearch && matchDept && matchProg && matchYear &&
             matchBatch && matchStatus && matchFace;
    });
  }, [
    students, searchQuery, filterDept, filterProgram,
    filterYearLevel, filterBatchYear, filterStatus, filterFaceStatus, faceStatusMap,
  ]);

  // ── Sorted list ────────────────────────────────────────────────────────────
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents].sort((a, b) => {
      let aVal, bVal;
      switch(sortColumn) {
        case "last_name":
          aVal = `${a.last_name || ""} ${a.first_name || ""}`.toLowerCase();
          bVal = `${b.last_name || ""} ${b.first_name || ""}`.toLowerCase();
          break;
        case "first_name":
          aVal = a.first_name?.toLowerCase() || "";
          bVal = b.first_name?.toLowerCase() || "";
          break;
        case "student_id":
          aVal = a.student_id?.toLowerCase() || "";
          bVal = b.student_id?.toLowerCase() || "";
          break;
        case "college_department":
          aVal = a.dept_name?.toLowerCase() || "";
          bVal = b.dept_name?.toLowerCase() || "";
          break;
        case "program_name":
          aVal = a.program_name?.toLowerCase() || "";
          bVal = b.program_name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status?.toLowerCase() || "";
          bVal = b.status?.toLowerCase() || "";
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredStudents, sortColumn, sortDirection]);

  // ── Paginated slice ───────────────────────────────────────────────────────
  const totalPages      = Math.max(1, Math.ceil(sortedStudents.length / recordsPerPage));
  const indexOfFirst    = (currentPage - 1) * recordsPerPage;
  const currentStudents = sortedStudents.slice(indexOfFirst, indexOfFirst + recordsPerPage);

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL / SORT HANDLERS (unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  const openModal  = () => { document.body.style.overflow = "hidden"; };
  const closeModal = () => { document.body.style.overflow = "unset"; };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIndicator = (column) => {
    if (sortColumn !== column) return " ⇅";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === currentStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(currentStudents.map(s => s.student_id)));
    }
  };

  const handleAdd    = () => { openModal(); setShowRegisterModal(true); };
  const handleImport = () => { openModal(); setShowImportModal(true); };
  const handleEdit   = (student) => {
    setEditingStudent({ ...student, hasFace: faceStatusMap[student.student_id] === true });
    openModal();
    setShowEditModal(true);
  };

  const handleCloseRegister = () => { closeModal(); setShowRegisterModal(false); refreshAll(); };
  const handleCloseImport   = () => { closeModal(); setShowImportModal(false); };
  const handleImportSuccess = () => { refreshAll(); handleCloseImport(); };
  const handleCloseEdit     = () => {
    closeModal(); setShowEditModal(false); setEditingStudent(null); refreshAll();
  };

  // ── Bulk archive ──────────────────────────────────────────────────────────
  const ARCHIVABLE_STATUSES = ["LOA", "Dropout", "Kickout", "Graduated", "Transferred"];

  const handleArchiveByStatus = async (status) => {
    if (!status || !ARCHIVABLE_STATUSES.includes(status)) {
      Swal.fire({ icon: 'error', title: 'Invalid Status', text: `Cannot archive status: ${status}`, confirmButtonColor: '#3085d6' });
      return;
    }
    const count = students.filter(s => s.status === status).length;
    if (count === 0) {
      Swal.fire({ icon: 'info', title: 'No Students Found', text: `No ${status} students to archive.`, confirmButtonColor: '#3085d6' });
      return;
    }
    const result = await Swal.fire({
      title: 'Archive Students?',
      html: `Are you sure you want to archive <strong>${count}</strong> ${status} student${count > 1 ? 's' : ''}?<br><br>Their original status will be preserved and they will be moved to the archived students list.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Yes, archive ${count} student${count > 1 ? 's' : ''}!`,
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    Swal.fire({
      title: 'Archiving...', text: `Please wait while we archive ${count} student${count > 1 ? 's' : ''}.`,
      allowOutsideClick: false, showConfirmButton: false, didOpen: () => { Swal.showLoading(); }
    });
    try {
      const res = await axios.put("/api/students/archive-by-status", { status });
      setStudents(prev => prev.filter(s => s.status !== status));
      Swal.fire({
        icon: 'success', title: 'Archived Successfully!',
        html: `<strong>${res.data.count || count}</strong> ${status} student${(res.data.count || count) > 1 ? 's have' : ' has'} been archived.`,
        timer: 3000, showConfirmButton: false
      });
      refreshAll();
    } catch (err) {
      console.error('Archive error:', err);
      Swal.fire({ icon: 'error', title: 'Archive Failed', text: err.response?.data?.message || 'Something went wrong. Please try again.', confirmButtonColor: '#3085d6' });
      refreshAll();
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const formatFullName = (s) => {
    if (!s) return "";
    const mid = s.middle_name ? ` ${s.middle_name.charAt(0)}.` : "";
    const ext = s.extension_name ? ` ${s.extension_name}` : "";
    return `${s.last_name || ""}, ${s.first_name || ""}${mid}${ext}`.trim();
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d)
      .toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
      .replace(/\//g, "-");
  };

  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const addBtn = (i) => pages.push(
      <button key={i} className={`page-number ${currentPage === i ? "active" : ""}`}
        onClick={() => setCurrentPage(i)}>{i}</button>
    );
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) addBtn(i);
    } else {
      addBtn(1);
      let start = Math.max(2, currentPage - 1);
      let end   = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3)              end   = 4;
      if (currentPage >= totalPages - 2) start = totalPages - 3;
      if (start > 2) pages.push(<span key="e1" className="ellipsis">…</span>);
      for (let i = start; i <= end; i++) addBtn(i);
      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">…</span>);
      addBtn(totalPages);
    }
    return pages;
  };

  const CustomLegend = ({ payload }) => {
  // Split the payload into two columns
  const midPoint = Math.ceil(payload.length / 2);
  const leftColumn = payload.slice(0, midPoint);
  const rightColumn = payload.slice(midPoint);
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '40px',
      marginTop: '20px',
      width: '100%'
    }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        {leftColumn.map((entry, index) => (
          <div key={`legend-left-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: entry.color,
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', color: '#333' }}>{entry.value}</span>
          </div>
        ))}
      </div>
      
      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        {rightColumn.map((entry, index) => (
          <div key={`legend-right-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: entry.color,
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '12px', color: '#333' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="students">
      {/* ── Page header ── */}
      <header className="header-card">
        <h1>STUDENT MANAGEMENT</h1>
        <p className="subtitle">Dashboard / Student Management</p>
      </header>
      <hr className="header-divider" />

      {/* ── Face registration notification ── */}
      {pendingFaceCount > 0 && (
        <section className="notification_box">
          <div className="notification_wrapper">
            <h3><IoNotificationsCircleOutline /></h3>
            <div className="notification-content">
              <p>
                <strong>Action Required:</strong>{" "}
                <strong>{pendingFaceCount}</strong> student{pendingFaceCount !== 1 && "s"} need
                {pendingFaceCount === 1 ? "s" : ""} face registration.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── College Analytics Section (replaces stat cards) ── */}
      {collegeChartLoading ? (
        <div className="loading-charts">Loading college statistics…</div>
      ) : (
        <div className="college-analytics-section">
          <h3 className="section-title">College Distribution &amp; Status Breakdown</h3>

          <div className="charts-row">

            {/* Pie Chart – Total Students per College */}
            <div className="chart-card chart-card--pie">
              <div className="chart-card-header">
                <h4>Total Students by College</h4>
              </div>
              <div className="chart-card-body">
                <ResponsiveContainer width="100%" height={320}>
                <PieChart>
  <Pie
    data={collegeStatusData}
    dataKey="total"
    nameKey="collegeAbbrev"
    cx="50%"
    cy="50%"
    outerRadius={95}
    labelLine={false}
    label={({ collegeAbbrev, percent }) =>
      `${collegeAbbrev}: ${(percent * 100).toFixed(0)}%`
    }
  >
    {collegeStatusData.map((entry, index) => (
      <Cell 
        key={`cell-${index}`} 
        fill={getCollegeColor(entry.collegeAbbrev)}
        stroke="#fff"
        strokeWidth={2}
      />
    ))}
  </Pie>
  <Tooltip
    formatter={(value, name, props) =>
      [`${value} students`, props.payload.college]
    }
    cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
  />
  <Legend 
    content={<CustomLegend />}
    verticalAlign="bottom"
    align="center"
  />
</PieChart>
              </ResponsiveContainer>
            </div>
          </div>

            {/* Vertical Stacked Bar Chart – Status per College */}
            <div className="chart-card chart-card--bar">
              <div className="chart-card-header">
                <h4>Student Status Breakdown by College</h4>
              </div>
              <div className="chart-card-body">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={collegeStatusData}
                    margin={{ top: 18, right: 20, left: 0, bottom: 22 }}
                    barCategoryGap="18%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="collegeAbbrev" tick={{ fontSize: 11, fill: '#5c6b7a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#5c6b7a' }} />
                    <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
                    <Bar dataKey="regular"   stackId="status" fill="#17a057" name="Regular" />
                    <Bar dataKey="irregular" stackId="status" fill="#f39c12" name="Irregular" />
                    <Bar dataKey="loa"       stackId="status" fill="#3498db" name="LOA" />
                    <Bar dataKey="graduated" stackId="status" fill="#9b59b6" name="Graduated" />
                    <Bar dataKey="withdrawn" stackId="status" fill="#e74c3c" name="Withdrawn" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Summary legend strip (replaces the old stat cards) ── */}
              <div className="chart-summary-legend">
                <span className="summary-item summary-total">
                  <span className="summary-dot" style={{ background: "#3498db" }} />
                  TOTAL STUDENTS: {stats.total.toLocaleString()}
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: "#2ecc71" }} />
                  REGULAR: {stats.regular.toLocaleString()}
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: "#f39c12" }} />
                  IRREGULAR: {stats.irregular.toLocaleString()}
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: "#3498db" }} />
                  LOA: {stats.loa.toLocaleString()}
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: "#9b59b6" }} />
                  GRADUATED: {stats.graduated.toLocaleString()}
                </span>
                <span className="summary-item">
                  <span className="summary-dot" style={{ background: "#e74c3c" }} />
                  WITHDRAWN: {stats.withdrawn.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="student-management">

        {/* ── Controls row ── */}
        <div className="controls">
          <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.dept_name}>{d.dept_name}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterProgram}
            onChange={e => setFilterProgram(e.target.value)}
            disabled={programsForFilter.length === 0}
          >
            <option value="">All Programs</option>
            {programsForFilter.map(p => (
              <option key={p.id} value={p.program_name}>
                {p.program_name} ({p.program_code})
              </option>
            ))}
          </select>

          <select className="filter-select" value={filterYearLevel} onChange={e => setFilterYearLevel(e.target.value)}>
            <option value="">All Year Levels</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select className="filter-select" value={filterBatchYear} onChange={e => setFilterBatchYear(e.target.value)}>
            <option value="">All Batches</option>
            {batchYearOptions.map(y => (
              <option key={y} value={y}>Batch {y}</option>
            ))}
          </select>

          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select className="filter-select" value={filterFaceStatus} onChange={e => setFilterFaceStatus(e.target.value)}>
            <option value="">All Face Status</option>
            <option value="registered">Face Registered</option>
            <option value="missing">Face Not Registered</option>
          </select>

          <input
            type="text"
            className="search-input"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <button className="action-button import-button" onClick={handleImport}>
            <FiDownload className="button-icon" /> Import
          </button>
          <button className="action-button add-button" onClick={handleAdd}>
            <FiPlus className="button-icon" /> Add
          </button>
        </div>

        {/* ── Archive buttons section ── */}
  <div className="archive-buttons-section">
    <h4 className="archive-section-title">Archive Students by Status:</h4>
    <div className="archive-buttons-group">
      <button className="action-button archive-button" onClick={() => handleArchiveByStatus("LOA")}>
        <FiArchive className="button-icon" /> Archive all LOA students
      </button>
      <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Dropout")}>
        <FiArchive className="button-icon" /> Archive all Dropout students
      </button>
      <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Kickout")}>
        <FiArchive className="button-icon" /> Archive all Kickout students
      </button>
      <button className="action-button archive-button" onClick={() => handleArchiveByStatus("Transferred")}>
        <FiArchive className="button-icon" /> Archive all Transferred students
      </button>
    </div>
  </div>

        {/* ── Face legend ── */}
        <div className="face-legend">
          <span className="face-legend-title">Face Registration:</span>
          <span className="face-legend-item">
            <span className="face-dot face-dot-registered" /> Registered
          </span>
          <span className="face-legend-item">
            <span className="face-dot face-dot-missing" /> Not registered
          </span>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">Loading students…</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : (
            <table className="student-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === currentStudents.length && currentStudents.length > 0}
                      onChange={handleSelectAll}
                      title="Select all on this page"
                    />
                  </th>
                  <th>No.</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("student_id")}>
                    Student ID{getSortIndicator("student_id")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("last_name")}>
                    Full Name{getSortIndicator("last_name")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("college_department")}>
                    Department{getSortIndicator("college_department")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("program_name")}>
                    Program{getSortIndicator("program_name")}
                  </th>
                  <th>Year Level</th>
                  <th>Section</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
                    Status{getSortIndicator("status")}
                  </th>
                  <th>Date Registered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.length > 0 ? currentStudents.map((s, idx) => {
                  const hasFace = faceStatusMap[s.student_id] === true;
                  return (
                    <tr key={s.student_id}>
                      <td style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.student_id)}
                          onChange={() => handleSelectStudent(s.student_id)}
                        />
                      </td>
                      <td>{indexOfFirst + idx + 1}</td>
                      <td>
                        <div className="student-id-cell">
                          <span>{s.student_id}</span>
                          <span
                            className={`face-dot ${hasFace ? "face-dot-registered" : "face-dot-missing"}`}
                            title={hasFace ? "Face registered" : "Face not registered"}
                          />
                        </div>
                      </td>
                      <td>{formatFullName(s)}</td>
                      <td>{s.college_department || "—"}</td>
                      <td className="program-cell" title={s.program_name || ""}>
                        {s.program_name || "—"}
                      </td>
                      <td>{s.year_level ? `${s.year_level}` : "—"}</td>
                      <td>{s.section || "—"}</td>
                      <td>
                        <span className={`status-badge ${statusBadgeClass(s.status)}`}>
                          {s.status || "Unknown"}
                        </span>
                      </td>
                      <td>{formatDate(s.created_at)}</td>
                      <td className="action-cell">
                        <button
                          className="action-text-btn edit-text-btn"
                          onClick={() => handleEdit(s)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={10} className="no-data">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && !error && sortedStudents.length > 0 && (
          <>
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >← Previous</button>
              <div className="page-numbers">{renderPageNumbers()}</div>
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >Next →</button>
            </div>
            <div className="results-count">
              Showing {indexOfFirst + 1}–{Math.min(indexOfFirst + recordsPerPage, sortedStudents.length)} of {sortedStudents.length} students
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <RegisterStudent onClose={handleCloseRegister} onSuccess={fetchStudents} />
          </div>
        </div>
      )}
      {showImportModal && (
        <ImportStudent
          isOpen={showImportModal}
          onClose={handleCloseImport}
          onSuccess={handleImportSuccess}
        />
      )}
      {showEditModal && editingStudent && (
        <EditStudent student={editingStudent} onClose={handleCloseEdit} />
      )}
    </div>
  );
}

export default Students;