import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import GenerateReportFilter from "../../components/GenerateReportFilter";
import GenerateReportPdf from "../../components/GenerateReportPdf";
import { reportToXml, xmlToReport } from "../../utils/xmlReportUtils";
import {
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  PieChart as RePieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import "../../css/Dashboard.css";
import {
  FaBook, FaQuestionCircle, FaBolt, FaHeadset,
  FaChartBar, FaCog, FaEnvelope, FaCheckCircle,
  FaClock, FaCode, FaCalendar, FaCircle, FaSync,
  FaTachometerAlt, FaBell, FaUsers, FaClipboardList,
  FaUserPlus, FaUserEdit, FaUserMinus, FaGraduationCap,
  FaBuilding, FaLayerGroup, FaExclamationCircle,
  FaInfoCircle, FaSchool, FaDoorOpen,
  FaEllipsisH, FaTimes,
} from "react-icons/fa";
// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

class TimeService {
  static async fetchServerTime() {
    const res = await fetch("http://localhost:5000/api/time");
    const data = await res.json();
    return new Date(data.serverTime);
  }

  static format(date) {
    const day = date
      .toLocaleDateString("en-PH", { weekday: "long" })
      .toUpperCase();
    const dateStr = date.toLocaleDateString("en-PH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { day, date: dateStr, time: timeStr };
  }
}

class DashboardService {
  static async fetchMetrics() {
    try {
      const res = await fetch("http://localhost:5000/api/analytics/metrics");
      if (!res.ok) throw new Error("no metrics");
      const json = await res.json();
      // Accept direct payload or envelope
      return json.data ?? json.metrics ?? json;
    } catch {
      return {
        onCampus: 1000,
        totalEntries: 1000,
        authSuccessRate: 80,
        totalUsers: 10,
        totalSuperAdmins: 1,
        totalEEMSAdmins: 2,
        totalEAMSAdmins: 3,
        totalStudents: 3000,
        totalDepartments: 7,
        totalPrograms: 12,
        archivedUsers: 0,
        archivedStudents: 0,
        archivedDepartments: 0,
        archivedPrograms: 0,
      };
    }
  }

  static async fetchTraffic(days = 7) {
    const sampleAll = [
      { day: "MON", entries: 150,  exits: 140  },
      { day: "TUE", entries: 180,  exits: 170  },
      { day: "WED", entries: 1240, exits: 1190 },
      { day: "THU", entries: 900,  exits: 850  },
      { day: "FRI", entries: 1100, exits: 1080 },
      { day: "SAT", entries: 2150, exits: 2100 },
      { day: "SUN", entries: 1820, exits: 1790 },
    ];
    return sampleAll.slice(0, days);
  }

  static async fetchColleges() {
    return [
      { name: "College of Computer Studies", value: 2000 },
      { name: "College of Arts and Sciences", value: 1000 },
      { name: "College of Nursing", value: 1000 },
      { name: "College of Business and Accountancy", value: 1000 },
      { name: "College of International Hospitality Management", value: 2000 },
      { name: "College of Education", value: 3000 },
      { name: "College of Engineering", value: 2500 },
    ];
  }

  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entries ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exits   ?? 0), 0);
    const peak         = data.reduce((a, b) => (b.entries > a.entries ? b : a));
    return { totalEntries, totalExits, peakDay: peak.day, peakEntries: peak.entries };
  }

  static trafficDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }

  static async fetchNotifications() {
    try {
      const res = await fetch("http://localhost:5000/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      return json.data ?? json.notifications ?? json;
    } catch (err) {
      console.error('[DashboardService] fetchNotifications failed:', err.message);
      return [];
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsPanel({ notifications }) {
  const unreadCount = notifications.filter((n) => n.unread).length;
  const iconMap = {
    exclamation: <FaExclamationCircle />,
    calendar: <FaCalendar />,
    check: <FaCheckCircle />,
    info: <FaInfoCircle />,
    envelope: <FaEnvelope />,
  };

  return (
    <div className="panel-card notif-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon-wrap notif-icon-wrap">
            <FaBell />
          </span>
          <h3 className="panel-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>

      {/* List */}
      <ul className="notif-list">
        {notifications.length === 0 ? (
          <li className="notif-empty-item">No notifications available.</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}>
              <span
                className={`notif-type-bar type-${n.type}`}
                aria-hidden="true"
              />
              <span className={`notif-dot-icon type-${n.type}`}>
                {iconMap[n.icon] ?? <FaBell />}
              </span>
              <div className="notif-body">
                <p className="notif-title">{n.title}</p>
                <p className="notif-detail">{n.detail}</p>
                <span className="notif-time">{n.time}</span>
              </div>
              {n.unread && <span className="notif-unread-dot" aria-label="Unread" />}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// USERS LIST MODAL
// ─────────────────────────────────────────────────────────────────────────────

function UsersListModal({ isOpen, users, onClose, isLoading }) {
  if (!isOpen) return null;

  // Inline styles for modal overlay
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
    backdropFilter: 'blur(2px)',
  };

  // Inline styles for modal container
  const containerStyle = {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease',
  };

  // Inline styles for modal header
  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
    background: 'linear-gradient(135deg, rgba(84, 135, 114, 0.05), rgba(217, 146, 1, 0.05))',
  };

  const headerH2Style = {
    margin: 0,
    fontSize: '1.25rem',
    color: '#123',
    fontFamily: '"Montserrat", sans-serif',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#999',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  };

  const [closeButtonHover, setCloseButtonHover] = React.useState(false);

  // Inline styles for modal body
  const bodyStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
  };

  const loadingEmptyStyle = {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: '#999',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '0.95rem',
  };

  const tableWrapperStyle = {
    width: '100%',
    overflowX: 'auto',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: '"Montserrat", sans-serif',
    fontSize: '0.9rem',
  };

  const theadStyle = {
    background: 'rgba(0, 0, 0, 0.04)',
    borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
  };

  const thStyle = {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: 600,
    color: '#123',
    whiteSpace: 'nowrap',
  };

  const tbodyTrStyle = {
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    transition: 'background 0.15s ease',
  };

  const [hoveredRowId, setHoveredRowId] = React.useState(null);

  const tdStyle = {
    padding: '0.75rem 1rem',
    color: '#555',
    verticalAlign: 'middle',
  };



  const userNameStyle = {
    ...tdStyle,
    fontWeight: 500,
    color: '#123',
  };

  const userEmailStyle = {
    ...tdStyle,
    color: '#666',
    fontSize: '0.88rem',
  };

  const userRoleStyle = {
    ...tdStyle,
    textAlign: 'center',
  };

  const userStatusStyle = {
    ...tdStyle,
    textAlign: 'center',
  };

  // Role badge styles with variants
  const getRoleBadgeStyle = (role) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.78rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    };

    const roleLC = role?.toLowerCase() || 'user';

    if (roleLC === 'super_admin' || roleLC === 'superadmin') {
      return {
        ...baseStyle,
        background: 'rgba(217, 146, 1, 0.15)',
        color: '#d99201',
        border: '1px solid rgba(217, 146, 1, 0.3)',
      };
    } else if (roleLC === 'eems_admin' || roleLC === 'eemsadmin') {
      return {
        ...baseStyle,
        background: 'rgba(84, 135, 114, 0.15)',
        color: '#548772',
        border: '1px solid rgba(84, 135, 114, 0.3)',
      };
    } else if (roleLC === 'eams_admin' || roleLC === 'eamsadmin') {
      return {
        ...baseStyle,
        background: 'rgba(52, 152, 219, 0.15)',
        color: '#3498db',
        border: '1px solid rgba(52, 152, 219, 0.3)',
      };
    } else {
      return {
        ...baseStyle,
        background: 'rgba(149, 165, 166, 0.15)',
        color: '#7f8c8d',
        border: '1px solid rgba(149, 165, 166, 0.3)',
      };
    }
  };

  // Status badge styles
  const getStatusBadgeStyle = (isArchived) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.78rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    };

    if (isArchived) {
      return {
        ...baseStyle,
        background: 'rgba(231, 76, 60, 0.15)',
        color: '#e74c3c',
        border: '1px solid rgba(231, 76, 60, 0.3)',
      };
    } else {
      return {
        ...baseStyle,
        background: 'rgba(39, 174, 96, 0.15)',
        color: '#27ae60',
        border: '1px solid rgba(39, 174, 96, 0.3)',
      };
    }
  };

  // Footer styles
  const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    background: 'rgba(0, 0, 0, 0.02)',
  };

  const userCountStyle = {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
    fontFamily: '"Montserrat", sans-serif',
  };

  const btnCloseStyle = {
    background: '#548772',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '"Montserrat", sans-serif',
  };

  return ReactDOM.createPortal(
    <>
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={overlayStyle} onClick={onClose}>
        <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={headerH2Style}><FaUsers /> Users List</h2>
            <button
              style={{
                ...closeButtonStyle,
                background: closeButtonHover ? 'rgba(0, 0, 0, 0.08)' : 'none',
                color: closeButtonHover ? '#123' : '#999',
              }}
              onClick={onClose}
              onMouseEnter={() => setCloseButtonHover(true)}
              onMouseLeave={() => setCloseButtonHover(false)}
            >
              ✕
            </button>
          </div>

          <div style={bodyStyle}>
            {isLoading ? (
              <div style={loadingEmptyStyle}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={loadingEmptyStyle}>No users found.</div>
            ) : (
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead style={theadStyle}>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.email}
                        style={{
                          ...tbodyTrStyle,
                          background: hoveredRowId === user.email ? 'rgba(84, 135, 114, 0.04)' : 'transparent',
                        }}
                        onMouseEnter={() => setHoveredRowId(user.email)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td style={userNameStyle}>{user.fullname || "—"}</td>
                        <td style={userEmailStyle}>{user.email || "—"}</td>
                        <td style={userRoleStyle}>
                          <span style={getRoleBadgeStyle(user.role)}>
                            {user.role || "User"}
                          </span>
                        </td>
                        <td style={userStatusStyle}>
                          <span style={getStatusBadgeStyle(false)}>
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={footerStyle}>
            <p style={userCountStyle}>Total Users: {users.length}</p>
            <button
              style={btnCloseStyle}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.target.style.background = '#01311d';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#548772';
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS (updated)
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionsSection({ onShowUsers, onShowSupport, onSystemSettings, onGenerateReports }) {
  const actions = [
    {
      variant: "primary",
      icon: <FaUsers />,
      title: "Show list of Users",
      desc: "View all system users",
      onClick: onShowUsers,
    },
    {
      variant: "success",
      icon: <FaChartBar />,
      title: "Generate Reports",
      desc: "Export analytics & summaries",
      onClick: onGenerateReports,
    },
    {
      variant: "info",
      icon: <FaCog />,
      title: "System Settings",
      desc: "Configure gate & academic year settings",
      onClick: onSystemSettings,
    },
    {
      variant: "warning",
      icon: <FaEnvelope />,
      title: "Contact Support",
      desc: "24/7 assistance",
      onClick: onShowSupport,
    },
  ];

  return (
    <section className="quick-actions-section-superadmin">
      <div className="section-header-wrapper">
        <h3>
          <FaBolt /> Quick Actions
        </h3>
        <span className="section-badge">{actions.length} available</span>
      </div>

      <div className="actions-grid">
        {actions.map((a) => (
          <button
            key={a.title}
            className={`action-card ${a.variant}`}
            onClick={a.onClick}
          >
            <span className="action-icon">{a.icon}</span>
            <div className="action-content">
              <span className="action-title">{a.title}</span>
              <span className="action-desc">{a.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function SuperDashboard() {
  const [serverTime,      setServerTime]      = useState(null);
  const [metrics,         setMetrics]         = useState(null);
  const [trafficData,     setTrafficData]     = useState(null);
  const [collegeData,     setCollegeData]     = useState(null);
  const [notifications,   setNotifications]   = useState([]);
  const [trafficDays,     setTrafficDays]     = useState(7);
  const [chartKey,        setChartKey]        = useState(0);
  const [logoUrl, setLogoUrl] = useState("../logoplp.gif");

    // Load logo from server (ADD THIS NEW useEffect HERE)
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/api/settings/logo');
        const data = await response.json();
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        console.error('Failed to load logo:', err);
      }
    };
    
    loadLogo();

    const handleLogoUpdate = (event) => {
      if (event.detail.logoUrl) {
        setLogoUrl(event.detail.logoUrl);
      } else {
        setLogoUrl("../logoplp.gif");
      }
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);
  const [showUsersModal,  setShowUsersModal]  = useState(false);
  const [usersList,       setUsersList]       = useState([]);
  const [usersLoading,    setUsersLoading]    = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const navigate = useNavigate();
  const [showReportFilter, setShowReportFilter] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const pdfRef = useRef(null);
  const [expandedGuide, setExpandedGuide] = useState(null);

  // Function to fetch users from backend
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      const data = json.data ?? json.users ?? json;
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SuperDashboard] fetchUsers failed:', err.message);
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Handle opening users modal
  const handleShowUsers = useCallback(async () => {
    setShowUsersModal(true);
    await fetchUsers();
  }, [fetchUsers]);

  // Report generation handlers (reuse Analytics logic)
  const handleApplyFilters = async (filters) => {
    setAppliedFilters(filters);
    try {
      const reportParams = {};
      if (filters.dateRange?.from) {
        const parts = String(filters.dateRange.from).split('/');
        reportParams.from = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : filters.dateRange.from;
      }
      if (filters.dateRange?.to) {
        const parts = String(filters.dateRange.to).split('/');
        reportParams.to = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : filters.dateRange.to;
      }
      if (filters.collegeDepartment) reportParams.dept = filters.collegeDepartment;

      const query = new URLSearchParams(reportParams).toString();
      const res = await fetch(`/api/analytics/report?${query}`);
      if (!res.ok) throw new Error(`report: HTTP ${res.status}`);
      const reportData = await res.json();

      const xmlString = reportToXml(reportData, reportParams);
      const parsedData = xmlToReport(xmlString);

      setFilteredReportData({
        ...parsedData,
        _xml: xmlString,
        dateRange: filters.dateRange?.from && filters.dateRange?.to ? `${filters.dateRange.from} - ${filters.dateRange.to}` : parsedData.dateRange,
        collegeData: reportData.collegeData,
        authData: reportData.authData,
        trafficData: reportData.trafficChartData ?? trafficData,
        visitorData: reportData.visitorData,
        visitorLogs: reportData.visitorLogs,
        metrics: metrics,
        totalStudents: reportData.totalStudents,
        currentOnCampus: reportData.currentOnCampus,
        totalEntries: reportData.totalEntries,
        studentLogs: reportData.studentLogs,
        entryLogs: reportData.entryLogs,
        exitLogs: reportData.exitLogs,
      });

      setShowPdfPreview(true);
    } catch (err) {
      console.error('[SuperDashboard] report fetch error:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setShowReportFilter(false);
    }
  };

  const handleDownloadPDF = () => pdfRef.current?.generatePDF();
  

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setFilteredReportData(null);
  };

  // Clock
  useEffect(() => {
    let baseTime, tickInterval, syncInterval;
    const syncClock = async () => {
      try {
        baseTime = await TimeService.fetchServerTime();
      } catch {
        baseTime = new Date();
      }
      setServerTime(new Date(baseTime));
      clearInterval(tickInterval);
      tickInterval = setInterval(() => {
        baseTime = new Date(baseTime.getTime() + 1000);
        setServerTime(new Date(baseTime));
      }, 1000);
    };
    syncClock();
    syncInterval = setInterval(syncClock, 60_000);
    return () => { clearInterval(tickInterval); clearInterval(syncInterval); };
  }, []);

  // Data
  useEffect(() => {
    DashboardService.fetchMetrics().then((m) => { console.log('[SuperDashboard] metrics →', m); setMetrics(m); });
    DashboardService.fetchColleges().then(setCollegeData);
    DashboardService.fetchNotifications().then((n) => { console.log('[SuperDashboard] notifications →', n); setNotifications(n); });
  }, []);

  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(setTrafficData);
    setChartKey((p) => p + 1);
  }, [trafficDays]);

  // Resize → force chart re-render
  useEffect(() => {
    const onResize = () => setChartKey((p) => p + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const formatted     = serverTime ? TimeService.format(serverTime) : null;
  const summary       = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  if (!formatted) return null;

  const formatNumber = (v) => {
    if (v === null || v === undefined) return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString();
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashb">

        {/* ── HEADER ── */}
        <header className="campus-header">
          <div className="logo-area">
            <img className="seal-placeholder" src={logoUrl} alt="PLP Seal" />
            <div className="university-info">
              <h1>Pamantasan ng Lungsod ng Pasig</h1>
              <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
            </div>
          </div>
          <div className="date-and-time">
            <div className="date-section">
              <span className="day">{formatted.day}</span>
              <span className="date">{formatted.date}</span>
            </div>
            <div className="time">{formatted.time}</div>
          </div>
        </header>

        {/* ── METRIC CARDS (4 per row) ── */}
        <section className="metrics-row">
          <MetricCard
            title="Total Users"
            value={formatNumber(metrics?.totalUsers)}
            tooltip="Shows the total number of user accounts (admins) registered in the system."
          />
          <MetricCard
            title="Total Super Admin"
            value={formatNumber(metrics?.totalSuperAdmins)}
            tooltip="Shows the total number of super admins registered in the system."
          />
          <MetricCard
            title="Total EEMS Admin"
            value={formatNumber(metrics?.totalEEMSAdmins)}
            tooltip="Shows the total number of EEMS Admins registered in the system."
          />
          <MetricCard
            title="Total EAMS Admin"
            value={formatNumber(metrics?.totalEAMSAdmins)}
            tooltip="Shows the total number of EAMS Admins registered in the system."
          />
        </section>

        <section className="metrics-row">
          <MetricCard
            title="Total Programs"
            value={formatNumber(metrics?.totalPrograms)}
            tooltip="Shows the total number of programs."
          />
          <MetricCard
            title="Total Departments"
            value={formatNumber(metrics?.totalDepartments)}
            tooltip="Shows the total number of departments."
          />
          <MetricCard
            title="Total Students"
            value={formatNumber(metrics?.totalStudents)}
            tooltip="Shows the total number of students currently registered in the system."
          />
        </section>

        {/* ── NOTIFICATIONS + QUICK ACTIONS ── */}
        <section className="info-panels-row">
          <NotificationsPanel
            notifications={notifications}
          />
          <QuickActionsSection onShowUsers={handleShowUsers} onShowSupport={() => setShowSupportModal(true)} onSystemSettings={() => navigate('/systemsettings')} onGenerateReports={() => setShowReportFilter(true)} />
        </section>

        {/* ── QUICK GUIDE ── */}
        <section className="quick-guide-section">
          <h3><FaBook /> Quick Guide &amp; FAQs</h3>
          <div className="guide-grid">
            <div className="guide-card" onClick={() => setExpandedGuide('getting-started')} style={{ cursor: 'pointer' }}>
              <div className="guide-icon"><FaBook /></div>
              <h4>Getting Started</h4>
              <ul>
                <li><FaCircle /> Monitor real-time entries/exits via Real-Time Monitor</li>
                <li><FaCircle /> View daily traffic trends and college distribution</li>
                <li><FaCircle /> Generate reports for analytics and audits</li>
                <li><FaCircle /> Configure system-wide settings and academic years</li>
              </ul>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Click to expand</p>
            </div>
            <div className="guide-card" onClick={() => setExpandedGuide('faq')} style={{ cursor: 'pointer' }}>
              <div className="guide-icon"><FaQuestionCircle /></div>
              <h4>Frequently Asked</h4>
              <ul>
                <li><FaCircle /> How do I add or manage system users and admins?</li>
                <li><FaCircle /> How do I configure a new academic year?</li>
                <li><FaCircle /> How can I reset a user's password?</li>
                <li><FaCircle /> What's the difference between EEMS and EAMS admins?</li>
              </ul>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Click to expand</p>
            </div>
            <div className="guide-card" onClick={() => setExpandedGuide('tips')} style={{ cursor: 'pointer' }}>
              <div className="guide-icon"><FaBolt /></div>
              <h4>Quick Tips</h4>
              <ul>
                <li><FaCircle /> Use date filters in reports to analyze specific periods</li>
                <li><FaCircle /> Monitor college distribution to identify peak hours</li>
                <li><FaCircle /> Use role-based access to delegate admin tasks</li>
                <li><FaCircle /> Review logs daily for suspicious patterns</li>
              </ul>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Click to expand</p>
            </div>
            <div className="guide-card" onClick={() => setExpandedGuide('contact')} style={{ cursor: 'pointer' }}>
              <div className="guide-icon"><FaHeadset /></div>
              <h4>Contact Support</h4>
              <ul>
                <li><FaCircle /> Main Support Line: (+63) 2-1234-5678 ext. 1234</li>
                <li><FaCircle /> General Email: ithelpdesk@plp.edu.ph</li>
                <li><FaCircle /> Hours: Monday-Friday, 8:00 AM - 5:00 PM</li>
                <li><FaCircle /> Emergency: 0917-123-4567</li>
              </ul>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Click to expand</p>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="dashboard-footer">
          <div className="footer-left">
            <span className="system-status">
              <span className="status-dot green" />
              <FaCheckCircle /> System Online
            </span>
            <span className="separator">|</span>
            <span><FaClock /> Last Sync: {formatted.time}</span>
            <span className="separator">|</span>
            <span><FaTachometerAlt /> API: 45ms</span>
          </div>
          <div className="footer-right">
            <span><FaCalendar /> 2026 PLP Entrance Exit Monitoring System</span>
            <span className="separator">|</span>
            <span><FaCode /> v1.1.0</span>
            <span className="separator">|</span>
            <span><FaSync /> Build: 03.01</span>
          </div>
        </footer>

      </div>

      {/* Users List Modal */}
      <UsersListModal 
        isOpen={showUsersModal}
        users={usersList}
        isLoading={usersLoading}
        onClose={() => setShowUsersModal(false)}
      />

      {/* Generate Report Filter (reuse Analytics modal) */}
      {showReportFilter && (
        <GenerateReportFilter
          onClose={() => setShowReportFilter(false)}
          onGenerate={handleApplyFilters}
        />
      )}

      {/* PDF Preview Modal for generated report */}
      {showPdfPreview && filteredReportData && (
        <div
          className="modal-overlay"
          onClick={handleClosePdfPreview}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="pdf-preview-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: "12px",
              width: "90%",
              maxWidth: "1000px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            <div
              className="pdf-preview-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: "#01311d",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", color: "#fff" }}>
                Report Preview
              </h2>
              <button
                onClick={handleClosePdfPreview}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                ×
              </button>
            </div>
            <div
              className="pdf-preview-content"
              style={{ flex: 1, overflowY: "auto", padding: "20px" }}
            >
              <GenerateReportPdf
                ref={pdfRef}
                reportData={filteredReportData}
                filters={appliedFilters}
              />
            </div>
            <div
              className="pdf-preview-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 20px",
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <button
                onClick={handleClosePdfPreview}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f5f5f5",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#548772",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showSupportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem',
          backdropFilter: 'blur(2px)',
        }} onClick={() => setShowSupportModal(false)}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, rgba(84, 135, 114, 0.05), rgba(217, 146, 1, 0.05))',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                color: '#123',
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: 600,
              }}>Contact Support</h2>
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: '#999',
                cursor: 'pointer',
                padding: 0,
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }} onClick={() => setShowSupportModal(false)} onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.08)';
                e.target.style.color = '#123';
              }} onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#999';
              }}>
                <FaTimes />
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              fontFamily: '"Montserrat", sans-serif',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              color: '#333',
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.1rem',
                color: '#123',
                fontWeight: 600,
              }}>PLP IT Helpdesk</h3>
              <p style={{ margin: '0.75rem 0' }}>
                <strong>📞 Hotline:</strong> (+63) 2-1234-5678 ext. 1234
              </p>
              <p style={{ margin: '0.75rem 0' }}>
                <strong>✉️ Email:</strong> ithelpdesk@plp.edu.ph
              </p>
              <p style={{ margin: '0.75rem 0' }}>
                <strong>⏰ Operating Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM
              </p>
              <p style={{ margin: '0.75rem 0' }}>
                <strong>🚨 Emergency/After Hours:</strong> 0917-123-4567
              </p>
              <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
              <h4 style={{
                margin: '1rem 0 0.75rem 0',
                fontSize: '1rem',
                color: '#123',
                fontWeight: 600,
              }}>Specialized Support Contacts:</h4>
              <ul style={{
                margin: '0.75rem 0',
                paddingLeft: '1.5rem',
              }}>
                <li style={{ margin: '0.5rem 0' }}>
                  <strong>Facial Recognition Issues:</strong> fr_support@plp.edu.ph
                </li>
                <li style={{ margin: '0.5rem 0' }}>
                  <strong>System Access/Login Problems:</strong> sysaccess@plp.edu.ph
                </li>
                <li style={{ margin: '0.5rem 0' }}>
                  <strong>Reports & Analytics:</strong> analytics@plp.edu.ph
                </li>
              </ul>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '1.5rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(0, 0, 0, 0.02)',
              gap: '0.75rem',
            }}>
              <button style={{
                background: '#548772',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Montserrat", sans-serif',
              }} onClick={() => setShowSupportModal(false)} onMouseEnter={(e) => {
                e.target.style.background = '#01311d';
              }} onMouseLeave={(e) => {
                e.target.style.background = '#548772';
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Guide Modal */}
      {expandedGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '1rem',
          backdropFilter: 'blur(2px)',
        }} onClick={() => setExpandedGuide(null)}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, rgba(84, 135, 114, 0.05), rgba(217, 146, 1, 0.05))',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                color: '#123',
                fontFamily: '"Montserrat", sans-serif',
                fontWeight: 600,
              }}>
                {expandedGuide === 'getting-started' && 'Getting Started'}
                {expandedGuide === 'faq' && 'Frequently Asked Questions'}
                {expandedGuide === 'tips' && 'Quick Tips & Best Practices'}
                {expandedGuide === 'contact' && 'Contact Support'}
              </h2>
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: '#999',
                cursor: 'pointer',
                padding: 0,
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }} onClick={() => setExpandedGuide(null)} onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.08)';
                e.target.style.color = '#123';
              }} onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#999';
              }}>
                ✕
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              fontFamily: '"Montserrat", sans-serif',
              fontSize: '0.95rem',
              lineHeight: '1.7',
              color: '#333',
            }}>
              {expandedGuide === 'getting-started' && (
                <>
                  <h3 style={{ marginTop: 0, color: '#123', fontSize: '1.1rem', fontWeight: 600 }}>Key Features</h3>
                  <ul style={{ paddingLeft: '1.5rem', margin: '0.75rem 0' }}>
                    <li style={{ margin: '0.75rem 0' }}><strong>Monitor real-time entries/exits</strong> via Real-Time Monitor</li>
                    <li style={{ margin: '0.75rem 0' }}><strong>View daily traffic trends</strong> and college distribution in Analytics & Reports</li>
                    <li style={{ margin: '0.75rem 0' }}><strong>Generate reports</strong> for analytics</li>
                    <li style={{ margin: '0.75rem 0' }}><strong>Configure system-wide settings</strong> and academic years</li>
                    <li style={{ margin: '0.75rem 0' }}><strong>Manage users</strong> and assign roles</li>
                  </ul>
                  <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>
                    As a Super Admin, you have full access to all system functions. Use the Quick Actions panel to access key features directly.
                  </p>
                </>
              )}

              {expandedGuide === 'faq' && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>How do I add or manage system users and admins?</h4>
                    <p style={{ margin: 0, color: '#666' }}>Click "User Management" in the Side Bar. From there, you can view all users, manage their roles, and create new admin accounts.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>How do I configure a new academic year?</h4>
                    <p style={{ margin: 0, color: '#666' }}>Go to System Settings and look for the Academic Year configuration. Set the start and end dates, then save the settings.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>How can I reset a user's password?</h4>
                    <p style={{ margin: 0, color: '#666' }}>In the Users Management, find the user then click edit button then input the new password.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>How do can I set CAMPUS ENTRY WINDOW and CAMPUS EXIT WINDOW?</h4>
                    <p style={{ margin: 0, color: '#666' }}>Access System Settings and navigate to Gate Settings.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>What's the difference between EEMS Admin and EAMS Admin roles?</h4>
                    <p style={{ margin: 0, color: '#666' }}>EEMS Admin (Entrance & Exit Monitoring System) manages student monitoring, while EAMS Admin (Attendance & Assessment Management System) handles Employee Attendance Monitoring. Super Admin oversees both systems.</p>
                  </div>
                </>
              )}

              {expandedGuide === 'tips' && (
                <>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderLeft: '4px solid #548772', borderRadius: '4px' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>Use date filters in reports</h4>
                    <p style={{ margin: 0, color: '#666' }}>When generating reports, always use date filters to analyze specific periods. This helps identify trends and anomalies.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderLeft: '4px solid #D99201', borderRadius: '4px' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>Monitor college distribution</h4>
                    <p style={{ margin: 0, color: '#666' }}>Review the college distribution charts on the Analytics & Reports tab to see current campus population.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderLeft: '4px solid #548772', borderRadius: '4px' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>Use role-based access</h4>
                    <p style={{ margin: 0, color: '#666' }}>Delegate administrative tasks by assigning appropriate roles to other admins. This improves efficiency and security.</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderLeft: '4px solid #D99201', borderRadius: '4px' }}>
                    <h4 style={{ color: '#123', marginTop: 0, marginBottom: '0.5rem' }}>Review logs daily</h4>
                    <p style={{ margin: 0, color: '#666' }}>Check entry and exit logs daily for suspicious patterns, missed records, or system errors.</p>
                  </div>
                </>
              )}

              {expandedGuide === 'contact' && (
                <>
                  <h3 style={{ marginTop: 0, color: '#123', fontSize: '1.1rem', fontWeight: 600 }}>Main Support Channels</h3>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f8ff', borderLeft: '4px solid #548772', borderRadius: '4px' }}>
                    <p style={{ margin: 0 }}><strong>📞 Main Support Line:</strong> (+63) 2-1234-5678 ext. 1234</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f8ff', borderLeft: '4px solid #548772', borderRadius: '4px' }}>
                    <p style={{ margin: 0 }}><strong>✉️ General Email:</strong> ithelpdesk@plp.edu.ph</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f8ff', borderLeft: '4px solid #548772', borderRadius: '4px' }}>
                    <p style={{ margin: 0 }}><strong>⏰ Business Hours:</strong> Monday-Friday, 8:00 AM - 5:00 PM</p>
                  </div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#ffe0e0', borderLeft: '4px solid #d11100', borderRadius: '4px' }}>
                    <p style={{ margin: 0 }}><strong>🚨 After-Hours Emergency:</strong> 0917-123-4567</p>
                  </div>
                  <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  <h4 style={{ color: '#123', marginTop: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>Specialized Support</h4>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0.5rem 0' }}><strong>📧 Facial Recognition Issues:</strong> fr_support@plp.edu.ph</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>📧 System Access/Login Problems:</strong> sysaccess@plp.edu.ph</p>
                    <p style={{ margin: '0.5rem 0' }}><strong>📧 Reports & Analytics:</strong> analytics@plp.edu.ph</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function InfoIcon({ tooltip }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0 });
  const iconRef               = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top:  rect.top  + window.scrollY - 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    setVisible(true);
  }, []);
  const handleMouseLeave = useCallback(() => setVisible(false), []);

  const tooltipPortal = visible
    ? ReactDOM.createPortal(
        <div
          className="tooltip-portal"
          style={{
            position: "fixed",
            top:  coords.top  - window.scrollY,
            left: coords.left,
            transform: "translate(-50%, -100%)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          role="tooltip"
        >
          {tooltip}
          <span className="tooltip-arrow" />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={iconRef}
        className="info-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        i
      </span>
      {tooltipPortal}
    </>
  );
}

function MetricCard({ title, value, subtitle, tooltip }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        <InfoIcon tooltip={tooltip} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{subtitle}</div>
    </div>
  );
}

const TRAFFIC_COLORS = { entries: "#58761B", exits: "#D99201" };
const PIE_COLORS = [
  "#5e5e5e","#54325f","#da719e","#ffeb36","#d11100","#0023be","#ff8800",
];

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entries, exits } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {entries?.toLocaleString() || 0}</div>
      <div className="tt-exits">Exits: {exits?.toLocaleString() || 0}</div>
    </div>
  );
}

function TrafficAreaChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!data || data.length === 0) return <p className="chart-placeholder">No traffic data</p>;

  const formatted = data.map((d) => ({
    date: d.date || d.day,
    entries: d.entries ?? 0,
    exits:   d.exits   ?? 0,
  }));

  return (
    <div ref={containerRef} className="chart-container" style={{ width: "100%", height: "100%", minHeight: "280px" }}>
      {dimensions.width > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <ReAreaChart data={formatted} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <defs>
              <linearGradient id="gEntries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="gExits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} width={45} />
            <ReTooltip content={<TrafficTooltip />} />
            <ReLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            <Area type="monotone" dataKey="entries" name="Entries" stroke={TRAFFIC_COLORS.entries} strokeWidth={2} fill="url(#gEntries)" fillOpacity={0.6} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="exits"   name="Exits"   stroke={TRAFFIC_COLORS.exits}   strokeWidth={2} fill="url(#gExits)"   fillOpacity={0.6} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </ReAreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CollegePieChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!data || data.length === 0) return <p className="chart-placeholder">No distribution data</p>;
  const total = data.reduce((s, d) => s + d.value, 0);

  const CustomLegend = () => (
    <ul className="pie-legend">
      {data.map((entry, i) => (
        <li key={entry.name}>
          <span className="swatch" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="legend-text">{entry.name} ({((entry.value / total) * 100).toFixed(0)}%)</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div ref={containerRef} className="pie-wrap">
        <div className="pie-chart-wrapper" style={{ width: "100%", height: "250px" }}>
          {dimensions.width > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie data={data} cx="50%" cy="50%" innerRadius={dimensions.width < 400 ? 30 : 40} outerRadius={dimensions.width < 400 ? 60 : 80} paddingAngle={2} dataKey="value" label={false}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v, n) => [`${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`, n]} />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>
        <CustomLegend />
      </div>
    </>
  );
}

export default SuperDashboard;